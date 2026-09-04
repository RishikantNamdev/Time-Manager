import React, { useEffect } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { TopBar } from './components/TopBar';
import { ViewNav } from './components/ViewNav';
import { DaySelector } from './components/DaySelector';
import { DayBudgetMetrics } from './components/DayBudgetMetrics';
import { SearchFilterBar } from './components/SearchFilterBar';
import { TimelineFeed } from './components/TimelineFeed';
import { DaysOverviewView } from './components/DaysOverviewView';
import { AnalyticsView } from './components/AnalyticsView';
import { MasterRoutineView } from './components/MasterRoutineView';
import { TaskModal } from './components/TaskModal';
import { MasterRoutineModal } from './components/MasterRoutineModal';
import { DataManagementModal } from './components/DataManagementModal';

export const App: React.FC = () => {
  const { initializeStore, isInitialized, activeView } = useScheduleStore();

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
        {/* View Navigation Pill Tabs */}
        <ViewNav />

        {/* View Routing */}
        {activeView === 'daily' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            <DaySelector />
            <DayBudgetMetrics />
            <SearchFilterBar />
            <TimelineFeed />
          </div>
        )}

        {activeView === 'week' && (
          <div className="animate-in fade-in duration-200">
            <DaysOverviewView />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="animate-in fade-in duration-200">
            <AnalyticsView />
          </div>
        )}

        {activeView === 'routines' && (
          <div className="animate-in fade-in duration-200">
            <MasterRoutineView />
          </div>
        )}
      </main>

      {/* Minimalist Engineered Footer */}
      <footer className="w-full border-t border-hairline bg-canvas mt-12 py-6 text-center text-xs text-ink-mute font-mono">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Timetable Manager — 24-Hour Time Budgeting & Productivity Engine</span>
          <div className="flex items-center gap-4">
            <span className="text-ink font-medium">1,440 Mins / Day</span>
            <span>•</span>
            <span className="capitalize">{activeView} View Active</span>
          </div>
        </div>
      </footer>

      {/* Global Accessible Modal Dialogs */}
      <TaskModal />
      <MasterRoutineModal />
      <DataManagementModal />
    </div>
  );
};

export default App;
