import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import { calculateDayBudget, formatDuration, TOTAL_DAY_MINUTES, detectOverlaps, format24To12Display } from '../utils/timeMath';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const DAYS_CONFIG: { key: DayOfWeek; name: string; short: string; dayIndex: number }[] = [
  { key: 'mon', name: 'Monday', short: 'Mon', dayIndex: 1 },
  { key: 'tue', name: 'Tuesday', short: 'Tue', dayIndex: 2 },
  { key: 'wed', name: 'Wednesday', short: 'Wed', dayIndex: 3 },
  { key: 'thu', name: 'Thursday', short: 'Thu', dayIndex: 4 },
  { key: 'fri', name: 'Friday', short: 'Fri', dayIndex: 5 },
  { key: 'sat', name: 'Saturday', short: 'Sat', dayIndex: 6 },
  { key: 'sun', name: 'Sunday', short: 'Sun', dayIndex: 0 },
];

export const DaysOverviewView: React.FC = () => {
  const { selectDay, setActiveView, getResolvedItemsForDay } = useScheduleStore();
  const todayIndex = new Date().getDay();

  // Aggregate weekly stats
  let totalWeeklyMins = 0;
  let totalWeeklyActiveTasks = 0;
  let daysOverBudget = 0;

  for (const day of DAYS_CONFIG) {
    const items = getResolvedItemsForDay(day.key);
    const budget = calculateDayBudget(items);
    totalWeeklyMins += budget.totalAllocatedMinutes;
    totalWeeklyActiveTasks += budget.activeTasksCount;
    if (budget.isOverBudget) daysOverBudget++;
  }

  const handleOpenDay = (day: DayOfWeek) => {
    selectDay(day);
    setActiveView('daily');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Section Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-display-sm text-ink dark:text-slate-100 font-semibold tracking-tight-sm flex items-center gap-2">
            <span>7-Day Schedule Comparison</span>
            <span className="font-mono text-xs font-normal text-ink-mute dark:text-slate-400 px-2 py-0.5 rounded-full bg-canvas-soft dark:bg-slate-800 border border-hairline dark:border-slate-700">
              Weekly Grid
            </span>
          </h2>
          <p className="text-body-sm text-ink-mute dark:text-slate-400 mt-0.5">
            Side-by-side time allocations, task velocity, and daily budgets across the entire week.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 font-mono text-xs text-ink-body dark:text-slate-200">
          <div className="px-3 py-1.5 rounded-md bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 shadow-level-1">
            <span className="text-ink-mute dark:text-slate-400">Weekly Total: </span>
            <span className="text-ink dark:text-slate-100 font-semibold">{formatDuration(totalWeeklyMins)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 shadow-level-1">
            <span className="text-ink-mute dark:text-slate-400">Remaining Tasks: </span>
            <span className="text-ink dark:text-slate-100 font-semibold">{totalWeeklyActiveTasks}</span>
          </div>
          {daysOverBudget > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 font-semibold shadow-level-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{daysOverBudget} Over Budget</span>
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5">
        {DAYS_CONFIG.map(({ key, name, short, dayIndex }) => {
          const items = getResolvedItemsForDay(key);
          const budget = calculateDayBudget(items);
          const overlaps = detectOverlaps(items);
          const isToday = todayIndex === dayIndex;

          const taskPercent = Math.min((budget.taskMinutes / TOTAL_DAY_MINUTES) * 100, 100);
          const breakPercent = Math.min((budget.breakMinutes / TOTAL_DAY_MINUTES) * 100, 100 - taskPercent);

          return (
            <div
              key={key}
              className={clsx(
                'bg-canvas dark:bg-slate-900 border rounded-md p-3.5 sm:p-4 shadow-level-2 transition-all flex flex-col justify-between min-h-[380px] relative overflow-hidden',
                isToday
                  ? 'border-ink dark:border-cyan-400 shadow-level-3 ring-1 ring-ink/10 dark:ring-cyan-400/20'
                  : 'border-hairline dark:border-slate-800 hover:border-hairline-strong dark:hover:border-slate-700'
              )}
            >
              {/* Card Top Section: Header, Metrics, & Timeline Progress */}
              <div>
                {/* Header: Day Title & Badges */}
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-body-sm-strong font-semibold text-ink dark:text-slate-100">
                    {short}
                  </span>
                  <div className="flex items-center gap-1">
                    {isToday && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-700 dark:border-slate-300 font-semibold">
                        TODAY
                      </span>
                    )}
                    {budget.isOverBudget && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-brand-error text-white font-semibold">
                        OVER
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-ink-mute dark:text-slate-400 block font-mono">{name}</span>

                {/* Quick KPI Numbers */}
                <div className="mt-3 pt-2.5 border-t border-hairline dark:border-slate-800 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs whitespace-nowrap gap-1">
                    <span className="text-ink-mute dark:text-slate-400">Scheduled:</span>
                    <span className={clsx('font-semibold tabular-nums', budget.isOverBudget ? 'text-brand-error' : 'text-ink dark:text-slate-200')}>
                      {formatDuration(budget.totalAllocatedMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs whitespace-nowrap gap-1">
                    <span className="text-ink-mute dark:text-slate-400">Available:</span>
                    <span className={clsx('tabular-nums', budget.availableMinutes < 0 ? 'text-brand-error font-semibold' : 'text-ink-body dark:text-slate-300')}>
                      {budget.availableMinutes < 0
                        ? `-${formatDuration(Math.abs(budget.availableMinutes))}`
                        : formatDuration(budget.availableMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs whitespace-nowrap gap-1">
                    <span className="text-ink-mute dark:text-slate-400">Tasks:</span>
                    <div className="flex items-center gap-1 tabular-nums">
                      <span className="text-ink-body dark:text-slate-200 font-semibold">
                        {budget.activeTasksCount}
                        <span className="text-ink-mute dark:text-slate-500 font-normal mx-0.5">/</span>
                        {budget.activeTasksCount + budget.completedTasksCount}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-canvas-soft dark:bg-slate-800 border border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-400">
                        active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mini 1,440-minute Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 rounded-xs bg-canvas-soft-2 dark:bg-slate-800 border border-hairline dark:border-slate-700 overflow-hidden flex">
                    {budget.isOverBudget ? (
                      <div className="h-full bg-brand-error w-full animate-pulse" />
                    ) : (
                      <>
                        <div
                          className="h-full bg-ink dark:bg-slate-200 transition-all"
                          style={{ width: `${taskPercent}%` }}
                          title={`Tasks: ${budget.taskMinutes}m`}
                        />
                        <div
                          className="h-full bg-ink-mute dark:bg-slate-500 transition-all"
                          style={{ width: `${breakPercent}%` }}
                          title={`Rest: ${budget.breakMinutes}m`}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-ink-mute dark:text-slate-400 mt-1">
                    <span>0h</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>

                {/* Conflict indicator */}
                {overlaps.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 font-mono text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-xs border border-amber-200 dark:border-amber-800/80">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="truncate">{overlaps.length} overlap conflict</span>
                  </div>
                )}
              </div>

              {/* Blocks Preview / Empty State */}
              <div className="mt-3 pt-2.5 border-t border-hairline/60 dark:border-slate-800/80 flex-1 flex flex-col justify-start">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-ink-mute dark:text-slate-400 uppercase tracking-wider block">
                    Blocks ({items.length})
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="flex-1 min-h-[64px] flex items-center justify-center rounded border border-dashed border-hairline-strong/50 dark:border-slate-700/60 bg-canvas-soft/40 dark:bg-slate-900/40 px-2 py-3 text-center my-auto">
                    <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400 italic">
                      No blocks scheduled
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {items.slice(0, 3).map((item) => (
                      <div key={item.id} className="truncate text-ink-body dark:text-slate-300 flex items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={clsx(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              item.type === 'break' ? 'bg-amber-500' : 'bg-ink-mute dark:bg-slate-400'
                            )}
                          />
                          <span
                            className="truncate"
                            title={
                              item.startTime && item.endTime
                                ? `${item.title} (${format24To12Display(item.startTime)} - ${format24To12Display(item.endTime)})`
                                : item.title
                            }
                          >
                            {item.title}
                          </span>
                        </div>
                        {item.startTime && (
                          <span className="text-[10px] font-mono text-ink-mute dark:text-slate-400 flex-shrink-0">
                            {format24To12Display(item.startTime)}
                          </span>
                        )}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <span className="text-[10px] font-mono text-ink-mute dark:text-slate-400 italic block pt-0.5">
                        +{items.length - 3} more entries
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick-Jump Action Button pinned to bottom */}
              <button
                type="button"
                onClick={() => handleOpenDay(key)}
                className="w-full mt-3 py-1.5 px-2.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink dark:text-slate-100 text-xs font-medium transition-colors shadow-level-1 flex items-center justify-center gap-1 group/btn"
              >
                <span>Open Day</span>
                <ArrowRight className="w-3 h-3 text-ink-mute dark:text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
