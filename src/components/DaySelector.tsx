import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import { calculateDayBudget, formatDuration } from '../utils/timeMath';
import { clsx } from 'clsx';

const DAYS: { key: DayOfWeek; label: string; full: string }[] = [
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
  { key: 'sun', label: 'Sun', full: 'Sunday' },
];

export const DaySelector: React.FC = () => {
  const { selectedDay, selectDay, getResolvedItemsForDay } = useScheduleStore();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-caption-mono text-ink-mute uppercase tracking-wider font-medium">
          Select Day Budget
        </h2>
        <span className="text-caption-mono text-ink-mute">
          1,440m / Day
        </span>
      </div>

      {/* Pill Row Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS.map(({ key, label, full }) => {
          const items = getResolvedItemsForDay(key);
          const budget = calculateDayBudget(items);
          const isSelected = selectedDay === key;
          const isOver = budget.isOverBudget;

          return (
            <button
              key={key}
              onClick={() => selectDay(key)}
              title={`${full}: ${formatDuration(budget.totalAllocatedMinutes)} scheduled, ${budget.activeTasksCount} active tasks`}
              className={clsx(
                'group relative flex-1 min-w-[96px] py-2.5 px-3 rounded-md transition-all duration-150 text-left border flex flex-col justify-between gap-1',
                isSelected
                  ? 'bg-ink text-on-primary border-ink shadow-level-2'
                  : 'bg-canvas text-ink-body border-hairline hover:border-hairline-strong hover:bg-canvas-soft shadow-level-1'
              )}
            >
              {/* Top row: Day label & Task counter indicator */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={clsx(
                    'text-xs font-semibold uppercase tracking-wider',
                    isSelected ? 'text-on-primary' : 'text-ink'
                  )}
                >
                  {label}
                </span>

                {budget.activeTasksCount > 0 && (
                  <span
                    className={clsx(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-canvas-soft-2 text-ink-body border border-hairline'
                    )}
                  >
                    {budget.activeTasksCount}
                  </span>
                )}
              </div>

              {/* Bottom row: Live duration badge */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className={clsx(
                    'font-medium truncate',
                    isOver
                      ? isSelected
                        ? 'text-red-300 font-bold'
                        : 'text-brand-error font-bold'
                      : isSelected
                      ? 'text-white/80'
                      : 'text-ink-mute'
                  )}
                >
                  {formatDuration(budget.totalAllocatedMinutes)}
                </span>

                {isOver && (
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      isSelected ? 'bg-red-400' : 'bg-brand-error'
                    )}
                    title="Over 1,440-minute day budget!"
                  />
                )}
              </div>

              {/* Active Day Indicator Highlight Line */}
              {isSelected && (
                <div className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-brand-cyan rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
