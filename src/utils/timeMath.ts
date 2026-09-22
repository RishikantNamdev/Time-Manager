import { ScheduleItem, DayBudget, FreeSlot } from '../types/schedule';

export const TOTAL_DAY_MINUTES = 1440;

/**
 * Parses 'HH:mm' string into total minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  return Math.min(Math.max(hours * 60 + minutes, 0), TOTAL_DAY_MINUTES);
}

/**
 * Formats total minutes from midnight into 24-hour 'HH:mm' format.
 */
export function formatMinutesToTime(minutes: number): string {
  const normalized = ((minutes % TOTAL_DAY_MINUTES) + TOTAL_DAY_MINUTES) % TOTAL_DAY_MINUTES;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Adds minutes to an 'HH:mm' time string and returns a normalized 24-hour 'HH:mm' string.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const currentMin = parseTimeToMinutes(timeStr);
  const newMin = ((currentMin + minutesToAdd) % TOTAL_DAY_MINUTES + TOTAL_DAY_MINUTES) % TOTAL_DAY_MINUTES;
  return formatMinutesToTime(newMin);
}

/**
 * Formats duration in minutes to human-readable string (e.g., '1h 30m' or '45m').
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculates duration between start and end times in 'HH:mm' format.
 * Supports overnight rollover (e.g., '23:00' to '07:00' = 480 minutes).
 */
export function calculateDuration(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);

  if (endMin >= startMin) {
    return endMin - startMin;
  }
  // Overnight rollover across midnight (24 hours)
  return TOTAL_DAY_MINUTES - startMin + endMin;
}

export const calculateDurationMinutes = calculateDuration;

/**
 * Computes 24-hour day budget metrics against the strict 1,440-minute pool.
 */
export function calculateDayBudget(items: ScheduleItem[]): DayBudget {
  let taskMinutes = 0;
  let breakMinutes = 0;
  let activeTasksCount = 0;
  let completedTasksCount = 0;

  for (const item of items) {
    const duration = item.durationMinutes || 0;
    if (item.type === 'task') {
      taskMinutes += duration;
      if (item.isCompleted) {
        completedTasksCount++;
      } else {
        activeTasksCount++;
      }
    } else {
      breakMinutes += duration;
    }
  }

  const totalAllocatedMinutes = taskMinutes + breakMinutes;
  const availableMinutes = TOTAL_DAY_MINUTES - totalAllocatedMinutes;
  const isOverBudget = totalAllocatedMinutes > TOTAL_DAY_MINUTES;

  return {
    totalAllocatedMinutes,
    availableMinutes,
    isOverBudget,
    taskMinutes,
    breakMinutes,
    activeTasksCount,
    completedTasksCount,
  };
}

export interface TimeInterval {
  start: number;
  end: number;
}

/**
 * Converts a scheduled item into one or two [start, end] intervals (handling midnight rollover).
 */
export function getItemIntervals(item: Pick<ScheduleItem, 'startTime' | 'endTime'>): TimeInterval[] {
  if (!item.startTime || !item.endTime) return [];
  const start = parseTimeToMinutes(item.startTime);
  const end = parseTimeToMinutes(item.endTime);

  if (start === end) {
    return [];
  }

  if (start < end) {
    return [{ start, end }];
  } else {
    // Spans across midnight
    return [
      { start, end: TOTAL_DAY_MINUTES },
      { start: 0, end },
    ];
  }
}

/**
 * Finds unscheduled chronological gaps between fixed blocks within the 1,440-minute day.
 */
export function findFreeSlots(items: ScheduleItem[]): FreeSlot[] {
  const fixedItems = items.filter((item) => item.startTime && item.endTime);
  const allIntervals: TimeInterval[] = [];

  for (const item of fixedItems) {
    allIntervals.push(...getItemIntervals(item));
  }

  if (allIntervals.length === 0) {
    return [
      {
        startTime: '00:00',
        endTime: '24:00',
        durationMinutes: TOTAL_DAY_MINUTES,
      },
    ];
  }

  // Sort intervals by start time
  allIntervals.sort((a, b) => a.start - b.start);

  // Merge overlapping or adjacent occupied intervals
  const merged: TimeInterval[] = [];
  let current = { ...allIntervals[0] };

  for (let i = 1; i < allIntervals.length; i++) {
    const next = allIntervals[i];
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  const freeSlots: FreeSlot[] = [];
  let cursor = 0;

  for (const interval of merged) {
    if (interval.start > cursor) {
      const duration = interval.start - cursor;
      if (duration > 0) {
        freeSlots.push({
          startTime: formatMinutesToTime(cursor),
          endTime: formatMinutesToTime(interval.start),
          durationMinutes: duration,
        });
      }
    }
    cursor = Math.max(cursor, interval.end);
  }

  // Final gap until midnight
  if (cursor < TOTAL_DAY_MINUTES) {
    const duration = TOTAL_DAY_MINUTES - cursor;
    if (duration > 0) {
      freeSlots.push({
        startTime: formatMinutesToTime(cursor),
        endTime: '24:00',
        durationMinutes: duration,
      });
    }
  }

  return freeSlots;
}

/**
 * Converts a 24-hour 'HH:mm' string to 12-hour components (hour 1-12, minute 0-59, period AM/PM).
 */
export function parse24To12(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  if (!time24 || !time24.includes(':')) {
    return { hour: 12, minute: 0, period: 'AM' };
  }
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) hours = 0;
  let minutes = parseInt(minutesStr, 10);
  if (isNaN(minutes)) minutes = 0;

  if (hours === 24) {
    return { hour: 12, minute: 0, period: 'AM' };
  }

  hours = Math.min(Math.max(hours, 0), 23);
  minutes = Math.min(Math.max(minutes, 0), 59);

  const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
  let hour = hours % 12;
  if (hour === 0) hour = 12;

  return { hour, minute: minutes, period };
}

/**
 * Converts 12-hour components (hour 1-12, minute 0-59, period AM/PM) into standard 24-hour 'HH:mm' string.
 */
export function format12To24(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = (hour || 0) % 12;
  if (period === 'PM') {
    h += 12;
  }
  const m = Math.min(Math.max(minute || 0, 0), 59);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats a 24-hour 'HH:mm' string to human-readable 12-hour format (e.g., '2:30 PM' or '9:00 AM').
 */
export function format24To12Display(time24?: string): string {
  if (!time24) return '';
  const { hour, minute, period } = parse24To12(time24);
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
}

