import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { TaskItem, ScheduleItem } from '../types/schedule';
import { formatDuration, detectOverlaps, findFreeSlots } from '../utils/timeMath';
import {
  Check,
  Coffee,
  AlertCircle,
  PlusCircle,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

export const TimelinePlaceholder: React.FC = () => {
  const { selectedDay, getResolvedItemsForDay, toggleTaskCompletion, masterRoutines } =
    useScheduleStore();

  const items = getResolvedItemsForDay(selectedDay);
  const overlaps = detectOverlaps(items);
  const freeSlots = findFreeSlots(items);

  const isMasterItem = (id: string) => masterRoutines.some((r) => r.id === id);

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-canvas-soft-2 text-ink-mute border-hairline';
    }
  };

  return (
    <section className="space-y-4">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-display-sm text-ink font-semibold tracking-tight-sm flex items-center gap-2">
            <span>Schedule Timeline Feed</span>
            <span className="font-mono text-xs font-normal text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline">
              {items.length} blocks
            </span>
          </h2>
          <p className="text-body-sm text-ink-mute mt-0.5">
            Chronological fixed blocks, habits, and rest periods for this 24-hour cycle.
          </p>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {overlaps.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-brand-warning-soft/60 border border-brand-warning text-ink-body font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-brand-warning" />
              <span>{overlaps.length} Collision{overlaps.length > 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-canvas-soft border border-hairline text-ink-mute">
            <PlusCircle className="w-3.5 h-3.5 text-brand-link" />
            <span>{freeSlots.length} Free Slot{freeSlots.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Collision Alerts Banner (if any) */}
      {overlaps.length > 0 && (
        <div className="p-3.5 rounded-md bg-amber-50/70 border border-amber-200 text-amber-900 text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>TIMELINE COLLISION DETECTED</span>
          </div>
          <p className="text-amber-700">
            {overlaps.map((o, idx) => (
              <span key={idx} className="block">
                • Overlap of {o.overlapMinutes}m between &quot;{o.itemA.title}&quot; ({o.itemA.startTime}-{o.itemA.endTime}) and &quot;{o.itemB.title}&quot; ({o.itemB.startTime}-{o.itemB.endTime}).
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Schedule Feed Item Cards */}
      {items.length === 0 ? (
        /* Empty State Card matching DESIGN.md ex-empty-state-card */
        <div className="p-12 rounded-lg bg-canvas-soft border border-dashed border-hairline-strong text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink-mute mb-3 shadow-level-1">
            <Calendar className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-body-md font-medium text-ink">No entries scheduled for this day</h3>
          <p className="text-body-sm text-ink-mute max-w-sm mt-1">
            Allocate actionable tasks or downtime rest blocks to plan your 1,440-minute day budget.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item: ScheduleItem) => {
            const isTask = item.type === 'task';
            const task = isTask ? (item as TaskItem) : null;
            const isCompleted = task?.isCompleted ?? false;
            const isMaster = isMasterItem(item.id);

            // Check if this item is in any overlap
            const isOverlapping = overlaps.some(
              (o) => o.itemA.id === item.id || o.itemB.id === item.id
            );

            if (!isTask) {
              /* Break / Rest Card: Minimalist dashed low-contrast styling as specified in features.md */
              return (
                <div
                  key={item.id}
                  className={clsx(
                    'p-3.5 rounded-md border border-dashed transition-all flex items-center justify-between gap-4',
                    isOverlapping
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-canvas-soft/80 border-hairline hover:border-hairline-strong hover:bg-canvas-soft'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-sm bg-canvas flex items-center justify-center text-ink-mute border border-hairline flex-shrink-0">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-ink-body truncate">
                          {item.title}
                        </span>
                        {isMaster && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-canvas text-ink-mute border border-hairline uppercase">
                            Routine
                          </span>
                        )}
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-canvas text-ink-mute border border-hairline uppercase">
                          Rest
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-ink-mute truncate max-w-lg mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-ink-mute flex-shrink-0">
                    <span>
                      {item.startTime && item.endTime
                        ? `${item.startTime} – ${item.endTime}`
                        : 'Floating'}
                    </span>
                    <span className="font-medium text-ink-body px-2 py-0.5 bg-canvas rounded-xs border border-hairline">
                      {formatDuration(item.durationMinutes)}
                    </span>
                  </div>
                </div>
              );
            }

            /* Actionable Task Card: Expandable card chrome matching DESIGN.md card-marketing */
            return (
              <div
                key={item.id}
                className={clsx(
                  'group p-4 rounded-md border bg-canvas shadow-level-2 transition-all flex items-center justify-between gap-4',
                  isOverlapping
                    ? 'border-amber-400 bg-amber-50/10'
                    : 'border-hairline hover:border-hairline-strong',
                  isCompleted && 'opacity-65 bg-canvas-soft/50'
                )}
              >
                {/* Left: Checkbox + Title + Meta tags */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => toggleTaskCompletion(item.id)}
                    title={isCompleted ? 'Mark task as pending' : 'Mark task as completed'}
                    className={clsx(
                      'w-5 h-5 rounded-xs border flex items-center justify-center transition-colors flex-shrink-0',
                      isCompleted
                        ? 'bg-ink border-ink text-white'
                        : 'border-hairline-strong bg-canvas hover:border-ink'
                    )}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={clsx(
                          'text-body-sm font-medium tracking-tight truncate',
                          isCompleted ? 'line-through text-ink-mute' : 'text-ink'
                        )}
                      >
                        {item.title}
                      </span>

                      {/* Priority Badge */}
                      {task?.priority && (
                        <span
                          className={clsx(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded-xs border uppercase font-medium',
                            getPriorityBadgeClass(task.priority)
                          )}
                        >
                          {task.priority}
                        </span>
                      )}

                      {/* Category Tag */}
                      {item.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-ink-body">
                          {item.category}
                        </span>
                      )}

                      {/* Master Routine Indicator */}
                      {isMaster && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas-soft text-ink-mute border border-hairline">
                          ROUTINE
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-ink-mute mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Time Range & Duration Badge */}
                <div className="flex items-center gap-3 font-mono text-xs flex-shrink-0">
                  <span className="text-ink-mute hidden sm:inline">
                    {item.startTime && item.endTime
                      ? `${item.startTime} – ${item.endTime}`
                      : 'Floating'}
                  </span>
                  <span className="font-semibold text-ink px-2.5 py-1 bg-canvas-soft-2 rounded-xs border border-hairline">
                    {formatDuration(item.durationMinutes)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase 2 Architecture Ready Banner */}
      <div className="p-4 rounded-md bg-canvas border border-hairline shadow-level-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-brand-link border border-hairline">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-body-sm-strong text-ink block">
              Phase 1 Core Engine Active
            </span>
            <span className="text-caption text-ink-mute block">
              1,440-minute day budgeting, overlap detection, and IndexedDB sync are live. Phase 2 will introduce the full interactive timeline feed and modals.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs text-ink-mute">
          <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
          <span>Section 7 Contracts Verified</span>
        </div>
      </div>
    </section>
  );
};
