import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types/schedule';
import { useScheduleStore } from '../store/useScheduleStore';
import { formatDuration, format24To12Display } from '../utils/timeMath';
import { playCompletionChime } from '../utils/audioChime';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TaskCardProps {
  task: TaskItem;
  isOverlapping?: boolean;
  overlappingMinutes?: number;
  conflictingTitle?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isOverlapping = false,
  overlappingMinutes,
  conflictingTitle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    toggleTaskCompletion,
    openEditModal,
    deleteScheduleItem,
    selectedDay,
    masterRoutines,
    daySchedules,
  } = useScheduleStore();

  const isMaster = masterRoutines.some((r) => r.id === task.id);
  const isOverridden = Boolean(daySchedules[selectedDay]?.overrides[task.id]);

  // Focus Timer / Pomodoro Engine State with LocalStorage Persistence
  const timerStorageKey = `task_timer_${task.id}`;
  const defaultTaskSeconds = Math.max(1, ((task.durationMinutes || (task as any).duration || 0) * 60));

  const getSavedSeconds = (): number => {
    try {
      const saved = localStorage.getItem(timerStorageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {
      // LocalStorage access error handling (e.g. private browsing)
    }
    return defaultTaskSeconds;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getSavedSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(() => {
    try {
      const saved = localStorage.getItem(timerStorageKey);
      if (saved !== null && parseInt(saved, 10) === 0) return true;
    } catch {}
    return false;
  });

  // When task ID or task duration changes, restore saved seconds or reset to default
  useEffect(() => {
    const key = `task_timer_${task.id}`;
    let initialSecs = Math.max(1, ((task.durationMinutes || (task as any).duration || 0) * 60));
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          initialSecs = parsed;
        }
      }
    } catch {}
    setTimeLeft(initialSecs);
    setIsRunning(false);
    setHasFinished(initialSecs === 0);
  }, [task.id, task.durationMinutes]);

  // When task is marked completed, clear storage and stop timer
  useEffect(() => {
    if (task.isCompleted) {
      setIsRunning(false);
      try {
        localStorage.removeItem(timerStorageKey);
      } catch {}
    }
  }, [task.isCompleted, timerStorageKey]);

  // Active ticking interval
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          setHasFinished(true);
          try {
            localStorage.setItem(timerStorageKey, '0');
          } catch {}
          playCompletionChime();
          return 0;
        }
        const next = prev - 1;
        try {
          localStorage.setItem(timerStorageKey, next.toString());
        } catch {}
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerStorageKey]);

  const handleToggleTimer = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    if (!nextRunning) {
      try {
        localStorage.setItem(timerStorageKey, timeLeft.toString());
      } catch {}
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setHasFinished(false);
    try {
      localStorage.removeItem(timerStorageKey);
    } catch {}
    setTimeLeft(defaultTaskSeconds);
  };

  const handleMarkDone = () => {
    setIsRunning(false);
    try {
      localStorage.removeItem(timerStorageKey);
    } catch {}
    toggleTaskCompletion(task.id, selectedDay);
  };

  const formatTimerDisplay = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          label: 'High',
          class: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'medium':
        return {
          label: 'Medium',
          class: 'text-amber-950 bg-amber-100 border-amber-300 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
        };
      case 'low':
        return {
          label: 'Low',
          class: 'text-teal-900 bg-teal-100 border-teal-300 dark:text-teal-200 dark:bg-teal-950/40 dark:border-teal-800',
        };
      default:
        return {
          label: priority,
          class: 'bg-canvas-soft-2 text-ink-mute border-hairline',
        };
    }
  };

  const priorityMeta = getPriorityBadge(task.priority);

  const handleDelete = () => {
    const confirmMessage = isMaster
      ? `Delete "${task.title}" for ${selectedDay.toUpperCase()} only? (Master routine will remain for other days)`
      : `Delete "${task.title}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        localStorage.removeItem(timerStorageKey);
      } catch {}
      deleteScheduleItem(task.id, selectedDay);
    }
  };

  const formattedCreated = task.createdAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(task.createdAt))
    : null;

  return (
    <div
      className={clsx(
        'group rounded-md border bg-canvas shadow-level-2 transition-all overflow-hidden',
        isRunning
          ? 'border-cyan-500 shadow-sm ring-1 ring-cyan-500/30'
          : isOverlapping
            ? 'border-amber-500/50 bg-amber-500/5 dark:border-amber-400/40 dark:bg-amber-950/20 shadow-level-3'
            : 'border-hairline hover:border-hairline-strong',
        task.isCompleted && 'opacity-65 bg-canvas-soft/60'
      )}
    >
      {/* Collapsed Header / Main Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        {/* Left: Interactive Checkbox & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (!task.isCompleted) {
                setIsRunning(false);
                try {
                  localStorage.removeItem(timerStorageKey);
                } catch {}
              }
              toggleTaskCompletion(task.id, selectedDay);
            }}
            title={task.isCompleted ? 'Mark task as pending' : 'Mark task as completed'}
            className={clsx(
              'w-5 h-5 rounded-xs border flex items-center justify-center transition-all flex-shrink-0',
              task.isCompleted
                ? 'bg-ink border-ink text-white'
                : 'border-hairline-strong bg-canvas hover:border-ink'
            )}
          >
            {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={() => setIsExpanded(!isExpanded)}
                className={clsx(
                  'text-body-sm font-medium tracking-tight cursor-pointer hover:underline truncate',
                  task.isCompleted ? 'line-through text-ink-mute' : 'text-ink'
                )}
              >
                {task.title}
              </span>

              {/* Category Tag */}
              {task.category && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-canvas-soft-2 dark:bg-slate-800 text-ink-body dark:text-slate-300 border border-hairline dark:border-slate-700">
                  {task.category}
                </span>
              )}

              {/* Priority Pill */}
              <span
                className={clsx(
                  'text-xs font-medium px-2.5 py-0.5 rounded-full border uppercase',
                  priorityMeta.class
                )}
              >
                {priorityMeta.label}
              </span>

              {/* Technical Indicator for Master Routines */}
              {isMaster && (
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-canvas-soft dark:bg-slate-800 text-ink-mute dark:text-slate-300 border border-hairline dark:border-slate-700 uppercase"
                  title={isOverridden ? 'Modified for today only' : 'Inherited from Master Routine'}
                >
                  {isOverridden ? '[MODIFIED]' : 'ROUTINE'}
                </span>
              )}

              {/* Collision Warning Pill */}
              {isOverlapping && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full text-amber-950 bg-amber-100 border border-amber-300 dark:text-amber-200 dark:bg-amber-950/40 dark:border-amber-800 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>
                    Overlaps with {conflictingTitle || 'conflicting block'}{' '}
                    {overlappingMinutes ? `(+${overlappingMinutes} min double-counted)` : ''}
                  </span>
                </span>
              )}
            </div>

            {/* Sub-line for mobile: Time range */}
            <div className="flex items-center gap-2 mt-0.5 sm:hidden font-mono text-[11px] text-ink-mute">
              <span>
                {task.startTime && task.endTime
                  ? `${format24To12Display(task.startTime)} - ${format24To12Display(task.endTime)}`
                  : 'Floating'}
              </span>
              <span>•</span>
              <span>{formatDuration(task.durationMinutes)}</span>
            </div>
          </div>
        </div>

        {/* Right: Time Window, Duration Badge & Accordion Toggle */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-ink-mute">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-ink-body font-medium">
              {task.startTime && task.endTime
                ? `${format24To12Display(task.startTime)} – ${format24To12Display(task.endTime)}`
                : 'Floating Goal'}
            </span>
          </div>

          <span className="font-mono text-xs font-semibold text-ink px-2.5 py-1 bg-canvas-soft-2 rounded-xs border border-hairline">
            {formatDuration(task.durationMinutes)}
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-ink-mute hover:text-ink hover:bg-canvas-soft-2 transition-colors"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Focus Timer Bar (Active Tasks Only) */}
      {!task.isCompleted && (
        <div className="px-3.5 sm:px-4 py-2 bg-canvas-soft/60 dark:bg-slate-800/40 border-t border-hairline flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mute dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden xs:inline">Focus Timer</span>
            </span>
            <span
              className={clsx(
                'font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded-xs border transition-colors',
                isRunning
                  ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 animate-pulse'
                  : hasFinished
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-canvas dark:bg-slate-800 text-ink dark:text-slate-200 border-hairline dark:border-slate-700'
              )}
            >
              {formatTimerDisplay(timeLeft)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasFinished || timeLeft === 0 ? (
              <button
                type="button"
                onClick={handleMarkDone}
                className="px-2.5 py-1 rounded-xs bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-semibold flex items-center gap-1 transition-all shadow-level-2 animate-bounce"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Completed! Mark Done</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className={clsx(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-xs border text-[11px] font-mono font-medium transition-colors shadow-level-1',
                    isRunning
                      ? 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink dark:text-slate-200'
                  )}
                  title={isRunning ? 'Pause focus timer' : timeLeft < defaultTaskSeconds ? 'Resume focus timer' : 'Start focus timer'}
                >
                  {isRunning ? (
                    <Pause className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>{isRunning ? 'Pause' : timeLeft < defaultTaskSeconds ? 'Resume' : 'Start'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="p-1 rounded-xs border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink-mute hover:text-ink dark:text-slate-400 dark:hover:text-white transition-colors"
                  title="Reset timer to task duration"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expanded View (Accordion) */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-hairline bg-canvas-soft/40 flex flex-col gap-3 text-xs">
          {/* Description */}
          {task.description ? (
            <p className="text-ink-body whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          ) : (
            <p className="text-ink-mute italic">No description provided for this task.</p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-hairline/60 text-ink-mute font-mono text-[11px]">
            <div className="flex items-center gap-3">
              {task.category && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 text-ink-body dark:text-slate-200 font-medium">
                  Category: {task.category}
                </span>
              )}
              {formattedCreated && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Created {formattedCreated}</span>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(task)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1"
              >
                <Edit2 className="w-3 h-3 text-ink-mute" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-hairline bg-canvas hover:bg-red-50 text-brand-error text-xs font-medium transition-colors shadow-level-1"
              >
                <Trash2 className="w-3 h-3 text-brand-error" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
