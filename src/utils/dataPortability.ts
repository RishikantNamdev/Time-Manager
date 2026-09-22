import { DayOfWeek, DaySchedule, MasterRoutineItem } from '../types/schedule';
import { validateBackupJson } from './schemaValidation';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  daySchedules: Record<DayOfWeek, DaySchedule>;
  masterRoutines: MasterRoutineItem[];
}

const REQUIRED_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Triggers a direct browser file download containing the complete schedule state.
 */
export function exportScheduleData(
  daySchedules: Record<DayOfWeek, DaySchedule>,
  masterRoutines: MasterRoutineItem[]
): void {
  const payload: BackupPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    daySchedules,
    masterRoutines,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `timetable-backup-${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

/**
 * Validates and parses raw JSON string into a verified BackupPayload.
 */
export function validateAndParseBackup(
  jsonString: string
): { success: true; data: BackupPayload } | { success: false; error: string } {
  try {
    const rawParsed = JSON.parse(jsonString);

    // Validate using Zod schema
    const validation = validateBackupJson(rawParsed);
    if (!validation.success) {
      return { success: false, error: validation.error || 'Backup schema validation failed.' };
    }

    const parsed = validation.data;

    // Normalize day schedules (supports daySchedules or days)
    const schedulesMap = parsed.daySchedules || parsed.days;
    if (!schedulesMap || typeof schedulesMap !== 'object') {
      return { success: false, error: 'Backup is missing the "daySchedules" data object.' };
    }

    for (const day of REQUIRED_DAYS) {
      const schedule = schedulesMap[day];
      if (!schedule || typeof schedule !== 'object') {
        return { success: false, error: `Missing schedule data for required day: "${day}".` };
      }
      const items = Array.isArray(schedule.customItems) ? schedule.customItems : Array.isArray(schedule) ? schedule : null;
      if (!items) {
        return { success: false, error: `Invalid items array for day: "${day}".` };
      }
    }

    // Normalize master routines
    const routinesList = parsed.masterRoutines || parsed.routines || [];
    if (!Array.isArray(routinesList)) {
      return { success: false, error: 'Backup "masterRoutines" must be an array.' };
    }

    for (const routine of routinesList) {
      if (!routine.id || !routine.title || !routine.type) {
        return {
          success: false,
          error: `A master routine item is missing required fields (id, title, or type).`,
        };
      }
    }

    return {
      success: true,
      data: {
        version: String(parsed.version || '1.0.0'),
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        daySchedules: schedulesMap,
        masterRoutines: routinesList,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON file syntax.';
    return { success: false, error: `Could not parse JSON: ${msg}` };
  }
}

