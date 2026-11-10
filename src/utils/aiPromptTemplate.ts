import { TaskItem, DayOfWeek, DayKey } from '../types/schedule';
import { TaskSchema } from './schemaValidation';
import { parseTimeToMinutes } from './timeMath';

export const ALL_DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
export const WEEKENDS: DayKey[] = ['sat', 'sun'];

/**
 * Standardized system prompt template to convert weekly natural language
 * routines or schedules into structured multi-day JSON.
 */
export const AI_SCHEDULE_PROMPT_TEMPLATE = `You are an expert weekly scheduler for the Timetable Manager PWA.
Convert the user's weekly routine into a single JSON array where tasks specify which days of the week they apply to.

Schema:
[
  {
    "id": "item-1",
    "days": ["mon", "tue", "wed", "thu", "fri"], // Or "weekdays", "weekends", "all", or specific days
    "title": "Core Work & Coding",
    "type": "task",
    "durationMinutes": 480,
    "startTime": "09:00",
    "endTime": "17:00",
    "priority": "p1",
    "category": "Work",
    "isCompleted": false
  },
  {
    "id": "item-2",
    "days": ["sat", "sun"],
    "title": "Weekend Project / Reading",
    "type": "task",
    "durationMinutes": 120,
    "startTime": "11:00",
    "endTime": "13:00",
    "priority": "p2",
    "category": "Learning",
    "isCompleted": false
  },
  {
    "id": "item-3",
    "days": ["all"],
    "title": "Evening Walk & Meditation",
    "type": "rest",
    "durationMinutes": 30,
    "startTime": "21:00",
    "endTime": "21:30",
    "priority": "p3",
    "category": "Rest",
    "isCompleted": false
  }
]

Strict Rules:
1. Output ONLY a valid JSON array inside a \`\`\`json \`\`\` markdown code fence.
2. The "days" property accepts:
   - "all" or "daily" -> Applies Monday through Sunday
   - "weekdays" -> ["mon", "tue", "wed", "thu", "fri"]
   - "weekends" -> ["sat", "sun"]
   - An explicit array of day abbreviations: ["mon", "wed", "fri"]
3. Format times strictly in 24-hour "HH:mm" (e.g., "09:00", "21:30").
4. Use type "task" for work, chores, and study; use "rest" for breaks, meals, and walks.
5. "priority" must be one of: "p1", "p2", "p3", "p4".
6. Floating tasks without fixed hours must omit startTime/endTime and define durationMinutes.`;

export interface ParseWeeklyScheduleResult {
  success: boolean;
  weeklyTasks: Record<DayKey, TaskItem[]>;
  isMultiDay: boolean;
  configuredDays: DayKey[];
  totalTasksCount: number;
  error?: string;
  rawCount?: number;
}

