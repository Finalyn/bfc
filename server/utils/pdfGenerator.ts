import { jsPDF } from "jspdf";
import { type Order } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export function generateOrderPDF(order: Order): Buffer {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // En-tête
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE COMMANDE", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${order.orderCode}`, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.text(`Date : ${formatInTimeZone(new Date(order.createdAt), "Europe/Paris", "d MMMM yyyy", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 20;
  
  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Sauvegarder la position de départ pour la signature à droite
  const startYPos = yPos;
  
  // Commercial (colonne gauche)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL", margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${order.salesRepName}`, margin, yPos);
  yPos += 15;
  
  // Informations client (colonne gauche)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS CLIENT", margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Client : ${order.clientName}`, margin, yPos);
  yPos += 7;
  doc.text(`Email : ${order.clientEmail}`, margin, yPos);
  yPos += 7;
  
  // Signature (colonne droite - à côté des infos client)
  const signatureX = pageWidth / 2 + 10;
  let signatureY = startYPos;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNATURE DU CLIENT", signatureX, signatureY);
  signatureY += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nom : ${order.clientSignedName}`, signatureX, signatureY);
  signatureY += 6;
  doc.text(`Lieu : ${order.signatureLocation}`, signatureX, signatureY);
  signatureY += 6;
  doc.text(`Date : ${formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}`, signatureX, signatureY);
  signatureY += 10;
  
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", signatureX, signatureY, 70, 35);
      signatureY += 40;
    } catch (error) {
      console.error("Erreur lors de l'ajout de la signature:", error);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Signature capturée", signatureX, signatureY);
      signatureY += 10;
    }
  }
  
  // Continuer après la zone la plus basse (signature ou infos client)
  yPos = Math.max(yPos, signatureY) + 10;
  
  // Détails de la commande
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DE LA COMMANDE", margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Fournisseur : ${order.supplier}`, margin, yPos);
  yPos += 7;
  doc.text(`Thématique produit : ${order.productTheme}`, margin, yPos);
  yPos += 7;
  doc.text(`Quantité : ${order.quantity}`, margin, yPos);
  yPos += 7;
  
  if (order.quantityNote) {
    doc.setFont("helvetica", "italic");
    // Largeur disponible pour la note (toute la page)
    const noteWidth = pageWidth - 2 * margin - 5;
    const noteLines = doc.splitTextToSize(`Note : ${order.quantityNote}`, noteWidth);
    doc.text(noteLines, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    yPos += noteLines.length * 6 + 3;
  }
  
  doc.text(`Date de livraison souhaitée : ${formatInTimeZone(new Date(order.deliveryDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}`, margin, yPos);
  yPos += 15;
  
  // Remarques (sur toute la largeur, en dessous)
  if (order.remarks) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REMARQUES", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    // Largeur disponible pour les remarques (toute la page)
    const remarksWidth = pageWidth - 2 * margin;
    const remarksLines = doc.splitTextToSize(order.remarks, remarksWidth);
    doc.text(remarksLines, margin, yPos);
    yPos += remarksLines.length * 6 + 10;
  }
  
  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${formatInTimeZone(new Date(), "Europe/Paris", "d MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, footerY, { align: "center" });
  
  return Buffer.from(doc.output("arraybuffer"));
}
