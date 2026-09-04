import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { calculateDayBudget, formatDuration, TOTAL_DAY_MINUTES } from '../utils/timeMath';
import { CheckCircle2, Clock, Hourglass, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const DayBudgetMetrics: React.FC = () => {
  const { selectedDay, getResolvedItemsForDay } = useScheduleStore();
  const items = getResolvedItemsForDay(selectedDay);
  const budget = calculateDayBudget(items);

  const taskPercentage = Math.min(
    (budget.taskMinutes / TOTAL_DAY_MINUTES) * 100,
    100
  );
  const breakPercentage = Math.min(
    (budget.breakMinutes / TOTAL_DAY_MINUTES) * 100,
    100 - taskPercentage
  );

  const dayNames: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-display-sm text-ink font-semibold tracking-tight-sm">
            {dayNames[selectedDay]} Budget
          </h1>
          <span className="font-mono text-xs text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft-2 border border-hairline">
            24-Hour Pool
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-mute font-mono">
          <span>Target:</span>
          <span className="text-ink font-semibold">1,440 mins</span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Active Tasks */}
        <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 transition-all hover:border-hairline-strong flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-mute uppercase tracking-wider">
              Active Tasks
            </span>
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink-body border border-hairline">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-semibold text-ink tracking-tight">
              {budget.activeTasksCount}
            </div>
            <p className="mt-1 text-xs text-ink-mute font-mono flex items-center gap-1.5">
              <span>{budget.completedTasksCount} completed</span>
              <span className="text-hairline-strong">•</span>
              <span>{budget.activeTasksCount + budget.completedTasksCount} total</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Total Scheduled */}
        <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 transition-all hover:border-hairline-strong flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-mute uppercase tracking-wider">
              Total Scheduled
            </span>
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink-body border border-hairline">
              <Clock className="w-4 h-4 text-brand-link" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-semibold text-ink tracking-tight flex items-baseline gap-2">
              <span>{formatDuration(budget.totalAllocatedMinutes)}</span>
              <span className="text-xs text-ink-mute font-normal font-mono">
                / 24h
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-mute font-mono flex items-center gap-1.5">
              <span>{formatDuration(budget.taskMinutes)} tasks</span>
              <span className="text-hairline-strong">•</span>
              <span>{formatDuration(budget.breakMinutes)} rest</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Available Time */}
        <div
          className={clsx(
            'border rounded-md p-5 shadow-level-2 transition-all flex flex-col justify-between',
            budget.isOverBudget
              ? 'bg-brand-error-soft/30 border-brand-error'
              : 'bg-canvas border-hairline hover:border-hairline-strong'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                'text-caption-mono uppercase tracking-wider',
                budget.isOverBudget ? 'text-brand-error font-medium' : 'text-ink-mute'
              )}
            >
              Available Time
            </span>
            <div
              className={clsx(
                'w-8 h-8 rounded-sm flex items-center justify-center border',
                budget.isOverBudget
                  ? 'bg-brand-error-soft text-brand-error border-brand-error/40'
                  : 'bg-canvas-soft-2 text-ink-body border-hairline'
              )}
            >
              {budget.isOverBudget ? (
                <AlertTriangle className="w-4 h-4 text-brand-error" />
              ) : (
                <Hourglass className="w-4 h-4 text-ink-body" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={clsx(
                'text-3xl font-mono font-semibold tracking-tight',
                budget.isOverBudget ? 'text-brand-error' : 'text-ink'
              )}
            >
              {budget.isOverBudget
                ? `-${formatDuration(Math.abs(budget.availableMinutes))}`
                : formatDuration(budget.availableMinutes)}
            </div>
            <p
              className={clsx(
                'mt-1 text-xs font-mono',
                budget.isOverBudget ? 'text-brand-error font-medium' : 'text-ink-mute'
              )}
            >
              {budget.isOverBudget
                ? `Over budget by ${Math.abs(budget.availableMinutes)}m!`
                : `${budget.availableMinutes}m remaining (${((budget.availableMinutes / TOTAL_DAY_MINUTES) * 100).toFixed(1)}% pool)`}
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour Progress Bar Container */}
      <div className="bg-canvas border border-hairline rounded-md p-4 sm:p-5 shadow-level-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-caption-mono text-ink-body font-medium uppercase tracking-wider">
              24-Hour Day Allocation
            </span>
            {budget.isOverBudget && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-sm bg-brand-error text-white font-medium">
                <AlertTriangle className="w-3 h-3" />
                OVER BUDGET ({budget.totalAllocatedMinutes}m / 1,440m)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-ink-mute">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-ink inline-block" />
              <span>Tasks ({formatDuration(budget.taskMinutes)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-ink-mute inline-block" />
              <span>Rest ({formatDuration(budget.breakMinutes)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-canvas-soft-2 border border-hairline inline-block" />
              <span>Free ({formatDuration(Math.max(budget.availableMinutes, 0))})</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="relative w-full h-4 rounded-xs bg-canvas-soft-2 border border-hairline overflow-hidden flex shadow-inner">
          {budget.isOverBudget ? (
            /* Over Budget Bar */
            <div
              className="h-full bg-brand-error transition-all duration-300 relative overflow-hidden"
              style={{ width: '100%' }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-pulse" />
            </div>
          ) : (
            /* Normal Stacked Allocation Bar */
            <>
              {/* Task segment */}
              <div
                className="h-full bg-ink transition-all duration-300"
                style={{ width: `${taskPercentage}%` }}
                title={`Tasks: ${budget.taskMinutes}m (${taskPercentage.toFixed(1)}%)`}
              />
              {/* Break segment */}
              <div
                className="h-full bg-ink-mute transition-all duration-300"
                style={{ width: `${breakPercentage}%` }}
                title={`Rest: ${budget.breakMinutes}m (${breakPercentage.toFixed(1)}%)`}
              />
            </>
          )}
        </div>

        {/* 24-Hour Markers */}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-mute">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </section>
  );
};
