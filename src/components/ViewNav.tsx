import React from 'react';
import { useScheduleStore, AppView } from '../store/useScheduleStore';
import { Clock, LayoutGrid, BarChart2, Repeat } from 'lucide-react';
import { clsx } from 'clsx';

interface ViewTab {
  id: AppView;
  label: string;
  icon: React.ElementType;
}

const TABS: ViewTab[] = [
  { id: 'daily', label: 'Daily Schedule', icon: Clock },
  { id: 'week', label: '7-Day Overview', icon: LayoutGrid },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'routines', label: 'Master Routines', icon: Repeat },
];

export const ViewNav: React.FC = () => {
  const { activeView, setActiveView } = useScheduleStore();

  return (
    <nav aria-label="Main view navigation" className="w-full flex justify-center">
      <div className="flex items-center gap-1 p-1 rounded-pill-sm bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 shadow-level-1 overflow-x-auto max-w-full">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={clsx(
                'h-8 px-3.5 rounded-pill-sm text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap select-none',
                isActive
                  ? 'bg-ink dark:bg-slate-100 text-on-primary dark:text-slate-950 shadow-level-1'
                  : 'text-ink-body dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 hover:bg-canvas-soft-2 dark:hover:bg-slate-800'
              )}
            >
              <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-white dark:text-slate-950' : 'text-ink-mute dark:text-slate-400')} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