export interface ParseScheduleResult {
  success: boolean;
  data: TaskItem[];
  isMultiDay?: boolean;
  configuredDays?: DayKey[];
  weeklyTasks?: Record<DayKey, TaskItem[]>;
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
 * Normalizes day keywords ("weekdays", "weekends", "all", "daily", or specific day arrays)
 * into a verified list of DayKey values.
 */
export function normalizeDayKeywords(
  daysInput: unknown,
  fallbackDay: DayKey = 'mon'
): { days: DayKey[]; isExplicitMultiDay: boolean } {
  if (daysInput === undefined || daysInput === null || daysInput === '') {
    return { days: [fallbackDay], isExplicitMultiDay: false };
  }

  let list: string[] = [];
  if (Array.isArray(daysInput)) {
    list = daysInput.map((d) => String(d).toLowerCase().trim());
  } else if (typeof daysInput === 'string') {
    list = [daysInput.toLowerCase().trim()];
  } else {
    return { days: [fallbackDay], isExplicitMultiDay: false };
  }

  const resultSet = new Set<DayKey>();
  let hasMultiDayKeyword = false;

  for (const raw of list) {
    if (raw === 'all' || raw === 'daily' || raw === 'everyday' || raw === 'every day') {
      ALL_DAYS.forEach((d) => resultSet.add(d));
      hasMultiDayKeyword = true;
    } else if (raw === 'weekdays' || raw === 'weekday') {
      WEEKDAYS.forEach((d) => resultSet.add(d));
      hasMultiDayKeyword = true;
    } else if (raw === 'weekends' || raw === 'weekend') {
      WEEKENDS.forEach((d) => resultSet.add(d));
      hasMultiDayKeyword = true;
    } else {
      const prefix = raw.substring(0, 3) as DayKey;
      if (ALL_DAYS.includes(prefix)) {
        resultSet.add(prefix);
      }
    }
  }

  const resultDays = ALL_DAYS.filter((d) => resultSet.has(d));
  if (resultDays.length === 0) {
    return { days: [fallbackDay], isExplicitMultiDay: false };
  }

  return {
    days: resultDays,
    isExplicitMultiDay: hasMultiDayKeyword || resultDays.length > 1,
  };
}

/**
 * Normalizes an individual raw task candidate against the TaskSchema.
 */
function normalizeRawTask(raw: any, index: number): { task?: Record<string, any>; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: `Item at index ${index} is not a valid object.` };
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateFallbackId();
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `Task ${index + 1}`;

  let type = raw.type;
  if (typeof type === 'string') {
    type = type.toLowerCase().trim();
  }
  if (type !== 'task' && type !== 'rest' && type !== 'break') {
    type = 'task';
  }

  const startTime = typeof raw.startTime === 'string' && raw.startTime.trim() ? raw.startTime.trim() : undefined;
  const endTime = typeof raw.endTime === 'string' && raw.endTime.trim() ? raw.endTime.trim() : undefined;

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
  durationMinutes = Math.max(1, Math.round(durationMinutes));

  let priority = typeof raw.priority === 'string' ? raw.priority.toLowerCase().trim() : undefined;
  if (!priority || !['p1', 'p2', 'p3', 'p4', 'high', 'medium', 'low'].includes(priority)) {
    priority = 'p3';
  }

  const defaultCategory = type === 'rest' || type === 'break' ? 'Rest' : 'General';
  const category = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : defaultCategory;

  const isFloating = !startTime || !endTime || Boolean(raw.isFloating);
  const now = Date.now();
  const isCompleted = Boolean(raw.isCompleted ?? raw.completed ?? false);

  const candidate: Record<string, any> = {
    ...raw,
    id,
    title,
    type,
    durationMinutes,
    startTime: isFloating ? undefined : startTime,
    endTime: isFloating ? undefined : endTime,
    priority,
    category,
    completed: isCompleted,
    isCompleted,
    isFloating,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  };

  const parseRes = TaskSchema.safeParse(candidate);
  if (!parseRes.success) {
    const issueMsgs = parseRes.error.issues.map((issue) => issue.message).join(', ');
    return { error: `Item "${title}": ${issueMsgs}` };
  }

  return { task: candidate };
}

/**
 * Extracts and unpacks multi-day or single-day schedules from raw text.
 * Distributes tasks into Record<DayKey, TaskItem[]> with unique day-specific IDs.
 */
