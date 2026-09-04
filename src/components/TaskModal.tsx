import React, { useState, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import {
  EntryType,
  PriorityLevel,
  TaskItem,
  BreakItem,
  TaskCategory,
} from '../types/schedule';
import { calculateDuration, formatDuration, formatMinutesToTime } from '../utils/timeMath';
import { X, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

const PRESET_CATEGORIES: TaskCategory[] = [
  'Work',
  'Personal',
  'Health',
  'Learning',
  'Rest',
];

export const TaskModal: React.FC = () => {
  const {
    isModalOpen,
    editingItem,
    modalPrefill,
    closeModal,
    addScheduleItem,
    updateScheduleItem,
    selectedDay,
  } = useScheduleStore();

  const [type, setType] = useState<EntryType>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Work');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [floatingDuration, setFloatingDuration] = useState(45);
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [errorMessage, setErrorMessage] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form fields whenever modal opens
  useEffect(() => {
    if (!isModalOpen) return;

    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title);
      setDescription(editingItem.description || '');

      const cat = editingItem.category || (editingItem.type === 'break' ? 'Rest' : 'Work');
      if (PRESET_CATEGORIES.includes(cat)) {
        setCategory(cat);
        setIsCustomCategory(false);
      } else {
        setIsCustomCategory(true);
        setCustomCategory(cat);
      }

      if (editingItem.type === 'task') {
        const task = editingItem as TaskItem;
        setPriority(task.priority || 'medium');
        setIsFloating(Boolean(task.isFloating));
      } else {
        setIsFloating(false);
      }

      if (editingItem.startTime && editingItem.endTime) {
        setStartTime(editingItem.startTime);
        setEndTime(editingItem.endTime);
      } else {
        setStartTime('09:00');
        setEndTime('10:30');
        setFloatingDuration(editingItem.durationMinutes || 45);
      }
    } else {
      // Create mode
      setType(modalPrefill?.type || 'task');
      setTitle(modalPrefill?.title || '');
      setDescription(modalPrefill?.description || '');
      setCategory(modalPrefill?.category || (modalPrefill?.type === 'break' ? 'Rest' : 'Work'));
      setIsCustomCategory(false);
      setCustomCategory('');
      setIsFloating(Boolean((modalPrefill as TaskItem)?.isFloating));
      setPriority((modalPrefill as TaskItem)?.priority || 'medium');

      if (modalPrefill?.startTime && modalPrefill?.endTime) {
        setStartTime(modalPrefill.startTime);
        setEndTime(modalPrefill.endTime);
      } else {
        const nowHour = new Date().getHours();
        const startH = formatMinutesToTime(nowHour * 60);
        const endH = formatMinutesToTime((nowHour + 1) * 60);
        setStartTime(startH);
        setEndTime(endH);
      }

      if (modalPrefill?.durationMinutes) {
        setFloatingDuration(modalPrefill.durationMinutes);
      } else {
        setFloatingDuration(45);
      }
    }

    setErrorMessage('');
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  }, [isModalOpen, editingItem, modalPrefill]);

  // Compute live duration
  const liveDuration = isFloating
    ? floatingDuration
    : calculateDuration(startTime, endTime);

  // Global key listener for Escape and Enter
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter an entry title.');
      titleInputRef.current?.focus();
      return;
    }

    const finalCategory = isCustomCategory
      ? customCategory.trim() || 'General'
      : category;

    const duration = isFloating
      ? Math.max(floatingDuration, 1)
      : calculateDuration(startTime, endTime);

    const now = Date.now();

    if (editingItem) {
      if (type === 'task') {
        const existingTask = editingItem.type === 'task' ? (editingItem as TaskItem) : null;
        const updatedTask: TaskItem = {
          ...editingItem,
          type: 'task',
          title: title.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          startTime: isFloating ? undefined : startTime,
          endTime: isFloating ? undefined : endTime,
          durationMinutes: duration,
          priority,
          isCompleted: existingTask ? existingTask.isCompleted : false,
          isFloating,
          createdAt: existingTask ? existingTask.createdAt : now,
          updatedAt: now,
        };
        updateScheduleItem(updatedTask, selectedDay);
      } else {
        const updatedBreak: BreakItem = {
          ...editingItem,
          type: 'break',
          title: title.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          startTime: isFloating ? undefined : startTime,
          endTime: isFloating ? undefined : endTime,
          durationMinutes: duration,
        };
        updateScheduleItem(updatedBreak, selectedDay);
      }
    } else {
      // Create new item
      const id = `${type}-${Date.now()}`;
      if (type === 'task') {
        const newTask: TaskItem = {
          id,
          type: 'task',
          title: title.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          startTime: isFloating ? undefined : startTime,
          endTime: isFloating ? undefined : endTime,
          durationMinutes: duration,
          priority,
          isCompleted: false,
          isFloating,
          createdAt: now,
          updatedAt: now,
        };
        addScheduleItem(newTask, selectedDay);
      } else {
        const newBreak: BreakItem = {
          id,
          type: 'break',
          title: title.trim(),
          description: description.trim() || undefined,
          category: finalCategory,
          startTime: isFloating ? undefined : startTime,
          endTime: isFloating ? undefined : endTime,
          durationMinutes: duration,
        };
        addScheduleItem(newBreak, selectedDay);
      }
    }

    closeModal();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Surface: Follows DESIGN.md ex-modal-card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-canvas border border-hairline rounded-lg shadow-level-5 p-6 max-w-lg w-full text-ink flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header & Segmented Pill */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <h2 id="modal-title" className="text-display-sm font-semibold tracking-tight-sm text-ink">
              {editingItem ? 'Edit Entry' : 'New Entry'}
            </h2>
            <p className="text-caption text-ink-mute mt-0.5">
              Budget time for {selectedDay.toUpperCase()} in the 1,440-minute daily pool.
            </p>
          </div>

          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-ink-mute hover:text-ink hover:bg-canvas-soft-2 transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Segmented Pill: Task vs Break */}
        <div className="flex p-1 rounded-sm bg-canvas-soft-2 border border-hairline">
          <button
            type="button"
            onClick={() => {
              setType('task');
              if (category === 'Rest') setCategory('Work');
            }}
            className={clsx(
              'flex-1 py-1.5 text-xs font-semibold rounded-xs transition-all tracking-wider uppercase',
              type === 'task'
                ? 'bg-canvas text-ink shadow-level-1'
                : 'text-ink-mute hover:text-ink'
            )}
          >
            Actionable Task
          </button>
          <button
            type="button"
            onClick={() => {
              setType('break');
              setCategory('Rest');
            }}
            className={clsx(
              'flex-1 py-1.5 text-xs font-semibold rounded-xs transition-all tracking-wider uppercase',
              type === 'break'
                ? 'bg-canvas text-ink shadow-level-1'
                : 'text-ink-mute hover:text-ink'
            )}
          >
            Break / Rest
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-sm bg-brand-error-soft/40 border border-brand-error text-brand-error text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title Input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="entry-title" className="text-caption-mono text-ink-body font-medium uppercase">
              Title <span className="text-brand-error">*</span>
            </label>
            <input
              id="entry-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'task' ? 'e.g. Deep Work: System Engine' : 'e.g. Sleep & Rest'}
              className="h-10 px-3 rounded-sm border border-hairline bg-canvas text-body-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          {/* Time Range vs Floating Allocation */}
          <div className="flex flex-col gap-2 p-3.5 rounded-md bg-canvas-soft border border-hairline">
            <div className="flex items-center justify-between">
              <label className="text-caption-mono text-ink-body font-medium uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-ink-mute" />
                <span>Time Allocation</span>
              </label>

              {type === 'task' && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-ink-body">
                  <input
                    type="checkbox"
                    checked={isFloating}
                    onChange={(e) => setIsFloating(e.target.checked)}
                    className="rounded-xs border-hairline-strong text-ink focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Floating Goal (No set hours)</span>
                </label>
              )}
            </div>

            {isFloating ? (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1">
                  <label className="text-[11px] font-mono text-ink-mute">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    step="5"
                    value={floatingDuration}
                    onChange={(e) => setFloatingDuration(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-9 px-3 rounded-sm border border-hairline bg-canvas text-body-sm font-mono text-ink focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="text-caption-mono text-ink font-semibold mt-4">
                  = {formatDuration(floatingDuration)}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <label htmlFor="start-time" className="text-[11px] font-mono text-ink-mute">Start Time</label>
                  <input
                    id="start-time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-sm border border-hairline bg-canvas text-body-sm font-mono text-ink focus:outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label htmlFor="end-time" className="text-[11px] font-mono text-ink-mute">End Time</label>
                  <input
                    id="end-time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-sm border border-hairline bg-canvas text-body-sm font-mono text-ink focus:outline-none focus:border-ink"
                  />
                </div>
              </div>
            )}

            {/* Live Duration Readout with Overnight Indicator */}
            <div className="flex items-center justify-between pt-1 border-t border-hairline/60 font-mono text-xs">
              <span className="text-ink-mute">Total Pool Deduction:</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-ink font-semibold">{formatDuration(liveDuration)}</span>
                <span className="text-ink-mute">({liveDuration} min)</span>
                {!isFloating && startTime > endTime && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-amber-100 text-amber-800 font-semibold" title="Overnight interval spanning past midnight">
                    Overnight +24h
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Priority Selector (Only for tasks) */}
          {type === 'task' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-caption-mono text-ink-body font-medium uppercase">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={clsx(
                    'py-2 px-3 rounded-sm border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5',
                    priority === 'high'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-level-1'
                      : 'bg-canvas border-hairline text-ink-mute hover:border-hairline-strong'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>High</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('medium')}
                  className={clsx(
                    'py-2 px-3 rounded-sm border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5',
                    priority === 'medium'
                      ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-level-1'
                      : 'bg-canvas border-hairline text-ink-mute hover:border-hairline-strong'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Medium</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('low')}
                  className={clsx(
                    'py-2 px-3 rounded-sm border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5',
                    priority === 'low'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-level-1'
                      : 'bg-canvas border-hairline text-ink-mute hover:border-hairline-strong'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low</span>
                </button>
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-mono text-ink-body font-medium uppercase">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setIsCustomCategory(false);
                  }}
                  className={clsx(
                    'px-2.5 py-1 rounded-sm border font-mono text-xs transition-all',
                    !isCustomCategory && category === cat
                      ? 'bg-ink text-on-primary border-ink shadow-level-1'
                      : 'bg-canvas border-hairline text-ink-body hover:border-hairline-strong'
                  )}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomCategory(true)}
                className={clsx(
                  'px-2.5 py-1 rounded-sm border font-mono text-xs transition-all',
                  isCustomCategory
                    ? 'bg-ink text-on-primary border-ink shadow-level-1'
                    : 'bg-canvas border-hairline text-ink-body hover:border-hairline-strong'
                )}
              >
                + Custom
              </button>
            </div>

            {isCustomCategory && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name..."
                className="mt-1.5 h-9 px-3 rounded-sm border border-hairline bg-canvas text-body-sm text-ink focus:outline-none focus:border-ink font-mono text-xs"
              />
            )}
          </div>

          {/* Description Textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="entry-description" className="text-caption-mono text-ink-body font-medium uppercase">
                Description
              </label>
              <span className="text-[11px] font-mono text-ink-mute">
                Shift + Enter for newline
              </span>
            </div>
            <textarea
              id="entry-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Notes, deliverables, or objectives..."
              className="p-3 rounded-sm border border-hairline bg-canvas text-body-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink transition-colors resize-y text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline mt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-sm border border-hairline bg-canvas hover:bg-canvas-soft-2 text-ink text-xs font-medium transition-colors shadow-level-1"
            >
              Cancel (Esc)
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-sm bg-ink hover:bg-ink/90 text-on-primary text-xs font-medium transition-colors shadow-level-2"
            >
              {editingItem ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
