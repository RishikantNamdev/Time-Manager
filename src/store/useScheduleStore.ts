import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import {
  DayOfWeek,
  DaySchedule,
  MasterRoutineItem,
  ScheduleItem,
  TaskItem,
} from '../types/schedule';
import { INITIAL_DAY_SCHEDULES, INITIAL_MASTER_ROUTINES } from './seedData';
import { parseTimeToMinutes } from '../utils/timeMath';

const STORAGE_KEY_SCHEDULES = 'timetable_manager_day_schedules';
const STORAGE_KEY_ROUTINES = 'timetable_manager_master_routines';
const STORAGE_KEY_ACTIVE_DAY = 'timetable_manager_active_day';
const STORAGE_KEY_ACTIVE_VIEW = 'timetable_manager_active_view';

export type AppView = 'daily' | 'week' | 'analytics' | 'routines';
export type StatusFilter = 'all' | 'active' | 'completed';
export type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

interface ScheduleState {
  activeView: AppView;
  selectedDay: DayOfWeek;
  daySchedules: Record<DayOfWeek, DaySchedule>;
  masterRoutines: MasterRoutineItem[];
  isInitialized: boolean;

  // Task Modal State
  isModalOpen: boolean;
  editingItem: ScheduleItem | null;
  modalPrefill: Partial<ScheduleItem> | null;

  // Master Routine Modal State
  isRoutineModalOpen: boolean;
  editingRoutine: MasterRoutineItem | null;

  // Filter & Search State
  searchQuery: string;
  statusFilter: StatusFilter;
  priorityFilter: PriorityFilter;

  // View Navigation Action
  setActiveView: (view: AppView) => void;

  // Schedule Actions
  selectDay: (day: DayOfWeek) => void;
  toggleTaskCompletion: (id: string, day?: DayOfWeek) => void;
  addScheduleItem: (item: ScheduleItem, day?: DayOfWeek) => void;
  updateScheduleItem: (item: ScheduleItem, day?: DayOfWeek) => void;
  deleteScheduleItem: (id: string, day?: DayOfWeek) => void;
  resetToDefaults: () => Promise<void>;
  initializeStore: () => Promise<void>;

  // Task Modal Actions
  openCreateModal: (prefill?: Partial<ScheduleItem>) => void;
  openEditModal: (item: ScheduleItem) => void;
  closeModal: () => void;

  // Master Routine Modal Actions
  openCreateRoutineModal: () => void;
  openEditRoutineModal: (routine: MasterRoutineItem) => void;
  closeRoutineModal: () => void;
  addMasterRoutine: (routine: MasterRoutineItem) => void;
  updateMasterRoutine: (routine: MasterRoutineItem) => void;
  deleteMasterRoutine: (id: string) => void;

  // Filter Actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setPriorityFilter: (priority: PriorityFilter) => void;

  // Resolved Selectors
  getResolvedItemsForDay: (day: DayOfWeek) => ScheduleItem[];
}

function getTodayDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ...
  const map: Record<number, DayOfWeek> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  return map[dayIndex] || 'mon';
}

function isRoutineApplicableToDay(routine: MasterRoutineItem, day: DayOfWeek): boolean {
  if (routine.recurrence === 'daily') return true;
  if (routine.recurrence === 'weekdays') return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(day);
  if (routine.recurrence === 'weekends') return ['sat', 'sun'].includes(day);
  if (routine.recurrence === 'custom') return routine.customDays?.includes(day) ?? false;
  return false;
}

// Fallback persistence helper
async function saveToStorage(
  schedules: Record<DayOfWeek, DaySchedule>,
  routines: MasterRoutineItem[],
  activeDay: DayOfWeek,
  activeView: AppView = 'daily'
) {
  try {
    await set(STORAGE_KEY_SCHEDULES, schedules);
    await set(STORAGE_KEY_ROUTINES, routines);
    await set(STORAGE_KEY_ACTIVE_DAY, activeDay);
    await set(STORAGE_KEY_ACTIVE_VIEW, activeView);
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
      localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(routines));
      localStorage.setItem(STORAGE_KEY_ACTIVE_DAY, activeDay);
      localStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, activeView);
    } catch {
      // LocalStorage fallback error ignored
    }
  }
}

