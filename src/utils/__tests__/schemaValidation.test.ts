import { describe, it, expect } from 'vitest';
import { validateBackupJson } from '../schemaValidation';

describe('schemaValidation', () => {
  it('validates a valid backup payload with daySchedules', () => {
    const validData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      daySchedules: {
        mon: {
          day: 'mon',
          customItems: [
            {
              id: 'task-1',
              title: 'Morning Plan',
              type: 'task',
              durationMinutes: 30,
              startTime: '09:00',
              endTime: '09:30',
              priority: 'high',
              category: 'Work',
            },
          ],
          overrides: {},
          excludedMasterIds: [],
        },
      },
      categories: ['Work', 'Health'],
      masterRoutines: [],
    };

    const result = validateBackupJson(validData);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('validates a valid legacy format backup with days map', () => {
    const legacyData = {
      version: 1,
      days: {
        mon: [
          {
            id: 'task-1',
            title: 'Legacy Task',
            type: 'task',
            durationMinutes: 45,
          },
        ],
      },
    };

    const result = validateBackupJson(legacyData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid backup without daySchedules or days', () => {
    const invalidData = {
      version: 1,
      categories: ['Work'],
    };

    const result = validateBackupJson(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Backup must contain either "daySchedules" or "days"');
  });

  it('rejects non-object payload', () => {
    const result = validateBackupJson('not a json object');
    expect(result.success).toBe(false);
  });
});
