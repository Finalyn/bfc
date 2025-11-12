import nodemailer from "nodemailer";
import { type Order } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const AGENCY_EMAIL = "jack@finalyn.com";
const FROM_EMAIL = process.env.SMTP_USER || "jack@finalyn.com";

export async function sendOrderEmails(
  order: Order,
  pdfBuffer: Buffer,
  excelBuffer: Buffer,
  clientEmail: string
): Promise<void> {
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const orderDate = formatInTimeZone(new Date(order.createdAt), "Europe/Paris", "d MMMM yyyy", { locale: fr });

  // Email au client
  const clientMailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Votre bon de commande n° ${order.orderCode} – ${orderDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Votre bon de commande</h2>
        <p>Bonjour <strong>${order.clientName}</strong>,</p>
        <p>Nous vous confirmons la réception de votre commande.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Numéro de commande :</strong> ${order.orderCode}</p>
          <p style="margin: 5px 0;"><strong>Date :</strong> ${orderDate}</p>
          <p style="margin: 5px 0;"><strong>Produit :</strong> ${order.productTheme}</p>
          <p style="margin: 5px 0;"><strong>Quantité :</strong> ${order.quantity}</p>
          <p style="margin: 5px 0;"><strong>Livraison souhaitée :</strong> ${formatInTimeZone(new Date(order.deliveryDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}</p>
        </div>
        
        <p>Vous trouverez le bon de commande en pièce jointe.</p>
        <p>Bien cordialement,<br/>L'équipe BFC</p>
      </div>
    `,
    attachments: [
      {
        filename: `${order.orderCode}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  // Email à l'agence BFC
  const agencyMailOptions = {
    from: FROM_EMAIL,
    to: AGENCY_EMAIL,
    subject: `Commande n° ${order.orderCode} – ${order.clientName} – ${orderDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nouvelle commande reçue</h2>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Informations client</h3>
          <p style="margin: 5px 0;"><strong>Nom :</strong> ${order.clientName}</p>
          <p style="margin: 5px 0;"><strong>Email :</strong> ${order.clientEmail}</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails de la commande</h3>
          <p style="margin: 5px 0;"><strong>Numéro :</strong> ${order.orderCode}</p>
          <p style="margin: 5px 0;"><strong>Fournisseur :</strong> ${order.supplier}</p>
          <p style="margin: 5px 0;"><strong>Produit :</strong> ${order.productTheme}</p>
          <p style="margin: 5px 0;"><strong>Quantité :</strong> ${order.quantity}</p>
          ${order.quantityNote ? `<p style="margin: 5px 0;"><strong>Note :</strong> ${order.quantityNote}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Livraison souhaitée :</strong> ${formatInTimeZone(new Date(order.deliveryDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}</p>
        </div>
        
        ${order.remarks ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Remarques</h3>
          <p style="margin: 0;">${order.remarks}</p>
        </div>
        ` : ""}
        
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

  // Envoyer les deux emails
  await Promise.all([
    transporter.sendMail(clientMailOptions),
    transporter.sendMail(agencyMailOptions),
  ]);
}
