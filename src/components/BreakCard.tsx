import React from 'react';
import { BreakItem } from '../types/schedule';
import { useScheduleStore } from '../store/useScheduleStore';
import { formatDuration } from '../utils/timeMath';
import { Coffee, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface BreakCardProps {
  breakItem: BreakItem;
  isOverlapping?: boolean;
  overlappingMinutes?: number;
}

export const BreakCard: React.FC<BreakCardProps> = ({
  breakItem,
  isOverlapping = false,
  overlappingMinutes,
}) => {
  const { openEditModal, deleteScheduleItem, selectedDay, masterRoutines, daySchedules } =
    useScheduleStore();

  const isMaster = masterRoutines.some((r) => r.id === breakItem.id);
  const isOverridden = Boolean(daySchedules[selectedDay]?.overrides[breakItem.id]);

  const handleDelete = () => {
    const confirmMessage = isMaster
      ? `Delete rest block "${breakItem.title}" for ${selectedDay.toUpperCase()} only? (Master routine will remain for other days)`
      : `Delete rest block "${breakItem.title}"?`;

    if (window.confirm(confirmMessage)) {
      deleteScheduleItem(breakItem.id, selectedDay);
    }
  };

  return (
    <div
      className={clsx(
        'group p-3.5 rounded-md border border-dashed transition-all flex items-center justify-between gap-3',
        isOverlapping
          ? 'bg-amber-50/40 border-amber-300 shadow-level-1'
          : 'bg-canvas-soft/80 border-hairline hover:border-hairline-strong hover:bg-canvas-soft'
      )}
    >
      {/* Left: Icon, Title & Badges */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-sm bg-canvas flex items-center justify-center text-ink-mute border border-hairline flex-shrink-0">
          <Coffee className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-sm font-medium text-ink-body truncate">
              {breakItem.title}
            </span>

            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-canvas text-ink-mute border border-hairline uppercase font-medium">
              Rest
            </span>

            {isMaster && (
              <span
                className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-canvas text-ink-mute border border-hairline uppercase font-medium"
                title={isOverridden ? 'Modified for today only' : 'Inherited from Master Routine'}
              >
                {isOverridden ? '[MODIFIED]' : 'ROUTINE'}
              </span>
            )}

            {isOverlapping && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Collision {overlappingMinutes ? `(${overlappingMinutes}m)` : ''}</span>
              </span>
            )}
          </div>

          {breakItem.description && (
            <p className="text-xs text-ink-mute truncate max-w-lg mt-0.5">
              {breakItem.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Time Range, Duration Badge & Quick Actions */}
      <div className="flex items-center gap-2.5 flex-shrink-0 font-mono text-xs text-ink-mute">
        <span className="hidden sm:inline">
          {breakItem.startTime && breakItem.endTime
            ? `${breakItem.startTime} – ${breakItem.endTime}`
            : 'Floating'}
        </span>

        <span className="font-semibold text-ink-body px-2.5 py-1 bg-canvas rounded-xs border border-hairline">
          {formatDuration(breakItem.durationMinutes)}
        </span>

        {/* Quick Edit/Delete buttons (visible on hover or focus) */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => openEditModal(breakItem)}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-ink-mute hover:text-ink hover:bg-canvas border border-transparent hover:border-hairline transition-colors"
            title="Edit rest entry"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-ink-mute hover:text-brand-error hover:bg-canvas border border-transparent hover:border-hairline transition-colors"
            title="Delete rest entry"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
