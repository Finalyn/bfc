import { jsPDF } from "jspdf";
import { type Order, THEMES_TOUTE_ANNEE, THEMES_SAISONNIER, type ThemeSelection } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import * as fs from "fs";
import * as path from "path";

// Load header image once at startup
const headerImagePath = path.join(process.cwd(), "attached_assets", "Haut_de_page_BFC_1767019338721.jpg");
let headerImageBase64: string | null = null;
try {
  if (fs.existsSync(headerImagePath)) {
    headerImageBase64 = fs.readFileSync(headerImagePath).toString("base64");
  }
} catch (e) {
  console.error("Failed to load header image:", e);
}

export function generateOrderPDF(order: Order): Buffer {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 10;

  // === IMAGE EN-TÊTE BDIS ===
  if (headerImageBase64) {
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = 22;
    doc.addImage(`data:image/jpeg;base64,${headerImageBase64}`, "JPEG", margin, yPos, imgWidth, imgHeight);
    yPos += imgHeight + 5;
  }

  // === EN-TÊTE ===
  // Date et Commercial
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATE * :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr }), margin + 20, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL * :", margin, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.text(order.salesRepName, margin + 35, yPos + 6);

  // Titre principal
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 51, 102);
  doc.text("BON DE COMMANDE 2026", pageWidth / 2, yPos + 3, { align: "center" });
  doc.setTextColor(0, 0, 0);

  yPos += 18;

  // Ligne de séparation
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 51, 102);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // === CONTACTS (2 colonnes) ===
  const colWidth = (pageWidth - 2 * margin) / 2;
  
  // Colonne gauche - Responsable
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Responsable * :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableName || "", margin + 28, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("Tel. * :", margin, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableTel || "", margin + 15, yPos + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail * :", margin, yPos + 10);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableEmail || "", margin + 18, yPos + 10);

  // Colonne droite - Service comptabilité
  const col2X = margin + colWidth + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Service comptabilité :", col2X, yPos);
  
  doc.text("Tel. :", col2X, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaTel || "", col2X + 12, yPos + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail :", col2X, yPos + 10);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaEmail || "", col2X + 15, yPos + 10);

  yPos += 20;

  // === TABLEAU DES THÈMES ===
  const tableWidth = (pageWidth - 2 * margin - 10) / 2;
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];

  // En-têtes des tableaux
  doc.setFillColor(0, 51, 102);
  doc.rect(margin, yPos, tableWidth, 7, "F");
  doc.setFillColor(230, 126, 34);
  doc.rect(margin + tableWidth + 10, yPos, tableWidth, 7, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("THEME", margin + 2, yPos + 5);
  doc.text("QTE", margin + tableWidth - 25, yPos + 5);
  doc.text("Date livr.", margin + tableWidth - 12, yPos + 5);

  doc.text("THEME", margin + tableWidth + 12, yPos + 5);
  doc.text("QTE", margin + 2 * tableWidth - 15, yPos + 5);
  doc.text("Date livr.", margin + 2 * tableWidth - 2, yPos + 5);
  doc.setTextColor(0, 0, 0);

  // Sous-en-têtes
  yPos += 7;
  doc.setFillColor(200, 220, 240);
  doc.rect(margin, yPos, tableWidth, 6, "F");
  doc.setFillColor(250, 220, 200);
  doc.rect(margin + tableWidth + 10, yPos, tableWidth, 6, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TOUTE L'ANNEE", margin + 2, yPos + 4);
  doc.text("SAISONNIER", margin + tableWidth + 12, yPos + 4);
  yPos += 6;

  // Lignes des thèmes
  const rowHeight = 5;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");

  // Colonne TOUTE L'ANNEE
  THEMES_TOUTE_ANNEE.forEach((theme, idx) => {
    const rowY = yPos + idx * rowHeight;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, rowY, tableWidth, rowHeight, "F");
    }
    doc.rect(margin, rowY, tableWidth, rowHeight);
    
    const selection = themeSelections.find(t => t.theme === theme && t.category === "TOUTE_ANNEE");
    doc.text(theme, margin + 2, rowY + 3.5);
    if (selection?.quantity) {
      doc.text(selection.quantity, margin + tableWidth - 22, rowY + 3.5);
    }
    if (selection?.deliveryDate) {
      doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + tableWidth - 10, rowY + 3.5);
    }
  });

  // Colonne SAISONNIER
  THEMES_SAISONNIER.forEach((theme, idx) => {
    const rowY = yPos + idx * rowHeight;
    if (idx % 2 === 0) {
      doc.setFillColor(255, 245, 240);
      doc.rect(margin + tableWidth + 10, rowY, tableWidth, rowHeight, "F");
    }
    doc.rect(margin + tableWidth + 10, rowY, tableWidth, rowHeight);
    
    const selection = themeSelections.find(t => t.theme === theme && t.category === "SAISONNIER");
    doc.text(theme, margin + tableWidth + 12, rowY + 3.5);
    if (selection?.quantity) {
      doc.text(selection.quantity, margin + 2 * tableWidth - 12, rowY + 3.5);
    }
    if (selection?.deliveryDate) {
      doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + 2 * tableWidth, rowY + 3.5);
    }
  });

  yPos += Math.max(THEMES_TOUTE_ANNEE.length, THEMES_SAISONNIER.length) * rowHeight + 10;

  // === LIVRAISON ET FACTURATION (2 colonnes) ===
  const boxWidth = (pageWidth - 2 * margin - 10) / 2;
  const boxHeight = 45;

  // Livraison
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LIVRAISON *", margin + 2, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let livY = yPos + 10;
  doc.text(`ENSEIGNE : ${order.livraisonEnseigne || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`ADRESSE : ${order.livraisonAdresse || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`CP / VILLE : ${order.livraisonCpVille || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`Horaires : ${order.livraisonHoraires || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`Camion avec hayon : ${order.livraisonHayon ? "Oui" : "Non"}`, margin + 2, livY);

  // Facturation
  doc.setFillColor(240, 240, 240);
  doc.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FACTURATION *", margin + boxWidth + 12, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let facY = yPos + 10;
  doc.text(`RAISON SOCIALE : ${order.facturationRaisonSociale || ""}`, margin + boxWidth + 12, facY);
  facY += 5;
  doc.text(`ADRESSE : ${order.facturationAdresse || ""}`, margin + boxWidth + 12, facY);
  facY += 5;
  doc.text(`CP / VILLE : ${order.facturationCpVille || ""}`, margin + boxWidth + 12, facY);
  facY += 5;
  doc.text(`MODE DE RÈGLEMENT : ${order.facturationMode || ""}`, margin + boxWidth + 12, facY);
  if (order.facturationRib) {
    facY += 5;
    doc.text(`RIB : ${order.facturationRib}`, margin + boxWidth + 12, facY);
  }

  // CGV à droite
  const cgvX = margin + boxWidth + 12;
  const cgvY = yPos + 32;
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRAIT DES CGV", cgvX, cgvY);
  doc.setFont("helvetica", "normal");
  doc.text("RÈGLEMENT À 30 JOURS DATE DE FACTURE", cgvX, cgvY + 3);
  doc.text("Escompte de 2% pour paiement comptant", cgvX, cgvY + 6);

  yPos += boxHeight + 8;

  // === REMARQUES ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REMARQUES", margin, yPos);
  yPos += 5;
  
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 20);
  
  if (order.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const remarksLines = doc.splitTextToSize(order.remarks, pageWidth - 2 * margin - 4);
    doc.text(remarksLines, margin + 2, yPos + 5);
  }
  yPos += 25;

  // === SIGNATURES ===
  const sigBoxWidth = (pageWidth - 2 * margin - 20) / 2;
  const sigBoxHeight = 35;

  // Signature magasin (gauche)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Le Magasin", margin + sigBoxWidth / 2, yPos, { align: "center" });
  doc.setFontSize(6);
  doc.text("Cachet et signature obligatoires", margin + sigBoxWidth / 2, yPos + 4, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.text("Le client reconnait avoir pris connaissance des CGV", margin + sigBoxWidth / 2, yPos + 8, { align: "center" });
  
  doc.rect(margin, yPos + 10, sigBoxWidth, sigBoxHeight);
  
  // Ajouter la signature du client
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", margin + 5, yPos + 12, sigBoxWidth - 10, sigBoxHeight - 8);
    } catch (error) {
      console.error("Erreur signature:", error);
    }
  }
  
  // Infos signature
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Signé par: ${order.clientSignedName || ""}`, margin + 2, yPos + sigBoxHeight + 14);
  doc.text(`Le: ${formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr })} à ${order.signatureLocation || ""}`, margin + 2, yPos + sigBoxHeight + 18);
  if (order.cgvAccepted) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 0);
    doc.text("CGV ACCEPTÉES", margin + 2, yPos + sigBoxHeight + 22);
    doc.setTextColor(0, 0, 0);
  }

  // Signature société (droite)
  const sigRightX = margin + sigBoxWidth + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Pour la société", sigRightX + sigBoxWidth / 2, yPos, { align: "center" });
  
  doc.rect(sigRightX, yPos + 10, sigBoxWidth, sigBoxHeight);

  // === PIED DE PAGE ===
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Document généré le ${formatInTimeZone(new Date(), "Europe/Paris", "dd/MM/yyyy à HH:mm", { locale: fr })} - Réf: ${order.orderCode}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  // Mention légale
  doc.setFontSize(5);
  doc.text(
    "Pour toutes les contestations relatives aux ventes réalisées par la société BOISSELLERIE DISTRIBUTION, seul sera compétent le Tribunal de Commerce de VILLEFRANCHE-TARARE.",
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}
