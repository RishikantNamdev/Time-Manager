import React, { useState, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek, DayKey } from '../types/schedule';
import {
  AI_SCHEDULE_PROMPT_TEMPLATE,
  extractWeeklyScheduleFromText,
  ALL_DAYS,
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
  Layers,
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
    replaceWeeklyCustomItems,
    appendWeeklyCustomItems,
    showToast,
  } = useScheduleStore();

  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [userNotes, setUserNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const [pastedInput, setPastedInput] = useState('');
  const [targetDay, setTargetDay] = useState<DayOfWeek>(selectedDay);
  const [selectedPreviewDay, setSelectedPreviewDay] = useState<DayKey | 'all'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync target day when modal opens or selectedDay changes
  useEffect(() => {
    if (isAiModalOpen) {
      setTargetDay(selectedDay);
      setSelectedPreviewDay('all');
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

  // Real-time weekly schedule parsing
  const weeklyResult = useMemo(() => {
    if (!pastedInput.trim()) {
      return null;
    }
    return extractWeeklyScheduleFromText(pastedInput, targetDay);
  }, [pastedInput, targetDay]);

  const isMultiDay = Boolean(weeklyResult?.success && weeklyResult.isMultiDay);
  const configuredDays = weeklyResult?.configuredDays || [];

  // When multi-day is newly detected, default preview to 'all'
  useEffect(() => {
    if (isMultiDay) {
      setSelectedPreviewDay('all');
    } else {
      setSelectedPreviewDay(targetDay);
    }
  }, [isMultiDay, targetDay]);

  // Collisions computed per day
  const dailyCollisions = useMemo(() => {
    const collisionsMap: Record<DayKey, ReturnType<typeof detectScheduleCollisions>> = {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    if (!weeklyResult?.success) return collisionsMap;

    for (const d of ALL_DAYS) {
      const items = weeklyResult.weeklyTasks[d] || [];
      collisionsMap[d] = detectScheduleCollisions(items);
    }
    return collisionsMap;
  }, [weeklyResult]);

  // Active items for the currently selected preview view (all days or specific day)
  const previewItemsForDay = useMemo(() => {
    if (!weeklyResult?.success) return [];
    if (selectedPreviewDay === 'all') {
      return [];
    }
    return weeklyResult.weeklyTasks[selectedPreviewDay] || [];
  }, [weeklyResult, selectedPreviewDay]);

  // Aggregate metrics for specific day
  const singleDayMetrics = useMemo(() => {
    let tasks = 0;
    let breaks = 0;
    let mins = 0;

    for (const item of previewItemsForDay) {
      mins += item.durationMinutes || 0;
      if (item.type === 'task') {
        tasks++;
      } else {
        breaks++;
      }
    }

    const collisions = selectedPreviewDay !== 'all' ? dailyCollisions[selectedPreviewDay] : [];

    return {
      tasksCount: tasks,
      breaksCount: breaks,
      totalMinutes: mins,
      collisions,
    };
  }, [previewItemsForDay, selectedPreviewDay, dailyCollisions]);

  // Total collisions count across all days
  const totalAllCollisionsCount = useMemo(() => {
    return Object.values(dailyCollisions).reduce((acc, colList) => acc + colList.length, 0);
  }, [dailyCollisions]);

  if (!isAiModalOpen) return null;

  const handleCopyPrompt = async () => {
    const promptToCopy = userNotes.trim()
      ? `${AI_SCHEDULE_PROMPT_TEMPLATE}\n\nUser Weekly Routine Notes to Convert:\n"""\n${userNotes.trim()}\n"""`
      : AI_SCHEDULE_PROMPT_TEMPLATE;

    try {
      await navigator.clipboard.writeText(promptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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

  // Full-Week Import Handlers
  const handleReplaceEntireWeek = async () => {
    if (!weeklyResult?.success) return;
    setIsSubmitting(true);
    try {
      await replaceWeeklyCustomItems(weeklyResult.weeklyTasks);
      showToast(
        `Applied schedule across entire week (${configuredDays.length} days configured)!`,
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

  const handleAppendEntireWeek = async () => {
    if (!weeklyResult?.success) return;
    setIsSubmitting(true);
    try {
      await appendWeeklyCustomItems(weeklyResult.weeklyTasks);
      showToast(
        `Appended items across ${configuredDays.length} days of the week!`,
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

  // Single-Day Import Handlers
  const dayToImport = (selectedPreviewDay !== 'all' ? selectedPreviewDay : targetDay) as DayOfWeek;
  const itemsForDayToImport = weeklyResult?.weeklyTasks[dayToImport] || [];

  const handleReplaceSingleDay = async () => {
    if (!weeklyResult?.success || itemsForDayToImport.length === 0) return;
    setIsSubmitting(true);
    try {
      await replaceDayCustomItems(dayToImport, itemsForDayToImport);
      showToast(
        `Replaced ${dayToImport.toUpperCase()} schedule with ${itemsForDayToImport.length} items!`,
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

  const handleAppendSingleDay = async () => {
    if (!weeklyResult?.success || itemsForDayToImport.length === 0) return;
    setIsSubmitting(true);
    try {
      await appendDayCustomItems(dayToImport, itemsForDayToImport);
      showToast(
        `Appended ${itemsForDayToImport.length} items to ${dayToImport.toUpperCase()}!`,
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
                Generate single-day or full-week schedules using ChatGPT, Claude, or Gemini
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
            {weeklyResult?.success && (
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
                  Full-Week & Multi-Day Scheduling:
                </span>
                <p className="text-ink-body dark:text-purple-200/90 leading-relaxed">
                  Describe your routine once: distinguish between <strong>weekdays</strong>, <strong>weekends</strong>, <strong>daily habits</strong>, or <strong>specific days</strong> (e.g., &ldquo;Monday &amp; Wednesday Gym&rdquo;). The AI assigns tasks to each day automatically.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-ink-body dark:text-purple-200/90 leading-relaxed pt-1">
                  <li>
                    Click <strong className="text-purple-700 dark:text-purple-300">&ldquo;Copy Prompt to Clipboard&rdquo;</strong> below.
                  </li>
                  <li>
                    Paste into <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong> with your routine.
                  </li>
                  <li>
                    Switch to the <strong className="text-purple-700 dark:text-purple-300">&ldquo;Import Schedule&rdquo;</strong> tab and paste the AI&apos;s reply to populate your entire week in one click.
                  </li>
                </ol>
              </div>

              {/* Optional Custom Notes Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="ai-user-notes"
                  className="block text-xs font-medium text-ink dark:text-slate-300"
                >
                  Optional: Describe your routine here before copying
                </label>
                <textarea
                  id="ai-user-notes"
                  rows={3}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Describe your schedule once (e.g., Weekdays 9-5 work, Weekends relaxing, Daily 30m walk)."
                  className="w-full text-xs p-2.5 rounded-md border border-hairline dark:border-slate-700 bg-canvas-soft dark:bg-slate-800 text-ink dark:text-slate-100 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-sans"
                />
              </div>

              {/* Prompt Preview Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-mute dark:text-slate-400">
                  <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                    Master Weekly System Prompt Template
                  </span>
                  <span className="text-[11px]">Multi-Day Schema • 24h Engine</span>
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
                    Supports JSON array, multi-day `days` tags, or day-grouped dict
                  </span>
                </div>
                <textarea
                  id="ai-pasted-json"
                  rows={4}
                  value={pastedInput}
                  onChange={(e) => setPastedInput(e.target.value)}
                  placeholder={`Paste the AI's response here (e.g. \`\`\`json [ { "title": "Deep Work", "days": ["weekdays"], ... } ] \`\`\`)...`}
                  className="w-full text-xs font-mono p-3 rounded-md border border-hairline dark:border-slate-700 bg-canvas-soft dark:bg-slate-950 text-ink dark:text-slate-100 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all leading-relaxed"
                />
              </div>

              {/* Parsing Feedback & Validation Results */}
              {weeklyResult && !weeklyResult.success && (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">JSON Extraction Error</span>
                    <p className="text-rose-800 dark:text-rose-300 leading-relaxed font-mono text-[11px]">
                      {weeklyResult.error}
                    </p>
                  </div>
                </div>
              )}

              {/* MULTI-DAY DETECTION BADGE & SELECTOR */}
              {weeklyResult?.success && (
                <div className="space-y-3">
                  {isMultiDay ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs font-semibold">
                            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            Multi-Day Schedule Detected ({configuredDays.length} Days Configured)
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                          Inspect day preview:
                        </span>
                      </div>

                      {/* Day Selector Pills (All + Mon..Sun) */}
                      <div className="grid grid-cols-8 gap-1.5 p-1 rounded-md bg-canvas-soft dark:bg-slate-800/60 border border-hairline dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewDay('all')}
                          className={clsx(
                            'py-1.5 text-xs font-mono font-medium rounded transition-all text-center',
                            selectedPreviewDay === 'all'
                              ? 'bg-purple-600 text-white font-semibold shadow-sm dark:bg-purple-600'
                              : 'text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-slate-700'
                          )}
                        >
                          All ({weeklyResult.totalTasksCount})
                        </button>
                        {DAYS.map((d) => {
                          const count = weeklyResult.weeklyTasks[d.key].length;
                          return (
                            <button
                              key={d.key}
                              type="button"
                              onClick={() => {
                                setSelectedPreviewDay(d.key);
                                setTargetDay(d.key);
                              }}
                              className={clsx(
                                'py-1.5 text-xs font-mono font-medium rounded transition-all text-center relative',
                                selectedPreviewDay === d.key
                                  ? 'bg-purple-600 text-white font-semibold shadow-sm dark:bg-purple-600'
                                  : count > 0
                                  ? 'text-ink dark:text-slate-200 hover:bg-canvas dark:hover:bg-slate-700'
                                  : 'text-ink-mute/50 dark:text-slate-600 hover:text-ink hover:bg-canvas dark:hover:bg-slate-700'
                              )}
                            >
                              <span>{d.label}</span>
                              {count > 0 && (
                                <span className="ml-1 text-[10px] opacity-80">({count})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Single-day target selector */
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-ink dark:text-slate-300">
                        Target Day for Single-Day Import:
                      </label>
                      <div className="grid grid-cols-7 gap-1.5 p-1 rounded-md bg-canvas-soft dark:bg-slate-800/60 border border-hairline dark:border-slate-700">
                        {DAYS.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              setTargetDay(d.key);
                              setSelectedPreviewDay(d.key);
                            }}
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
                  )}

                  {/* PREVIEW CONTENT */}
                  {selectedPreviewDay === 'all' ? (
                    /* Entire Week Overview Preview */
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-md bg-canvas-soft-2 dark:bg-slate-800/80 border border-hairline dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-semibold text-ink dark:text-white">
                              Full-Week Schedule Ready ({weeklyResult.totalTasksCount} Total Tasks)
                            </span>
                          </div>
                          {totalAllCollisionsCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {totalAllCollisionsCount} collision(s) detected across week
                            </span>
                          )}
                        </div>

                        {/* Weekday cards breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                          {ALL_DAYS.map((d) => {
                            const dayTasks = weeklyResult.weeklyTasks[d];
                            const dayMins = dayTasks.reduce(
                              (sum, t) => sum + (t.durationMinutes || 0),
                              0
                            );
                            const hasCol = dailyCollisions[d].length > 0;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setSelectedPreviewDay(d);
                                  setTargetDay(d);
                                }}
                                className={clsx(
                                  'p-2 rounded text-left border transition-all',
                                  dayTasks.length > 0
                                    ? 'bg-canvas dark:bg-slate-900 border-hairline dark:border-slate-800 hover:border-purple-400'
                                    : 'bg-canvas-soft/40 dark:bg-slate-900/40 border-hairline/50 opacity-60'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold uppercase text-xs text-ink dark:text-slate-200">
                                    {d}
                                  </span>
                                  {hasCol && (
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  )}
                                </div>
                                <div className="text-[11px] text-ink-mute dark:text-slate-400 mt-1">
                                  {dayTasks.length} items • {formatDuration(dayMins)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Full-Week Import Action Panel */}
                      <div className="pt-2 border-t border-hairline dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                          Apply to all {configuredDays.length} configured days in one click
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleReplaceEntireWeek}
                            title="Replace existing custom items for all configured days"
                            className="flex-1 sm:flex-none px-3.5 py-2 rounded-md text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all shadow-sm"
                          >
                            Replace Entire Week
                          </button>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleAppendEntireWeek}
                            title="Append new items to existing tasks across all configured days"
                            className="flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                          >
                            Apply to Entire Week
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Specific Single Day Preview */
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-md bg-canvas-soft-2 dark:bg-slate-800/80 border border-hairline dark:border-slate-700 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline dark:border-slate-700 pb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-semibold text-ink dark:text-white">
                              Preview for {selectedPreviewDay.toUpperCase()} ({previewItemsForDay.length} items)
                            </span>
                          </div>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                            Day: {selectedPreviewDay.toUpperCase()}
                          </span>
                        </div>

                        {/* Metrics Counters */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                          <div className="p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                            <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                              Tasks &amp; Breaks
                            </span>
                            <span className="text-xs font-semibold text-ink dark:text-slate-100 mt-0.5">
                              {singleDayMetrics.tasksCount} Tasks, {singleDayMetrics.breaksCount} Breaks
                            </span>
                          </div>

                          <div className="p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                            <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                              Allocated Time
                            </span>
                            <span
                              className={clsx(
                                'text-xs font-semibold mt-0.5',
                                singleDayMetrics.totalMinutes > TOTAL_DAY_MINUTES
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-ink dark:text-slate-100'
                              )}
                            >
                              {formatDuration(singleDayMetrics.totalMinutes)} / 24h
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-1 p-2 rounded bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 flex flex-col">
                            <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                              Daily Pool Fit
                            </span>
                            <span className="text-xs font-semibold text-ink dark:text-slate-100 mt-0.5">
                              {TOTAL_DAY_MINUTES - singleDayMetrics.totalMinutes >= 0
                                ? `${TOTAL_DAY_MINUTES - singleDayMetrics.totalMinutes}m free`
                                : `+${singleDayMetrics.totalMinutes - TOTAL_DAY_MINUTES}m over`}
                            </span>
                          </div>
                        </div>

                        {/* Day Collision Warning Banner */}
                        {singleDayMetrics.collisions.length > 0 && (
                          <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-semibold block">
                                Collision Warning: {singleDayMetrics.collisions.length} overlapping block(s) detected
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                                {singleDayMetrics.collisions.map((col, idx) => (
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

                      {/* Items Preview List for selected day */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-ink-mute dark:text-slate-400 uppercase tracking-wider font-mono">
                          Schedule Preview for {selectedPreviewDay.toUpperCase()} ({previewItemsForDay.length} items)
                        </span>

                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {previewItemsForDay.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="p-2.5 rounded-md bg-canvas-soft/80 dark:bg-slate-800/60 border border-hairline dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
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

                      {/* Day Action Buttons */}
                      <div className="pt-2 border-t border-hairline dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
                          {isMultiDay
                            ? `Apply only to ${selectedPreviewDay.toUpperCase()} or switch to entire week`
                            : `Choose replace or append to ${targetDay.toUpperCase()}`}
                        </span>

                        <div className="flex items-center gap-2">
                          {isMultiDay && (
                            <button
                              type="button"
                              onClick={handleAppendEntireWeek}
                              className="px-3 py-2 rounded-md text-xs font-medium border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                            >
                              Apply to Entire Week
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isSubmitting || previewItemsForDay.length === 0}
                            onClick={handleReplaceSingleDay}
                            className="flex-1 sm:flex-none px-3.5 py-2 rounded-md text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all shadow-sm"
                          >
                            Replace {selectedPreviewDay.toUpperCase()}
                          </button>

                          <button
                            type="button"
                            disabled={isSubmitting || previewItemsForDay.length === 0}
                            onClick={handleAppendSingleDay}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                          >
                            Apply to {selectedPreviewDay.toUpperCase()}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-hairline dark:border-slate-800 bg-canvas-soft/30 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-ink-mute dark:text-slate-400">
            Timetable Manager AI Weekly Importer
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
