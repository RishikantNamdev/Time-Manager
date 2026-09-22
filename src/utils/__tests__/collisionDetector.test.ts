import { describe, it, expect } from 'vitest';
import {
  detectScheduleCollisions,
  checkCandidateCollision,
  getTotalCollisionMinutes,
  getCollisionDetailsMap,
  calculateIntervalOverlap,
} from '../collisionDetector';
import { TaskItem, BreakItem, ScheduleItem } from '../../types/schedule';

describe('collisionDetector', () => {
  const createTask = (
    id: string,
    title: string,
    startTime: string,
    endTime: string,
    durationMinutes: number
  ): TaskItem => ({
    id,
    title,
    type: 'task',
    startTime,
    endTime,
    durationMinutes,
    priority: 'medium',
    isCompleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createBreak = (
    id: string,
    title: string,
    startTime: string,
    endTime: string,
    durationMinutes: number
  ): BreakItem => ({
    id,
    title,
    type: 'break',
    startTime,
    endTime,
    durationMinutes,
  });

  describe('Non-overlapping fixed tasks', () => {
    it('detects no collisions when items are sequentially adjacent or apart', () => {
      const items: ScheduleItem[] = [
        createTask('1', 'Morning Standup', '09:00', '09:30', 30),
        createTask('2', 'Deep Work', '09:30', '11:30', 120),
        createBreak('3', 'Coffee Break', '11:45', '12:00', 15),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(0);
      expect(getTotalCollisionMinutes(items)).toBe(0);

      const collisionMap = getCollisionDetailsMap(items);
      expect(collisionMap.get('1')?.hasCollision).toBe(false);
      expect(collisionMap.get('2')?.hasCollision).toBe(false);
      expect(collisionMap.get('3')?.hasCollision).toBe(false);
    });

    it('ignores floating tasks without start/end times', () => {
      const items: ScheduleItem[] = [
        createTask('1', 'Fixed Task', '10:00', '11:00', 60),
        {
          ...createTask('2', 'Floating Task', '', '', 60),
          startTime: undefined,
          endTime: undefined,
          isFloating: true,
        },
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(0);
    });
  });

  describe('Overlapping intervals and conflict duration', () => {
    it('detects partial overlap and accurately computes collision minutes', () => {
      const items: ScheduleItem[] = [
        createTask('1', 'Design Review', '10:00', '11:30', 90),
        createTask('2', 'Sprint Planning', '11:00', '12:00', 60),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].overlapMinutes).toBe(30); // 11:00 to 11:30 = 30 minutes
      expect(getTotalCollisionMinutes(items)).toBe(30);

      const detailsMap = getCollisionDetailsMap(items);
      const item1Info = detailsMap.get('1');
      expect(item1Info?.hasCollision).toBe(true);
      expect(item1Info?.totalOverlapMinutes).toBe(30);
      expect(item1Info?.conflictingTitles).toContain('Sprint Planning');

      const item2Info = detailsMap.get('2');
      expect(item2Info?.hasCollision).toBe(true);
      expect(item2Info?.totalOverlapMinutes).toBe(30);
      expect(item2Info?.conflictingTitles).toContain('Design Review');
    });

    it('detects complete enclosure overlap (one task inside another)', () => {
      const items: ScheduleItem[] = [
        createTask('1', 'Long Session', '13:00', '16:00', 180),
        createTask('2', 'Short Meeting', '14:00', '14:45', 45),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].overlapMinutes).toBe(45);
      expect(getTotalCollisionMinutes(items)).toBe(45);
    });

    it('detects multiple colliding pairs', () => {
      const items: ScheduleItem[] = [
        createTask('1', 'Task A', '09:00', '10:30', 90),
        createTask('2', 'Task B', '10:00', '11:00', 60),
        createTask('3', 'Task C', '10:15', '11:15', 60),
      ];

      const collisions = detectScheduleCollisions(items);
      // Collisions: A & B (30 min: 10:00-10:30), A & C (15 min: 10:15-10:30), B & C (45 min: 10:15-11:00)
      expect(collisions).toHaveLength(3);
      expect(getTotalCollisionMinutes(items)).toBe(30 + 15 + 45);
    });
  });

  describe('Overnight task collision boundaries', () => {
    it('detects collision across midnight boundaries', () => {
      // Task 1: 23:00 to 02:00 overnight (180 mins)
      // Task 2: 01:00 to 03:00 morning (120 mins)
      // Overlap: 01:00 to 02:00 = 60 mins
      const items: ScheduleItem[] = [
        createTask('night-owl', 'Night Shift', '23:00', '02:00', 180),
        createTask('early-bird', 'Early Workout', '01:00', '03:00', 120),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].overlapMinutes).toBe(60);
    });

    it('detects collision on the pre-midnight portion of an overnight task', () => {
      // Task 1: 22:00 to 01:00 overnight
      // Task 2: 23:00 to 23:45
      // Overlap: 23:00 to 23:45 = 45 mins
      const items: ScheduleItem[] = [
        createTask('shift', 'Evening Work', '22:00', '01:00', 180),
        createTask('brief', 'Night Sync', '23:00', '23:45', 45),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].overlapMinutes).toBe(45);
    });

    it('does not detect collision if morning interval is after overnight end', () => {
      // Task 1: 22:00 to 01:00
      // Task 2: 01:30 to 03:00
      const items: ScheduleItem[] = [
        createTask('shift', 'Evening Work', '22:00', '01:00', 180),
        createTask('later', 'Late Review', '01:30', '03:00', 90),
      ];

      const collisions = detectScheduleCollisions(items);
      expect(collisions).toHaveLength(0);
    });
  });

  describe('checkCandidateCollision', () => {
    const existing: ScheduleItem[] = [
      createTask('existing-1', 'Existing Meeting', '14:00', '15:00', 60),
    ];

    it('identifies collision for overlapping candidate', () => {
      const result = checkCandidateCollision('14:30', '15:30', existing);
      expect(result.hasCollision).toBe(true);
      expect(result.overlapMinutes).toBe(30);
      expect(result.conflictingItem?.id).toBe('existing-1');
    });

    it('returns no collision for non-overlapping candidate', () => {
      const result = checkCandidateCollision('15:00', '16:00', existing);
      expect(result.hasCollision).toBe(false);
      expect(result.overlapMinutes).toBe(0);
    });

    it('respects excludeItemId during edit mode', () => {
      const result = checkCandidateCollision('14:00', '15:00', existing, 'existing-1');
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('calculateIntervalOverlap helper', () => {
    it('returns 0 for disjoint intervals', () => {
      expect(calculateIntervalOverlap({ start: 60, end: 120 }, { start: 120, end: 180 })).toBe(0);
      expect(calculateIntervalOverlap({ start: 60, end: 120 }, { start: 200, end: 250 })).toBe(0);
    });

    it('returns positive overlap for overlapping intervals', () => {
      expect(calculateIntervalOverlap({ start: 60, end: 120 }, { start: 90, end: 150 })).toBe(30);
    });
  });
});
