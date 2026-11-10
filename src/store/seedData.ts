import { MasterRoutineItem, DaySchedule, DayKey } from '../types/schedule';

export const createEmptyDaySchedule = (day: DayKey): DaySchedule => ({
  day,
  excludedMasterIds: [],
  overrides: {},
  customItems: [],
});

export const INITIAL_DAY_SCHEDULES: Record<DayKey, DaySchedule> = {
  mon: { day: 'mon', excludedMasterIds: [], overrides: {}, customItems: [] },
  tue: { day: 'tue', excludedMasterIds: [], overrides: {}, customItems: [] },
  wed: { day: 'wed', excludedMasterIds: [], overrides: {}, customItems: [] },
  thu: { day: 'thu', excludedMasterIds: [], overrides: {}, customItems: [] },
  fri: { day: 'fri', excludedMasterIds: [], overrides: {}, customItems: [] },
  sat: { day: 'sat', excludedMasterIds: [], overrides: {}, customItems: [] },
  sun: { day: 'sun', excludedMasterIds: [], overrides: {}, customItems: [] },
};

export const INITIAL_MASTER_ROUTINES: MasterRoutineItem[] = [];
