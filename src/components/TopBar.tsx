import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { calculateDayBudget } from '../utils/timeMath';
import { DayOfWeek } from '../types/schedule';
import { Clock, RotateCcw, ShieldCheck, Database } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { resetToDefaults, getResolvedItemsForDay, openDataModal } = useScheduleStore();

  const days: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  let totalWeekActiveTasks = 0;
  for (const day of days) {
    const items = getResolvedItemsForDay(day);
    const budget = calculateDayBudget(items);
    totalWeekActiveTasks += budget.activeTasksCount;
  }

  const currentDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleReset = async () => {
    if (window.confirm('Reset all schedules and routines back to default starter seed data?')) {
      await resetToDefaults();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/95 backdrop-blur border-b border-hairline transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding & Core Engine Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-ink text-on-primary flex items-center justify-center shadow-level-2">
            <Clock className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-body-sm-strong sm:text-base font-semibold text-ink tracking-tight">
                Timetable Manager
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-canvas-soft-2 text-ink-body border border-hairline">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                24h Engine
              </span>
            </div>
            <span className="hidden md:block text-[11px] text-ink-mute">
              Fixed & Floating 1,440-Minute Time Budgeting
            </span>
          </div>
        </div>

        {/* Right: Meta stats & Quick Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-canvas-soft border border-hairline font-mono text-xs text-ink-body">
            <span className="text-ink-mute">{currentDateFormatted}</span>
            <span className="text-hairline-strong">•</span>
            <span className="text-ink font-medium">{totalWeekActiveTasks} active tasks</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-mute font-mono hidden lg:flex">
            <ShieldCheck className="w-4 h-4 text-brand-link" />
            <span>IndexedDB Synced</span>
          </div>

          <button
            onClick={openDataModal}
            title="Open Data & Backup Manager"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1"
          >
            <Database className="w-3.5 h-3.5 text-brand-link" />
            <span>Data & Backup</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset to starter seed data"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-ink-mute" />
            <span className="hidden xs:inline">Reset Seed</span>
          </button>
        </div>
      </div>
    </header>
  );
};
