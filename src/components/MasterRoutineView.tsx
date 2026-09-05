import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { MasterRoutineItem } from '../types/schedule';
import { formatDuration } from '../utils/timeMath';
import {
  Repeat,
  Plus,
  Clock,
  Coffee,
  CheckCircle2,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';

export const MasterRoutineView: React.FC = () => {
  const {
    masterRoutines,
    openCreateRoutineModal,
    openEditRoutineModal,
    deleteMasterRoutine,
  } = useScheduleStore();

  const getRecurrenceBadge = (routine: MasterRoutineItem) => {
    switch (routine.recurrence) {
      case 'daily':
        return { label: 'Every Day', class: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'weekdays':
        return { label: 'Weekdays (M-F)', class: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'weekends':
        return { label: 'Weekends (Sat-Sun)', class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'custom':
        return {
          label: routine.customDays?.map((d) => d.toUpperCase()).join(', ') || 'Custom',
          class: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return { label: routine.recurrence, class: 'bg-canvas-soft border-hairline text-ink-body' };
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${title}"? This will remove it from all days that inherit this routine.`
      )
    ) {
      deleteMasterRoutine(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h2 className="text-display-sm text-ink font-semibold tracking-tight-sm flex items-center gap-2">
            <span>Master Routine Engine</span>
            <span className="font-mono text-xs font-normal text-ink-mute px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline">
              Global Habits Layer
            </span>
          </h2>
          <p className="text-body-sm text-ink-mute mt-0.5">
            Configure baseline habits, sleep schedules, and recurring tasks inherited dynamically by daily schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateRoutineModal}
          className="h-9 px-4 rounded-pill bg-ink hover:bg-ink/90 text-on-primary font-sans text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 shadow-level-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Add Master Routine</span>
        </button>
      </div>

      {/* Inheritance Architecture Info Callout */}
      <div className="p-4 rounded-md bg-canvas border border-hairline shadow-level-1 flex items-start gap-3">
        <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-brand-link border border-hairline flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-ink-body space-y-1">
          <span className="font-semibold text-ink block">
            How Routine Inheritance Works:
          </span>
          <p className="text-ink-mute leading-relaxed">
            Daily schedules dynamically inherit these templates based on recurrence rules. If you modify or delete an inherited item on a specific day (e.g. Monday), the engine creates a local day override or exclusion without breaking the global routine for the other days.
          </p>
        </div>
      </div>

      {/* Routine Cards List */}
      <div className="space-y-3">
        {masterRoutines.length === 0 ? (
          <div className="p-12 rounded-lg bg-canvas border border-dashed border-hairline-strong text-center flex flex-col items-center justify-center shadow-level-1">
            <div className="w-12 h-12 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center text-ink-mute mb-3 shadow-level-1">
              <Repeat className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-body-md font-medium text-ink">No master routines defined</h3>
            <p className="text-body-sm text-ink-mute max-w-sm mt-1 mb-4">
              Add recurring routines like sleep blocks, morning prep, or daily workouts to automatically budget them across your week.
            </p>
            <button
              type="button"
              onClick={openCreateRoutineModal}
              className="px-4 py-2 rounded-pill bg-ink text-on-primary font-sans text-xs font-medium hover:bg-ink/90 transition-all shadow-level-2"
            >
              + Add First Routine
            </button>
          </div>
        ) : (
          masterRoutines.map((routine) => {
            const isTask = routine.type === 'task';
            const recurrenceBadge = getRecurrenceBadge(routine);

            return (
              <div
                key={routine.id}
                className="group p-4 rounded-md border border-hairline bg-canvas hover:border-hairline-strong shadow-level-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Icon, Title, Recurrence & Category */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink-body border border-hairline flex-shrink-0">
                    {isTask ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Coffee className="w-4 h-4 text-ink-mute" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body-sm font-semibold text-ink truncate">
                        {routine.title}
                      </span>

                      {/* Recurrence Badge */}
                      <span
                        className={clsx(
                          'text-[10px] font-mono px-2 py-0.5 rounded-xs border font-medium uppercase',
                          recurrenceBadge.class
                        )}
                      >
                        {recurrenceBadge.label}
                      </span>

                      {/* Type Badge */}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas-soft text-ink-mute border border-hairline uppercase">
                        {isTask ? 'Habit / Task' : 'Rest Block'}
                      </span>

                      {/* Category Tag */}
                      {routine.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-ink-body">
                          {routine.category}
                        </span>
                      )}
                    </div>

                    {routine.description && (
                      <p className="text-xs text-ink-mute mt-1 line-clamp-1">
                        {routine.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Time Range, Duration Badge & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-xs flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/60">
                  <div className="flex items-center gap-1.5 text-ink-mute">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-ink-body font-medium">
                      {routine.startTime} – {routine.endTime}
                    </span>
                  </div>

                  <span className="font-semibold text-ink px-2.5 py-1 bg-canvas-soft-2 rounded-xs border border-hairline">
                    {formatDuration(routine.durationMinutes)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditRoutineModal(routine)}
                      className="p-1.5 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1"
                      title="Edit Master Routine"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-ink-mute" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(routine.id, routine.title)}
                      className="p-1.5 rounded-sm border border-hairline bg-canvas hover:bg-red-50 text-brand-error text-xs font-medium transition-colors shadow-level-1"
                      title="Delete Master Routine"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-brand-error" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Routine Footer Status */}
      <div className="p-3.5 rounded-md bg-canvas border border-hairline shadow-level-1 flex items-center justify-between font-mono text-xs text-ink-mute">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-brand-link" />
          <span>{masterRoutines.length} active master routine rules</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
          <span>Automatic 7-Day Inheritance Engine</span>
        </div>
      </div>
    </div>
  );
};
