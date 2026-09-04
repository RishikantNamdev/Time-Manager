import React, { useState } from 'react';
import { TaskItem } from '../types/schedule';
import { useScheduleStore } from '../store/useScheduleStore';
import { formatDuration } from '../utils/timeMath';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TaskCardProps {
  task: TaskItem;
  isOverlapping?: boolean;
  overlappingMinutes?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isOverlapping = false,
  overlappingMinutes,
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
          class: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'low':
        return {
          label: 'Low',
          class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
        isOverlapping
          ? 'border-amber-400 bg-amber-50/20 shadow-level-3'
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
            onClick={() => toggleTaskCompletion(task.id, selectedDay)}
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

              {/* Priority Pill */}
              <span
                className={clsx(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-xs border uppercase font-medium',
                  priorityMeta.class
                )}
              >
                {priorityMeta.label}
              </span>

              {/* Technical Indicator for Master Routines */}
              {isMaster && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-canvas-soft text-ink-mute border border-hairline uppercase font-medium"
                  title={isOverridden ? 'Modified for today only' : 'Inherited from Master Routine'}
                >
                  {isOverridden ? '[MODIFIED]' : 'ROUTINE'}
                </span>
              )}

              {/* Collision Warning Pill */}
              {isOverlapping && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Collision {overlappingMinutes ? `(${overlappingMinutes}m)` : ''}</span>
                </span>
              )}
            </div>

            {/* Sub-line for mobile: Time range */}
            <div className="flex items-center gap-2 mt-0.5 sm:hidden font-mono text-[11px] text-ink-mute">
              <span>
                {task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : 'Floating'}
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
              {task.startTime && task.endTime ? `${task.startTime} – ${task.endTime}` : 'Floating Goal'}
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
                <span className="px-2 py-0.5 rounded-xs bg-canvas border border-hairline text-ink-body font-medium">
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
