"use client";

import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { showDailyReminderNotification, getTodayLabel, msUntilTime } from "@/lib/notifications";

/**
 * Mounts invisibly inside AppShell. Schedules a setTimeout for the next
 * occurrence of the user's reminder time if the reminder is enabled and
 * today is an active day. Re-checks on window focus.
 */
export const NotificationScheduler: React.FC = () => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleNext() {
    const { reminderEnabled, reminderTime, activeDays } = useNotificationStore.getState();
    if (!reminderEnabled) return;

    const today = getTodayLabel();
    if (!activeDays.includes(today as never)) return;

    const ms = msUntilTime(reminderTime);

    timerRef.current = setTimeout(async () => {
      await showDailyReminderNotification();
      // schedule the next day's reminder
      scheduleNext();
    }, ms);
  }

  useEffect(() => {
    scheduleNext();

    const onFocus = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      scheduleNext();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};
