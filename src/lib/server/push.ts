import "server-only";
import { db } from "@/lib/server/db";

/**
 * Push alerts to the team's phones and browsers through OneSignal web push.
 * Each browser that turns alerts on is linked to the admin user's id (OneSignal "external_id"),
 * so we target users, not devices. Without ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY nothing is sent.
 */

const ONESIGNAL_API = "https://api.onesignal.com/notifications?c=push";

export class PushSendError extends Error {}

export type PushMessage = {
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url: string;
};

/** The public OneSignal app id (safe to hand to the browser), or null when push isn't set up. */
export function pushAppId(): string | null {
  return process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY ? process.env.ONESIGNAL_APP_ID : null;
}

export function isPushConfigured(): boolean {
  return pushAppId() !== null;
}

/**
 * Sends a push to the given users' subscribed devices.
 * Returns false when none of them has alerts turned on; throws PushSendError when OneSignal refuses.
 */
export async function sendPush(userIds: string[], message: PushMessage): Promise<boolean> {
  const appId = pushAppId();
  if (!appId || userIds.length === 0) {
    return false;
  }
  const response = await fetch(ONESIGNAL_API, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: userIds },
      headings: { en: message.title },
      contents: { en: message.body },
      web_url: message.url,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await response.json().catch(() => null)) as { id?: string; errors?: unknown } | null;
  if (!response.ok) {
    throw new PushSendError(oneSignalError(response.status, json?.errors));
  }
  // OneSignal answers 200 with an empty id when no targeted device is subscribed.
  return Boolean(json?.id);
}

/** Internal alert to every active admin who has turned on alerts on a device. */
export async function notifyAdminsPush(message: PushMessage): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }
  const admins = await db().user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
  await sendPush(
    admins.map((admin) => admin.id),
    message,
  );
}

function oneSignalError(status: number, errors: unknown): string {
  const detail = Array.isArray(errors) ? errors.join(" ") : `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return `OneSignal rejected the key (${detail}). Check ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY.`;
  }
  return `OneSignal: ${detail}`;
}
