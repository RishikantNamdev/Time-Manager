import { TaskItem, DayOfWeek } from '../types/schedule';
import { TaskSchema } from './schemaValidation';
import { parseTimeToMinutes } from './timeMath';

/**
 * Standardized system prompt template to convert user routines or notes
 * into structured JSON matching the application's schedule schema.
 */
export const AI_SCHEDULE_PROMPT_TEMPLATE = `You are an expert schedule assistant for the Timetable Manager PWA.
Convert the user's daily plans, routines, or natural language schedule into a valid JSON array matching this exact schema:

[
  {
    "id": "ai-task-1",
    "title": "Deep Work - Coding",
    "type": "task",
    "durationMinutes": 90,
    "startTime": "09:00",
    "endTime": "10:30",
    "priority": "p1",
    "category": "Work",
    "completed": false
  },
  {
    "id": "ai-task-2",
    "title": "Morning Coffee & Break",
    "type": "rest",
    "durationMinutes": 30,
    "startTime": "10:30",
    "endTime": "11:00",
    "priority": "p3",
    "category": "Rest",
    "completed": false
  }
]

Strict Rules:
1. Always output ONLY valid JSON inside a single \`\`\`json \`\`\` markdown code fence.
2. Time format must strictly be 24-hour "HH:mm" (e.g., "09:00", "14:30").
3. Use type: "task" for actionable tasks, and type: "rest" for breaks, meals, and downtime.
4. "priority" must be one of: "p1" (Urgent/Deep Work), "p2" (High), "p3" (Medium), "p4" (Low).
5. For fixed tasks, durationMinutes must equal the minute delta: (endTime - startTime).
6. Floating tasks (tasks without set hours) must omit startTime and endTime and provide durationMinutes.
7. Total day duration must fit within 1,440 minutes without overlapping fixed time blocks.`;

export interface ParseScheduleResult {
  success: boolean;
  data: TaskItem[];
  error?: string;
  rawCount?: number;
}

/**
 * Generates a unique fallback ID using crypto.randomUUID or timestamp fallback.
 */
