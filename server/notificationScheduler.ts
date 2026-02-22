import cron from "node-cron";
import { db } from "./db";
import { orders, pushSubscriptions, notificationLogs } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import {
  initializeWebPush,
  sendPushToUser,
  type NotificationPayload,
} from "./utils/notificationSender";

const EVENT_TYPES = [
  { field: "dateLivraison" as const, label: "Livraison", type: "livraison" },
  {
    field: "dateInventairePrevu" as const,
    label: "Inventaire",
    type: "inventaire_prevu",
  },
  { field: "dateRetour" as const, label: "Retour", type: "retour" },
];

async function checkAndSendNotifications(
  notifType: "veille" | "jour_meme"
): Promise<void> {
  const now = new Date();

  let targetDate: string;
  if (notifType === "veille") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetDate = formatInTimeZone(tomorrow, "Europe/Paris", "yyyy-MM-dd");
  } else {
    targetDate = formatInTimeZone(now, "Europe/Paris", "yyyy-MM-dd");
  }

  console.log(
    `[NOTIF] Checking ${notifType} notifications (target: ${targetDate})`
  );

  // Get users with active push subscriptions
  const subscribedUsers = await db
    .selectDistinct({ userName: pushSubscriptions.userName })
    .from(pushSubscriptions);

  if (subscribedUsers.length === 0) {
    console.log("[NOTIF] No subscribed users, skipping");
    return;
  }

  const userNames = subscribedUsers.map((u) => u.userName);

  // Fetch all orders for subscribed users
  const allOrders = await db
    .select()
    .from(orders)
    .where(
      sql`${orders.salesRepName} IN (${sql.join(
        userNames.map((n) => sql`${n}`),
        sql`, `
      )})`
    );

  let totalSent = 0;

  for (const order of allOrders) {
    for (const eventDef of EVENT_TYPES) {
      const eventDate = order[eventDef.field];
      if (!eventDate || eventDate !== targetDate) continue;

      const userName = order.salesRepName;

      // Check deduplication
      const existing = await db
        .select()
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.userName, userName),
            eq(notificationLogs.orderId, order.id),
            eq(notificationLogs.eventType, eventDef.type),
            eq(notificationLogs.eventDate, eventDate),
            eq(notificationLogs.notifType, notifType)
          )
        );

      if (existing.length > 0) continue;

      const isVeille = notifType === "veille";
      const dateFormatted = eventDate.split("-").reverse().join("/");

      const payload: NotificationPayload = {
        title: isVeille
          ? `Rappel : ${eventDef.label} demain`
          : `${eventDef.label} aujourd'hui`,
        body: `${order.clientName || "Client"} - ${order.orderCode} (${dateFormatted})`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `${eventDef.type}-${order.orderCode}-${notifType}`,
        data: {
          url: "/my-dashboard",
          eventType: eventDef.type,
          orderCode: order.orderCode,
          eventDate,
        },
      };

      const result = await sendPushToUser(userName, payload);

      if (result.sent > 0) {
        await db.insert(notificationLogs).values({
          userName,
          orderId: order.id,
          eventType: eventDef.type,
          eventDate,
          notifType,
        });
        totalSent++;
      }

      if (result.cleaned > 0) {
        console.log(
          `[NOTIF] Cleaned ${result.cleaned} expired sub(s) for ${userName}`
        );
      }
    }
  }

  console.log(`[NOTIF] ${notifType}: sent ${totalSent} notification(s)`);
}

async function ensureNotificationLogsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name TEXT NOT NULL,
        order_id INT NOT NULL,
        event_type TEXT NOT NULL,
        event_date TEXT NOT NULL,
        notif_type TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[NOTIF] notification_logs table ready");
  } catch (error) {
    console.error("[NOTIF] Error creating notification_logs table:", error);
  }
}

export async function startNotificationScheduler(): Promise<void> {
  const configured = initializeWebPush();
  if (!configured) {
    console.log("[NOTIF] Scheduler not started (VAPID not configured)");
    return;
  }

  await ensureNotificationLogsTable();

  // Veille - 18h00 Europe/Paris
  cron.schedule(
    "0 18 * * *",
    async () => {
      try {
        await checkAndSendNotifications("veille");
      } catch (error) {
        console.error("[NOTIF] Error in veille cron:", error);
      }
    },
    { timezone: "Europe/Paris" }
  );

  // Jour même - 07h30 Europe/Paris
  cron.schedule(
    "30 7 * * *",
    async () => {
      try {
        await checkAndSendNotifications("jour_meme");
      } catch (error) {
        console.error("[NOTIF] Error in jour_meme cron:", error);
      }
    },
    { timezone: "Europe/Paris" }
  );

  // Nettoyage des logs > 30 jours - 03h00
  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        await db
          .delete(notificationLogs)
          .where(sql`${notificationLogs.sentAt} < ${cutoff}`);
        console.log("[NOTIF] Cleaned up old notification logs");
      } catch (error) {
        console.error("[NOTIF] Error cleaning logs:", error);
      }
    },
    { timezone: "Europe/Paris" }
  );

  console.log(
    "[NOTIF] Scheduler started (veille 18:00, jour_meme 07:30, cleanup 03:00)"
  );
}
