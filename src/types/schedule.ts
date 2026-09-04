export type PriorityLevel = 'high' | 'medium' | 'low';
export type EntryType = 'task' | 'break';
export type RecurrenceType = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TaskCategory = 'Work' | 'Personal' | 'Health' | 'Learning' | 'Rest' | string;

export interface BaseScheduleItem {
  id: string;
  title: string;
  type: EntryType;
  startTime?: string; // 'HH:mm' (24-hour format; optional for floating tasks)
  endTime?: string;   // 'HH:mm' (24-hour format; optional for floating tasks)
  durationMinutes: number;
  description?: string;
  category?: TaskCategory;
}

export interface TaskItem extends BaseScheduleItem {
  type: 'task';
  priority: PriorityLevel;
  isCompleted: boolean;
  isFloating?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BreakItem extends BaseScheduleItem {
  type: 'break';
}

export type ScheduleItem = TaskItem | BreakItem;

export interface MasterRoutineItem extends BaseScheduleItem {
  recurrence: RecurrenceType;
  customDays?: DayOfWeek[];
  priority?: PriorityLevel;
}

export interface DaySchedule {
  day: DayOfWeek;
  customItems: ScheduleItem[];
  overrides: Record<string, Partial<ScheduleItem>>; // masterId -> modified fields
  excludedMasterIds: string[];                    // masterIds deleted for this day
}

export interface DayBudget {
  totalAllocatedMinutes: number;
  availableMinutes: number;
  isOverBudget: boolean;
  taskMinutes: number;
  breakMinutes: number;
  activeTasksCount: number;
  completedTasksCount: number;
}

export interface TimeOverlap {
  itemA: ScheduleItem;
  itemB: ScheduleItem;
  overlapMinutes: number;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}
