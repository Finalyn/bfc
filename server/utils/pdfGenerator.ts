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
  
  // Commercial
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL", margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${order.salesRepName}`, margin, yPos);
  yPos += 15;
  
  // Informations client
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS CLIENT", margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Client : ${order.clientName}`, margin, yPos);
  yPos += 7;
  doc.text(`Email : ${order.clientEmail}`, margin, yPos);
  yPos += 15;
  
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
    doc.text(`Note : ${order.quantityNote}`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 7;
  }
  
  doc.text(`Date de livraison souhaitée : ${formatInTimeZone(new Date(order.deliveryDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}`, margin, yPos);
  yPos += 15;
  
  // Remarques
  if (order.remarks) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REMARQUES", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const remarksLines = doc.splitTextToSize(order.remarks, pageWidth - 2 * margin);
    doc.text(remarksLines, margin, yPos);
    yPos += remarksLines.length * 7 + 10;
  }
  
  // Signature
  yPos = Math.max(yPos, 200);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNATURE DU CLIENT", margin, yPos);
  yPos += 10;
  
  // Informations de signature
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nom et prénom : ${order.clientSignedName}`, margin, yPos);
  yPos += 7;
  doc.text(`Lieu : ${order.signatureLocation}`, margin, yPos);
  yPos += 7;
  doc.text(`Date : ${formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "d MMMM yyyy", { locale: fr })}`, margin, yPos);
  yPos += 12;
  
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", margin, yPos, 80, 40);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la signature:", error);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Signature capturée", margin, yPos);
    }
  }
  
  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128, 128, 128);
  doc.text(`Document généré le ${formatInTimeZone(new Date(), "Europe/Paris", "d MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, footerY, { align: "center" });
  
  return Buffer.from(doc.output("arraybuffer"));
}
