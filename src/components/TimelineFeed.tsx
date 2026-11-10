import React, { useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { ScheduleItem, TaskItem, BreakItem, FreeSlot, MasterRoutineItem } from '../types/schedule';
import { findFreeSlots, parseTimeToMinutes, format24To12Display } from '../utils/timeMath';
import { detectScheduleCollisions, getCollisionDetailsMap } from '../utils/collisionDetector';
import { TaskCard } from './TaskCard';
import { BreakCard } from './BreakCard';
import { FreeSlotCard } from './FreeSlotCard';
import { AlertTriangle, Calendar, Layers, Sparkles, FilterX, CheckCircle2, CheckCheck } from 'lucide-react';

type TimelineNode =
  | { kind: 'item'; data: ScheduleItem; startMin: number }
  | { kind: 'slot'; data: FreeSlot; startMin: number };

function isDailyRoutine(routine: MasterRoutineItem): boolean {
  if (routine.recurrence === 'daily') return true;
  if (
    routine.recurrence === 'custom' &&
    routine.customDays &&
    routine.customDays.length === 7
  ) {
    return true;
  }
  return false;
}

export const TimelineFeed: React.FC = () => {
  const {
    selectedDay,
    daySchedules,
    masterRoutines,
    timelineScope,
    setTimelineScope,
    getResolvedItemsForDay,
    searchQuery,
    statusFilter,
    priorityFilter,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    openCreateModal,
    openCreateRoutineModal,
  } = useScheduleStore();

  const dailyHabitItems: ScheduleItem[] = useMemo(() => {
    const dailyRoutines = masterRoutines.filter(isDailyRoutine);
    const daySchedule = daySchedules[selectedDay];
    return dailyRoutines
      .map((routine) => {
        const override = daySchedule?.overrides[routine.id];
        const base: ScheduleItem = {
          ...routine,
          type: routine.type === 'rest' ? 'break' : (routine.type as 'task' | 'break'),
          priority: routine.priority || 'medium',
          isCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...override,
        } as ScheduleItem;
        return base;
      })
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
      });
  }, [masterRoutines, daySchedules, selectedDay]);

  const allDayItems = useMemo(() => {
    if (timelineScope === 'habits') {
      return dailyHabitItems;
    }
    return getResolvedItemsForDay(selectedDay);
  }, [timelineScope, dailyHabitItems, getResolvedItemsForDay, selectedDay]);

  // Overlap collisions on ALL fixed day items
  const collisions = useMemo(() => detectScheduleCollisions(allDayItems), [allDayItems]);
  const collisionMap = useMemo(() => getCollisionDetailsMap(allDayItems), [allDayItems]);

  // Tasks counts for context-aware empty states
  const allTasks = useMemo(
    () => allDayItems.filter((i): i is TaskItem => i.type === 'task'),
    [allDayItems]
  );
  const completedTasksCount = useMemo(
    () => allTasks.filter((t) => t.isCompleted).length,
    [allTasks]
  );
  const activeTasksCount = useMemo(
    () => allTasks.filter((t) => !t.isCompleted).length,
    [allTasks]
  );

  // Free slots calculated on all fixed items
  const freeSlots = useMemo(() => findFreeSlots(allDayItems), [allDayItems]);

  // Filtered items based on search query, status filter, and priority filter
  const isFilteringActive =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || priorityFilter !== 'all';

  const filteredItems = useMemo(() => {
    return allDayItems.filter((item) => {
      // Search text match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query) ?? false;
        const catMatch = item.category?.toLowerCase().includes(query) ?? false;
        if (!titleMatch && !descMatch && !catMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.type !== 'task') return false;
        const task = item as TaskItem;
        if (statusFilter === 'active' && task.isCompleted) return false;
        if (statusFilter === 'completed' && !task.isCompleted) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        if (item.type !== 'task') return false;
        const task = item as TaskItem;
        if (task.priority !== priorityFilter) return false;
      }

      return true;
    });
  }, [allDayItems, searchQuery, statusFilter, priorityFilter]);

  // Separate fixed vs floating items
  const fixedItems = filteredItems.filter((item) => item.startTime && item.endTime);
  const floatingItems = filteredItems.filter((item) => !item.startTime || !item.endTime);

  // Interleaved timeline nodes (items + free slots)
  const timelineNodes: TimelineNode[] = useMemo(() => {
    const nodes: TimelineNode[] = [];

    // Add fixed items
    for (const item of fixedItems) {
      nodes.push({
        kind: 'item',
        data: item,
        startMin: parseTimeToMinutes(item.startTime!),
      });
    }

    // Only interleave free slots if user isn't actively filtering
    if (!isFilteringActive) {
      for (const slot of freeSlots) {
        nodes.push({
          kind: 'slot',
          data: slot,
          startMin: parseTimeToMinutes(slot.startTime),
        });
      }
    }

    // Sort nodes chronologically by start minute
    nodes.sort((a, b) => {
      if (a.startMin !== b.startMin) {
        return a.startMin - b.startMin;
      }
      // If same start minute, put items before free slots
      if (a.kind === 'item' && b.kind === 'slot') return -1;
      if (a.kind === 'slot' && b.kind === 'item') return 1;
      return 0;
    });

    return nodes;
  }, [fixedItems, freeSlots, isFilteringActive]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  return (
    <section className="space-y-4">
      {/* Scope Banner: Everyday Habits Active */}
      {timelineScope === 'habits' && (
        <div className="p-3.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 text-xs font-mono flex items-center justify-between gap-3 shadow-level-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <span className="font-semibold">EVERYDAY HABITS VIEW</span>
              <span className="hidden sm:inline text-purple-800 dark:text-purple-300 ml-2">
                • Displaying non-negotiable routines repeating 7 days a week
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTimelineScope('day')}
            className="px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800/80 text-purple-900 dark:text-purple-200 font-semibold transition-colors flex-shrink-0 text-xs"
          >
            Back to Day by Day
          </button>
        </div>
      )}

      {/* Collision Alerts Banner */}
      {collisions.length > 0 && (
        <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-mono space-y-2 shadow-level-1">
          <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>TIMELINE OVERLAP COLLISION DETECTED</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
              {collisions.length} {collisions.length === 1 ? 'conflict' : 'conflicts'}
            </span>
          </div>

          <div className="space-y-1 text-amber-800 dark:text-amber-300">
            {collisions.map((col, index) => (
              <div key={index} className="flex items-center gap-1.5 flex-wrap">
                <span>• Collision of</span>
                <span className="font-bold underline">{col.overlapMinutes} minutes</span>
                <span>between</span>
                <span className="font-semibold">&quot;{col.itemA.title}&quot;</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono">({format24To12Display(col.itemA.startTime)} - {format24To12Display(col.itemA.endTime)})</span>
                <span>and</span>
                <span className="font-semibold">&quot;{col.itemB.title}&quot;</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono">({format24To12Display(col.itemB.startTime)} - {format24To12Display(col.itemB.endTime)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Goals Section (if any match filters) */}
      {floatingItems.length > 0 && (
        <div className="space-y-2.5 p-4 rounded-md bg-canvas-soft border border-hairline">
          <div className="flex items-center justify-between">
            <h3 className="text-caption-mono text-ink-body font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-ink-mute" />
              <span>Floating Goals & Unscheduled Targets</span>
            </h3>
            <span className="text-caption-mono text-ink-mute">
              {floatingItems.length} floating
            </span>
          </div>

          <div className="space-y-2">
            {floatingItems.map((item) =>
              item.type === 'task' ? (
                <TaskCard key={item.id} task={item as TaskItem} />
              ) : (
                <BreakCard key={item.id} breakItem={item as BreakItem} />
              )
            )}
          </div>
        </div>
      )}

      {/* Chronological Timeline Feed */}
      {allDayItems.length === 0 ? (
        timelineScope === 'habits' ? (
          /* Empty State for Everyday Habits */
          <div className="p-12 rounded-lg bg-canvas dark:bg-slate-900 border border-dashed border-hairline-strong dark:border-slate-700 text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-level-1">
              <Sparkles className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-body-md font-semibold text-ink dark:text-slate-100">
              No everyday habits configured yet.
            </h3>
            <p className="text-body-sm text-ink-mute dark:text-slate-400 max-w-sm mt-1 mb-4">
              Add non-negotiable daily routines that recur all 7 days a week (e.g., Morning Routine, Exercise, Sleep).
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCreateRoutineModal()}
                className="px-4 py-2 rounded-pill bg-purple-600 text-white hover:bg-purple-700 font-sans text-xs font-medium transition-all shadow-level-2"
              >
                + Add Everyday Habit
              </button>
              <button
                type="button"
                onClick={() => setTimelineScope('day')}
                className="px-3.5 py-2 rounded-pill border border-hairline text-ink-mute hover:text-ink font-sans text-xs font-medium transition-colors"
              >
                View Day by Day
              </button>
            </div>
          </div>
        ) : (
          /* Empty State for Day (All filter & 0 total tasks) */
          <div className="p-12 rounded-lg bg-canvas dark:bg-slate-900 border border-dashed border-hairline-strong dark:border-slate-700 text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-canvas-soft dark:bg-slate-800 border border-hairline dark:border-slate-700 flex items-center justify-center text-ink-mute dark:text-slate-400 mb-3 shadow-level-1">
              <Calendar className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-body-md font-semibold text-ink dark:text-slate-100">
              No entries scheduled for this day. Start budgeting your 1,440 minutes.
            </h3>
            <p className="text-body-sm text-ink-mute dark:text-slate-400 max-w-sm mt-1 mb-4">
              Add a focused task or rest block to begin organizing your daily pool.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="px-4 py-2 rounded-pill bg-slate-900 text-white border border-slate-700 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-sans text-xs font-medium transition-all shadow-level-2"
            >
              + Add First Entry
            </button>
          </div>
        )
      ) : filteredItems.length === 0 ? (
        statusFilter === 'active' && activeTasksCount === 0 && completedTasksCount > 0 && !searchQuery.trim() && priorityFilter === 'all' ? (
          /* Active filter & 0 active tasks (with completed tasks present) */
          <div className="p-10 rounded-lg bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-level-1">
              <CheckCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-body-md font-semibold text-ink dark:text-slate-100">
              All caught up! All tasks for today are completed 🎉
            </h3>
            <p className="text-body-sm text-ink-mute dark:text-slate-400 max-w-sm mt-1 mb-4">
              Great job! You have completed all {completedTasksCount} scheduled {completedTasksCount === 1 ? 'task' : 'tasks'} for today.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="px-3.5 py-1.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft dark:hover:bg-slate-700 text-ink dark:text-slate-200 font-mono text-xs font-medium transition-colors shadow-level-1"
            >
              View All Entries
            </button>
          </div>
        ) : statusFilter === 'completed' && completedTasksCount === 0 && !searchQuery.trim() && priorityFilter === 'all' ? (
          /* Completed filter & 0 completed tasks */
          <div className="p-10 rounded-lg bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-canvas-soft dark:bg-slate-800 border border-hairline dark:border-slate-700 flex items-center justify-center text-ink-mute dark:text-slate-400 mb-3 shadow-level-1">
              <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-body-md font-semibold text-ink dark:text-slate-100">
              No completed tasks yet. Mark tasks as done as you progress.
            </h3>
            <p className="text-body-sm text-ink-mute dark:text-slate-400 max-w-sm mt-1 mb-4">
              Check off tasks from your timeline feed as you complete them to track your accomplishments.
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="px-3.5 py-1.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft dark:hover:bg-slate-700 text-ink dark:text-slate-200 font-mono text-xs font-medium transition-colors shadow-level-1"
            >
              View All Entries
            </button>
          </div>
        ) : (
          /* Search / Priority filter active & 0 matches */
          <div className="p-10 rounded-lg bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-canvas-soft dark:bg-slate-800 border border-hairline dark:border-slate-700 flex items-center justify-center text-ink-mute dark:text-slate-400 mb-3 shadow-level-1">
              <FilterX className="w-8 h-8 text-ink-mute dark:text-slate-400" />
            </div>
            <h3 className="text-body-md font-semibold text-ink dark:text-slate-100">
              No tasks match your current filter or search criteria.
            </h3>
            <p className="text-body-sm text-ink-mute dark:text-slate-400 max-w-sm mt-1 mb-4">
              Try adjusting your search query, priority, or status filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-1.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft dark:hover:bg-slate-700 text-ink dark:text-slate-200 font-mono text-xs font-medium transition-colors shadow-level-1"
            >
              Clear Filters
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {timelineNodes.map((node) => {
            if (node.kind === 'slot') {
              return (
                <FreeSlotCard
                  key={`slot-${node.data.startTime}-${node.data.endTime}`}
                  slot={node.data}
                />
              );
            }

            const item = node.data;
            const colInfo = collisionMap.get(item.id);
            const isOverlap = colInfo?.hasCollision ?? false;
            const ovMins = colInfo?.totalOverlapMinutes;
            const conflictingTitle = colInfo?.firstConflictTitle;

            if (item.type === 'task') {
              return (
                <TaskCard
                  key={item.id}
                  task={item as TaskItem}
                  isOverlapping={isOverlap}
                  overlappingMinutes={ovMins}
                  conflictingTitle={conflictingTitle}
                />
              );
            }

            return (
              <BreakCard
                key={item.id}
                breakItem={item as BreakItem}
                isOverlapping={isOverlap}
                overlappingMinutes={ovMins}
                conflictingTitle={conflictingTitle}
              />
            );
          })}
        </div>
      )}

      {/* Feed Footer Status Indicator */}
      <div className="p-3.5 rounded-md bg-canvas border border-hairline shadow-level-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-ink-mute">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-link" />
          <span>
            {timelineScope === 'habits'
              ? 'Everyday Habits Scope • 7-day recurring routines'
              : 'Timeline synchronized with 24-Hour Budgeting Engine'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>{allDayItems.length} active entries</span>
          <span>•</span>
          <span>{freeSlots.length} unscheduled gaps</span>
        </div>
      </div>
    </section>
  );
};
