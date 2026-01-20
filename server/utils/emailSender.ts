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
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #0369a1;">
            <h3 style="margin: 0 0 10px 0; color: #0369a1; font-size: 16px;">Adresse de livraison</h3>
            <p style="margin: 0; color: #333; line-height: 1.6;">
              <strong>${order.livraisonEnseigne}</strong><br/>
              ${order.livraisonAdresse}<br/>
              ${order.livraisonCpVille}
            </p>
            ${firstDeliveryDate ? `
            <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #bae6fd;">
              <span style="color: #0369a1; font-weight: 600;">Première livraison prévue :</span> 
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

  // Email à l'agence - design élégant avec encoches comme le client
  const agencyMailOptions = {
    from: FROM_EMAIL,
    to: AGENCY_EMAIL,
    subject: `[${fournisseurNom}] Commande ${order.orderCode} – ${order.livraisonEnseigne} – ${totalProducts} unités – ${orderDate}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header avec couleur de marque -->
        <div style="background: linear-gradient(135deg, #003366 0%, #0052a3 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Nouvelle Commande ${fournisseurNom}</h1>
          <p style="color: #E67E22; margin: 10px 0 0 0; font-size: 18px; font-weight: 700;">${order.orderCode}</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <!-- Récapitulatif commande -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #003366;">
            <h2 style="margin: 0 0 15px 0; color: #003366; font-size: 18px;">Informations générales</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Fournisseur</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #003366; font-size: 14px;">${fournisseurNomComplet}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Commercial</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${order.salesRepName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date de commande</td>
                <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${orderDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Nombre de thèmes</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${productCount} thème${productCount > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Quantité totale</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #E67E22; font-size: 14px;">${totalProducts} unité${totalProducts > 1 ? 's' : ''}</td>
              </tr>
              ${firstDeliveryDate ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Première livraison</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e; font-size: 14px;">${firstDeliveryDate}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Contact client -->
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #0369a1;">
            <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 16px;">Contact client</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Client</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${order.livraisonEnseigne}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Responsable</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${order.responsableName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Téléphone</td>
                <td style="padding: 6px 0; text-align: right; font-size: 14px;"><a href="tel:${order.responsableTel}" style="color: #0369a1; text-decoration: none;">${order.responsableTel}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Email</td>
                <td style="padding: 6px 0; text-align: right; font-size: 14px;"><a href="mailto:${order.responsableEmail}" style="color: #0369a1; text-decoration: none;">${order.responsableEmail}</a></td>
              </tr>
              ${order.comptaTel ? `
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Tél. comptabilité</td>
                <td style="padding: 6px 0; text-align: right; font-size: 14px;"><a href="tel:${order.comptaTel}" style="color: #0369a1; text-decoration: none;">${order.comptaTel}</a></td>
              </tr>
              ` : ''}
              ${order.comptaEmail ? `
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Email comptabilité</td>
                <td style="padding: 6px 0; text-align: right; font-size: 14px;"><a href="mailto:${order.comptaEmail}" style="color: #0369a1; text-decoration: none;">${order.comptaEmail}</a></td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${themesHtml ? `
          <!-- Produits commandés -->
          <div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 15px 0; color: #b45309; font-size: 16px;">Produits commandés</h3>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8; font-size: 14px;">${themesHtml}</ul>
          </div>
          ` : ""}
          
          <!-- Livraison -->
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">Adresse de livraison</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Enseigne</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${order.livraisonEnseigne}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Adresse</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.livraisonAdresse}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">CP / Ville</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.livraisonCpVille}</td>
              </tr>
              ${order.livraisonHoraires ? `
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Horaires</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.livraisonHoraires}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Hayon requis</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${order.livraisonHayon ? '#22c55e' : '#666'}; font-size: 14px;">${order.livraisonHayon ? "Oui" : "Non"}</td>
              </tr>
            </table>
          </div>
          
          <!-- Facturation -->
          <div style="background-color: #faf5ff; padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #7c3aed;">
            <h3 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 16px;">Facturation</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Raison sociale</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #333; font-size: 14px;">${order.facturationRaisonSociale}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Adresse</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.facturationAdresse}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">CP / Ville</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.facturationCpVille}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">Mode de paiement</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #7c3aed; font-size: 14px;">${order.facturationMode}</td>
              </tr>
              ${order.facturationRib ? `
              <tr>
                <td style="padding: 6px 0; color: #666; font-size: 14px;">RIB</td>
                <td style="padding: 6px 0; text-align: right; color: #333; font-size: 14px;">${order.facturationRib}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${order.remarks ? `
          <!-- Remarques -->
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; margin: 0 0 25px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 16px;">Remarques importantes</h3>
            <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">${order.remarks}</p>
          </div>
          ` : ""}
          
          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            Les documents (PDF et Excel) sont en pièce jointe de ce message.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            BFC APP - Gestion de commandes
          </p>
          <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 11px;">
            Développé par Finalyn
          </p>
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
