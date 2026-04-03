import nodemailer from "nodemailer";
import { type Order, type ThemeSelection } from "@shared/schema";
import { FOURNISSEURS_CONFIG } from "@shared/fournisseurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const AGENCY_EMAIL = process.env.AGENCY_EMAIL || "slf@orange.fr";
const FROM_EMAIL = process.env.SMTP_USER || "";

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

export async function sendOrderEmails(
  order: Order,
  pdfBuffer: Buffer,
  excelBuffer: Buffer,
  clientEmail: string
): Promise<void> {
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("Configuration SMTP manquante - emails non envoyés");
    throw new Error("Configuration SMTP non disponible");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production" ? true : (process.env.SMTP_REJECT_UNAUTHORIZED !== "false"),
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  const orderDate = formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "d MMMM yyyy", { locale: fr });

  const fournisseurConfig = FOURNISSEURS_CONFIG.find(f => f.id === order.fournisseur) || {
    id: order.fournisseur || "AUTRE", nom: order.fournisseur || "FOURNISSEUR", nomComplet: order.fournisseur || "FOURNISSEUR", themes: [], cgv: "",
  };
  const fournisseurNom = fournisseurConfig.nom;
  const fournisseurNomComplet = fournisseurConfig.nomComplet || fournisseurNom;

  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];
  const filledThemes = themeSelections.filter(t => t.quantity && Number(t.quantity) > 0);

  const themesHtml = filledThemes
    .map(t => `<li>${escapeHtml(t.theme)} - Qté: ${escapeHtml(t.quantity || "N/A")}${t.deliveryDate ? ` - Livr: ${format(new Date(t.deliveryDate), "dd/MM/yyyy")}` : ""}</li>`)
    .join("");

  const totalProducts = filledThemes.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  const productCount = filledThemes.length;

  const deliveryDates = filledThemes
    .filter(t => t.deliveryDate)
    .map(t => new Date(t.deliveryDate!))
    .sort((a, b) => a.getTime() - b.getTime());
  const firstDeliveryDate = deliveryDates.length > 0
    ? format(deliveryDates[0], "d MMMM yyyy", { locale: fr })
    : null;

  // === EMAIL CLIENT — design professionnel ===
  const clientMailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Merci pour votre commande ${fournisseurNom} ! Ref. ${order.orderCode}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: #2563eb; padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Merci pour votre confiance !</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Votre commande a bien été enregistrée</p>
        </div>

        <div style="padding: 25px 20px;">
          <p style="font-size: 15px; color: #333;">Bonjour <strong>${escapeHtml(order.responsableName || "")}</strong>,</p>
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            Nous avons le plaisir de vous confirmer l'enregistrement de votre commande <strong>${fournisseurNom}</strong>.
          </p>

          <div style="background: #f8fafc; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Référence</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #2563eb; font-size: 13px;">${escapeHtml(order.orderCode)}</td></tr>
              <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Fournisseur</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 13px;">${fournisseurNom}</td></tr>
              <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Date</td><td style="padding: 6px 0; text-align: right; color: #333; font-size: 13px;">${orderDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Commercial</td><td style="padding: 6px 0; text-align: right; color: #333; font-size: 13px;">${escapeHtml(order.salesRepName)}</td></tr>
              ${productCount > 0 ? `<tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Thèmes</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 13px;">${productCount}</td></tr>` : ''}
              ${totalProducts > 0 ? `<tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Quantité totale</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 13px;">${totalProducts}</td></tr>` : ''}
              ${firstDeliveryDate ? `<tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Première livraison</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 13px;">${firstDeliveryDate}</td></tr>` : ''}
            </table>
          </div>

          <div style="background: #f8fafc; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: 600; color: #333;">Adresse de livraison</p>
            <p style="margin: 0; color: #555; font-size: 13px; line-height: 1.5;">
              ${escapeHtml(order.livraisonEnseigne)}<br/>${escapeHtml(order.livraisonAdresse)}<br/>${escapeHtml(order.livraisonCpVille)}
            </p>
          </div>

          <p style="font-size: 13px; color: #555; line-height: 1.5;">
            Vous trouverez votre bon de commande en pièce jointe.<br/>
            Pour toute question, contactez votre commercial <strong>${escapeHtml(order.salesRepName)}</strong>.
          </p>

          <p style="font-size: 14px; color: #333; margin-top: 20px;">
            Cordialement,<br/><strong>${fournisseurNom}</strong>
          </p>
        </div>

        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">Ce message a été envoyé automatiquement.</p>
        </div>
      </div>
    `,
    attachments: [
      { filename: `${order.orderCode}.pdf`, content: pdfBuffer },
    ],
  };

  // === EMAIL AGENCE — simple et clair, bordure bleue uniquement ===
  const agencyMailOptions = {
    from: FROM_EMAIL,
    to: AGENCY_EMAIL,
    subject: `[${fournisseurNom}] ${order.orderCode} – ${order.livraisonEnseigne} – ${totalProducts} unités`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="padding: 20px; border-bottom: 3px solid #2563eb;">
          <h2 style="margin: 0; color: #333; font-size: 18px;">Nouvelle commande ${fournisseurNom}</h2>
          <p style="margin: 5px 0 0 0; color: #2563eb; font-size: 15px; font-weight: 600;">${escapeHtml(order.orderCode)}</p>
        </div>

        <div style="padding: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Fournisseur</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${fournisseurNom}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Commercial</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(order.salesRepName)}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; text-align: right;">${orderDate}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Thèmes</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${productCount}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Quantité totale</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${totalProducts}</td></tr>
            ${firstDeliveryDate ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Première livraison</td><td style="padding: 8px 0; text-align: right;">${firstDeliveryDate}</td></tr>` : ''}
          </table>

          <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 3px 0; font-size: 12px; color: #666; font-weight: 600;">CLIENT</p>
            <p style="margin: 0; font-size: 13px;"><strong>${escapeHtml(order.livraisonEnseigne)}</strong> — ${escapeHtml(order.responsableName || "")}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">${escapeHtml(order.responsableTel || "")} · ${escapeHtml(order.responsableEmail || "")}</p>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 3px 0; font-size: 12px; color: #666; font-weight: 600;">LIVRAISON</p>
            <p style="margin: 0; font-size: 13px;">${escapeHtml(order.livraisonAdresse)}, ${escapeHtml(order.livraisonCpVille)}</p>
            ${order.livraisonHoraires ? `<p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">Horaires : ${escapeHtml(order.livraisonHoraires || "")}</p>` : ''}
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">Hayon : ${order.livraisonHayon ? "Oui" : "Non"}</p>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 3px 0; font-size: 12px; color: #666; font-weight: 600;">FACTURATION</p>
            <p style="margin: 0; font-size: 13px;">${escapeHtml(order.facturationRaisonSociale)}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">${escapeHtml(order.facturationAdresse)}, ${escapeHtml(order.facturationCpVille)}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #666;">Paiement : ${escapeHtml(order.facturationMode)}${order.facturationRib ? ` — RIB : ${escapeHtml(order.facturationRib || "")}` : ''}</p>
          </div>

          ${themesHtml ? `
          <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; font-weight: 600;">PRODUITS</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #333; line-height: 1.7;">${themesHtml}</ul>
          </div>
          ` : ""}

          ${order.remarks ? `
          <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 3px 0; font-size: 12px; color: #666; font-weight: 600;">REMARQUES</p>
            <p style="margin: 0; font-size: 13px; color: #333;">${escapeHtml(order.remarks || "")}</p>
          </div>
          ` : ""}
        </div>

        <div style="padding: 12px 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="margin: 0; color: #999; font-size: 11px;">BFC APP — Développé par Finalyn</p>
        </div>
      </div>
    `,
    attachments: [
      { filename: `${order.orderCode}.pdf`, content: pdfBuffer },
      { filename: `${order.orderCode}.xlsx`, content: excelBuffer },
    ],
  };

  await withTimeout(
    Promise.all([
      transporter.sendMail(clientMailOptions),
      transporter.sendMail(agencyMailOptions),
    ]),
    15000,
    "Timeout lors de l'envoi des emails (15s)"
  );
}