export function extractWeeklyScheduleFromText(
  rawText: string,
  activeDay: DayKey | string = 'mon'
): ParseWeeklyScheduleResult {
  const fallbackDay = (activeDay?.toLowerCase() || 'mon') as DayKey;

  const emptyWeeklyTasks: Record<DayKey, TaskItem[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      weeklyTasks: emptyWeeklyTasks,
      isMultiDay: false,
      configuredDays: [],
      totalTasksCount: 0,
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
    const firstBracket = jsonCandidate.indexOf('[');
    const lastBracket = jsonCandidate.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const arraySub = jsonCandidate.substring(firstBracket, lastBracket + 1);
        parsedJson = JSON.parse(arraySub);
      } catch {
        // Fall through
      }
    }

    if (!parsedJson) {
      const firstBrace = jsonCandidate.indexOf('{');
      const lastBrace = jsonCandidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const objSub = jsonCandidate.substring(firstBrace, lastBrace + 1);
          parsedJson = JSON.parse(objSub);
        } catch {
          // Failed
        }
      }
    }
  }

  if (!parsedJson) {
    return {
      success: false,
      weeklyTasks: emptyWeeklyTasks,
      isMultiDay: false,
      configuredDays: [],
      totalTasksCount: 0,
      error: 'Failed to extract valid JSON from the provided text. Ensure the AI output contains a valid JSON array or object.',
    };
  }

  // 3. Extract items and their assigned days
  interface TaskQueueItem {
    raw: any;
    days: DayKey[];
    isExplicitMultiDay: boolean;
  }
  const taskQueue: TaskQueueItem[] = [];
  let isMultiDayDetected = false;
  let totalRawCount = 0;

  if (Array.isArray(parsedJson)) {
    totalRawCount = parsedJson.length;
    for (const item of parsedJson) {
      const { days, isExplicitMultiDay } = normalizeDayKeywords(item?.days, fallbackDay);
      if (isExplicitMultiDay) {
        isMultiDayDetected = true;
      }
      taskQueue.push({ raw: item, days, isExplicitMultiDay });
    }
  } else if (parsedJson && typeof parsedJson === 'object') {
    const obj = parsedJson as Record<string, any>;

    // Case A: Full backup payload with daySchedules or days
    const schedulesMap = obj.daySchedules || obj.days;
    if (schedulesMap && typeof schedulesMap === 'object') {
      const dayKeys = Object.keys(schedulesMap);
      if (dayKeys.length > 1) {
        isMultiDayDetected = true;
      }
      for (const k of dayKeys) {
        const dKey = k.toLowerCase().substring(0, 3) as DayKey;
        const validDay = ALL_DAYS.includes(dKey) ? dKey : fallbackDay;
        const sched = schedulesMap[k];
        const items = Array.isArray(sched?.customItems)
          ? sched.customItems
          : Array.isArray(sched?.items)
          ? sched.items
          : [];
        totalRawCount += items.length;
        for (const item of items) {
          taskQueue.push({ raw: item, days: [validDay], isExplicitMultiDay: false });
        }
      }
    } else {
      // Case B: Grouped dictionary format: { "weekdays": [...], "weekends": [...] } or { "mon": [...] }
      const recognizedKeys = Object.keys(obj).filter((key) => {
        const k = key.toLowerCase().trim();
        return (
          Array.isArray(obj[key]) &&
          (ALL_DAYS.includes(k.substring(0, 3) as DayKey) ||
            ['weekdays', 'weekday', 'weekends', 'weekend', 'all', 'daily'].includes(k))
        );
      });

      if (recognizedKeys.length > 0) {
        isMultiDayDetected = true;
        for (const groupKey of recognizedKeys) {
          const items = obj[groupKey] as any[];
          totalRawCount += items.length;
          const { days } = normalizeDayKeywords(groupKey, fallbackDay);
          for (const item of items) {
            taskQueue.push({ raw: item, days, isExplicitMultiDay: true });
          }
        }
      } else if (Array.isArray(obj.tasks) || Array.isArray(obj.items) || Array.isArray(obj.customItems) || Array.isArray(obj.schedule)) {
        // Case C: Object wrapper { tasks: [...] }
        const items = obj.tasks || obj.items || obj.customItems || obj.schedule;
        totalRawCount = items.length;
        for (const item of items) {
          const { days, isExplicitMultiDay } = normalizeDayKeywords(item?.days, fallbackDay);
          if (isExplicitMultiDay) isMultiDayDetected = true;
          taskQueue.push({ raw: item, days, isExplicitMultiDay });
        }
      } else if (obj.title && typeof obj.title === 'string') {
        // Case D: Single task object
        totalRawCount = 1;
        const { days, isExplicitMultiDay } = normalizeDayKeywords(obj.days, fallbackDay);
        if (isExplicitMultiDay) isMultiDayDetected = true;
        taskQueue.push({ raw: obj, days, isExplicitMultiDay });
      }
    }
  }

  if (taskQueue.length === 0) {
    return {
      success: false,
      weeklyTasks: emptyWeeklyTasks,
      isMultiDay: false,
      configuredDays: [],
      totalTasksCount: 0,
      error: 'No schedule items found in the extracted JSON payload.',
      rawCount: totalRawCount,
    };
  }

  // 4. Distribute into daily buckets and ensure unique day-specific IDs
  const weeklyTasks: Record<DayKey, TaskItem[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  const validationErrors: string[] = [];
  let totalValidItemsCount = 0;

  for (let idx = 0; idx < taskQueue.length; idx++) {
    const { raw, days } = taskQueue[idx];
    const norm = normalizeRawTask(raw, idx);

    if (norm.error || !norm.task) {
      validationErrors.push(norm.error || `Task at index ${idx} failed validation.`);
      continue;
    }

    const baseTask = norm.task;
    const baseId = baseTask.id;

    for (const day of days) {
      // Generate day-specific ID when a task spans multiple days so IDs remain unique across days
      const daySpecificId = days.length > 1 ? `${baseId}-${day}` : baseId;

      const dayTask: TaskItem = {
        ...(baseTask as TaskItem),
        id: daySpecificId,
      };

      weeklyTasks[day].push(dayTask);
      totalValidItemsCount++;
    }
  }

  const configuredDays = ALL_DAYS.filter((d) => weeklyTasks[d].length > 0);

  if (configuredDays.length > 1) {
    isMultiDayDetected = true;
  }

  if (totalValidItemsCount === 0) {
    return {
      success: false,
      weeklyTasks: emptyWeeklyTasks,
      isMultiDay: false,
      configuredDays: [],
      totalTasksCount: 0,
      error: validationErrors.length > 0 ? validationErrors.join('; ') : 'All extracted items failed validation.',
      rawCount: totalRawCount,
    };
  }

  return {
    success: true,
    weeklyTasks,
    isMultiDay: isMultiDayDetected,
    configuredDays,
    totalTasksCount: totalValidItemsCount,
    rawCount: totalRawCount,
  };
}

