"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const ALL_DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface NotificationState {
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM" 24-hour format
  activeDays: DayOfWeek[];
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setActiveDays: (days: DayOfWeek[]) => void;
  toggleDay: (day: DayOfWeek) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      reminderEnabled: false,
      reminderTime: "20:00",
      activeDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      setReminderEnabled: (enabled) => set({ reminderEnabled: enabled }),
      setReminderTime: (time) => set({ reminderTime: time }),
      setActiveDays: (days) => set({ activeDays: days }),
      toggleDay: (day) =>
        set((s) => ({
          activeDays: s.activeDays.includes(day)
            ? s.activeDays.filter((d) => d !== day)
            : [...s.activeDays, day],
        })),
    }),
    {
      name: "money-flow:notifications",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
