import { describe, it, expect } from 'vitest';
import {
  AI_SCHEDULE_PROMPT_TEMPLATE,
  extractScheduleJsonFromText,
  extractWeeklyScheduleFromText,
  normalizeDayKeywords,
} from '../aiPromptTemplate';

describe('aiPromptTemplate', () => {
  describe('AI_SCHEDULE_PROMPT_TEMPLATE', () => {
    it('should export a standardized master weekly prompt containing multi-day schema rules', () => {
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof AI_SCHEDULE_PROMPT_TEMPLATE).toBe('string');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('Timetable Manager PWA');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('"days"');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('"weekdays"');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('"weekends"');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('"all"');
      expect(AI_SCHEDULE_PROMPT_TEMPLATE).toContain('Strict Rules:');
    });
  });

  describe('normalizeDayKeywords', () => {
    it('1. should expand "weekdays" into Monday through Friday', () => {
      const res = normalizeDayKeywords('weekdays');
      expect(res.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
      expect(res.isExplicitMultiDay).toBe(true);

      const resArray = normalizeDayKeywords(['weekdays']);
      expect(resArray.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
      expect(resArray.isExplicitMultiDay).toBe(true);
    });

    it('2. should expand "weekends" into Saturday and Sunday', () => {
      const res = normalizeDayKeywords('weekends');
      expect(res.days).toEqual(['sat', 'sun']);
      expect(res.isExplicitMultiDay).toBe(true);

      const resSingular = normalizeDayKeywords('weekend');
      expect(resSingular.days).toEqual(['sat', 'sun']);
      expect(resSingular.isExplicitMultiDay).toBe(true);
    });

    it('3. should expand "all" and "daily" into all 7 calendar days', () => {
      const resAll = normalizeDayKeywords('all');
      expect(resAll.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      expect(resAll.isExplicitMultiDay).toBe(true);

      const resDaily = normalizeDayKeywords(['daily']);
      expect(resDaily.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      expect(resDaily.isExplicitMultiDay).toBe(true);
    });

    it('should handle explicit day arrays and fallbacks', () => {
      const res = normalizeDayKeywords(['mon', 'wed', 'fri']);
      expect(res.days).toEqual(['mon', 'wed', 'fri']);
      expect(res.isExplicitMultiDay).toBe(true);

      const singleDay = normalizeDayKeywords(['tue']);
      expect(singleDay.days).toEqual(['tue']);
      expect(singleDay.isExplicitMultiDay).toBe(false);

      const fallback = normalizeDayKeywords(undefined, 'thu');
      expect(fallback.days).toEqual(['thu']);
      expect(fallback.isExplicitMultiDay).toBe(false);
    });
  });

  describe('extractWeeklyScheduleFromText', () => {
    it('4. should correctly distribute tasks into Record<DayKey, TaskItem[]> with unique day-specific IDs', () => {
      const multiDayJson = `\`\`\`json
[
  {
    "id": "work-session",
    "days": "weekdays",
    "title": "Full-Stack Development",
    "type": "task",
    "durationMinutes": 480,
    "startTime": "09:00",
    "endTime": "17:00",
    "priority": "p1",
    "category": "Work"
  },
  {
    "id": "weekend-hike",
    "days": "weekends",
    "title": "Outdoor Trail Hike",
    "type": "rest",
    "durationMinutes": 180,
    "startTime": "08:00",
    "endTime": "11:00",
    "priority": "p3",
    "category": "Health"
  },
  {
    "id": "night-meditation",
    "days": ["all"],
    "title": "Evening Meditation",
    "type": "rest",
    "durationMinutes": 20,
    "startTime": "22:00",
    "endTime": "22:20"
  }
]
\`\`\``;

      const result = extractWeeklyScheduleFromText(multiDayJson);
      expect(result.success).toBe(true);
      expect(result.isMultiDay).toBe(true);
      expect(result.configuredDays).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

      // Weekday task distribution check (Mon..Fri should each have work-session and night-meditation)
      const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
      for (const d of weekdays) {
        const dayTasks = result.weeklyTasks[d];
        expect(dayTasks.length).toBeGreaterThanOrEqual(2);

        const workTask = dayTasks.find((t) => t.title === 'Full-Stack Development');
        expect(workTask).toBeDefined();
        // Day-specific ID check
        expect(workTask?.id).toBe(`work-session-${d}`);
        expect(workTask?.isCompleted).toBe(false);
        expect(workTask?.durationMinutes).toBe(480);

        const medTask = dayTasks.find((t) => t.title === 'Evening Meditation');
        expect(medTask).toBeDefined();
        expect(medTask?.id).toBe(`night-meditation-${d}`);
      }

      // Weekend task distribution check (Sat & Sun should have outdoor trail hike and night-meditation)
      const weekendDays = ['sat', 'sun'] as const;
      for (const d of weekendDays) {
        const dayTasks = result.weeklyTasks[d];
        expect(dayTasks.length).toBe(2);

        const hikeTask = dayTasks.find((t) => t.title === 'Outdoor Trail Hike');
        expect(hikeTask).toBeDefined();
        expect(hikeTask?.id).toBe(`weekend-hike-${d}`);

        const medTask = dayTasks.find((t) => t.title === 'Evening Meditation');
        expect(medTask).toBeDefined();
        expect(medTask?.id).toBe(`night-meditation-${d}`);
      }

      // Verify all day-specific IDs are unique
      const allIds = new Set<string>();
      let totalCount = 0;
      for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const) {
        for (const item of result.weeklyTasks[d]) {
          totalCount++;
          allIds.add(item.id);
        }
      }
      expect(allIds.size).toBe(totalCount);
    });

    it('should support dictionary format grouped by day keywords', () => {
      const dictJson = JSON.stringify({
        weekdays: [
          {
            id: "weekday-sync",
            title: "Morning Team Sync",
            durationMinutes: 30,
            startTime: "09:30",
            endTime: "10:00"
          }
        ],
        weekends: [
          {
            id: "weekend-brunch",
            title: "Family Brunch",
            durationMinutes: 90,
            startTime: "11:00",
            endTime: "12:30"
          }
        ]
      });

      const result = extractWeeklyScheduleFromText(dictJson);
      expect(result.success).toBe(true);
      expect(result.isMultiDay).toBe(true);
      expect(result.weeklyTasks.mon).toHaveLength(1);
      expect(result.weeklyTasks.mon[0].title).toBe('Morning Team Sync');
      expect(result.weeklyTasks.sat).toHaveLength(1);
      expect(result.weeklyTasks.sat[0].title).toBe('Family Brunch');
    });

    it('5. should handle legacy single-day JSON arrays seamlessly', () => {
      const legacyPayload = `[
        {
          "id": "single-task-1",
          "title": "Single Day Deep Focus",
          "type": "task",
          "durationMinutes": 90,
          "startTime": "10:00",
          "endTime": "11:30"
        }
      ]`;

      // Pass activeDay = 'wed'
      const result = extractWeeklyScheduleFromText(legacyPayload, 'wed');
      expect(result.success).toBe(true);
      expect(result.isMultiDay).toBe(false);
      expect(result.configuredDays).toEqual(['wed']);
      expect(result.weeklyTasks.wed).toHaveLength(1);
      expect(result.weeklyTasks.wed[0].id).toBe('single-task-1');
      expect(result.weeklyTasks.wed[0].title).toBe('Single Day Deep Focus');
      expect(result.weeklyTasks.mon).toHaveLength(0);
    });
  });

  describe('extractScheduleJsonFromText (Single-Day / Backward-Compatible Facade)', () => {
    it('should extract JSON from clean markdown fences (```json [...] ```)', () => {
      const rawText = `\`\`\`json
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
\`\`\``;

      const result = extractScheduleJsonFromText(rawText);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const [task1, task2] = result.data;
      expect(task1.id).toBe('ai-task-1');
      expect(task1.title).toBe('Deep Work - Coding');
      expect(task1.type).toBe('task');
      expect(task1.durationMinutes).toBe(90);
      expect(task1.startTime).toBe('09:00');
      expect(task1.endTime).toBe('10:30');
      expect(task1.priority).toBe('p1');
      expect(task1.category).toBe('Work');
      expect(task1.isCompleted).toBe(false);

      expect(task2.id).toBe('ai-task-2');
      expect(task2.title).toBe('Morning Coffee & Break');
      expect(task2.type).toBe('rest');
      expect(task2.durationMinutes).toBe(30);
      expect(task2.startTime).toBe('10:30');
      expect(task2.endTime).toBe('11:00');
      expect(task2.priority).toBe('p3');
      expect(task2.category).toBe('Rest');
    });

    it('should extract JSON from conversational text with preamble and postscript sentences', () => {
      const conversationalText = `Here is your requested daily plan formatted according to your schema!

\`\`\`json
[
  {
    "id": "task-alpha",
    "title": "Architecture Review",
    "type": "task",
    "durationMinutes": 60,
    "startTime": "14:00",
    "endTime": "15:00",
    "priority": "p2",
    "category": "Engineering"
  }
]
\`\`\`

Feel free to let me know if you would like me to adjust any time blocks or add more breaks!`;

      const result = extractScheduleJsonFromText(conversationalText);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Architecture Review');
      expect(result.data[0].startTime).toBe('14:00');
      expect(result.data[0].endTime).toBe('15:00');
      expect(result.data[0].durationMinutes).toBe(60);
    });

    it('should extract JSON from conversational text without markdown code fences', () => {
      const textWithoutFences = `Sure! Here is the JSON array:
[
  {
    "title": "Evening Walk",
    "durationMinutes": 45,
    "startTime": "18:00",
    "endTime": "18:45",
    "type": "rest"
  }
]
Hope that helps you organize your evening!`;

      const result = extractScheduleJsonFromText(textWithoutFences);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Evening Walk');
      expect(result.data[0].durationMinutes).toBe(45);
    });

    it('should handle fallback normalization: auto-generating IDs and assigning isCompleted: false when omitted', () => {
      const barePayload = `[
        {
          "title": "Unidentified Task",
          "durationMinutes": -15
        },
        {
          "title": "Floating Goal with No Completed Flag"
        }
      ]`;

      const result = extractScheduleJsonFromText(barePayload);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const [item1, item2] = result.data;

      // Auto-generated IDs
      expect(item1.id).toBeDefined();
      expect(typeof item1.id).toBe('string');
      expect(item1.id.length).toBeGreaterThan(0);

      expect(item2.id).toBeDefined();
      expect(typeof item2.id).toBe('string');
      expect(item2.id.length).toBeGreaterThan(0);
      expect(item1.id).not.toBe(item2.id);

      // Completed is forced false
      expect(item1.isCompleted).toBe(false);
      expect(item2.isCompleted).toBe(false);

      // Duration clamped > 0
      expect(item1.durationMinutes).toBeGreaterThan(0);
      expect(item2.durationMinutes).toBeGreaterThan(0);

      // Type defaulted to 'task'
      expect(item1.type).toBe('task');
      expect(item2.type).toBe('task');

      // Floating items have isFloating = true
      expect(item1.isFloating).toBe(true);
      expect(item2.isFloating).toBe(true);
    });

    it('should calculate durationMinutes from startTime and endTime delta if omitted', () => {
      const payload = `[
        {
          "title": "Morning Sync",
          "startTime": "09:30",
          "endTime": "10:15"
        }
      ]`;

      const result = extractScheduleJsonFromText(payload);
      expect(result.success).toBe(true);
      expect(result.data[0].durationMinutes).toBe(45);
    });

    it('should handle invalid JSON strings gracefully without throwing unhandled exceptions', () => {
      const invalidJsonCases = [
        '',
        '   ',
        'This is completely non-JSON plain conversational text without any brackets or data.',
        '```json\n{ "incomplete": [ 1, 2, \n```',
        '{ invalid json syntax: true, "test": }',
        '[]',
      ];

      for (const text of invalidJsonCases) {
        expect(() => {
          const res = extractScheduleJsonFromText(text);
          expect(res.success).toBe(false);
          expect(res.data).toEqual([]);
          expect(res.error).toBeDefined();
        }).not.toThrow();
      }
    });

    it('should extract tasks from full backup objects containing daySchedules', () => {
      const fullBackupPayload = JSON.stringify({
        version: '1.0.0',
        exportedAt: '2026-11-10T12:00:00.000Z',
        daySchedules: {
          mon: {
            day: 'mon',
            customItems: [
              {
                id: 'backup-task-mon-1',
                title: 'Monday Standup',
                type: 'task',
                durationMinutes: 30,
                startTime: '09:00',
                endTime: '09:30',
                priority: 'p2',
                category: 'Work',
                completed: false,
                isCompleted: false,
              },
            ],
            overrides: {},
            excludedMasterIds: [],
          },
          tue: {
            day: 'tue',
            customItems: [
              {
                id: 'backup-task-tue-1',
                title: 'Tuesday Sprint Planning',
                type: 'task',
                durationMinutes: 60,
                startTime: '10:00',
                endTime: '11:00',
                priority: 'p1',
                category: 'Work',
                completed: false,
                isCompleted: false,
              },
            ],
            overrides: {},
            excludedMasterIds: [],
          },
        },
        masterRoutines: [],
      });

      // Target day = mon
      const resMon = extractScheduleJsonFromText(fullBackupPayload, 'mon');
      expect(resMon.success).toBe(true);
      expect(resMon.data).toHaveLength(1);
      expect(resMon.data[0].id).toBe('backup-task-mon-1');
      expect(resMon.data[0].title).toBe('Monday Standup');

      // Target day = tue
      const resTue = extractScheduleJsonFromText(fullBackupPayload, 'tue');
      expect(resTue.success).toBe(true);
      expect(resTue.data).toHaveLength(1);
      expect(resTue.data[0].id).toBe('backup-task-tue-1');
      expect(resTue.data[0].title).toBe('Tuesday Sprint Planning');
    });

    it('should extract tasks from objects wrapped in customItems or tasks keys', () => {
      const wrappedPayload = JSON.stringify({
        tasks: [
          {
            title: 'Wrapped Task Item',
            durationMinutes: 40,
            startTime: '13:00',
            endTime: '13:40',
          },
        ],
      });

      const result = extractScheduleJsonFromText(wrappedPayload);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Wrapped Task Item');
      expect(result.data[0].durationMinutes).toBe(40);
    });
  });
});
