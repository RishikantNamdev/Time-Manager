import React, { useState, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import {
  AI_SCHEDULE_PROMPT_TEMPLATE,
  extractScheduleJsonFromText,
} from '../utils/aiPromptTemplate';
import { detectScheduleCollisions } from '../utils/collisionDetector';
import {
  format24To12Display,
  formatDuration,
  TOTAL_DAY_MINUTES,
} from '../utils/timeMath';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export const AiScheduleModal: React.FC = () => {
  const {
    isAiModalOpen,
    closeAiModal,
    selectedDay,
    replaceDayCustomItems,
    appendDayCustomItems,
    showToast,
  } = useScheduleStore();

  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [userNotes, setUserNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const [pastedInput, setPastedInput] = useState('');
  const [targetDay, setTargetDay] = useState<DayOfWeek>(selectedDay);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync target day when modal opens or selectedDay changes
  useEffect(() => {
    if (isAiModalOpen) {
      setTargetDay(selectedDay);
    }
  }, [isAiModalOpen, selectedDay]);

  // Handle escape key
  useEffect(() => {
    if (!isAiModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAiModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiModalOpen, closeAiModal]);

  // Real-time parsing and validation of pasted content
  const parseResult = useMemo(() => {
    if (!pastedInput.trim()) {
      return null;
    }
    return extractScheduleJsonFromText(pastedInput, targetDay);
  }, [pastedInput, targetDay]);

  // Schedule metrics & collision detection
  const candidateItems = parseResult?.success ? parseResult.data : [];

  const { tasksCount, breaksCount, totalMinutes, collisions } = useMemo(() => {
    let tasks = 0;
    let breaks = 0;
    let mins = 0;

    for (const item of candidateItems) {
      mins += item.durationMinutes || 0;
      if (item.type === 'task') {
        tasks++;
      } else {
        breaks++;
      }
    }

    const detectedCollisions = detectScheduleCollisions(candidateItems);

    return {
      tasksCount: tasks,
      breaksCount: breaks,
      totalMinutes: mins,
      collisions: detectedCollisions,
    };
  }, [candidateItems]);

  if (!isAiModalOpen) return null;

  const handleCopyPrompt = async () => {
    const promptToCopy = userNotes.trim()
      ? `${AI_SCHEDULE_PROMPT_TEMPLATE}\n\nUser Schedule / Routine Notes to Convert:\n"""\n${userNotes.trim()}\n"""`
      : AI_SCHEDULE_PROMPT_TEMPLATE;

    try {
      await navigator.clipboard.writeText(promptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = promptToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReplaceImport = async () => {
    if (!parseResult?.success || candidateItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await replaceDayCustomItems(targetDay, candidateItems);
      showToast(
        `Replaced ${targetDay.toUpperCase()} schedule with ${candidateItems.length} items!`,
        'success'
      );
      closeAiModal();
      setPastedInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppendImport = async () => {
    if (!parseResult?.success || candidateItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await appendDayCustomItems(targetDay, candidateItems);
      showToast(
        `Appended ${candidateItems.length} items to ${targetDay.toUpperCase()}!`,
        'success'
      );
      closeAiModal();
      setPastedInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeAiModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-schedule-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 rounded-lg shadow-level-5 max-w-2xl w-full text-ink dark:text-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline dark:border-slate-800 bg-canvas-soft/40 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="ai-schedule-modal-title"
                className="text-body-strong sm:text-display-sm font-semibold text-ink dark:text-slate-100"
              >
                AI Schedule Assistant
              </h2>
              <p className="text-caption text-ink-mute dark:text-slate-400">
                Generate and import schedules using ChatGPT, Claude, or Gemini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAiModal}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas-soft-2 dark:hover:bg-slate-800 transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex border-b border-hairline dark:border-slate-800 px-5 pt-3 bg-canvas dark:bg-slate-900 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={clsx(
              'flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'prompt'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-semibold'
                : 'border-transparent text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Get AI Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={clsx(
              'flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-colors relative',
              activeTab === 'import'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-semibold'
                : 'border-transparent text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Import Schedule</span>
            {candidateItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: GET AI PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              {/* Step-by-Step Instructions */}
              <div className="p-3.5 rounded-md bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 space-y-2 text-xs text-purple-950 dark:text-purple-200">
                <span className="font-semibold block text-[13px] text-purple-900 dark:text-purple-300">
                  How it works:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-ink-body dark:text-purple-200/90 leading-relaxed">
                  <li>
                    Click <strong className="text-purple-700 dark:text-purple-300">&ldquo;Copy Prompt to Clipboard&rdquo;</strong> below.
                  </li>
                  <li>
                    Paste it into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong> along with your raw notes.
                  </li>
                  <li>
                    Switch to the <strong className="text-purple-700 dark:text-purple-300">&ldquo;Import Schedule&rdquo;</strong> tab and paste the AI&apos;s JSON reply.
                  </li>
                </ol>
              </div>

              {/* Optional Custom Notes Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ai-user-notes"
                  className="block text-xs font-medium text-ink dark:text-slate-300"
                >
                  Optional: Add your specific routine/tasks here before copying
                </label>
                <textarea
                  id="ai-user-notes"
                  rows={3}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="e.g. Wake up 07:00, 08:00 - 09:30 Client Presentation, 12:30 Lunch break, Gym in evening..."
                  className="w-full text-xs p-2.5 rounded-md border border-hairline dark:border-slate-700 bg-canvas-soft dark:bg-slate-800 text-ink dark:text-slate-100 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-sans"
                />
              </div>

              {/* Prompt Preview Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-mute dark:text-slate-400">
                  <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                    Master System Prompt Template
                  </span>
                  <span className="text-[11px]">Schema v1.0 • 24h Engine</span>
                </div>
                <div className="relative rounded-md border border-hairline dark:border-slate-800 bg-canvas-soft-2 dark:bg-slate-950 p-3 max-h-52 overflow-y-auto">
                  <pre className="font-mono text-[11px] text-ink-body dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                    {AI_SCHEDULE_PROMPT_TEMPLATE}
                  </pre>
                </div>
              </div>

              {/* Copy Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                  {userNotes.trim()
                    ? 'Includes your notes appended below prompt'
                    : 'System prompt ready to copy'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={clsx(
                      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-all',
                      copied
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Prompt to Clipboard</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-hairline dark:border-slate-700 hover:bg-canvas-soft dark:hover:bg-slate-800 text-ink dark:text-slate-200 transition-colors"
                  >
                    <span>Next: Import</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT SCHEDULE */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Target Day Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink dark:text-slate-300">
                  Target Day for Import:
                </label>
                <div className="grid grid-cols-7 gap-1.5 p-1 rounded-md bg-canvas-soft dark:bg-slate-800/60 border border-hairline dark:border-slate-700">
                  {DAYS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setTargetDay(d.key)}
                      className={clsx(
                        'py-1.5 text-xs font-mono font-medium rounded transition-all text-center',
                        targetDay === d.key
                          ? 'bg-purple-600 text-white font-semibold shadow-sm dark:bg-purple-600'
                          : 'text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-700'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ai-pasted-json"
                    className="block text-xs font-medium text-ink dark:text-slate-300"
                  >
                    Paste AI Response:
                  </label>
                  <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                    Supports JSON code blocks & conversational output
                  </span>
                </div>
                <textarea
                  id="ai-pasted-json"
                  rows={5}
                  value={pastedInput}
                  onChange={(e) => setPastedInput(e.target.value)}
                  placeholder={`Paste the AI's response here (e.g. \`\`\`json [ { "title": "Work", ... } ] \`\`\`)...`}
                  className="w-full text-xs font-mono p-3 rounded-md border border-hairline dark:border-slate-700 bg-canvas-soft dark:bg-slate-950 text-ink dark:text-slate-100 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all leading-relaxed"
                />
              </div>

              {/* Parsing Feedback & Validation Results */}
              {parseResult && !parseResult.success && (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">JSON Extraction Error</span>
                    <p className="text-rose-800 dark:text-rose-300 leading-relaxed font-mono text-[11px]">
                      {parseResult.error}
                    </p>
                  </div>
                </div>
              )}

              {/* Validated Summary Metrics Banner */}
              {parseResult?.success && candidateItems.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-md bg-canvas-soft-2 dark:bg-slate-800/80 border border-hairline dark:border-slate-700 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline dark:border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-ink dark:text-white">
                          Schedule Ready for Preview
                        </span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                        Target: {targetDay.toUpperCase()}
                      </span>
                    </div>

                    {/* Metrics Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                      <div className="p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                        <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                          Tasks & Breaks
                        </span>
                        <span className="text-xs font-semibold text-ink dark:text-slate-100 mt-0.5">
                          {tasksCount} Tasks, {breaksCount} Breaks
                        </span>
                      </div>

                      <div className="p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                        <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                          Allocated Time
                        </span>
                        <span
                          className={clsx(
                            'text-xs font-semibold mt-0.5',
                            totalMinutes > TOTAL_DAY_MINUTES
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-ink dark:text-slate-100'
                          )}
                        >
                          {formatDuration(totalMinutes)} / 24h
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                        <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                          Daily Pool Fit
                        </span>
                        <span className="text-xs font-semibold text-ink dark:text-slate-100 mt-0.5">
                          {TOTAL_DAY_MINUTES - totalMinutes >= 0
                            ? `${TOTAL_DAY_MINUTES - totalMinutes}m free`
                            : `+${totalMinutes - TOTAL_DAY_MINUTES}m over`}
                        </span>
                      </div>
                    </div>

                    {/* Collision Warning Banner */}
                    {collisions.length > 0 && (
                      <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-semibold block">
                            Collision Warning: {collisions.length} overlapping block(s) detected
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                            {collisions.map((col, idx) => (
                              <li key={idx}>
                                &ldquo;{col.itemA.title}&rdquo; ({format24To12Display(col.itemA.startTime)} -{' '}
                                {format24To12Display(col.itemA.endTime)}) overlaps &ldquo;{col.itemB.title}&rdquo; (
                                {format24To12Display(col.itemB.startTime)} -{' '}
                                {format24To12Display(col.itemB.endTime)}) [{col.overlapMinutes}m]
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Candidate Items Preview List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-ink-mute dark:text-slate-400 uppercase tracking-wider font-mono">
                      Task Schedule Preview ({candidateItems.length} items)
                    </span>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {candidateItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 rounded-md bg-canvas-soft/80 dark:bg-slate-800/60 border border-hairline dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Type Pill */}
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase',
                                item.type === 'task'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              )}
                            >
                              {item.type}
                            </span>

                            {/* Title & Category */}
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="font-medium text-ink dark:text-slate-100 truncate">
                                {item.title}
                              </span>
                              {item.category && (
                                <span className="hidden sm:inline text-[10px] text-ink-mute dark:text-slate-400 font-mono">
                                  • {item.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time / Duration info */}
                          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-mute dark:text-slate-400 flex-shrink-0">
                            {item.startTime && item.endTime ? (
                              <span className="text-ink dark:text-slate-200 font-medium">
                                {format24To12Display(item.startTime)} –{' '}
                                {format24To12Display(item.endTime)}
                              </span>
                            ) : (
                              <span className="italic text-ink-mute">Floating</span>
                            )}
                            <span>({item.durationMinutes}m)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Import Action Buttons */}
                  <div className="pt-2 border-t border-hairline dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                      Choose replace or append to {targetDay.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleReplaceImport}
                        title={`Replace all existing custom items on ${targetDay.toUpperCase()}`}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-md text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all shadow-sm"
                      >
                        Replace {targetDay.toUpperCase()} Schedule
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleAppendImport}
                        title={`Append ${candidateItems.length} items to ${targetDay.toUpperCase()}`}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                      >
                        Append to {targetDay.toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-hairline dark:border-slate-800 bg-canvas-soft/30 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
            Timetable Manager AI Importer
          </span>
          <button
            type="button"
            onClick={closeAiModal}
            className="px-3.5 py-1.5 rounded-md border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink dark:text-slate-200 text-xs font-medium transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
