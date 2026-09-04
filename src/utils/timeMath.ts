import { ScheduleItem, DayBudget, TimeOverlap, FreeSlot } from '../types/schedule';

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

interface TimeInterval {
  start: number;
  end: number;
}

/**
 * Converts a scheduled item into one or two [start, end] intervals (handling midnight rollover).
 */
function getItemIntervals(item: ScheduleItem): TimeInterval[] {
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
 * Identifies collisions where two items overlap in time.
 * Evaluates (startA < endB && endA > startB) across minute intervals.
 */
export function detectOverlaps(items: ScheduleItem[]): TimeOverlap[] {
  const overlaps: TimeOverlap[] = [];
  const fixedItems = items.filter((item) => item.startTime && item.endTime);

  for (let i = 0; i < fixedItems.length; i++) {
    const itemA = fixedItems[i];
    const intervalsA = getItemIntervals(itemA);

    for (let j = i + 1; j < fixedItems.length; j++) {
      const itemB = fixedItems[j];
      const intervalsB = getItemIntervals(itemB);

      let totalOverlapMinutes = 0;

      for (const intA of intervalsA) {
        for (const intB of intervalsB) {
          const overlapStart = Math.max(intA.start, intB.start);
          const overlapEnd = Math.min(intA.end, intB.end);
          if (overlapStart < overlapEnd) {
            totalOverlapMinutes += overlapEnd - overlapStart;
          }
        }
      }

      if (totalOverlapMinutes > 0) {
        overlaps.push({
          itemA,
          itemB,
          overlapMinutes: totalOverlapMinutes,
        });
      }
    }
  }

  return overlaps;
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
