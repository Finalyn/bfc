import nodemailer from "nodemailer";
import { type Order, type ThemeSelection } from "@shared/schema";
import { FOURNISSEURS_CONFIG } from "@shared/fournisseurs";
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
  
  const fournisseurConfig = FOURNISSEURS_CONFIG.find(f => f.id === order.fournisseur) || FOURNISSEURS_CONFIG[0];
  const fournisseurNom = fournisseurConfig.nom;
  const fournisseurNomComplet = fournisseurConfig.nomComplet || fournisseurNom;
  
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];
  const themesHtml = themeSelections
    .filter(t => t.quantity || t.deliveryDate)
    .map(t => `<li>${t.theme} - Qté: ${t.quantity || "N/A"}${t.deliveryDate ? ` - Livr: ${format(new Date(t.deliveryDate), "dd/MM/yyyy")}` : ""}</li>`)
    .join("");

  // Calcul du nombre total de produits
  const totalProducts = themeSelections.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  const productCount = themeSelections.filter(t => t.quantity && Number(t.quantity) > 0).length;
  
  // Première date de livraison
  const deliveryDates = themeSelections
    .filter(t => t.deliveryDate)
    .map(t => new Date(t.deliveryDate!))
    .sort((a, b) => a.getTime() - b.getTime());
  const firstDeliveryDate = deliveryDates.length > 0 
    ? format(deliveryDates[0], "d MMMM yyyy", { locale: fr })
    : null;

  // Email au client - design attractif et professionnel
  const clientMailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Merci pour votre commande ${fournisseurNom} ! Ref. ${order.orderCode}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header avec couleur de marque -->
        <div style="background: linear-gradient(135deg, #003366 0%, #0052a3 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Merci pour votre confiance !</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Votre commande a bien été enregistrée</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <p style="font-size: 16px; color: #333;">Bonjour <strong>${order.responsableName}</strong>,</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Nous avons le plaisir de vous confirmer l'enregistrement de votre commande <strong>${fournisseurNom}</strong>. 
            Notre équipe prépare d'ores et déjà votre livraison avec le plus grand soin.
          </p>
          
          <!-- Récapitulatif commande -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #003366;">
            <h2 style="margin: 0 0 15px 0; color: #003366; font-size: 18px;">Récapitulatif de votre commande</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Référence</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #003366; font-size: 14px;">${order.orderCode}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Fournisseur</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${fournisseurNom}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date de commande</td>
                <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${orderDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Votre commercial</td>
                <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${order.salesRepName}</td>
              </tr>
              ${productCount > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Nombre de thèmes</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${productCount} thème${productCount > 1 ? 's' : ''}</td>
              </tr>
              ` : ''}
              ${totalProducts > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Quantité totale</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #E67E22; font-size: 14px;">${totalProducts} unité${totalProducts > 1 ? 's' : ''}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${themesHtml ? `
          <!-- Détail des produits -->
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 16px;">Vos produits commandés</h3>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8;">${themesHtml}</ul>
          </div>
          ` : ""}
          
          <!-- Livraison -->
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 16px;">Adresse de livraison</h3>
            <p style="margin: 0; color: #333; line-height: 1.6;">
              <strong>${order.livraisonEnseigne}</strong><br/>
              ${order.livraisonAdresse}<br/>
              ${order.livraisonCpVille}
            </p>
            ${firstDeliveryDate ? `
            <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #bbf7d0;">
              <span style="color: #166534; font-weight: 600;">Première livraison prévue :</span> 
              <span style="color: #333;">${firstDeliveryDate}</span>
            </p>
            ` : ''}
          </div>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Vous trouverez votre bon de commande complet en pièce jointe de ce message.
          </p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Pour toute question, n'hésitez pas à contacter votre commercial <strong>${order.salesRepName}</strong>.
          </p>
          
          <p style="font-size: 15px; color: #333; margin-top: 25px;">
            Bien cordialement,<br/>
            <strong style="color: #003366;">L'équipe ${fournisseurNom}</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            ${fournisseurNomComplet}
          </p>
          <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 11px;">
            Ce message a été envoyé automatiquement. Merci de ne pas y répondre directement.
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

  // Email à l'agence - format détaillé pour suivi interne
  const agencyMailOptions = {
    from: FROM_EMAIL,
    to: AGENCY_EMAIL,
    subject: `[${fournisseurNom}] Commande ${order.orderCode} – ${order.livraisonEnseigne} – ${totalProducts} unités – ${orderDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: #003366; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Nouvelle commande ${fournisseurNom}</h1>
          <p style="color: #E67E22; margin: 5px 0 0 0; font-size: 16px; font-weight: 600;">${order.orderCode}</p>
        </div>
        
        <div style="padding: 20px;">
          <!-- Résumé rapide -->
          <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="background-color: #003366; color: #fff; padding: 10px 15px; border-radius: 6px; text-align: center; min-width: 100px;">
              <div style="font-size: 24px; font-weight: bold;">${productCount}</div>
              <div style="font-size: 12px; opacity: 0.9;">Thème${productCount > 1 ? 's' : ''}</div>
            </div>
            <div style="background-color: #E67E22; color: #fff; padding: 10px 15px; border-radius: 6px; text-align: center; min-width: 100px;">
              <div style="font-size: 24px; font-weight: bold;">${totalProducts}</div>
              <div style="font-size: 12px; opacity: 0.9;">Unité${totalProducts > 1 ? 's' : ''}</div>
            </div>
            ${firstDeliveryDate ? `
            <div style="background-color: #22c55e; color: #fff; padding: 10px 15px; border-radius: 6px; text-align: center; flex: 1; min-width: 150px;">
              <div style="font-size: 14px; font-weight: bold;">${firstDeliveryDate}</div>
              <div style="font-size: 12px; opacity: 0.9;">1ère livraison</div>
            </div>
            ` : ''}
          </div>
          
          <!-- Informations générales -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600; width: 35%;">Fournisseur</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${fournisseurNomComplet}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">Commercial</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${order.salesRepName}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 600;">Date commande</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${orderDate}</td>
            </tr>
          </table>
          
          <!-- Contact client -->
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0369a1;">
            <h3 style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; text-transform: uppercase;">Contact client</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #666;">Responsable</td>
                <td style="padding: 5px 0; font-weight: 600;">${order.responsableName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;">Téléphone</td>
                <td style="padding: 5px 0;"><a href="tel:${order.responsableTel}" style="color: #0369a1;">${order.responsableTel}</a></td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;">Email</td>
                <td style="padding: 5px 0;"><a href="mailto:${order.responsableEmail}" style="color: #0369a1;">${order.responsableEmail}</a></td>
              </tr>
              ${order.comptaTel || order.comptaEmail ? `
              <tr><td colspan="2" style="padding: 10px 0 5px 0; border-top: 1px solid #bfdbfe; margin-top: 10px;"><strong style="color: #666;">Comptabilité</strong></td></tr>
              ${order.comptaTel ? `<tr><td style="padding: 5px 0; color: #666;">Tél. compta</td><td style="padding: 5px 0;"><a href="tel:${order.comptaTel}" style="color: #0369a1;">${order.comptaTel}</a></td></tr>` : ''}
              ${order.comptaEmail ? `<tr><td style="padding: 5px 0; color: #666;">Email compta</td><td style="padding: 5px 0;"><a href="mailto:${order.comptaEmail}" style="color: #0369a1;">${order.comptaEmail}</a></td></tr>` : ''}
              ` : ''}
            </table>
          </div>
          
          ${themesHtml ? `
          <!-- Produits commandés -->
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #b45309; font-size: 14px; text-transform: uppercase;">Produits commandés</h3>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8;">${themesHtml}</ul>
          </div>
          ` : ""}
          
          <!-- Livraison et Facturation côte à côte -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 20px;">
            <tr>
              <td style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; vertical-align: top; width: 50%;">
                <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 14px; text-transform: uppercase;">Livraison</h3>
                <p style="margin: 0 0 5px 0; font-weight: 600;">${order.livraisonEnseigne}</p>
                <p style="margin: 0; color: #555; line-height: 1.5;">${order.livraisonAdresse}<br/>${order.livraisonCpVille}</p>
                ${order.livraisonHoraires ? `<p style="margin: 10px 0 0 0; color: #666; font-size: 13px;">Horaires: ${order.livraisonHoraires}</p>` : ""}
                <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Hayon: <strong>${order.livraisonHayon ? "Oui" : "Non"}</strong></p>
              </td>
              <td style="background-color: #faf5ff; padding: 15px; border-radius: 8px; vertical-align: top; width: 50%;">
                <h3 style="margin: 0 0 10px 0; color: #7c3aed; font-size: 14px; text-transform: uppercase;">Facturation</h3>
                <p style="margin: 0 0 5px 0; font-weight: 600;">${order.facturationRaisonSociale}</p>
                <p style="margin: 0; color: #555; line-height: 1.5;">${order.facturationAdresse}<br/>${order.facturationCpVille}</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 13px;">Mode: <strong>${order.facturationMode}</strong></p>
                ${order.facturationRib ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">RIB: ${order.facturationRib}</p>` : ""}
              </td>
            </tr>
          </table>
          
          ${order.remarks ? `
          <!-- Remarques -->
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px; text-transform: uppercase;">Remarques importantes</h3>
            <p style="margin: 0; color: #333;">${order.remarks}</p>
          </div>
          ` : ""}
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Les documents (PDF et Excel) sont en pièce jointe.</p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">BFC APP - Gestion de commandes</p>
        </div>
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
