export const REMINDER_SETTINGS_KEY = "bible-reading-reminder-v1";
export const REMINDER_LAST_SHOWN_KEY = "bible-reading-reminder-last-shown-v1";

export interface ReminderSettings {
  enabled: boolean;
  time: string;
}

export interface ReminderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";
export type PermissionRequestResult = NotificationPermissionState | "error";

export interface NotificationPermissionClient {
  readonly permission: Exclude<NotificationPermissionState, "unsupported">;
  requestPermission(): Promise<Exclude<NotificationPermissionState, "unsupported">>;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: "19:00",
};

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function readReminderSettings(storage: ReminderStorage): ReminderSettings {
  try {
    const raw = storage.getItem(REMINDER_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return { ...DEFAULT_REMINDER_SETTINGS };
    const candidate = value as Partial<ReminderSettings>;
    if (typeof candidate.enabled !== "boolean" || !isValidTime(candidate.time)) {
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
    return { enabled: candidate.enabled, time: candidate.time };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
}

export function saveReminderSettings(storage: ReminderStorage, settings: ReminderSettings): boolean {
  if (typeof settings.enabled !== "boolean" || !isValidTime(settings.time)) return false;
  try {
    storage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(
  client: NotificationPermissionClient | null,
): Promise<PermissionRequestResult> {
  if (!client) return "unsupported";
  if (client.permission !== "default") return client.permission;
  try {
    return await client.requestPermission();
  } catch {
    return "error";
  }
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isReminderDue(settings: ReminderSettings, now: Date, lastShownDate: string | null): boolean {
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return settings.enabled && settings.time === currentTime && lastShownDate !== getLocalDateKey(now);
}