import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import { calculateDayBudget, formatDuration, TOTAL_DAY_MINUTES, detectOverlaps } from '../utils/timeMath';
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
    <div className="space-y-6">
      {/* Top Section Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h2 className="text-display-sm text-ink font-semibold tracking-tight-sm flex items-center gap-2">
            <span>7-Day Schedule Comparison</span>
            <span className="font-mono text-xs font-normal text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline">
              Weekly Grid
            </span>
          </h2>
          <p className="text-body-sm text-ink-mute mt-0.5">
            Side-by-side time allocations, task velocity, and daily budgets across the entire week.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-ink-body">
          <div className="px-3 py-1.5 rounded-md bg-canvas border border-hairline shadow-level-1">
            <span className="text-ink-mute">Weekly Total: </span>
            <span className="text-ink font-semibold">{formatDuration(totalWeeklyMins)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-canvas border border-hairline shadow-level-1">
            <span className="text-ink-mute">Remaining Tasks: </span>
            <span className="text-ink font-semibold">{totalWeeklyActiveTasks}</span>
          </div>
          {daysOverBudget > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-semibold shadow-level-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{daysOverBudget} Over Budget</span>
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
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
                'bg-canvas border rounded-md p-4 shadow-level-2 transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden',
                isToday
                  ? 'border-ink shadow-level-3 ring-1 ring-ink/10'
                  : 'border-hairline hover:border-hairline-strong'
              )}
            >
              {/* Card Header: Day Title & Badges */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-body-sm-strong font-semibold text-ink">
                    {short}
                  </span>
                  <div className="flex items-center gap-1">
                    {isToday && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-ink text-on-primary font-semibold">
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
                <span className="text-[11px] text-ink-mute block font-mono">{name}</span>

                {/* Quick KPI Numbers */}
                <div className="mt-3 pt-3 border-t border-hairline font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-mute">Scheduled:</span>
                    <span className={clsx('font-semibold', budget.isOverBudget ? 'text-brand-error' : 'text-ink')}>
                      {formatDuration(budget.totalAllocatedMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-mute">Available:</span>
                    <span className={clsx(budget.availableMinutes < 0 ? 'text-brand-error font-semibold' : 'text-ink-body')}>
                      {budget.availableMinutes < 0
                        ? `-${formatDuration(Math.abs(budget.availableMinutes))}`
                        : formatDuration(budget.availableMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-mute">Tasks:</span>
                    <span className="text-ink-body">
                      {budget.activeTasksCount} active / {budget.activeTasksCount + budget.completedTasksCount}
                    </span>
                  </div>
                </div>

                {/* Mini 1,440-minute Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 rounded-xs bg-canvas-soft-2 border border-hairline overflow-hidden flex">
                    {budget.isOverBudget ? (
                      <div className="h-full bg-brand-error w-full animate-pulse" />
                    ) : (
                      <>
                        <div
                          className="h-full bg-ink transition-all"
                          style={{ width: `${taskPercent}%` }}
                          title={`Tasks: ${budget.taskMinutes}m`}
                        />
                        <div
                          className="h-full bg-ink-mute transition-all"
                          style={{ width: `${breakPercent}%` }}
                          title={`Rest: ${budget.breakMinutes}m`}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between font-mono text-[9px] text-ink-mute mt-1">
                    <span>0h</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>

                {/* Conflict indicator */}
                {overlaps.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 font-mono text-[10px] text-amber-700 bg-amber-50 p-1 rounded-xs border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                    <span>{overlaps.length} overlap conflict</span>
                  </div>
                )}

                {/* Top 3 items preview */}
                <div className="mt-3 pt-2.5 border-t border-hairline/60 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-ink-mute uppercase tracking-wider block">
                    Blocks ({items.length})
                  </span>
                  {items.slice(0, 3).map((item) => (
                    <div key={item.id} className="truncate text-ink-body flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-mute flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <span className="text-[10px] font-mono text-ink-mute italic block">
                      +{items.length - 3} more entries
                    </span>
                  )}
                </div>
              </div>

              {/* Quick-Jump Action Button */}
              <button
                type="button"
                onClick={() => handleOpenDay(key)}
                className="w-full mt-2 py-1.5 px-2.5 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1 flex items-center justify-center gap-1 group/btn"
              >
                <span>Open Day</span>
                <ArrowRight className="w-3 h-3 text-ink-mute group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
