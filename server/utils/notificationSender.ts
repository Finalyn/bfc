import webpush from "web-push";
import { db } from "../db";
import { pushSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@finalyn.app";

let vapidConfigured = false;

export function initializeWebPush(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("[PUSH] VAPID keys not configured - push notifications disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
  console.log("[PUSH] Web Push configured successfully");
  return true;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;
  data: {
    url?: string;
    eventType: string;
    orderCode: string;
    eventDate: string;
  };
}

export async function sendPushToUser(
  userName: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!vapidConfigured) return { sent: 0, failed: 0, cleaned: 0 };

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userName, userName));

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      sent++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, sub.endpoint));
        cleaned++;
      } else {
        console.error(`[PUSH] Failed to send to ${userName}:`, error.message);
        failed++;
      }
    }
  }

  return { sent, failed, cleaned };
}
