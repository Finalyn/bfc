import { jsPDF } from "jspdf";
import { type Order, THEMES_TOUTE_ANNEE, THEMES_SAISONNIER, type ThemeSelection } from "@shared/schema";
import { FOURNISSEURS_CONFIG } from "@shared/fournisseurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import headerImageUrl from "@assets/Haut_de_page_BFC_1767019338721.jpg";

let headerImageBase64: string | null = null;

async function loadHeaderImage(): Promise<string | null> {
  if (headerImageBase64) return headerImageBase64;
  
  try {
    const response = await fetch(headerImageUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        headerImageBase64 = reader.result as string;
        resolve(headerImageBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to load header image:", e);
    return null;
  }
}

export async function generateOrderPDFClient(order: Order): Promise<Blob> {
  const headerImage = await loadHeaderImage();
  
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = 8;

  if (headerImage) {
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = 28;
    doc.addImage(headerImage, "JPEG", margin, yPos, imgWidth, imgHeight);
    yPos += imgHeight + 6;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("DATE :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr }), margin + 16, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL :", margin, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.text(order.salesRepName, margin + 32, yPos + 6);

  const fournisseur = FOURNISSEURS_CONFIG.find(f => f.id === order.fournisseur) || FOURNISSEURS_CONFIG[0];
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`BON DE COMMANDE ${fournisseur.nom} 2026`, pageWidth - margin, yPos + 3, { align: "right" });

  yPos += 16;

  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  const colWidth = (pageWidth - 2 * margin) / 2;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Responsable :", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableName || "", margin + 28, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("Tél :", margin, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableTel || "", margin + 12, yPos + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail :", margin, yPos + 10);
  doc.setFont("helvetica", "normal");
  doc.text(order.responsableEmail || "", margin + 18, yPos + 10);

  const col2X = margin + colWidth + 5;
  doc.setFont("helvetica", "bold");
  doc.text("Service comptabilité :", col2X, yPos);
  
  doc.text("Tél :", col2X, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaTel || "", col2X + 12, yPos + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("E-mail :", col2X, yPos + 10);
  doc.setFont("helvetica", "normal");
  doc.text(order.comptaEmail || "", col2X + 18, yPos + 10);

  yPos += 16;

  const gap = 6;
  const tableWidth = (pageWidth - 2 * margin - gap) / 2;
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];
  
  const filledSelections = themeSelections.filter(t => t.quantity && parseInt(t.quantity) > 0);
  
  if (order.fournisseur === "BDIS" || !order.fournisseur) {
    const headerHeight = 7;
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, yPos, tableWidth, headerHeight, "F");
    doc.rect(margin + tableWidth + gap, yPos, tableWidth, headerHeight, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("THEME", margin + 2, yPos + 5);
    doc.text("QTE", margin + tableWidth - 20, yPos + 5);
    doc.text("Date", margin + tableWidth - 10, yPos + 5);

    doc.text("THEME", margin + tableWidth + gap + 2, yPos + 5);
    doc.text("QTE", margin + 2 * tableWidth + gap - 20, yPos + 5);
    doc.text("Date", margin + 2 * tableWidth + gap - 10, yPos + 5);
    doc.setTextColor(0, 0, 0);

    yPos += headerHeight;
    const subHeaderHeight = 6;
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPos, tableWidth, subHeaderHeight, "F");
    doc.rect(margin + tableWidth + gap, yPos, tableWidth, subHeaderHeight, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TOUTE L'ANNEE", margin + 2, yPos + 4);
    doc.text("SAISONNIER", margin + tableWidth + gap + 2, yPos + 4);
    yPos += subHeaderHeight;

    const rowHeight = 5.5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    THEMES_TOUTE_ANNEE.forEach((theme, idx) => {
      const rowY = yPos + idx * rowHeight;
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, rowY, tableWidth, rowHeight, "F");
      }
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, rowY, tableWidth, rowHeight);
      
      const selection = themeSelections.find(t => t.theme === theme && (t.category === "TOUTE_ANNEE" || t.category === "TOUTE L'ANNÉE"));
      doc.text(theme, margin + 2, rowY + 4);
      if (selection?.quantity) {
        doc.text(selection.quantity, margin + tableWidth - 18, rowY + 4);
      }
      if (selection?.deliveryDate) {
        doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + tableWidth - 9, rowY + 4);
      }
    });

    THEMES_SAISONNIER.forEach((theme, idx) => {
      const rowY = yPos + idx * rowHeight;
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin + tableWidth + gap, rowY, tableWidth, rowHeight, "F");
      }
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin + tableWidth + gap, rowY, tableWidth, rowHeight);
      
      const selection = themeSelections.find(t => t.theme === theme && t.category === "SAISONNIER");
      doc.text(theme, margin + tableWidth + gap + 2, rowY + 4);
      if (selection?.quantity) {
        doc.text(selection.quantity, margin + 2 * tableWidth + gap - 18, rowY + 4);
      }
      if (selection?.deliveryDate) {
        doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + 2 * tableWidth + gap - 9, rowY + 4);
      }
    });

    yPos += Math.max(THEMES_TOUTE_ANNEE.length, THEMES_SAISONNIER.length) * 5.5 + 8;
  } else {
    const fullTableWidth = pageWidth - 2 * margin;
    const headerHeight = 7;
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, yPos, fullTableWidth, headerHeight, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PRODUIT", margin + 2, yPos + 5);
    doc.text("CATEGORIE", margin + fullTableWidth * 0.5, yPos + 5);
    doc.text("QTE", margin + fullTableWidth - 30, yPos + 5);
    doc.text("Date livr.", margin + fullTableWidth - 18, yPos + 5);
    doc.setTextColor(0, 0, 0);

    yPos += headerHeight;
    const rowHeight = 5.5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    filledSelections.forEach((selection, idx) => {
      const rowY = yPos + idx * rowHeight;
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, rowY, fullTableWidth, rowHeight, "F");
      }
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, rowY, fullTableWidth, rowHeight);
      
      const themeName = selection.theme.length > 35 ? selection.theme.substring(0, 32) + "..." : selection.theme;
      doc.text(themeName, margin + 2, rowY + 4);
      doc.text(selection.category || "", margin + fullTableWidth * 0.5, rowY + 4);
      doc.text(selection.quantity || "", margin + fullTableWidth - 28, rowY + 4);
      if (selection.deliveryDate) {
        doc.text(format(new Date(selection.deliveryDate), "dd/MM"), margin + fullTableWidth - 15, rowY + 4);
      }
    });

    yPos += Math.max(filledSelections.length, 1) * rowHeight + 8;
  }

  const boxWidth = (pageWidth - 2 * margin - gap) / 2;
  const boxHeight = 42;

  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LIVRAISON", margin + 2, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let livY = yPos + 11;
  doc.text(`ENSEIGNE : ${order.livraisonEnseigne || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`ADRESSE : ${order.livraisonAdresse || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`CP / VILLE : ${order.livraisonCpVille || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`Horaires : ${order.livraisonHoraires || ""}`, margin + 2, livY);
  livY += 5;
  doc.text(`Camion avec hayon : ${order.livraisonHayon ? "Oui" : "Non"}`, margin + 2, livY);

  doc.rect(margin + boxWidth + gap, yPos, boxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FACTURATION", margin + boxWidth + gap + 2, yPos + 5);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let facY = yPos + 11;
  doc.text(`RAISON SOCIALE : ${order.facturationRaisonSociale || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 5;
  doc.text(`ADRESSE : ${order.facturationAdresse || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 5;
  doc.text(`CP / VILLE : ${order.facturationCpVille || ""}`, margin + boxWidth + gap + 2, facY);
  facY += 5;
  doc.text(`MODE DE RÈGLEMENT : ${order.facturationMode || ""}`, margin + boxWidth + gap + 2, facY);
  if (order.facturationRib) {
    facY += 5;
    doc.text(`RIB : ${order.facturationRib}`, margin + boxWidth + gap + 2, facY);
  }

  const fournisseurConfig = FOURNISSEURS_CONFIG.find(f => f.id === order.fournisseur) || FOURNISSEURS_CONFIG[0];
  const cgvExtrait = fournisseurConfig.cgv.split("\n").slice(0, 3).join(" ").substring(0, 80);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(`EXTRAIT DES CGV ${fournisseurConfig.nom}`, margin + boxWidth + gap + 2, yPos + 33);
  doc.setFont("helvetica", "normal");
  doc.text(cgvExtrait + "...", margin + boxWidth + gap + 2, yPos + 38);

  yPos += boxHeight + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REMARQUES", margin, yPos);
  yPos += 5;
  
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 18);
  
  if (order.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const remarksLines = doc.splitTextToSize(order.remarks, pageWidth - 2 * margin - 4);
    doc.text(remarksLines, margin + 2, yPos + 5);
  }
  yPos += 22;

  const sigBoxWidth = (pageWidth - 2 * margin - 20) / 2;
  const sigBoxHeight = 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Le Magasin", margin + sigBoxWidth / 2, yPos, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Cachet et signature obligatoires", margin + sigBoxWidth / 2, yPos + 4, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.text("Le client reconnait avoir pris connaissance des CGV", margin + sigBoxWidth / 2, yPos + 8, { align: "center" });
  
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, yPos + 10, sigBoxWidth, sigBoxHeight);
  
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", margin + 3, yPos + 12, sigBoxWidth - 6, sigBoxHeight - 6);
    } catch (error) {
      console.error("Erreur signature:", error);
    }
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Signé par: ${order.clientSignedName || ""}`, margin + 2, yPos + sigBoxHeight + 14);
  doc.text(`Le: ${formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "dd/MM/yyyy", { locale: fr })} à ${order.signatureLocation || ""}`, margin + 2, yPos + sigBoxHeight + 18);

  const sigRightX = margin + sigBoxWidth + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Pour la société", sigRightX + sigBoxWidth / 2, yPos, { align: "center" });
  
  doc.rect(sigRightX, yPos + 10, sigBoxWidth, sigBoxHeight);

  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Document généré le ${formatInTimeZone(new Date(), "Europe/Paris", "dd/MM/yyyy à HH:mm", { locale: fr })} - Réf: ${order.orderCode}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  doc.setFontSize(4.5);
  const mentionLegale = fournisseurConfig.nomComplet 
    ? `Pour toutes les contestations relatives aux ventes réalisées par la société ${fournisseurConfig.nomComplet}, seul sera compétent le Tribunal de Commerce compétent.`
    : "Pour toutes les contestations relatives aux ventes, seul sera compétent le Tribunal de Commerce compétent.";
  doc.text(
    mentionLegale,
    pageWidth / 2,
    pageHeight - 3,
    { align: "center" }
  );

  return doc.output("blob");
}

export function downloadPDFBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
