import cron from "node-cron";
import nodemailer from "nodemailer";
import { db } from "./db";
import { orders, commerciaux, pushSubscriptions, notificationLogs, prospectEvents } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import {
  initializeWebPush,
  sendPushToUser,
  type NotificationPayload,
} from "./utils/notificationSender";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Envoyer un email de rappel au commercial
async function sendReminderEmail(
  email: string,
  userName: string,
  title: string,
  body: string
): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: parseInt(process.env.SMTP_PORT || "587") === 465,
      requireTLS: parseInt(process.env.SMTP_PORT || "587") === 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === "production" ? true : (process.env.SMTP_REJECT_UNAUTHORIZED !== "false") },
      connectionTimeout: 8000,
    });

    await transporter.sendMail({
      from: `"BFC APP" <${process.env.SMTP_USER}>`,
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">BFC APP - Rappel</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Bonjour <strong>${escapeHtml(userName)}</strong>,</p>
            <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; color: #1e40af;"><strong>${escapeHtml(title)}</strong></p>
              <p style="margin: 8px 0 0; color: #333;">${escapeHtml(body)}</p>
            </div>
            <p style="color: #666; font-size: 13px;">Connectez-vous à l'application pour plus de détails.</p>
          </div>
          <p style="text-align: center; color: #999; font-size: 11px; margin-top: 15px;">
            BFC APP - Développé par Finalyn
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error(`[NOTIF] Erreur envoi email à ${email}:`, error);
    return false;
  }
}

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

  // Pré-charger les logs de dédup pour cette date et ce type en UNE seule requête
  const existingLogs = await db
    .select()
    .from(notificationLogs)
    .where(
      and(
        eq(notificationLogs.eventDate, targetDate),
        eq(notificationLogs.notifType, notifType)
      )
    );
  const dedupSet = new Set(
    existingLogs.map(l => `${l.userName}|${l.orderId}|${l.eventType}`)
  );

  // Pré-charger les commerciaux en UNE seule requête (pour l'envoi d'email)
  const allCommerciaux = await db.select().from(commerciaux);
  const commerciauxByName = new Map<string, typeof allCommerciaux[0]>();
  for (const c of allCommerciaux) {
    commerciauxByName.set(`${c.prenom} ${c.nom}`.trim(), c);
  }

  let totalSent = 0;
  let totalMatched = 0;

  for (const order of allOrders) {
    for (const eventDef of EVENT_TYPES) {
      const rawEventDate = order[eventDef.field];
      if (!rawEventDate) continue;

      const eventDate = normalizeDateToISO(rawEventDate);
      if (!eventDate || eventDate !== targetDate) continue;

      totalMatched++;
      const userName = order.salesRepName;

      // Dédup via le Set pré-chargé (plus de requête N+1)
      const dedupKey = `${userName}|${order.id}|${eventDef.type}`;
      if (dedupSet.has(dedupKey)) continue;

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

      // Envoi email via le Map pré-chargé (plus de requête N+1)
      let emailSent = false;
      try {
        const commercial = commerciauxByName.get(userName);
        if (commercial?.email) {
          emailSent = await sendReminderEmail(
            commercial.email,
            userName,
            payload.title,
            payload.body
          );
        }
      } catch (emailError) {
        console.error(`[NOTIF] Erreur email pour ${userName}:`, emailError);
      }

      if (result.sent > 0 || emailSent) {
        await db.insert(notificationLogs).values({
          userName,
          orderId: order.id,
          eventType: eventDef.type,
          eventDate,
          notifType,
        });
        dedupSet.add(dedupKey);
        totalSent++;
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

// Check and send prospect reminders
async function checkProspectReminders(): Promise<void> {
  const today = formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd");
  console.log(`[NOTIF] === prospect reminders check START === (target: ${today})`);

  try {
    const pendingReminders = await db.select().from(prospectEvents)
      .where(and(
        eq(prospectEvents.rappelDate, today),
        eq(prospectEvents.rappel, true),
        eq(prospectEvents.rappelEnvoye, false)
      ));

    console.log(`[NOTIF] Found ${pendingReminders.length} prospect reminder(s) for today`);

    for (const reminder of pendingReminders) {
      const payload: NotificationPayload = {
        title: `Rappel prospect: ${reminder.titre}`,
        body: `${reminder.type === "rdv" ? "RDV" : reminder.type === "appel" ? "Appel" : "Relance"} prévu le ${reminder.dateEvenement}${reminder.heureEvenement ? ` à ${reminder.heureEvenement}` : ""}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: `prospect-reminder-${reminder.id}`,
        data: {
          url: "/prospects",
          eventType: "prospect_reminder",
          orderCode: `P-${reminder.prospectId}`,
          eventDate: reminder.dateEvenement,
        },
      };

      const result = await sendPushToUser(reminder.commercialName, payload);

      // Also send email
      const allCommerciaux = await db.select().from(commerciaux);
      const commercial = allCommerciaux.find(c => `${c.prenom} ${c.nom}`.trim() === reminder.commercialName);
      if (commercial?.email) {
        await sendReminderEmail(commercial.email, reminder.commercialName, payload.title, payload.body);
      }

      // Mark as sent
      await db.update(prospectEvents)
        .set({ rappelEnvoye: true })
        .where(eq(prospectEvents.id, reminder.id));

      if (result.sent > 0) {
        console.log(`[NOTIF] Prospect reminder sent to ${reminder.commercialName}: ${reminder.titre}`);
      }
    }

    console.log(`[NOTIF] === prospect reminders DONE === sent=${pendingReminders.length}`);
  } catch (error) {
    console.error("[NOTIF] Error checking prospect reminders:", error);
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
    // Always check prospect reminders at startup
    await checkProspectReminders();
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

  // Prospect reminders - 08h00 Europe/Paris
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await checkProspectReminders();
      } catch (error) {
        console.error("[NOTIF] Error in prospect reminders cron:", error);
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
    "[NOTIF] ✅ Scheduler started (veille 18:00, jour_meme 07:30, prospects 08:00, cleanup 03:00)"
  );
}
