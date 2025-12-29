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
  const margin = 10;
  let yPos = 8;

  // === IMAGE EN-TÊTE BDIS ===
  if (headerImageBase64) {
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = 20;
    doc.addImage(`data:image/jpeg;base64,${headerImageBase64}`, "JPEG", margin, yPos, imgWidth, imgHeight);
    yPos += imgHeight + 3;
  }

  // === EN-TÊTE ===
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DATE :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr }), margin + 14, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL :", margin, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.salesRepName, margin + 28, yPos + 5);

  // Titre principal
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE COMMANDE 2026", pageWidth / 2, yPos + 2, { align: "center" });

  yPos += 12;

  // Ligne de séparation
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // === CONTACTS (2 colonnes) ===
  const colWidth = (pageWidth - 2 * margin) / 2;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Responsable :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableName || "", margin + 24, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("Tél :", margin, yPos + 4);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableTel || "", margin + 10, yPos + 4);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail :", margin, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableEmail || "", margin + 15, yPos + 8);

  // Colonne droite - Service comptabilité
  const col2X = margin + colWidth + 5;
  doc.setFont("helvetica", "bold");
  doc.text("Service comptabilité :", col2X, yPos);
  
  doc.text("Tél :", col2X, yPos + 4);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaTel || "", col2X + 10, yPos + 4);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail :", col2X, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaEmail || "", col2X + 15, yPos + 8);

  yPos += 14;

  // === TABLEAU DES THÈMES ===
  const gap = 6;
  const tableWidth = (pageWidth - 2 * margin - gap) / 2;
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];

  // En-têtes des tableaux
  const headerHeight = 6;
  doc.setFillColor(60, 60, 60);
  doc.rect(margin, yPos, tableWidth, headerHeight, "F");
  doc.rect(margin + tableWidth + gap, yPos, tableWidth, headerHeight, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("THEME", margin + 2, yPos + 4);
  doc.text("QTE", margin + tableWidth - 18, yPos + 4);
  doc.text("Date", margin + tableWidth - 8, yPos + 4);

  doc.text("THEME", margin + tableWidth + gap + 2, yPos + 4);
  doc.text("QTE", margin + 2 * tableWidth + gap - 18, yPos + 4);
  doc.text("Date", margin + 2 * tableWidth + gap - 8, yPos + 4);
  doc.setTextColor(0, 0, 0);

  // Sous-en-têtes
  yPos += headerHeight;
  const subHeaderHeight = 5;
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, yPos, tableWidth, subHeaderHeight, "F");
  doc.rect(margin + tableWidth + gap, yPos, tableWidth, subHeaderHeight, "F");

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("TOUTE L'ANNEE", margin + 2, yPos + 3.5);
  doc.text("SAISONNIER", margin + tableWidth + gap + 2, yPos + 3.5);
  yPos += subHeaderHeight;

  // Lignes des thèmes
  const rowHeight = 4.5;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");

  // Colonne TOUTE L'ANNEE
  THEMES_TOUTE_ANNEE.forEach((theme, idx) => {
    const rowY = yPos + idx * rowHeight;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, rowY, tableWidth, rowHeight, "F");
    }
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, rowY, tableWidth, rowHeight);
    
    const selection = themeSelections.find(t => t.theme === theme && t.category === "TOUTE_ANNEE");
    doc.text(theme, margin + 1.5, rowY + 3);
    if (selection?.quantity) {
      doc.text(selection.quantity, margin + tableWidth - 17, rowY + 3);
    }
    if (selection?.deliveryDate) {
      doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + tableWidth - 8, rowY + 3);
    }
  });

  // Colonne SAISONNIER
  THEMES_SAISONNIER.forEach((theme, idx) => {
    const rowY = yPos + idx * rowHeight;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin + tableWidth + gap, rowY, tableWidth, rowHeight, "F");
    }
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin + tableWidth + gap, rowY, tableWidth, rowHeight);
    
    const selection = themeSelections.find(t => t.theme === theme && t.category === "SAISONNIER");
    doc.text(theme, margin + tableWidth + gap + 1.5, rowY + 3);
    if (selection?.quantity) {
      doc.text(selection.quantity, margin + 2 * tableWidth + gap - 17, rowY + 3);
    }
    if (selection?.deliveryDate) {
      doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + 2 * tableWidth + gap - 8, rowY + 3);
    }
  });

  yPos += Math.max(THEMES_TOUTE_ANNEE.length, THEMES_SAISONNIER.length) * rowHeight + 6;

  // === LIVRAISON ET FACTURATION (2 colonnes) ===
  const boxWidth = (pageWidth - 2 * margin - gap) / 2;
  const boxHeight = 38;

  // Livraison
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("LIVRAISON", margin + 2, yPos + 4);
  
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  let livY = yPos + 9;
  doc.text(`ENSEIGNE : ${order.livraisonEnseigne || ""}`, margin + 2, livY);
  livY += 4.5;
  doc.text(`ADRESSE : ${order.livraisonAdresse || ""}`, margin + 2, livY);
  livY += 4.5;
  doc.text(`CP / VILLE : ${order.livraisonCpVille || ""}`, margin + 2, livY);
  livY += 4.5;
  doc.text(`Horaires : ${order.livraisonHoraires || ""}`, margin + 2, livY);
  livY += 4.5;
  doc.text(`Camion avec hayon : ${order.livraisonHayon ? "Oui" : "Non"}`, margin + 2, livY);

  // Facturation
  doc.rect(margin + boxWidth + gap, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FACTURATION", margin + boxWidth + gap + 2, yPos + 4);
  
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  let facY = yPos + 9;
  doc.text(`RAISON SOCIALE : ${order.facturationRaisonSociale || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 4.5;
  doc.text(`ADRESSE : ${order.facturationAdresse || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 4.5;
  doc.text(`CP / VILLE : ${order.facturationCpVille || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 4.5;
  doc.text(`MODE DE RÈGLEMENT : ${order.facturationMode || ""}`, margin + boxWidth + gap + 2, facY);
  if (order.facturationRib) {
    facY += 4.5;
    doc.text(`RIB : ${order.facturationRib}`, margin + boxWidth + gap + 2, facY);
  }

  // CGV extrait
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRAIT DES CGV", margin + boxWidth + gap + 2, yPos + 30);
  doc.setFont("helvetica", "normal");
  doc.text("Règlement à 30 jours date de facture - Escompte 2% si paiement comptant", margin + boxWidth + gap + 2, yPos + 34);

  yPos += boxHeight + 5;

  // === REMARQUES ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("REMARQUES", margin, yPos);
  yPos += 4;
  
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 15);
  
  if (order.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const remarksLines = doc.splitTextToSize(order.remarks, pageWidth - 2 * margin - 4);
    doc.text(remarksLines, margin + 2, yPos + 4);
  }
  yPos += 19;

  // === SIGNATURES ===
  const sigBoxWidth = (pageWidth - 2 * margin - 20) / 2;
  const sigBoxHeight = 28;

  // Signature magasin (gauche)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Le Magasin", margin + sigBoxWidth / 2, yPos, { align: "center" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text("Cachet et signature obligatoires", margin + sigBoxWidth / 2, yPos + 3, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.text("Le client reconnait avoir pris connaissance des CGV", margin + sigBoxWidth / 2, yPos + 6, { align: "center" });
  
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPos + 8, sigBoxWidth, sigBoxHeight);
  
  // Ajouter la signature du client
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", margin + 3, yPos + 10, sigBoxWidth - 6, sigBoxHeight - 6);
    } catch (error) {
      console.error("Erreur signature:", error);
    }
  }
  
  // Infos signature
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(`Signé par: ${order.clientSignedName || ""}`, margin + 2, yPos + sigBoxHeight + 11);
  doc.text(`Le: ${formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr })} à ${order.signatureLocation || ""}`, margin + 2, yPos + sigBoxHeight + 15);
  if (order.cgvAccepted) {
    doc.setFont("helvetica", "bold");
    doc.text("CGV ACCEPTÉES", margin + 2, yPos + sigBoxHeight + 19);
  }

  // Signature société (droite)
  const sigRightX = margin + sigBoxWidth + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Pour la société", sigRightX + sigBoxWidth / 2, yPos, { align: "center" });
  
  doc.rect(sigRightX, yPos + 8, sigBoxWidth, sigBoxHeight);

  // === PIED DE PAGE ===
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Document généré le ${formatInTimeZone(new Date(), "Europe/Paris", "dd/MM/yyyy à HH:mm", { locale: fr })} - Réf: ${order.orderCode}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  // Mention légale
  doc.setFontSize(4.5);
  doc.text(
    "Pour toutes les contestations relatives aux ventes réalisées par la société BOISSELLERIE DISTRIBUTION, seul sera compétent le Tribunal de Commerce de VILLEFRANCHE-TARARE.",
    pageWidth / 2,
    pageHeight - 3,
    { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}
