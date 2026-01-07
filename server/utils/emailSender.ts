import nodemailer from "nodemailer";
import { type Order, type ThemeSelection } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const AGENCY_EMAIL = "jack@finalyn.com";
const FROM_EMAIL = process.env.SMTP_USER || "jack@finalyn.com";

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
      rejectUnauthorized: false,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  const orderDate = formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "d MMMM yyyy", { locale: fr });
  
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];
  const themesHtml = themeSelections
    .filter(t => t.quantity || t.deliveryDate)
    .map(t => `<li>${t.theme} - Qté: ${t.quantity || "N/A"}${t.deliveryDate ? ` - Livr: ${format(new Date(t.deliveryDate), "dd/MM/yyyy")}` : ""}</li>`)
    .join("");

  // Email au client
  const clientMailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Votre bon de commande n° ${order.orderCode} – ${orderDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #003366;">Votre bon de commande BDIS 2026</h2>
        <p>Bonjour <strong>${order.responsableName}</strong>,</p>
        <p>Nous vous confirmons la réception de votre commande.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Numéro de commande :</strong> ${order.orderCode}</p>
          <p style="margin: 5px 0;"><strong>Date :</strong> ${orderDate}</p>
          <p style="margin: 5px 0;"><strong>Commercial :</strong> ${order.salesRepName}</p>
        </div>
        
        ${themesHtml ? `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Thèmes commandés</h3>
          <ul style="margin: 0; padding-left: 20px;">${themesHtml}</ul>
        </div>
        ` : ""}
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Adresse de livraison</h3>
          <p style="margin: 5px 0;">${order.livraisonEnseigne}</p>
          <p style="margin: 5px 0;">${order.livraisonAdresse}</p>
          <p style="margin: 5px 0;">${order.livraisonCpVille}</p>
        </div>
        
        <p>Vous trouverez le bon de commande en pièce jointe.</p>
        <p>Bien cordialement,<br/>L'équipe BDIS</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Découvrez tous nos produits sur 
            <a href="https://bdis.fr" style="color: #003366; font-weight: bold; text-decoration: none;">bdis.fr</a>
          </p>
          <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
            BOISSELLERIE DISTRIBUTION - Votre partenaire depuis plus de 30 ans
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${order.orderCode}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  // Email à l'agence
  const agencyMailOptions = {
    from: FROM_EMAIL,
    to: AGENCY_EMAIL,
    subject: `Commande n° ${order.orderCode} – ${order.livraisonEnseigne} – ${orderDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #003366;">Nouvelle commande BDIS 2026</h2>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Informations générales</h3>
          <p style="margin: 5px 0;"><strong>Numéro :</strong> ${order.orderCode}</p>
          <p style="margin: 5px 0;"><strong>Date :</strong> ${orderDate}</p>
          <p style="margin: 5px 0;"><strong>Commercial :</strong> ${order.salesRepName}</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Responsable</h3>
          <p style="margin: 5px 0;"><strong>Nom :</strong> ${order.responsableName}</p>
          <p style="margin: 5px 0;"><strong>Tél :</strong> ${order.responsableTel}</p>
          <p style="margin: 5px 0;"><strong>Email :</strong> ${order.responsableEmail}</p>
        </div>
        
        ${themesHtml ? `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Thèmes commandés</h3>
          <ul style="margin: 0; padding-left: 20px;">${themesHtml}</ul>
        </div>
        ` : ""}
        
        <div style="display: flex; gap: 20px; margin: 20px 0;">
          <div style="flex: 1; background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Livraison</h3>
            <p style="margin: 5px 0;">${order.livraisonEnseigne}</p>
            <p style="margin: 5px 0;">${order.livraisonAdresse}</p>
            <p style="margin: 5px 0;">${order.livraisonCpVille}</p>
            ${order.livraisonHoraires ? `<p style="margin: 5px 0;">Horaires: ${order.livraisonHoraires}</p>` : ""}
            <p style="margin: 5px 0;">Hayon: ${order.livraisonHayon ? "Oui" : "Non"}</p>
          </div>
          <div style="flex: 1; background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Facturation</h3>
            <p style="margin: 5px 0;">${order.facturationRaisonSociale}</p>
            <p style="margin: 5px 0;">${order.facturationAdresse}</p>
            <p style="margin: 5px 0;">${order.facturationCpVille}</p>
            <p style="margin: 5px 0;">Mode: ${order.facturationMode}</p>
          </div>
        </div>
        
        ${order.remarks ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Remarques</h3>
          <p style="margin: 0;">${order.remarks}</p>
        </div>
        ` : ""}
        
        <div style="background-color: ${order.cgvAccepted ? '#d4edda' : '#f8d7da'}; padding: 10px 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${order.cgvAccepted ? '#28a745' : '#dc3545'};">
          <p style="margin: 0; font-weight: bold; color: ${order.cgvAccepted ? '#155724' : '#721c24'};">
            CGV : ${order.cgvAccepted ? '✓ Acceptées' : '✗ Non acceptées'}
          </p>
        </div>
        
        <p>Les documents (PDF et Excel) sont en pièce jointe.</p>
      </div>
    `,
    attachments: [
      {
        filename: `${order.orderCode}.pdf`,
        content: pdfBuffer,
      },
      {
        filename: `${order.orderCode}.xlsx`,
        content: excelBuffer,
      },
    ],
  };

  // Envoyer les deux emails avec timeout global de 15 secondes
  await withTimeout(
    Promise.all([
      transporter.sendMail(clientMailOptions),
      transporter.sendMail(agencyMailOptions),
    ]),
    15000,
    "Timeout lors de l'envoi des emails (15s)"
  );
}
