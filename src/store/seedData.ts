import { MasterRoutineItem, DaySchedule, DayOfWeek } from '../types/schedule';

export const INITIAL_MASTER_ROUTINES: MasterRoutineItem[] = [];

export const createEmptyDaySchedule = (day: DayOfWeek): DaySchedule => ({
  day,
  excludedMasterIds: [],
  overrides: {},
  customItems: [],
});

export const INITIAL_DAY_SCHEDULES: Record<DayOfWeek, DaySchedule> = {
  mon: createEmptyDaySchedule('mon'),
  tue: createEmptyDaySchedule('tue'),
  wed: createEmptyDaySchedule('wed'),
  thu: createEmptyDaySchedule('thu'),
  fri: createEmptyDaySchedule('fri'),
  sat: createEmptyDaySchedule('sat'),
  sun: createEmptyDaySchedule('sun'),
};
