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

// Normalize date to yyyy-MM-dd format regardless of input format
function normalizeDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already in yyyy-MM-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Handle dd/MM/yyyy format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  }

  // Handle yyyy/MM/dd format
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, "-");
  }

  // Try parsing as Date object
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return formatInTimeZone(d, "Europe/Paris", "yyyy-MM-dd");
    }
  } catch {}

  return null;
}

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

  const parisTime = formatInTimeZone(now, "Europe/Paris", "yyyy-MM-dd HH:mm:ss");
  console.log(
    `[NOTIF] === ${notifType} check START === (Paris: ${parisTime}, target: ${targetDate})`
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
  console.log(`[NOTIF] Subscribed users: ${userNames.join(", ")}`);

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

  console.log(`[NOTIF] Found ${allOrders.length} orders for subscribed users`);

  let totalSent = 0;
  let totalMatched = 0;

  for (const order of allOrders) {
    for (const eventDef of EVENT_TYPES) {
      const rawEventDate = order[eventDef.field];
      if (!rawEventDate) continue;

      // Normalize the date to handle various formats
      const eventDate = normalizeDateToISO(rawEventDate);
      if (!eventDate) {
        console.log(`[NOTIF] ⚠️ Could not parse date for order ${order.orderCode} ${eventDef.field}: "${rawEventDate}"`);
        continue;
      }

      if (eventDate !== targetDate) continue;

      totalMatched++;
      const userName = order.salesRepName;
      console.log(`[NOTIF] ✅ Match: ${eventDef.label} for ${userName} - ${order.orderCode} (date: ${eventDate})`);

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

      if (existing.length > 0) {
        console.log(`[NOTIF] Already sent for ${order.orderCode} ${eventDef.type} ${notifType}, skipping`);
        continue;
      }

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
          url: "/dashboard",
          eventType: eventDef.type,
          orderCode: order.orderCode,
          eventDate,
        },
      };

      const result = await sendPushToUser(userName, payload);
      console.log(`[NOTIF] Push result for ${userName}: sent=${result.sent}, failed=${result.failed}, cleaned=${result.cleaned}`);

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

  console.log(`[NOTIF] === ${notifType} DONE === matched=${totalMatched}, sent=${totalSent}`);
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
    console.log("[NOTIF] ❌ Scheduler not started (VAPID not configured)");
    return;
  }

  await ensureNotificationLogsTable();

  // Run a catch-up check at startup for today's notifications
  // This handles the case where the server restarts after the scheduled time
  console.log("[NOTIF] Running startup catch-up check...");
  try {
    const parisHour = parseInt(formatInTimeZone(new Date(), "Europe/Paris", "H"));

    // If server starts after 07:30, check jour_meme for today
    if (parisHour >= 8) {
      await checkAndSendNotifications("jour_meme");
    }
    // If server starts after 18:00, check veille for tomorrow
    if (parisHour >= 18) {
      await checkAndSendNotifications("veille");
    }
  } catch (error) {
    console.error("[NOTIF] Error in startup catch-up:", error);
  }

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
    "[NOTIF] ✅ Scheduler started (veille 18:00, jour_meme 07:30, cleanup 03:00)"
  );
}
