"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, AlertTriangle } from "lucide-react";
import { useNotificationStore, ALL_DAYS, type DayOfWeek } from "@/store/notificationStore";
import { requestNotificationPermission, showDailyReminderNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function NotificationSettingsPage() {
  const {
    reminderEnabled,
    reminderTime,
    activeDays,
    overBudgetEnabled,
    setReminderEnabled,
    setReminderTime,
    toggleDay,
    setOverBudgetEnabled,
  } = useNotificationStore();

  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function handleToggleReminder(checked: boolean) {
    if (checked) {
      const p = await requestNotificationPermission();
      setPermission(p);
      if (p !== "granted") return;
    }
    setReminderEnabled(checked);
  }

  async function handleTestNotification() {
    const p = await requestNotificationPermission();
    setPermission(p);
    if (p === "granted") {
      await showDailyReminderNotification();
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure your daily reminder to log transactions.
        </p>
      </div>

      {/* Permission banner */}
      {permission === "denied" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Notifications are blocked in your browser. Please enable them in your browser settings to use this feature.
        </div>
      )}

      {/* Master toggle */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Daily Reminder</Label>
            <p className="text-sm text-muted-foreground">
              Receive a push notification to log your transactions.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reminderEnabled}
            onClick={() => handleToggleReminder(!reminderEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              reminderEnabled ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                reminderEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Time picker */}
        <div className={`space-y-2 ${!reminderEnabled ? "opacity-40 pointer-events-none" : ""}`}>
          <Label htmlFor="reminder-time" className="flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Reminder Time
          </Label>
          <input
            id="reminder-time"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Day selector */}
        <div className={`space-y-2 ${!reminderEnabled ? "opacity-40 pointer-events-none" : ""}`}>
          <Label className="text-sm font-medium">Active Days</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeDays.includes(day)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-input hover:border-primary"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Over-budget alert toggle */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Over-budget Alert
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Get notified when spending exceeds a budget limit.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={overBudgetEnabled}
            onClick={async () => {
              if (!overBudgetEnabled) {
                const p = await requestNotificationPermission();
                setPermission(p);
                if (p !== "granted") return;
              }
              setOverBudgetEnabled(!overBudgetEnabled);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              overBudgetEnabled ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                overBudgetEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Test button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestNotification}
        className="flex items-center gap-2"
      >
        {permission === "granted" ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        Send Test Notification
      </Button>

      {permission === "granted" && (
        <p className="text-xs text-muted-foreground">
          Notifications permission: granted. Your reminder will fire at {reminderTime} on active days.
        </p>
      )}
    </div>
  );
}