function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails in restricted environments
    }
  }
  return `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Defensive JSON parser and sanitizer for raw conversational AI outputs.
 * Extracts items matching TaskItem schema, normalizes missing/invalid attributes,
 * handles full backup payloads, and validates through Zod TaskSchema.
 */
export function extractScheduleJsonFromText(
  rawText: string,
  targetDay?: DayOfWeek | string
): ParseScheduleResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      data: [],
      error: 'Input text is empty. Please paste the AI schedule output.',
    };
  }

  const trimmedText = rawText.trim();
  let jsonCandidate = trimmedText;

  // 1. Check for markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonCandidate = codeBlockMatch[1].trim();
  }

  // 2. Parse JSON defensively: try direct parse, then bracket extraction, then brace extraction
  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(jsonCandidate);
  } catch {
    // Attempt to locate outermost JSON array brackets [ ... ]
    const firstBracket = jsonCandidate.indexOf('[');
    const lastBracket = jsonCandidate.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const arraySub = jsonCandidate.substring(firstBracket, lastBracket + 1);
        parsedJson = JSON.parse(arraySub);
      } catch {
        // Fall through to object attempt
      }
    }

    // If still not parsed, attempt to locate outermost JSON object braces { ... }
    if (!parsedJson) {
      const firstBrace = jsonCandidate.indexOf('{');
      const lastBrace = jsonCandidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const objSub = jsonCandidate.substring(firstBrace, lastBrace + 1);
          parsedJson = JSON.parse(objSub);
        } catch {
          // Both array and object bracket extraction failed
        }
      }
    }
  }

  if (!parsedJson) {
    return {
      success: false,
      data: [],
      error: 'Failed to extract valid JSON from the provided text. Ensure the AI output contains a JSON schedule array.',
    };
  }

  // 3. Extract items array: handles standard arrays, full backup payloads, and object wrappers
  let rawItems: any[] = [];

  if (Array.isArray(parsedJson)) {
    rawItems = parsedJson;
  } else if (parsedJson && typeof parsedJson === 'object') {
    const obj = parsedJson as Record<string, any>;

    // Case: Full backup payload with daySchedules or days
    const schedulesMap = obj.daySchedules || obj.days;
    if (schedulesMap && typeof schedulesMap === 'object') {
      const dayKey = (targetDay?.toLowerCase() || 'mon') as DayOfWeek;
      const targetSchedule = schedulesMap[dayKey];

      if (targetSchedule && Array.isArray(targetSchedule.customItems)) {
        rawItems = targetSchedule.customItems;
      } else {
        // Search for any day that contains customItems or items
        const dayKeys = Object.keys(schedulesMap);
        let foundItems: any[] | null = null;
        for (const k of dayKeys) {
          const cand = schedulesMap[k];
          if (cand && Array.isArray(cand.customItems) && cand.customItems.length > 0) {
            foundItems = cand.customItems;
            break;
          }
          if (cand && Array.isArray(cand.items) && cand.items.length > 0) {
            foundItems = cand.items;
            break;
          }
        }
        if (foundItems) {
          rawItems = foundItems;
        } else if (targetSchedule && Array.isArray(targetSchedule.items)) {
          rawItems = targetSchedule.items;
        }
      }
    } else if (Array.isArray(obj.customItems)) {
      rawItems = obj.customItems;
    } else if (Array.isArray(obj.tasks)) {
      rawItems = obj.tasks;
    } else if (Array.isArray(obj.items)) {
      rawItems = obj.items;
    } else if (Array.isArray(obj.schedule)) {
      rawItems = obj.schedule;
    } else if (obj.title && typeof obj.title === 'string') {
      // Single task object pasted
      rawItems = [obj];
    }
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      success: false,
      data: [],
      error: 'No schedule items found in the extracted JSON payload.',
    };
  }

  // 4. Normalize and validate each item against TaskSchema
  const validatedTasks: TaskItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    if (!raw || typeof raw !== 'object') {
      errors.push(`Item at index ${i} is not a valid object.`);
      continue;
    }

    // Sanitize ID
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateFallbackId();

    // Sanitize title
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `Task ${i + 1}`;

    // Normalize type (default 'task', allow 'rest' / 'break')
    let type = raw.type;
    if (typeof type === 'string') {
      type = type.toLowerCase().trim();
    }
    if (type !== 'task' && type !== 'rest' && type !== 'break') {
      type = 'task';
    }

    // Times & duration calculation
    let startTime = typeof raw.startTime === 'string' && raw.startTime.trim() ? raw.startTime.trim() : undefined;
    let endTime = typeof raw.endTime === 'string' && raw.endTime.trim() ? raw.endTime.trim() : undefined;

    let durationMinutes = Number(raw.durationMinutes);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      if (startTime && endTime) {
        const startMins = parseTimeToMinutes(startTime);
        const endMins = parseTimeToMinutes(endTime);
        const delta = endMins - startMins;
        durationMinutes = delta > 0 ? delta : 30;
      } else {
        durationMinutes = 30;
      }
    }
    // Clamp to positive integer
    durationMinutes = Math.max(1, Math.round(durationMinutes));

    // Priority normalization
    let priority = typeof raw.priority === 'string' ? raw.priority.toLowerCase().trim() : undefined;
    if (!priority || !['p1', 'p2', 'p3', 'p4', 'high', 'medium', 'low'].includes(priority)) {
      priority = 'p3';
    }

    // Category normalization
    const defaultCategory = type === 'rest' || type === 'break' ? 'Rest' : 'General';
    const category = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : defaultCategory;

    const isFloating = !startTime || !endTime || Boolean(raw.isFloating);
    const now = Date.now();

    const candidateItem: Record<string, any> = {
      ...raw,
      id,
      title,
      type,
      durationMinutes,
      startTime: isFloating ? undefined : startTime,
      endTime: isFloating ? undefined : endTime,
      priority,
      category,
      completed: false,
      isCompleted: false,
      isFloating,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    };

    // Validate through Zod TaskSchema
    const parseRes = TaskSchema.safeParse(candidateItem);
    if (!parseRes.success) {
      const issueMsgs = parseRes.error.issues.map((issue) => issue.message).join(', ');
      errors.push(`Item "${title}": ${issueMsgs}`);
    } else {
      validatedTasks.push(candidateItem as TaskItem);
    }
  }

  if (validatedTasks.length === 0) {
    return {
      success: false,
      data: [],
      error: errors.length > 0 ? errors.join('; ') : 'All extracted items failed validation.',
      rawCount: rawItems.length,
    };
  }

  return {
    success: true,
    data: validatedTasks,
    rawCount: rawItems.length,
  };
}
