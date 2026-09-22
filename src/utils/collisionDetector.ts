import { ScheduleItem } from '../types/schedule';
import { parseTimeToMinutes, TOTAL_DAY_MINUTES } from './timeMath';

export interface TimeInterval {
  start: number;
  end: number;
}

export interface ScheduleCollision {
  itemA: ScheduleItem;
  itemB: ScheduleItem;
  overlapMinutes: number;
}

export interface ItemCollisionInfo {
  hasCollision: boolean;
  totalOverlapMinutes: number;
  conflictingItemIds: string[];
  conflictingTitles: string[];
  firstConflictTitle?: string;
  firstConflictTime?: string;
  conflicts: Array<{
    item: ScheduleItem;
    overlapMinutes: number;
  }>;
}

export interface CandidateCollisionResult {
  hasCollision: boolean;
  conflictingItem?: ScheduleItem;
  overlapMinutes: number;
}

/**
 * Converts a scheduled item into one or two [start, end] intervals in minutes [0, 1440].
 * Accounts for overnight rollover spanning past midnight.
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
    // Overnight rollover spanning past midnight
    return [
      { start, end: TOTAL_DAY_MINUTES },
      { start: 0, end },
    ];
  }
}

/**
 * Calculates the overlap in minutes between two time intervals [startA, endA] and [startB, endB].
 * A collision occurs if: max(startA, startB) < min(endA, endB)
 */
export function calculateIntervalOverlap(
  intA: TimeInterval,
  intB: TimeInterval
): number {
  const overlapStart = Math.max(intA.start, intB.start);
  const overlapEnd = Math.min(intA.end, intB.end);
  if (overlapStart < overlapEnd) {
    return overlapEnd - overlapStart;
  }
  return 0;
}

/**
 * Detects all collision pairs among fixed-time items for the day.
 * Returns conflicting items and overlap duration in minutes.
 */
export function detectScheduleCollisions(items: ScheduleItem[]): ScheduleCollision[] {
  const collisions: ScheduleCollision[] = [];
  const fixedItems = items.filter((item) => Boolean(item.startTime && item.endTime));

  for (let i = 0; i < fixedItems.length; i++) {
    const itemA = fixedItems[i];
    const intervalsA = getItemIntervals(itemA);

    for (let j = i + 1; j < fixedItems.length; j++) {
      const itemB = fixedItems[j];
      const intervalsB = getItemIntervals(itemB);

      let totalOverlapMinutes = 0;

      for (const intA of intervalsA) {
        for (const intB of intervalsB) {
          totalOverlapMinutes += calculateIntervalOverlap(intA, intB);
        }
      }

      if (totalOverlapMinutes > 0) {
        collisions.push({
          itemA,
          itemB,
          overlapMinutes: totalOverlapMinutes,
        });
      }
    }
  }

  return collisions;
}

/**
 * Computes an O(1) lookup map of collisions keyed by item ID.
 */
export function getCollisionDetailsMap(
  items: ScheduleItem[]
): Map<string, ItemCollisionInfo> {
  const collisions = detectScheduleCollisions(items);
  const map = new Map<string, ItemCollisionInfo>();

  // Initialize for all items
  for (const item of items) {
    map.set(item.id, {
      hasCollision: false,
      totalOverlapMinutes: 0,
      conflictingItemIds: [],
      conflictingTitles: [],
      conflicts: [],
    });
  }

  for (const col of collisions) {
    const infoA = map.get(col.itemA.id);
    if (infoA) {
      infoA.hasCollision = true;
      infoA.totalOverlapMinutes += col.overlapMinutes;
      infoA.conflictingItemIds.push(col.itemB.id);
      infoA.conflictingTitles.push(col.itemB.title);
      if (!infoA.firstConflictTitle) {
        infoA.firstConflictTitle = col.itemB.title;
        infoA.firstConflictTime = `${col.itemB.startTime} - ${col.itemB.endTime}`;
      }
      infoA.conflicts.push({
        item: col.itemB,
        overlapMinutes: col.overlapMinutes,
      });
    }

    const infoB = map.get(col.itemB.id);
    if (infoB) {
      infoB.hasCollision = true;
      infoB.totalOverlapMinutes += col.overlapMinutes;
      infoB.conflictingItemIds.push(col.itemA.id);
      infoB.conflictingTitles.push(col.itemA.title);
      if (!infoB.firstConflictTitle) {
        infoB.firstConflictTitle = col.itemA.title;
        infoB.firstConflictTime = `${col.itemA.startTime} - ${col.itemA.endTime}`;
      }
      infoB.conflicts.push({
        item: col.itemA,
        overlapMinutes: col.overlapMinutes,
      });
    }
  }

  return map;
}

/**
 * Calculates the total double-booked collision minutes on a day.
 */
export function getTotalCollisionMinutes(items: ScheduleItem[]): number {
  const collisions = detectScheduleCollisions(items);
  return collisions.reduce((sum, c) => sum + c.overlapMinutes, 0);
}

/**
 * Checks if a candidate time window (e.g., in TaskModal) collides with any existing fixed item on that day.
 * Ignores item with excludeItemId (when editing an existing item).
 */
export function checkCandidateCollision(
  startTime: string,
  endTime: string,
  existingItems: ScheduleItem[],
  excludeItemId?: string
): CandidateCollisionResult {
  if (!startTime || !endTime) {
    return { hasCollision: false, overlapMinutes: 0 };
  }

  const candidateIntervals = getItemIntervals({ startTime, endTime });
  if (candidateIntervals.length === 0) {
    return { hasCollision: false, overlapMinutes: 0 };
  }

  const fixedItems = existingItems.filter(
    (item) => item.id !== excludeItemId && Boolean(item.startTime && item.endTime)
  );

  for (const item of fixedItems) {
    const itemIntervals = getItemIntervals(item);
    let overlap = 0;

    for (const cInt of candidateIntervals) {
      for (const iInt of itemIntervals) {
        overlap += calculateIntervalOverlap(cInt, iInt);
      }
    }

    if (overlap > 0) {
      return {
        hasCollision: true,
        conflictingItem: item,
        overlapMinutes: overlap,
      };
    }
  }

  return { hasCollision: false, overlapMinutes: 0 };
}
