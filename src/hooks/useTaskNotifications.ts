import { useState, useEffect, useRef, useCallback } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { DayOfWeek } from '../types/schedule';
import { parseTimeToMinutes } from '../utils/timeMath';

const STORAGE_KEY = 'notifications_enabled';

const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface TaskNotificationsHook {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  toggleNotifications: () => Promise<void>;
}

export function useTaskNotifications(): TaskNotificationsHook {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  // Set of alerted tasks for today
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const lastDateStrRef = useRef<string>('');

  // Initial detection of Notification API support & stored settings
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true' && Notification.permission === 'granted') {
        setIsEnabled(true);
      } else if (Notification.permission === 'denied') {
        setIsEnabled(false);
      }
    }
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!isSupported) {
      alert('Web Notifications are not supported by your browser.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert(
        'Notification permissions are currently blocked in your browser settings. Please enable notifications for this site to receive task schedule alerts.'
      );
      setIsEnabled(false);
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          setIsEnabled(true);
          localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          setIsEnabled(false);
          localStorage.setItem(STORAGE_KEY, 'false');
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
      return;
    }

    if (Notification.permission === 'granted') {
      setIsEnabled((prev) => {
        const next = !prev;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    }
  }, [isSupported]);

  // Active 30-second schedule polling interval
  useEffect(() => {
    if (!isSupported || !isEnabled || permission !== 'granted') {
      return;
    }

    const checkScheduleAlarms = () => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];

      // Reset notified set at midnight
      if (lastDateStrRef.current !== todayDateStr) {
        lastDateStrRef.current = todayDateStr;
        notifiedTasksRef.current.clear();
      }

      const currentDay = DAY_MAP[now.getDay()];
      const currentMinute = now.getHours() * 60 + now.getMinutes();

      const store = useScheduleStore.getState();
      const todayItems = store.getResolvedItemsForDay(currentDay);

      // Check fixed-time tasks scheduled for today
      for (const item of todayItems) {
        if (!item.startTime || !item.endTime) continue;

        const taskStartMin = parseTimeToMinutes(item.startTime);
        const diffMinutes = Math.abs(taskStartMin - currentMinute);

        // Alert if task starts within +/- 1 minute and has not alerted today
        if (diffMinutes <= 1 && !notifiedTasksRef.current.has(item.id)) {
          notifiedTasksRef.current.add(item.id);

          try {
            const duration = item.durationMinutes || 0;
            const category = item.category || (item.type === 'break' ? 'Rest' : 'Task');
            new Notification(`Time for: ${item.title}`, {
              body: `${category} • ${duration} min block starts now.`,
              icon: '/favicon.ico',
            });
          } catch (e) {
            console.error('Failed to trigger notification:', e);
          }
        }
      }
    };

    // Immediate check on enable, followed by 30-second interval
    checkScheduleAlarms();
    const interval = setInterval(checkScheduleAlarms, 30000);

    return () => clearInterval(interval);
  }, [isSupported, isEnabled, permission]);

  return {
    isSupported,
    permission,
    isEnabled,
    toggleNotifications,
  };
}