/**
 * Defensive JSON parser and sanitizer for raw conversational AI outputs.
 * Delegates to extractWeeklyScheduleFromText for seamless multi-day support.
 */
export function extractScheduleJsonFromText(
  rawText: string,
  targetDay?: DayOfWeek | string
): ParseScheduleResult {
  const chosenDay = (targetDay?.toLowerCase() || 'mon') as DayKey;
  const weeklyResult = extractWeeklyScheduleFromText(rawText, chosenDay);

  if (!weeklyResult.success) {
    return {
      success: false,
      data: [],
      error: weeklyResult.error,
      rawCount: weeklyResult.rawCount,
    };
  }

  const targetDayTasks = weeklyResult.weeklyTasks[chosenDay];

  // If the target day has tasks, return those; if not multi-day and another day has tasks, return that day's tasks
  let dataToReturn: TaskItem[] = targetDayTasks;
  if (dataToReturn.length === 0 && !weeklyResult.isMultiDay) {
    for (const d of ALL_DAYS) {
      if (weeklyResult.weeklyTasks[d].length > 0) {
        dataToReturn = weeklyResult.weeklyTasks[d];
        break;
      }
    }
  }

  return {
    success: true,
    data: dataToReturn,
    isMultiDay: weeklyResult.isMultiDay,
    configuredDays: weeklyResult.configuredDays,
    weeklyTasks: weeklyResult.weeklyTasks,
    rawCount: weeklyResult.rawCount,
  };
}
