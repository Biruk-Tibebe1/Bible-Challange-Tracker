"use client";

import { useEffect } from "react";
import {
  getLocalDateKey,
  isReminderDue,
  readReminderSettings,
  REMINDER_LAST_SHOWN_KEY,
} from "@/lib/reminders/reminder-settings";

export function PwaRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    let lastShownDate: string | null = null;
    try {
      lastShownDate = window.localStorage.getItem(REMINDER_LAST_SHOWN_KEY);
    } catch {
      lastShownDate = null;
    }
    let isShowingNotification = false;

    const reminderTimer = window.setInterval(() => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted" || isShowingNotification) return;
      let settings;
      try {
        settings = readReminderSettings(window.localStorage);
      } catch {
        return;
      }
      const now = new Date();
      if (!isReminderDue(settings, now, lastShownDate)) return;

      isShowingNotification = true;
      const dateKey = getLocalDateKey(now);
      lastShownDate = dateKey;
      try {
        window.localStorage.setItem(REMINDER_LAST_SHOWN_KEY, dateKey);
      } catch {
        // Keep this page session from showing a duplicate if storage is unavailable.
      }
      void (async () => {
        try {
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification("Bible reading reminder", {
              body: "Your daily reading is ready when you are.",
              icon: "/icon.svg",
              tag: "bible-reading-reminder",
            });
          } else {
            new Notification("Bible reading reminder", { body: "Your daily reading is ready when you are.", icon: "/icon.svg" });
          }
        } catch {
          // Reminder delivery is best-effort and only runs while this app is open.
        } finally {
          isShowingNotification = false;
        }
      })();
    }, 15_000);

    return () => window.clearInterval(reminderTimer);
  }, []);

  return null;
}