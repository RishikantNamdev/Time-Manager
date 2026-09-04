# Project Specification: Timetable Manager (24-Hour Time Budgeting Engine)

## 1. Core Concept & 24-Hour Day Budget Engine
- **Strict 1,440-Minute Daily Pool:** Every 24-hour day represents an exact budget of 1,440 minutes.
- **Dynamic Pool Metrics:**
  - `Total Scheduled Time`: Cumulative minutes allocated to Tasks + Breaks with a visual progress bar.
  - `Available Time Remaining`: Calculated as `1,440m - Total Scheduled Time`. Triggers a visual warning alert whenever scheduled minutes exceed 1,440.
  - `Active Tasks Count`: Counter tracking remaining uncompleted actionable items.
  - `Day-by-Day Schedule Isolation`: Distinct schedules for Monday through Sunday with independent metric calculations.
- **Dual Entry Types:**
  - **Actionable Tasks:** Title, description, category tag, start time, end time, duration (minutes), priority (`High`, `Medium`, `Low`), and completion status (`Pending`, `Completed`).
  - **Breaks / Rest:** Non-actionable rest periods (sleep, meals, downtime) that deduct from the 1,440-minute pool without inflating active task counts.
- **Fixed vs. Floating Allocation:**
  - *Fixed Blocks:* Locked to specific clock windows on the timeline (e.g., `09:00 - 10:30`).
  - *Floating Tasks:* Duration-only goals (e.g., `Read 45m`) that deduct from available pool time without requiring set start/end times.

---

## 2. Master Routine Engine (General Tasks Layer)
- **Global Routine Template:**
  - A dedicated "General Section" to define recurring tasks and baseline habits without manual entry per day.
  - Recurrence rules: `Daily`, `Weekdays`, `Weekends`, or selected custom days (e.g., `["Mon", "Wed", "Fri"]`).
- **Inheritance & Exception Architecture:**
  - Daily schedules dynamically inherit master routine items rather than cloning static records.
  - Days store only local *overrides* (time changes) and *exclusions* (`blacklistedMasterIds`).
- **Granular Interaction on Daily Schedules:**
  - Interacting with an inherited master item on any day prompts 3 distinct actions:
    1. *Edit for Today Only:* Creates a day-level override without affecting other days.
    2. *Delete for Today Only:* Excludes the master item from that specific day.
    3. *Edit Master Routine:* Updates the global template across all days.
  - Inherited entries render a technical indicator (`ROUTINE` or `[MODIFIED]`).

---

## 3. Timeline Intelligence: Collisions & Gap Fillers
- **Collision & Overlap Detection:**
  - Evaluates time intervals `(startA < endB && endA > startB)`.
  - Highlights overlapping entries with a warning border and displays the exact overlapping minute count.
- **Empty Slot (Gap) Calculation:**
  - Identifies unscheduled chronological gaps between consecutive entries.
  - Renders dashed clickable blocks labeled `+ Free Slot (Xm)`.
  - Clicking an empty slot automatically opens the Add Modal pre-populated with that gap's start and end times.

---

## 4. Views & Navigation
- **Overview / Daily Feed:**
  - Day selector tabs (Monday–Sunday) displaying live duration badges per day.
  - 3 dynamic top metric cards (Active Tasks, Total Scheduled, Available Time).
  - Chronological, filterable timeline feed.
- **Days View (7-Day Overview):**
  - Side-by-side weekly comparison grid showing visual progress bars, task counts, and time allocations for each day.
  - Quick-switch actions to jump directly into editing any target day.
- **Progress & Analytics View:**
  - Weekly aggregate productivity metrics.
  - Work-to-Rest ratio calculation:
    $$\text{Work-to-Rest Ratio} = \frac{\text{Total Task Minutes}}{\text{Total Break/Rest Minutes}}$$
    Displayed as a normalized ratio (e.g., `1.8 : 1`).
  - Task completion rates and category allocation breakdowns.
- **General / Master Routine View:**
  - Dedicated manager to configure, add, and reorder master routine blocks.

---

## 5. Task & Schedule Management
- **Interactive Expandable Task Cards:**
  - *Collapsed View:* Priority badge (Rose High, Amber Medium, Emerald Low), completion checkbox, time range, and duration.
  - *Expanded View:* Full markdown description, category tag, created/updated timestamps, and quick action buttons (Edit / Delete).
- **Minimalist Break / Rest Cards:**
  - Low-contrast dashed styling to visually budget rest periods without visual clutter.
- **Add & Edit Modal Dialogs:**
  - Quick toggle between Task and Break/Rest.
  - Automatic duration calculation from Start and End times with overnight rollover handling (e.g., `23:00 - 07:00` = 480 min).
  - Priority selector and category tag input.
  - Keyboard shortcuts: `Enter` to submit, `Shift + Enter` for multiline descriptions, `Esc` to close.
- **Search & Filtering:**
  - Real-time text search matching title or description.
  - Filter by priority (`High`, `Medium`, `Low`) and status (`Active`, `Completed`).

---

## 6. Data Persistence, Portability & Architecture
- **Storage Layer:**
  - Asynchronous IndexedDB storage via `idb-keyval` (with fallback to LocalStorage).
- **Data Portability:**
  - One-click backup export to a formatted `.json` file.
  - JSON import with schema validation to restore schedules and master routines.
  - Reset option to restore default sample dataset at any time.
- **Pre-Populated Starter Data:**
  - Pre-seeded with realistic starter data: sleep/rest blocks, daily morning routines, and prioritized engineering/design tasks.
- **Zero-Install Offline Distribution:**
  - PWA configuration with service worker caching for offline native app installation.
  - Standalone Single-File Build: Vite bundle pipeline configuration (`vite-plugin-singlefile`) generating a self-contained `dist/standalone.html` file that opens locally in any web browser without Node.

---

## 7. TypeScript Data Schema Contracts

```typescript
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