import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { dropPushSubscription, listPushSubscriptions } from "@/lib/db/push";

export interface PushMessage {
  title: string;
  body: string;
  /** Same-site path opened when the notification is tapped. */
  url: string;
  /** A new message with the same tag replaces the old one. */
  tag?: string;
}

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@checkm8.invalid";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return configure();
}

/**
 * Sends a notification to every device of a user. Never throws: a failed notification must
 * not break the game move or challenge that caused it. Dead subscriptions are removed.
 */
export async function sendPush(userId: string, message: PushMessage): Promise<void> {
  try {
    if (!configure()) return;
    const subs = await listPushSubscriptions(userId);
    const payload = JSON.stringify(message);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 3600 });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await dropPushSubscription(sub._id);
        }
      }),
    );
  } catch {
    // Ignore: notifications are best effort.
  }
}

/** Sends after the response is returned when possible, so a slow push service never slows a move. */
export function notify(userId: string | null | undefined, message: PushMessage): void {
  if (!userId || !configure()) return;
  try {
    after(() => sendPush(userId, message));
  } catch {
    void sendPush(userId, message);
  }
}
