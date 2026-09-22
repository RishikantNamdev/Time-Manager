import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';

/**
 * Global keyboard navigation hook with input-focus guards.
 * Handles key bindings for view navigation, modal creation, closing dialogs, and cheat sheet.
 */
export function useKeyboardShortcuts(): void {
  const {
    openCreateModal,
    setActiveView,
    closeAllModals,
    toggleShortcutsModal,
    isModalOpen,
    isRoutineModalOpen,
    isDataModalOpen,
    isShortcutsModalOpen,
  } = useScheduleStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape should close active modals regardless of where focus is
      if (e.key === 'Escape') {
        if (isModalOpen || isRoutineModalOpen || isDataModalOpen || isShortcutsModalOpen) {
          e.preventDefault();
          closeAllModals();
        }
        return;
      }

      // Input-focus guard: Ignore other shortcuts when user is actively typing
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // KeyN or Ctrl+N / Cmd+N -> Open "+ Add Entry" task modal
      if (
        (e.key === 'n' || e.key === 'N') &&
        !e.altKey &&
        (!e.ctrlKey || e.ctrlKey) &&
        (!e.metaKey || e.metaKey)
      ) {
        e.preventDefault();
        openCreateModal();
        return;
      }

      // View switching: 1 (Daily), 2 (7-Day Overview), 3 (Analytics), 4 (Master Routines)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveView('daily');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setActiveView('week');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setActiveView('analytics');
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          setActiveView('routines');
          return;
        }
      }

      // '?' (Shift + /) -> Toggle keyboard shortcuts cheat sheet
      if (e.key === '?') {
        e.preventDefault();
        toggleShortcutsModal();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openCreateModal,
    setActiveView,
    closeAllModals,
    toggleShortcutsModal,
    isModalOpen,
    isRoutineModalOpen,
    isDataModalOpen,
    isShortcutsModalOpen,
  ]);
}
