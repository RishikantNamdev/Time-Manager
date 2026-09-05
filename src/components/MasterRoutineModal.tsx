import React, { useState, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import {
  EntryType,
  PriorityLevel,
  RecurrenceType,
  DayOfWeek,
  TaskCategory,
  MasterRoutineItem,
} from '../types/schedule';
import { calculateDuration, formatDuration } from '../utils/timeMath';
import { X, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

const PRESET_CATEGORIES: TaskCategory[] = [
  'Work',
  'Personal',
  'Health',
  'Learning',
  'Rest',
];

const ALL_DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export const MasterRoutineModal: React.FC = () => {
  const {
    isRoutineModalOpen,
    editingRoutine,
    closeRoutineModal,
    addMasterRoutine,
    updateMasterRoutine,
  } = useScheduleStore();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EntryType>('task');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [category, setCategory] = useState<TaskCategory>('Health');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('daily');
  const [customDays, setCustomDays] = useState<DayOfWeek[]>(['mon', 'wed', 'fri']);
  const [errorMessage, setErrorMessage] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRoutineModalOpen) return;

    if (editingRoutine) {
      setTitle(editingRoutine.title);
      setType(editingRoutine.type);
      setStartTime(editingRoutine.startTime || '07:00');
      setEndTime(editingRoutine.endTime || '08:00');
      setDescription(editingRoutine.description || '');
      setRecurrence(editingRoutine.recurrence || 'daily');
      setCustomDays(editingRoutine.customDays || ['mon', 'wed', 'fri']);
      setPriority(editingRoutine.priority || 'medium');

      const cat = editingRoutine.category || (editingRoutine.type === 'break' ? 'Rest' : 'Health');
      if (PRESET_CATEGORIES.includes(cat)) {
        setCategory(cat);
        setIsCustomCategory(false);
      } else {
        setIsCustomCategory(true);
        setCustomCategory(cat);
      }
    } else {
      setTitle('');
      setType('task');
      setStartTime('07:00');
      setEndTime('08:00');
      setDescription('');
      setCategory('Health');
      setIsCustomCategory(false);
      setCustomCategory('');
      setPriority('medium');
      setRecurrence('daily');
      setCustomDays(['mon', 'wed', 'fri']);
    }

    setErrorMessage('');
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  }, [isRoutineModalOpen, editingRoutine]);

  // Global key listener
  useEffect(() => {
    if (!isRoutineModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRoutineModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRoutineModalOpen, closeRoutineModal]);

  if (!isRoutineModalOpen) return null;

  const liveDuration = calculateDuration(startTime, endTime);

  const toggleDay = (day: DayOfWeek) => {
    if (customDays.includes(day)) {
      if (customDays.length > 1) {
        setCustomDays(customDays.filter((d) => d !== day));
      }
    } else {
      setCustomDays([...customDays, day]);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter a routine title.');
      titleInputRef.current?.focus();
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || 'General' : category;
    const duration = calculateDuration(startTime, endTime);

    const routineData: MasterRoutineItem = {
      id: editingRoutine ? editingRoutine.id : `master-${Date.now()}`,
      title: title.trim(),
      type,
      startTime,
      endTime,
      durationMinutes: duration,
      category: finalCategory,
      description: description.trim() || undefined,
      recurrence,
      customDays: recurrence === 'custom' ? customDays : undefined,
      priority: type === 'task' ? priority : undefined,
    };

    if (editingRoutine) {
      updateMasterRoutine(routineData);
    } else {
      addMasterRoutine(routineData);
    }

    closeRoutineModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-modal-title"
        className="bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 rounded-lg shadow-level-5 p-6 max-w-lg w-full text-ink dark:text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline dark:border-slate-800 pb-4">
          <div>
            <h2 id="routine-modal-title" className="text-display-sm font-semibold tracking-tight-sm text-ink dark:text-slate-100">
              {editingRoutine ? 'Edit Master Routine' : 'New Master Routine'}
            </h2>
            <p className="text-caption text-ink-mute dark:text-slate-400 mt-0.5">
              Global recurring habit or baseline rest block inherited across all days.
            </p>
          </div>

          <button
            onClick={closeRoutineModal}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas-soft-2 dark:hover:bg-slate-800 transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Segmented Pill */}
        <div className="flex p-1 rounded-sm bg-canvas-soft-2 dark:bg-slate-800 border border-hairline dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setType('task');
              if (category === 'Rest') setCategory('Health');
            }}
            className={clsx(
              'flex-1 py-1.5 text-xs font-semibold rounded-xs transition-all tracking-wider uppercase',
              type === 'task' ? 'bg-canvas dark:bg-slate-900 text-ink dark:text-slate-100 shadow-level-1' : 'text-ink-mute hover:text-ink'
            )}
          >
            Routine Task / Habit
          </button>
          <button
            type="button"
            onClick={() => {
              setType('break');
              setCategory('Rest');
            }}
            className={clsx(
              'flex-1 py-1.5 text-xs font-semibold rounded-xs transition-all tracking-wider uppercase',
              type === 'break' ? 'bg-canvas dark:bg-slate-900 text-ink dark:text-slate-100 shadow-level-1' : 'text-ink-mute hover:text-ink'
            )}
          >
            Recurring Rest Block
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-sm bg-brand-error-soft/40 border border-brand-error text-brand-error text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routine-title" className="text-caption-mono text-ink-body font-medium uppercase">
              Routine Title <span className="text-brand-error">*</span>
            </label>
            <input
              id="routine-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Routine, Daily Review, Sleep..."
              className="h-10 px-3 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 text-body-sm text-ink dark:text-white placeholder:text-ink-mute dark:placeholder:text-slate-400 focus:outline-none focus:border-ink dark:focus:border-slate-500 transition-colors"
            />
          </div>

          {/* Recurrence Rule */}
          <div className="flex flex-col gap-1.5 p-3 rounded-md bg-canvas-soft dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
            <label className="text-caption-mono text-ink-body font-medium uppercase">
              Recurrence Pattern
            </label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {(['daily', 'weekdays', 'weekends', 'custom'] as RecurrenceType[]).map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecurrence(rec)}
                  className={clsx(
                    'py-1.5 text-xs font-mono font-medium rounded-xs border capitalize transition-all',
                    recurrence === rec
                      ? 'bg-ink dark:bg-slate-100 text-on-primary dark:text-slate-900 border-ink dark:border-slate-100 shadow-level-1'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-300 hover:text-ink dark:hover:text-white'
                  )}
                >
                  {rec}
                </button>
              ))}
            </div>

            {/* Custom Day Selectors */}
            {recurrence === 'custom' && (
              <div className="mt-2 pt-2 border-t border-hairline dark:border-slate-800">
                <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400 block mb-1.5">
                  Applies on days:
                </span>
                <div className="flex items-center gap-1.5">
                  {ALL_DAYS.map(({ key, label }) => {
                    const isSelected = customDays.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={clsx(
                          'flex-1 py-1 text-xs font-mono font-semibold rounded-xs border transition-all',
                          isSelected
                            ? 'bg-ink dark:bg-slate-100 text-on-primary dark:text-slate-900 border-ink dark:border-slate-100'
                            : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-300 hover:border-hairline-strong'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Time Range */}
          <div className="flex flex-col gap-2 p-3.5 rounded-md bg-canvas-soft dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
            <label className="text-caption-mono text-ink-body font-medium uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink-mute" />
              <span>Time Window</span>
            </label>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label htmlFor="routine-start" className="text-[11px] font-mono text-ink-mute dark:text-slate-400">Start Time</label>
                <input
                  id="routine-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 text-body-sm font-mono text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-slate-500"
                />
              </div>
              <div>
                <label htmlFor="routine-end" className="text-[11px] font-mono text-ink-mute dark:text-slate-400">End Time</label>
                <input
                  id="routine-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 text-body-sm font-mono text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-hairline/60 dark:border-slate-800 font-mono text-xs">
              <span className="text-ink-mute dark:text-slate-400">Duration per active day:</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-ink dark:text-white font-semibold">{formatDuration(liveDuration)}</span>
                <span className="text-ink-mute dark:text-slate-400">({liveDuration} min)</span>
                {startTime > endTime && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold">
                    Overnight +24h
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
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
                      ? 'bg-ink dark:bg-slate-100 text-on-primary dark:text-slate-900 border-ink dark:border-slate-100 shadow-level-1'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-body dark:text-slate-300 hover:border-hairline-strong'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority (only if task) */}
          {type === 'task' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-caption-mono text-ink-body font-medium uppercase">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={clsx(
                    'py-2 px-3 rounded-sm border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5',
                    priority === 'high'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 shadow-level-1'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-300 hover:border-hairline-strong'
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
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-level-1'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-300 hover:border-hairline-strong'
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-level-1'
                      : 'bg-canvas dark:bg-slate-800 border-hairline dark:border-slate-700 text-ink-mute dark:text-slate-300 hover:border-hairline-strong'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low</span>
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routine-description" className="text-caption-mono text-ink-body font-medium uppercase">
              Description / Notes
            </label>
            <textarea
              id="routine-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Habit objectives or routines..."
              className="p-3 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 text-body-sm text-ink dark:text-white placeholder:text-ink-mute dark:placeholder:text-slate-400 focus:outline-none focus:border-ink dark:focus:border-slate-500 transition-colors resize-y text-xs"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={closeRoutineModal}
              className="px-4 py-2 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink dark:text-slate-200 text-xs font-medium transition-colors shadow-level-1"
            >
              Cancel (Esc)
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-sm bg-ink dark:bg-slate-100 hover:bg-ink/90 dark:hover:bg-slate-200 text-on-primary dark:text-slate-900 text-xs font-medium transition-colors shadow-level-2"
            >
              {editingRoutine ? 'Save Routine' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
