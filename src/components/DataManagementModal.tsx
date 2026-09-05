import React, { useState, useRef, useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { exportScheduleData, validateAndParseBackup } from '../utils/dataPortability';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

export const DataManagementModal: React.FC = () => {
  const {
    isDataModalOpen,
    closeDataModal,
    daySchedules,
    masterRoutines,
    importScheduleData,
    resetToDefaults,
  } = useScheduleStore();

  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDataModalOpen) {
      setImportStatus({ type: null, message: '' });
      setIsConfirmingReset(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDataModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDataModalOpen, closeDataModal]);

  if (!isDataModalOpen) return null;

  const handleExport = () => {
    try {
      exportScheduleData(daySchedules, masterRoutines);
      setImportStatus({
        type: 'success',
        message: 'Backup JSON downloaded successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed.';
      setImportStatus({ type: 'error', message: msg });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const validation = validateAndParseBackup(content);

      if (!validation.success) {
        setImportStatus({
          type: 'error',
          message: validation.error,
        });
        return;
      }

      await importScheduleData(
        validation.data.daySchedules,
        validation.data.masterRoutines
      );

      setImportStatus({
        type: 'success',
        message: 'Schedule and master routines successfully restored from backup!',
      });
    };

    reader.onerror = () => {
      setImportStatus({
        type: 'error',
        message: 'Failed to read file from local disk.',
      });
    };

    reader.readAsText(file);
    // Reset file input value so user can re-upload if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetConfirm = async () => {
    await resetToDefaults();
    setIsConfirmingReset(false);
    setImportStatus({
      type: 'success',
      message: 'All schedules and master routines have been cleared to a clean slate.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Card Surface: Follows DESIGN.md ex-modal-card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-modal-title"
        className="bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 rounded-lg shadow-level-5 p-6 max-w-md w-full text-ink dark:text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-hairline dark:border-slate-800 pb-4">
          <div>
            <h2 id="data-modal-title" className="text-display-sm font-semibold tracking-tight-sm text-ink dark:text-slate-100 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-brand-link" />
              <span>Data & Backup</span>
            </h2>
            <p className="text-caption text-ink-mute dark:text-slate-400 mt-0.5">
              Export, import, and manage offline data portability.
            </p>
          </div>

          <button
            onClick={closeDataModal}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas-soft-2 dark:hover:bg-slate-800 transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert (Success or Error) */}
        {importStatus.type && (
          <div
            className={clsx(
              'p-3.5 rounded-sm border text-xs font-mono flex items-start gap-2.5 animate-in fade-in duration-150',
              importStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            )}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{importStatus.message}</div>
          </div>
        )}

        {/* Section 1: Export Backup */}
        <div className="p-4 rounded-md bg-canvas-soft dark:bg-slate-950 border border-hairline dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-body dark:text-slate-300 font-semibold uppercase tracking-wider">
              Export Backup File
            </span>
            <span className="text-caption-mono text-ink-mute dark:text-slate-500">.json format</span>
          </div>
          <p className="text-xs text-ink-mute dark:text-slate-400 leading-relaxed">
            Download a formatted JSON snapshot of all 7-day schedules, tasks, overrides, and master routines.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="w-full py-2 px-3.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-900 hover:bg-canvas-soft-2 dark:hover:bg-slate-800 text-ink dark:text-slate-200 text-xs font-medium transition-colors shadow-level-1 flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-brand-link" />
            <span>Download timetable-backup.json</span>
          </button>
        </div>

        {/* Section 2: Import / Restore */}
        <div className="p-4 rounded-md bg-canvas-soft dark:bg-slate-950 border border-hairline dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-caption-mono text-ink-body dark:text-slate-300 font-semibold uppercase tracking-wider">
              Restore from Backup
            </span>
            <span className="text-caption-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Validated
            </span>
          </div>
          <p className="text-xs text-ink-mute dark:text-slate-400 leading-relaxed">
            Upload a previously exported backup file to restore complete schedule state.
          </p>

          <label
            htmlFor="backup-file-upload"
            className="w-full py-3 px-3.5 rounded-sm border border-dashed border-hairline-strong dark:border-slate-700 hover:border-ink dark:hover:border-slate-400 bg-canvas dark:bg-slate-900 text-center cursor-pointer transition-colors block group"
          >
            <input
              id="backup-file-upload"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="sr-only"
            />
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-4 h-4 text-ink-mute dark:text-slate-400 group-hover:text-ink dark:group-hover:text-white transition-colors" />
              <span className="text-xs font-medium text-ink-body dark:text-slate-300 group-hover:text-ink dark:group-hover:text-white">
                Click to browse or drop backup JSON
              </span>
              <span className="text-[10px] font-mono text-ink-mute dark:text-slate-500">
                Must match Section 7 schema
              </span>
            </div>
          </label>
        </div>

        {/* Section 3: Destructive Reset */}
        <div className="p-4 rounded-md bg-canvas-soft dark:bg-slate-950 border border-hairline dark:border-slate-800 space-y-2.5">
          <span className="text-caption-mono text-brand-error font-semibold uppercase tracking-wider block">
            Reset to Blank Schedule
          </span>
          <p className="text-xs text-ink-mute dark:text-slate-400 leading-relaxed">
            Clear all scheduled tasks, breaks, and routines across all 7 days to start fresh.
          </p>

          {isConfirmingReset ? (
            <div className="p-3 rounded-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-200 block">
                Are you sure you want to clear all tasks and routines? This will reset your entire schedule to a clean slate.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="flex-1 py-1.5 rounded-sm bg-brand-error hover:bg-brand-error/90 text-white text-xs font-medium transition-colors"
                >
                  Yes, Clear All Tasks & Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-3 py-1.5 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-900 hover:bg-canvas-soft-2 dark:hover:bg-slate-800 text-ink dark:text-slate-200 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingReset(true)}
              className="w-full py-2 px-3.5 rounded-sm border border-rose-200 dark:border-rose-900/50 bg-canvas dark:bg-slate-900 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-brand-error text-xs font-medium transition-colors shadow-level-1 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-error" />
              <span>Clear All Tasks & Reset</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-hairline dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={closeDataModal}
            className="px-4 py-2 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-900 hover:bg-canvas-soft-2 dark:hover:bg-slate-800 text-ink dark:text-slate-200 text-xs font-medium transition-colors shadow-level-1"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
