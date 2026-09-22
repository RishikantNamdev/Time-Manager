import React from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { X, Keyboard, Command } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, closeShortcutsModal } = useScheduleStore();

  if (!isShortcutsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeShortcutsModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas dark:bg-slate-900 border border-hairline dark:border-slate-800 rounded-lg shadow-level-5 p-6 max-w-lg w-full text-ink dark:text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-canvas-soft-2 dark:bg-slate-800 flex items-center justify-center text-ink dark:text-slate-200 border border-hairline dark:border-slate-700">
              <Keyboard className="w-4 h-4 text-brand-link" />
            </div>
            <div>
              <h2
                id="shortcuts-modal-title"
                className="text-display-sm font-semibold tracking-tight-sm text-ink dark:text-slate-100"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-caption text-ink-mute dark:text-slate-400 mt-0.5">
                Speed up your daily time budgeting workflow with global hotkeys.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeShortcutsModal}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-ink-mute dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-canvas-soft-2 dark:hover:bg-slate-800 transition-colors"
            title="Close shortcuts guide (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Two-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Column 1: Navigation */}
          <div className="space-y-3">
            <h3 className="text-caption-mono font-semibold uppercase tracking-wider text-ink-mute dark:text-slate-400 flex items-center gap-1.5">
              <span>View Navigation</span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Daily Schedule</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  1
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">7-Day Overview</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  2
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Analytics</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  3
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Master Routines</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  4
                </kbd>
              </div>
            </div>
          </div>

          {/* Column 2: Actions & Modals */}
          <div className="space-y-3">
            <h3 className="text-caption-mono font-semibold uppercase tracking-wider text-ink-mute dark:text-slate-400 flex items-center gap-1.5">
              <span>Actions & Dialogs</span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">New Task / Entry</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                    N
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Close active modal</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Toggle shortcuts guide</span>
                <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                  ?
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-sm bg-canvas-soft/60 dark:bg-slate-800/40 border border-hairline dark:border-slate-800">
                <span className="text-xs text-ink-body dark:text-slate-300">Add Entry Alternative</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white flex items-center">
                    <Command className="w-3 h-3 mr-0.5" /> Ctrl
                  </kbd>
                  <span className="text-xs text-ink-mute">+</span>
                  <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-xs shadow-sm text-ink dark:text-white">
                    N
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip note */}
        <div className="p-3 rounded-sm bg-canvas-soft dark:bg-slate-800/40 border border-hairline dark:border-slate-800 text-[11px] font-mono text-ink-mute dark:text-slate-400">
          💡 Shortcuts are automatically paused when typing inside form inputs and text areas.
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-hairline dark:border-slate-800">
          <button
            type="button"
            onClick={closeShortcutsModal}
            className="px-4 py-2 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 hover:bg-canvas-soft-2 dark:hover:bg-slate-700 text-ink dark:text-slate-200 text-xs font-medium transition-colors shadow-level-1"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
