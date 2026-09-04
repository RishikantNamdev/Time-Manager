import React, { useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { ScheduleItem, TaskItem, BreakItem, FreeSlot } from '../types/schedule';
import { detectOverlaps, findFreeSlots, parseTimeToMinutes } from '../utils/timeMath';
import { TaskCard } from './TaskCard';
import { BreakCard } from './BreakCard';
import { FreeSlotCard } from './FreeSlotCard';
import { AlertTriangle, Calendar, Layers, Sparkles, FilterX } from 'lucide-react';

type TimelineNode =
  | { kind: 'item'; data: ScheduleItem; startMin: number }
  | { kind: 'slot'; data: FreeSlot; startMin: number };

export const TimelineFeed: React.FC = () => {
  const {
    selectedDay,
    getResolvedItemsForDay,
    searchQuery,
    statusFilter,
    priorityFilter,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    openCreateModal,
  } = useScheduleStore();

  const allDayItems = getResolvedItemsForDay(selectedDay);

  // Overlap collisions on ALL fixed day items
  const overlaps = useMemo(() => detectOverlaps(allDayItems), [allDayItems]);

  // Map of itemId to overlap details
  const overlapMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ov of overlaps) {
      map.set(ov.itemA.id, (map.get(ov.itemA.id) || 0) + ov.overlapMinutes);
      map.set(ov.itemB.id, (map.get(ov.itemB.id) || 0) + ov.overlapMinutes);
    }
    return map;
  }, [overlaps]);

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
      {/* Collision Alerts Banner */}
      {overlaps.length > 0 && (
        <div className="p-4 rounded-md bg-amber-50/80 border border-amber-300 text-amber-900 text-xs font-mono space-y-2 shadow-level-1">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>TIMELINE OVERLAP COLLISION DETECTED</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-amber-200 text-amber-900 text-[10px] font-bold">
              {overlaps.length} {overlaps.length === 1 ? 'conflict' : 'conflicts'}
            </span>
          </div>

          <div className="space-y-1 text-amber-800">
            {overlaps.map((ov, index) => (
              <div key={index} className="flex items-center gap-1.5 flex-wrap">
                <span>• Collision of</span>
                <span className="font-bold underline">{ov.overlapMinutes} minutes</span>
                <span>between</span>
                <span className="font-semibold">&quot;{ov.itemA.title}&quot;</span>
                <span className="text-amber-700 font-mono">({ov.itemA.startTime}-{ov.itemA.endTime})</span>
                <span>and</span>
                <span className="font-semibold">&quot;{ov.itemB.title}&quot;</span>
                <span className="text-amber-700 font-mono">({ov.itemB.startTime}-{ov.itemB.endTime})</span>
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
        /* Empty State for Day */
        <div className="p-12 rounded-lg bg-canvas border border-dashed border-hairline-strong text-center flex flex-col items-center justify-center shadow-level-1">
          <div className="w-12 h-12 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center text-ink-mute mb-3 shadow-level-1">
            <Calendar className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-body-md font-medium text-ink">No entries scheduled for this day</h3>
          <p className="text-body-sm text-ink-mute max-w-sm mt-1 mb-4">
            Start budgeting your 1,440 minutes by adding a focused task or rest block.
          </p>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="px-4 py-2 rounded-pill bg-ink text-on-primary font-sans text-xs font-medium hover:bg-ink/90 transition-all shadow-level-2"
          >
            + Add First Entry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Filter Empty State */
        <div className="p-10 rounded-lg bg-canvas border border-hairline text-center flex flex-col items-center justify-center shadow-level-1">
          <FilterX className="w-8 h-8 text-ink-mute mb-2" />
          <h3 className="text-body-md font-medium text-ink">No matching items found</h3>
          <p className="text-body-sm text-ink-mute max-w-sm mt-1 mb-4">
            Try adjusting your search query, priority, or status filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3.5 py-1.5 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft text-ink font-mono text-xs font-medium transition-colors shadow-level-1"
          >
            Clear Filters
          </button>
        </div>
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
            const isOverlap = overlapMap.has(item.id);
            const ovMins = overlapMap.get(item.id);

            if (item.type === 'task') {
              return (
                <TaskCard
                  key={item.id}
                  task={item as TaskItem}
                  isOverlapping={isOverlap}
                  overlappingMinutes={ovMins}
                />
              );
            }

            return (
              <BreakCard
                key={item.id}
                breakItem={item as BreakItem}
                isOverlapping={isOverlap}
                overlappingMinutes={ovMins}
              />
            );
          })}
        </div>
      )}

      {/* Feed Footer Status Indicator */}
      <div className="p-3.5 rounded-md bg-canvas border border-hairline shadow-level-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-ink-mute">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-link" />
          <span>Timeline synchronized with 24-Hour Budgeting Engine</span>
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
