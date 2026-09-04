import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek, TaskItem } from '../types/schedule';
import { formatDuration } from '../utils/timeMath';
import {
  TrendingUp,
  Scale,
  CheckCircle2,
  PieChart,
  Flame,
} from 'lucide-react';
import { clsx } from 'clsx';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Work: { bg: 'bg-ink', text: 'text-on-primary', hex: '#171717' },
  Health: { bg: 'bg-emerald-600', text: 'text-white', hex: '#059669' },
  Learning: { bg: 'bg-blue-600', text: 'text-white', hex: '#2563eb' },
  Personal: { bg: 'bg-purple-600', text: 'text-white', hex: '#9333ea' },
  Rest: { bg: 'bg-slate-400', text: 'text-white', hex: '#94a3b8' },
};

export const AnalyticsView: React.FC = () => {
  const { getResolvedItemsForDay } = useScheduleStore();

  let totalTaskMinutes = 0;
  let totalBreakMinutes = 0;
  let totalCompletedTasks = 0;
  let totalTasksCount = 0;

  const categoryMinutesMap: Record<string, number> = {};
  const priorityStats = {
    high: { count: 0, minutes: 0 },
    medium: { count: 0, minutes: 0 },
    low: { count: 0, minutes: 0 },
  };

  for (const day of DAYS) {
    const items = getResolvedItemsForDay(day);
    for (const item of items) {
      const duration = item.durationMinutes || 0;
      const cat = item.category || (item.type === 'break' ? 'Rest' : 'General');
      categoryMinutesMap[cat] = (categoryMinutesMap[cat] || 0) + duration;

      if (item.type === 'task') {
        const task = item as TaskItem;
        totalTaskMinutes += duration;
        totalTasksCount++;
        if (task.isCompleted) {
          totalCompletedTasks++;
        }
        if (task.priority === 'high') {
          priorityStats.high.count++;
          priorityStats.high.minutes += duration;
        } else if (task.priority === 'low') {
          priorityStats.low.count++;
          priorityStats.low.minutes += duration;
        } else {
          priorityStats.medium.count++;
          priorityStats.medium.minutes += duration;
        }
      } else {
        totalBreakMinutes += duration;
      }
    }
  }

  const totalScheduledMinutes = totalTaskMinutes + totalBreakMinutes;

  // Work-to-Rest Ratio Calculation
  const rawRatio = totalBreakMinutes > 0 ? totalTaskMinutes / totalBreakMinutes : totalTaskMinutes > 0 ? 10 : 1;
  const normalizedRatio = rawRatio.toFixed(1);

  let ratioDescriptor = 'Balanced Output';
  let ratioBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
  if (rawRatio >= 0.8 && rawRatio <= 1.4) {
    ratioDescriptor = 'Optimal Recovery & Health';
    ratioBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (rawRatio > 1.4 && rawRatio <= 2.2) {
    ratioDescriptor = 'High Performance Focus';
    ratioBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (rawRatio > 2.2) {
    ratioDescriptor = 'High Strain / Review Rest';
    ratioBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else {
    ratioDescriptor = 'Light Output / Rest Focus';
    ratioBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  // Completion Velocity
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((totalCompletedTasks / totalTasksCount) * 100) : 0;

  // Sorted Category Distribution
  const categoryList = Object.entries(categoryMinutesMap)
    .map(([cat, mins]) => ({
      category: cat,
      minutes: mins,
      percentage: totalScheduledMinutes > 0 ? (mins / totalScheduledMinutes) * 100 : 0,
      color: CATEGORY_COLORS[cat] || { bg: 'bg-gray-700', text: 'text-white', hex: '#374151' },
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h2 className="text-display-sm text-ink font-semibold tracking-tight-sm flex items-center gap-2">
            <span>Productivity & Time Analytics</span>
            <span className="font-mono text-xs font-normal text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline">
              7-Day Metrics
            </span>
          </h2>
          <p className="text-body-sm text-ink-mute mt-0.5">
            Holistic velocity, work-to-rest equilibrium, and time allocation across all 7 days.
          </p>
        </div>

        <div className="font-mono text-xs text-ink-mute">
          <span>Analysis Window: </span>
          <span className="text-ink font-semibold">10,080 Mins Total Pool</span>
        </div>
      </div>

      {/* Top 3 Aggregate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Weekly Work Output */}
        <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-mute uppercase tracking-wider">
              Total Weekly Output
            </span>
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-brand-link border border-hairline">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-semibold text-ink tracking-tight flex items-baseline gap-2">
              <span>{formatDuration(totalTaskMinutes)}</span>
              <span className="text-xs text-ink-mute font-mono font-normal">
                in actionable work
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-mute font-mono">
              Avg {(totalTaskMinutes / (7 * 60)).toFixed(1)} hours/day across 7 days
            </p>
          </div>
        </div>

        {/* KPI 2: Work-to-Rest Ratio */}
        <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-mute uppercase tracking-wider">
              Work-to-Rest Ratio
            </span>
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-purple-600 border border-hairline">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-semibold text-ink tracking-tight flex items-baseline gap-2">
              <span>{normalizedRatio} : 1</span>
              <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold', ratioBadgeClass)}>
                {ratioDescriptor}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-mute font-mono">
              {formatDuration(totalTaskMinutes)} work vs. {formatDuration(totalBreakMinutes)} rest
            </p>
          </div>
        </div>

        {/* KPI 3: Task Completion Velocity */}
        <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-mute uppercase tracking-wider">
              Completion Velocity
            </span>
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-emerald-600 border border-hairline">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-semibold text-ink tracking-tight flex items-baseline gap-2">
              <span>{completionPercentage}%</span>
              <span className="text-xs text-ink-mute font-mono font-normal">
                ({totalCompletedTasks} / {totalTasksCount} tasks)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-mute font-mono">
              {totalTasksCount - totalCompletedTasks} tasks remaining this week
            </p>
          </div>
        </div>
      </div>

      {/* Category Allocation Section */}
      <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body-sm-strong text-ink flex items-center gap-2">
            <PieChart className="w-4 h-4 text-ink-mute" />
            <span>Category Time Allocation</span>
          </h3>
          <span className="font-mono text-xs text-ink-mute">
            {formatDuration(totalScheduledMinutes)} Total Time
          </span>
        </div>

        {/* Multi-segment Distribution Bar */}
        <div className="w-full h-3 rounded-xs bg-canvas-soft-2 border border-hairline overflow-hidden flex shadow-inner">
          {categoryList.map((item) => (
            <div
              key={item.category}
              className={clsx('h-full transition-all', item.color.bg)}
              style={{ width: `${item.percentage}%` }}
              title={`${item.category}: ${formatDuration(item.minutes)} (${item.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Category Breakdown Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {categoryList.map((item) => (
            <div
              key={item.category}
              className="p-3 rounded-sm border border-hairline bg-canvas-soft flex flex-col justify-between gap-1"
            >
              <div className="flex items-center gap-2">
                <span className={clsx('w-2.5 h-2.5 rounded-xs flex-shrink-0', item.color.bg)} />
                <span className="text-xs font-semibold text-ink truncate">{item.category}</span>
              </div>
              <div className="flex items-baseline justify-between font-mono text-xs mt-1">
                <span className="text-ink font-semibold">{formatDuration(item.minutes)}</span>
                <span className="text-ink-mute text-[11px]">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Volume & Commitment Breakdown */}
      <div className="bg-canvas border border-hairline rounded-md p-5 shadow-level-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body-sm-strong text-ink flex items-center gap-2">
            <Flame className="w-4 h-4 text-ink-mute" />
            <span>Task Priority Volume & Time Breakdown</span>
          </h3>
          <span className="font-mono text-xs text-ink-mute">
            {totalTasksCount} Total Actionable Tasks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* High Priority */}
          <div className="p-4 rounded-sm border border-rose-200 bg-rose-50/40 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption-mono text-rose-800 font-semibold uppercase">
                High Priority
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-rose-950">
              {priorityStats.high.count}{' '}
              <span className="text-xs font-normal text-rose-700">tasks</span>
            </div>
            <p className="font-mono text-xs text-rose-700">
              {formatDuration(priorityStats.high.minutes)} committed
            </p>
          </div>

          {/* Medium Priority */}
          <div className="p-4 rounded-sm border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption-mono text-amber-800 font-semibold uppercase">
                Medium Priority
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-amber-950">
              {priorityStats.medium.count}{' '}
              <span className="text-xs font-normal text-amber-700">tasks</span>
            </div>
            <p className="font-mono text-xs text-amber-700">
              {formatDuration(priorityStats.medium.minutes)} committed
            </p>
          </div>

          {/* Low Priority */}
          <div className="p-4 rounded-sm border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption-mono text-emerald-800 font-semibold uppercase">
                Low Priority
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-950">
              {priorityStats.low.count}{' '}
              <span className="text-xs font-normal text-emerald-700">tasks</span>
            </div>
            <p className="font-mono text-xs text-emerald-700">
              {formatDuration(priorityStats.low.minutes)} committed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