export const useScheduleStore = create<ScheduleState>((setStore, getStore) => ({
  activeView: 'daily',
  selectedDay: getTodayDayOfWeek(),
  daySchedules: INITIAL_DAY_SCHEDULES,
  masterRoutines: INITIAL_MASTER_ROUTINES,
  isInitialized: false,

  // Task Modal State
  isModalOpen: false,
  editingItem: null,
  modalPrefill: null,

  // Master Routine Modal State
  isRoutineModalOpen: false,
  editingRoutine: null,

  // Filter & Search State
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',

  initializeStore: async () => {
    try {
      let loadedSchedules = await get<Record<DayOfWeek, DaySchedule>>(STORAGE_KEY_SCHEDULES);
      let loadedRoutines = await get<MasterRoutineItem[]>(STORAGE_KEY_ROUTINES);
      let loadedDay = await get<DayOfWeek>(STORAGE_KEY_ACTIVE_DAY);
      let loadedView = await get<AppView>(STORAGE_KEY_ACTIVE_VIEW);

      // Try LocalStorage if idb returned empty
      if (!loadedSchedules) {
        const lsSchedules = localStorage.getItem(STORAGE_KEY_SCHEDULES);
        if (lsSchedules) loadedSchedules = JSON.parse(lsSchedules);
      }
      if (!loadedRoutines) {
        const lsRoutines = localStorage.getItem(STORAGE_KEY_ROUTINES);
        if (lsRoutines) loadedRoutines = JSON.parse(lsRoutines);
      }
      if (!loadedDay) {
        const lsDay = localStorage.getItem(STORAGE_KEY_ACTIVE_DAY);
        if (lsDay) loadedDay = lsDay as DayOfWeek;
      }
      if (!loadedView) {
        const lsView = localStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
        if (lsView) loadedView = lsView as AppView;
      }

      setStore({
        daySchedules: loadedSchedules || INITIAL_DAY_SCHEDULES,
        masterRoutines: loadedRoutines || INITIAL_MASTER_ROUTINES,
        selectedDay: loadedDay || getTodayDayOfWeek(),
        activeView: loadedView || 'daily',
        isInitialized: true,
      });
    } catch {
      setStore({
        daySchedules: INITIAL_DAY_SCHEDULES,
        masterRoutines: INITIAL_MASTER_ROUTINES,
        selectedDay: getTodayDayOfWeek(),
        activeView: 'daily',
        isInitialized: true,
      });
    }
  },

  setActiveView: (view: AppView) => {
    setStore({ activeView: view });
    const { daySchedules, masterRoutines, selectedDay } = getStore();
    saveToStorage(daySchedules, masterRoutines, selectedDay, view);
  },

  selectDay: (day: DayOfWeek) => {
    setStore({ selectedDay: day });
    const { daySchedules, masterRoutines, activeView } = getStore();
    saveToStorage(daySchedules, masterRoutines, day, activeView);
  },

  toggleTaskCompletion: (id: string, targetDay?: DayOfWeek) => {
    const state = getStore();
    const day = targetDay || state.selectedDay;
    const currentSchedule = state.daySchedules[day];
    if (!currentSchedule) return;

    // Check if it's in customItems
    const customIndex = currentSchedule.customItems.findIndex((item) => item.id === id);
    if (customIndex !== -1) {
      const item = currentSchedule.customItems[customIndex];
      if (item.type === 'task') {
        const updatedItems = [...currentSchedule.customItems];
        updatedItems[customIndex] = {
          ...item,
          isCompleted: !item.isCompleted,
          updatedAt: Date.now(),
        } as TaskItem;

        const updatedSchedules = {
          ...state.daySchedules,
          [day]: {
            ...currentSchedule,
            customItems: updatedItems,
          },
        };

        setStore({ daySchedules: updatedSchedules });
        saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
        return;
      }
    }

    // Check if it's an inherited master routine task
    const masterRoutine = state.masterRoutines.find((r) => r.id === id);
    if (masterRoutine && masterRoutine.type === 'task') {
      const existingOverride = (currentSchedule.overrides[id] || {}) as Partial<TaskItem>;
      const currentCompleted =
        existingOverride.isCompleted !== undefined ? existingOverride.isCompleted : false;

      const updatedOverrides = {
        ...currentSchedule.overrides,
        [id]: {
          ...existingOverride,
          isCompleted: !currentCompleted,
          updatedAt: Date.now(),
        },
      };

      const updatedSchedules = {
        ...state.daySchedules,
        [day]: {
          ...currentSchedule,
          overrides: updatedOverrides,
        },
      };

      setStore({ daySchedules: updatedSchedules });
      saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
    }
  },

  addScheduleItem: (item: ScheduleItem, targetDay?: DayOfWeek) => {
    const state = getStore();
    const day = targetDay || state.selectedDay;
    const currentSchedule = state.daySchedules[day];
    if (!currentSchedule) return;

    const updatedSchedules = {
      ...state.daySchedules,
      [day]: {
        ...currentSchedule,
        customItems: [...currentSchedule.customItems, item],
      },
    };

    setStore({ daySchedules: updatedSchedules });
    saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
  },

  updateScheduleItem: (item: ScheduleItem, targetDay?: DayOfWeek) => {
    const state = getStore();
    const day = targetDay || state.selectedDay;
    const currentSchedule = state.daySchedules[day];
    if (!currentSchedule) return;

    const customIndex = currentSchedule.customItems.findIndex((i) => i.id === item.id);
    if (customIndex !== -1) {
      const updatedItems = [...currentSchedule.customItems];
      updatedItems[customIndex] = item;

      const updatedSchedules = {
        ...state.daySchedules,
        [day]: {
          ...currentSchedule,
          customItems: updatedItems,
        },
      };

      setStore({ daySchedules: updatedSchedules });
      saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
      return;
    }

    // Master routine override
    const masterRoutine = state.masterRoutines.find((r) => r.id === item.id);
    if (masterRoutine) {
      const updatedOverrides = {
        ...currentSchedule.overrides,
        [item.id]: item,
      };

      const updatedSchedules = {
        ...state.daySchedules,
        [day]: {
          ...currentSchedule,
          overrides: updatedOverrides,
        },
      };

      setStore({ daySchedules: updatedSchedules });
      saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
    }
  },

  deleteScheduleItem: (id: string, targetDay?: DayOfWeek) => {
    const state = getStore();
    const day = targetDay || state.selectedDay;
    const currentSchedule = state.daySchedules[day];
    if (!currentSchedule) return;

    const isCustom = currentSchedule.customItems.some((item) => item.id === id);
    if (isCustom) {
      const updatedSchedules = {
        ...state.daySchedules,
        [day]: {
          ...currentSchedule,
          customItems: currentSchedule.customItems.filter((item) => item.id !== id),
        },
      };
      setStore({ daySchedules: updatedSchedules });
      saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
      return;
    }

    // Inherited master routine deletion for today only
    const isMaster = state.masterRoutines.some((r) => r.id === id);
    if (isMaster) {
      const updatedExclusions = Array.from(new Set([...currentSchedule.excludedMasterIds, id]));
      const updatedSchedules = {
        ...state.daySchedules,
        [day]: {
          ...currentSchedule,
          excludedMasterIds: updatedExclusions,
        },
      };
      setStore({ daySchedules: updatedSchedules });
      saveToStorage(updatedSchedules, state.masterRoutines, state.selectedDay, state.activeView);
    }
  },

  resetToDefaults: async () => {
    const today = getTodayDayOfWeek();
    setStore({
      daySchedules: INITIAL_DAY_SCHEDULES,
      masterRoutines: INITIAL_MASTER_ROUTINES,
      selectedDay: today,
      activeView: 'daily',
    });
    await saveToStorage(INITIAL_DAY_SCHEDULES, INITIAL_MASTER_ROUTINES, today, 'daily');
  },

  // Task Modal Actions
  openCreateModal: (prefill?: Partial<ScheduleItem>) => {
    setStore({
      isModalOpen: true,
      editingItem: null,
      modalPrefill: prefill || null,
    });
  },

  openEditModal: (item: ScheduleItem) => {
    setStore({
      isModalOpen: true,
      editingItem: item,
      modalPrefill: null,
    });
  },

  closeModal: () => {
    setStore({
      isModalOpen: false,
      editingItem: null,
      modalPrefill: null,
    });
  },

  // Master Routine Actions
  openCreateRoutineModal: () => {
    setStore({
      isRoutineModalOpen: true,
      editingRoutine: null,
    });
  },

  openEditRoutineModal: (routine: MasterRoutineItem) => {
    setStore({
      isRoutineModalOpen: true,
      editingRoutine: routine,
    });
  },

  closeRoutineModal: () => {
    setStore({
      isRoutineModalOpen: false,
      editingRoutine: null,
    });
  },

  addMasterRoutine: (routine: MasterRoutineItem) => {
    const state = getStore();
    const updatedRoutines = [...state.masterRoutines, routine];
    setStore({ masterRoutines: updatedRoutines });
    saveToStorage(state.daySchedules, updatedRoutines, state.selectedDay, state.activeView);
  },

  updateMasterRoutine: (routine: MasterRoutineItem) => {
    const state = getStore();
    const updatedRoutines = state.masterRoutines.map((r) => (r.id === routine.id ? routine : r));
    setStore({ masterRoutines: updatedRoutines });
    saveToStorage(state.daySchedules, updatedRoutines, state.selectedDay, state.activeView);
  },

  deleteMasterRoutine: (id: string) => {
    const state = getStore();
    const updatedRoutines = state.masterRoutines.filter((r) => r.id !== id);
    setStore({ masterRoutines: updatedRoutines });
    saveToStorage(state.daySchedules, updatedRoutines, state.selectedDay, state.activeView);
  },

  // Filter Actions
  setSearchQuery: (query: string) => {
    setStore({ searchQuery: query });
  },

  setStatusFilter: (status: StatusFilter) => {
    setStore({ statusFilter: status });
  },

  setPriorityFilter: (priority: PriorityFilter) => {
    setStore({ priorityFilter: priority });
  },

  getResolvedItemsForDay: (day: DayOfWeek): ScheduleItem[] => {
    const { daySchedules, masterRoutines } = getStore();
    const daySchedule = daySchedules[day];
    if (!daySchedule) return [];

    const inheritedItems: ScheduleItem[] = [];

    for (const routine of masterRoutines) {
      // Check recurrence applicability
      if (!isRoutineApplicableToDay(routine, day)) {
        continue;
      }
      // Check if excluded for this day
      if (daySchedule.excludedMasterIds.includes(routine.id)) {
        continue;
      }

      // Check for day override
      const override = daySchedule.overrides[routine.id];
      if (override) {
        inheritedItems.push({
          ...routine,
          ...override,
        } as ScheduleItem);
      } else {
        inheritedItems.push({ ...routine } as ScheduleItem);
      }
    }

    const combined = [...inheritedItems, ...daySchedule.customItems];

    // Sort chronologically by startTime, placing floating items at the end
    combined.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    return combined;
  },
}));
