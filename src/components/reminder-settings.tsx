"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_REMINDER_SETTINGS,
  readReminderSettings,
  requestNotificationPermission,
  saveReminderSettings,
} from "@/lib/reminders/reminder-settings";
import type { NotificationPermissionClient, NotificationPermissionState, ReminderSettings } from "@/lib/reminders/reminder-settings";

function getNotificationClient(): NotificationPermissionClient | null {
  if (typeof Notification === "undefined") return null;
  return {
    get permission() {
      return Notification.permission;
    },
    requestPermission: () => Notification.requestPermission(),
  };
}

function getPermissionState(): NotificationPermissionState {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      setSettings(readReminderSettings(window.localStorage));
    } catch {
      setSettings({ ...DEFAULT_REMINDER_SETTINGS });
    }
    setPermission(getPermissionState());
  }, []);

  function save(nextSettings: ReminderSettings): boolean {
    try {
      const wasSaved = saveReminderSettings(window.localStorage, nextSettings);
      if (wasSaved) setSettings(nextSettings);
      setNotice(wasSaved ? "Reminder settings saved on this device." : "Unable to save reminder settings on this device.");
      return wasSaved;
    } catch {
      setNotice("Unable to save reminder settings on this device.");
      return false;
    }
  }

  async function toggleReminder(enabled: boolean) {
    setNotice("");
    if (!enabled) {
      save({ ...settings, enabled: false });
      return;
    }

    const result = await requestNotificationPermission(getNotificationClient());
    if (result !== "granted") {
      if (result !== "error") setPermission(result);
      setNotice(result === "denied"
        ? "Notifications are blocked. Allow them in your browser settings before enabling reminders."
        : result === "unsupported"
          ? "This browser does not support notifications."
          : "Notification permission was not granted; the reminder remains off.");
      return;
    }

    setPermission("granted");
    save({ ...settings, enabled: true });
  }

  function updateTime(time: string) {
    save({ ...settings, time });
  }

  return (
    <section aria-labelledby="reminder-settings-title" className="mt-7 border-y border-[var(--line)] py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">Settings</p>
      <h2 id="reminder-settings-title" className="mt-1 font-serif text-2xl text-[var(--ink)]">Daily reading reminder</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-[var(--ink)]">
          <input
            checked={settings.enabled}
            className="size-4 accent-[var(--forest)]"
            disabled={permission === "unsupported"}
            type="checkbox"
            onChange={(event) => void toggleReminder(event.target.checked)}
          />
          Enable reminder
        </label>
        <label className="text-sm text-[var(--muted)]" htmlFor="reading-reminder-time">
          Reminder time
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]"
            id="reading-reminder-time"
            type="time"
            value={settings.time}
            onChange={(event) => updateTime(event.target.value)}
          />
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        Notification permission: {permission}. Reminders are checked while this app is open; background push reminders are not configured.
      </p>
      {notice && <p aria-live="polite" className="mt-2 text-sm text-[var(--forest-deep)]" role="status">{notice}</p>}
    </section>
  );
}