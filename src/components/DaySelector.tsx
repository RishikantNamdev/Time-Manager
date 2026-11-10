import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import { calculateDayBudget, formatDuration } from '../utils/timeMath';
import { Calendar, Sparkles, Sun } from 'lucide-react';
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
  const {
    selectedDay,
    selectDay,
    getResolvedItemsForDay,
    timelineScope,
    setTimelineScope,
  } = useScheduleStore();

  const handleWeekendToggle = () => {
    if (selectedDay === 'sat') {
      selectDay('sun');
    } else {
      selectDay('sat');
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Scope Quick Toggles & Engine Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-canvas-soft dark:bg-slate-800/60 border border-hairline dark:border-slate-700 text-xs font-mono">
          {/* Day by Day standard scope */}
          <button
            type="button"
            onClick={() => setTimelineScope('day')}
            className={clsx(
              'px-2.5 py-1 rounded transition-all font-medium flex items-center gap-1.5',
              timelineScope === 'day'
                ? 'bg-ink text-white dark:bg-slate-700 dark:text-cyan-300 shadow-sm font-semibold'
                : 'text-ink-mute hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-700/50'
            )}
            title="Standard view showing selected day"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Day by Day</span>
          </button>

          {/* Everyday Habits scope */}
          <button
            type="button"
            onClick={() => setTimelineScope('habits')}
            className={clsx(
              'px-2.5 py-1 rounded transition-all font-medium flex items-center gap-1.5',
              timelineScope === 'habits'
                ? 'bg-ink text-white dark:bg-slate-700 dark:text-cyan-300 shadow-sm font-semibold'
                : 'text-ink-mute hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-700/50'
            )}
            title="Filters timeline to show only routines and tasks marked as repeating daily"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span>Everyday Habits</span>
          </button>

          {/* Weekend View Toggle */}
          <button
            type="button"
            onClick={handleWeekendToggle}
            className={clsx(
              'px-2.5 py-1 rounded transition-all font-medium flex items-center gap-1.5',
              (selectedDay === 'sat' || selectedDay === 'sun') && timelineScope === 'day'
                ? 'text-purple-600 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
                : 'text-ink-mute hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-700/50'
            )}
            title="One-click toggle between Saturday and Sunday"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Weekend View ({selectedDay === 'sat' ? 'Sat' : selectedDay === 'sun' ? 'Sun' : 'Sat/Sun'})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-caption-mono text-ink-mute">
          <span className="hidden sm:inline">24h Budget</span>
          <span>•</span>
          <span>1,440m / Day</span>
        </div>
      </div>

      {/* 7-Day Pill Row Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map(({ key, label, full }) => {
          const items = getResolvedItemsForDay(key);
          const budget = calculateDayBudget(items);
          const isSelected = selectedDay === key && timelineScope === 'day';
          const isOver = budget.isOverBudget;

          return (
            <button
              key={key}
              onClick={() => selectDay(key)}
              title={`${full}: ${formatDuration(budget.totalAllocatedMinutes)} scheduled, ${budget.activeTasksCount} active tasks`}
              className={clsx(
                'group relative flex-1 min-w-[96px] py-2.5 px-3 rounded-md transition-all duration-150 text-left border flex flex-col justify-between gap-1',
                isSelected
                  ? 'bg-ink text-on-primary border-ink shadow-level-2 dark:bg-slate-800 dark:text-white dark:border-cyan-400'
                  : 'bg-canvas text-ink-body border-hairline hover:border-hairline-strong hover:bg-canvas-soft shadow-level-1'
              )}
            >
              {/* Top row: Day label & Task counter indicator */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={clsx(
                    'text-xs font-semibold uppercase tracking-wider',
                    isSelected ? 'text-on-primary dark:text-slate-200' : 'text-ink'
                  )}
                >
                  {label}
                </span>

                {budget.activeTasksCount > 0 && (
                  <span
                    className={clsx(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium',
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-700 dark:text-slate-200'
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
                      ? 'text-white/80 dark:text-slate-400'
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
