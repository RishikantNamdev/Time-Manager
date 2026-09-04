import React from 'react';
import { FreeSlot } from '../types/schedule';
import { useScheduleStore } from '../store/useScheduleStore';
import { Plus } from 'lucide-react';

interface FreeSlotCardProps {
  slot: FreeSlot;
}

export const FreeSlotCard: React.FC<FreeSlotCardProps> = ({ slot }) => {
  const { openCreateModal } = useScheduleStore();

  const handleClick = () => {
    openCreateModal({
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
      type: 'task',
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Click to schedule a block between ${slot.startTime} and ${slot.endTime}`}
      className="w-full border border-dashed border-hairline-strong/80 hover:border-ink rounded-md py-2.5 px-4 text-center text-ink-mute hover:text-ink transition-all cursor-pointer bg-canvas-soft/40 hover:bg-canvas flex items-center justify-center gap-2 group shadow-sm"
    >
      <div className="w-4 h-4 rounded-full border border-hairline-strong group-hover:border-ink flex items-center justify-center transition-colors">
        <Plus className="w-2.5 h-2.5" />
      </div>

      <span className="font-mono text-xs tracking-tight">
        <span className="font-semibold text-ink-body group-hover:text-ink">
          + Free Slot
        </span>{' '}
        <span className="text-ink-mute">({slot.durationMinutes}m available)</span> —{' '}
        <span className="text-ink-body font-medium">
          {slot.startTime} to {slot.endTime}
        </span>
      </span>
    </button>
  );
};
