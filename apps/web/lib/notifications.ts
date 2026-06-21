/**
 * Notification helpers for Money Flow.
 * Wraps the browser Notification API with graceful fallbacks.
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function showDailyReminderNotification(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    await registration.showNotification("Money Flow Reminder", {
      body: "Don't forget to record your transactions for today! 💰",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "daily-reminder",
    });
  } else {
    new Notification("Money Flow Reminder", {
      body: "Don't forget to record your transactions for today! 💰",
      icon: "/icons/icon-192.png",
    });
  }
}

/**
 * Maps JS getDay() (0=Sun) to our DayOfWeek labels.
 */
const DAY_MAP: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function getTodayLabel(): string {
  return DAY_MAP[new Date().getDay()];
}

/**
 * Returns milliseconds until the next occurrence of HH:MM today (or tomorrow
 * if that time has already passed today).
 */
export function msUntilTime(hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}
