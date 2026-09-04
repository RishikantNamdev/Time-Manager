import { DayOfWeek, DaySchedule, MasterRoutineItem } from '../types/schedule';

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
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Uploaded file does not contain a valid JSON object.' };
    }

    // Validate daySchedules object
    if (!parsed.daySchedules || typeof parsed.daySchedules !== 'object') {
      return { success: false, error: 'Backup is missing the "daySchedules" data object.' };
    }

    for (const day of REQUIRED_DAYS) {
      const schedule = parsed.daySchedules[day];
      if (!schedule || typeof schedule !== 'object') {
        return { success: false, error: `Missing schedule data for required day: "${day}".` };
      }
      if (!Array.isArray(schedule.customItems)) {
        return { success: false, error: `Invalid "customItems" array for day: "${day}".` };
      }
    }

    // Validate masterRoutines array
    if (!parsed.masterRoutines || !Array.isArray(parsed.masterRoutines)) {
      return { success: false, error: 'Backup is missing the "masterRoutines" list array.' };
    }

    for (const routine of parsed.masterRoutines) {
      if (!routine.id || !routine.title || !routine.type || !routine.recurrence) {
        return {
          success: false,
          error: `A master routine item is missing required fields (id, title, type, or recurrence).`,
        };
      }
    }

    return {
      success: true,
      data: {
        version: parsed.version || '1.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        daySchedules: parsed.daySchedules,
        masterRoutines: parsed.masterRoutines,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON file syntax.';
    return { success: false, error: `Could not parse JSON: ${msg}` };
  }
}
