import React, { useEffect } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { TopBar } from './components/TopBar';
import { DaySelector } from './components/DaySelector';
import { DayBudgetMetrics } from './components/DayBudgetMetrics';
import { TimelinePlaceholder } from './components/TimelinePlaceholder';

export const App: React.FC = () => {
  const { initializeStore, isInitialized } = useScheduleStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-canvas-soft flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-ink border-t-transparent animate-spin mb-4" />
        <span className="font-mono text-xs text-ink-mute tracking-wider uppercase">
          Initializing 24-Hour Time Engine...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-soft text-ink flex flex-col antialiased selection:bg-ink selection:text-white">
      {/* Top Header */}
      <TopBar />

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Day Selector Pill Row */}
        <DaySelector />

        {/* 24-Hour Day Budget Metrics Bar & Progress */}
        <DayBudgetMetrics />

        {/* Schedule Timeline Feed / Placeholder */}
        <TimelinePlaceholder />
      </main>

      {/* Minimalist Engineered Footer */}
      <footer className="w-full border-t border-hairline bg-canvas mt-12 py-6 text-center text-xs text-ink-mute font-mono">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Timetable Manager — 24-Hour Time Budgeting & Productivity Engine</span>
          <div className="flex items-center gap-4">
            <span className="text-ink font-medium">1,440 Mins / Day</span>
            <span>•</span>
            <span>Phase 1 Architecture Complete</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
