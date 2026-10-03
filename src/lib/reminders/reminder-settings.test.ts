import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REMINDER_SETTINGS,
  isReminderDue,
  readReminderSettings,
  REMINDER_SETTINGS_KEY,
  requestNotificationPermission,
  saveReminderSettings,
} from "./reminder-settings.ts";
import type { ReminderStorage } from "./reminder-settings.ts";

class MemoryStorage implements ReminderStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("reminder settings persist locally and reject malformed values", () => {
  const storage = new MemoryStorage();
  const settings = { enabled: true, time: "07:45" };
  assert.equal(saveReminderSettings(storage, settings), true);
  assert.equal(storage.getItem(REMINDER_SETTINGS_KEY), JSON.stringify(settings));
  assert.deepEqual(readReminderSettings(storage), settings);
  assert.equal(saveReminderSettings(storage, { enabled: true, time: "25:61" }), false);
  storage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify({ enabled: "yes", time: "7pm" }));
  assert.deepEqual(readReminderSettings(storage), DEFAULT_REMINDER_SETTINGS);
});

test("notification permission is requested only through the explicit permission client", async () => {
  let requestCount = 0;
  const permission = await requestNotificationPermission({
    permission: "default",
    async requestPermission() {
      requestCount += 1;
      return "granted";
    },
  });
  assert.equal(permission, "granted");
  assert.equal(requestCount, 1);
  assert.equal(await requestNotificationPermission(null), "unsupported");
});

test("known permission states do not prompt again and request failures stay explicit", async () => {
  let requestCount = 0;
  assert.equal(await requestNotificationPermission({
    permission: "denied",
    async requestPermission() {
      requestCount += 1;
      return "granted";
    },
  }), "denied");
  assert.equal(requestCount, 0);
  assert.equal(await requestNotificationPermission({
    permission: "default",
    async requestPermission() {
      throw new Error("permission prompt unavailable");
    },
  }), "error");
});

test("reminder is due only at its configured local time and once per local day", () => {
  const settings = { enabled: true, time: "19:05" };
  const now = new Date(2026, 9, 3, 19, 5, 20);
  assert.equal(isReminderDue(settings, now, null), true);
  assert.equal(isReminderDue(settings, now, "2026-10-03"), false);
  assert.equal(isReminderDue({ ...settings, enabled: false }, now, null), false);
});