import ExcelJS from "exceljs";
import { type Order, THEMES_TOUTE_ANNEE, THEMES_SAISONNIER, type ThemeSelection } from "@shared/schema";
import { FOURNISSEURS_CONFIG, getFournisseurConfig } from "@shared/fournisseurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export async function generateOrderExcel(order: Order): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Commande");
  
  worksheet.columns = [
    { width: 20 },
    { width: 25 },
    { width: 12 },
    { width: 12 },
    { width: 20 },
    { width: 25 },
    { width: 12 },
    { width: 12 }
  ];
  
  let currentRow = 1;
  
  // Récupérer le fournisseur
  const fournisseurConfig = FOURNISSEURS_CONFIG.find(f => f.id === order.fournisseur) || FOURNISSEURS_CONFIG[0];
  
  // Titre
  worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = `BON DE COMMANDE ${fournisseurConfig.nom}`;
  titleCell.font = { size: 18, bold: true, color: { argb: "FF003366" } };
  titleCell.alignment = { horizontal: "center" };
  currentRow += 2;
  
  // Info fournisseur
  worksheet.getCell(`A${currentRow}`).value = "FOURNISSEUR";
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).value = fournisseurConfig.nom;
  currentRow++;

  // En-tête
  worksheet.getCell(`A${currentRow}`).value = "DATE";
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(order.orderDate), "Europe/Paris", "dd/MM/yyyy");
  worksheet.getCell(`C${currentRow}`).value = "COMMERCIAL";
  worksheet.getCell(`C${currentRow}`).font = { bold: true };
  worksheet.getCell(`D${currentRow}`).value = order.salesRepName;
  worksheet.getCell(`F${currentRow}`).value = `Réf: ${order.orderCode}`;
  worksheet.getCell(`F${currentRow}`).font = { bold: true };
  currentRow += 2;

  // Contacts
  worksheet.getCell(`A${currentRow}`).value = "RESPONSABLE";
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
  worksheet.getCell(`E${currentRow}`).value = "SERVICE COMPTABILITÉ";
  worksheet.getCell(`E${currentRow}`).font = { bold: true, size: 11 };
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Nom";
  worksheet.getCell(`B${currentRow}`).value = order.responsableName;
  worksheet.getCell(`E${currentRow}`).value = "Tel.";
  worksheet.getCell(`F${currentRow}`).value = order.comptaTel || "";
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Tel.";
  worksheet.getCell(`B${currentRow}`).value = order.responsableTel;
  worksheet.getCell(`E${currentRow}`).value = "E-mail";
  worksheet.getCell(`F${currentRow}`).value = order.comptaEmail || "";
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "E-mail";
  worksheet.getCell(`B${currentRow}`).value = order.responsableEmail;
  currentRow += 2;

  // Thèmes
  const themeSelections: ThemeSelection[] = order.themeSelections ? JSON.parse(order.themeSelections) : [];

  // En-têtes des tableaux de thèmes
  worksheet.getCell(`A${currentRow}`).value = "TOUTE L'ANNEE";
  worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(`A${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);

  worksheet.getCell(`E${currentRow}`).value = "SAISONNIER";
  worksheet.getCell(`E${currentRow}`).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(`E${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE67E22" } };
  worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
  currentRow++;

  // Sous-en-têtes
  worksheet.getCell(`A${currentRow}`).value = "THEME";
  worksheet.getCell(`B${currentRow}`).value = "";
  worksheet.getCell(`C${currentRow}`).value = "QTE";
  worksheet.getCell(`D${currentRow}`).value = "Date livr.";
  worksheet.getCell(`E${currentRow}`).value = "THEME";
  worksheet.getCell(`F${currentRow}`).value = "";
  worksheet.getCell(`G${currentRow}`).value = "QTE";
  worksheet.getCell(`H${currentRow}`).value = "Date livr.";
  ["A", "B", "C", "D", "E", "F", "G", "H"].forEach(col => {
    worksheet.getCell(`${col}${currentRow}`).font = { bold: true, size: 9 };
    worksheet.getCell(`${col}${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
  });
  currentRow++;

  // Lignes des thèmes
  const maxThemes = Math.max(THEMES_TOUTE_ANNEE.length, THEMES_SAISONNIER.length);
  for (let i = 0; i < maxThemes; i++) {
    const toutAnnee = THEMES_TOUTE_ANNEE[i];
    const saisonnier = THEMES_SAISONNIER[i];

    if (toutAnnee) {
      worksheet.getCell(`A${currentRow}`).value = toutAnnee;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const selection = themeSelections.find(t => t.theme === toutAnnee && t.category === "TOUTE_ANNEE");
      if (selection?.quantity) worksheet.getCell(`C${currentRow}`).value = selection.quantity;
      if (selection?.deliveryDate) worksheet.getCell(`D${currentRow}`).value = format(new Date(selection.deliveryDate), "dd/MM");
    }

    if (saisonnier) {
      worksheet.getCell(`E${currentRow}`).value = saisonnier;
      worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
      const selection = themeSelections.find(t => t.theme === saisonnier && t.category === "SAISONNIER");
      if (selection?.quantity) worksheet.getCell(`G${currentRow}`).value = selection.quantity;
      if (selection?.deliveryDate) worksheet.getCell(`H${currentRow}`).value = format(new Date(selection.deliveryDate), "dd/MM");
    }

    // Bordures
    ["A", "B", "C", "D", "E", "F", "G", "H"].forEach(col => {
      worksheet.getCell(`${col}${currentRow}`).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    currentRow++;
  }
  currentRow++;

  // Livraison et Facturation
  worksheet.getCell(`A${currentRow}`).value = "LIVRAISON";
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
  worksheet.getCell(`E${currentRow}`).value = "FACTURATION";
  worksheet.getCell(`E${currentRow}`).font = { bold: true, size: 11 };
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Enseigne";
  worksheet.getCell(`B${currentRow}`).value = order.livraisonEnseigne;
  worksheet.getCell(`E${currentRow}`).value = "Raison sociale";
  worksheet.getCell(`F${currentRow}`).value = order.facturationRaisonSociale;
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Adresse";
  worksheet.getCell(`B${currentRow}`).value = order.livraisonAdresse;
  worksheet.getCell(`E${currentRow}`).value = "Adresse";
  worksheet.getCell(`F${currentRow}`).value = order.facturationAdresse;
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "CP / Ville";
  worksheet.getCell(`B${currentRow}`).value = order.livraisonCpVille;
  worksheet.getCell(`E${currentRow}`).value = "CP / Ville";
  worksheet.getCell(`F${currentRow}`).value = order.facturationCpVille;
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Horaires";
  worksheet.getCell(`B${currentRow}`).value = order.livraisonHoraires || "";
  worksheet.getCell(`E${currentRow}`).value = "Mode règlement";
  worksheet.getCell(`F${currentRow}`).value = order.facturationMode;
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Hayon";
  worksheet.getCell(`B${currentRow}`).value = order.livraisonHayon ? "Oui" : "Non";
  if (order.facturationRib) {
    worksheet.getCell(`E${currentRow}`).value = "RIB";
    worksheet.getCell(`F${currentRow}`).value = order.facturationRib;
  }
  currentRow++;
  if (order.numeroTva) {
    worksheet.getCell(`E${currentRow}`).value = "N° TVA";
    worksheet.getCell(`F${currentRow}`).value = order.numeroTva;
  }
  currentRow += 2;

  // Remarques
  if (order.remarks) {
    worksheet.getCell(`A${currentRow}`).value = "REMARQUES";
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = order.remarks;
    worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true };
    currentRow += 2;
  }

  // Signature
  worksheet.getCell(`A${currentRow}`).value = "SIGNATURE CLIENT";
  worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
  currentRow++;

  worksheet.getCell(`A${currentRow}`).value = "Nom";
  worksheet.getCell(`B${currentRow}`).value = order.clientSignedName;
  worksheet.getCell(`C${currentRow}`).value = "Lieu";
  worksheet.getCell(`D${currentRow}`).value = order.signatureLocation;
  worksheet.getCell(`E${currentRow}`).value = "Date";
  worksheet.getCell(`F${currentRow}`).value = formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "dd/MM/yyyy");
  worksheet.getCell(`G${currentRow}`).value = "CGV";
  worksheet.getCell(`H${currentRow}`).value = order.cgvAccepted ? "ACCEPTÉES" : "Non acceptées";
  worksheet.getCell(`H${currentRow}`).font = { bold: true, color: { argb: order.cgvAccepted ? "FF008000" : "FFFF0000" } };
  currentRow++;

  if (order.signature) {
    const base64Data = order.signature.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });
    
    worksheet.addImage(imageId, {
      tl: { col: 0, row: currentRow },
      ext: { width: 200, height: 80 }
    });
    currentRow += 5;
  }

  currentRow++;
  worksheet.getCell(`A${currentRow}`).value = "Document généré le";
  worksheet.getCell(`A${currentRow}`).font = { italic: true, size: 9 };
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(), "Europe/Paris", "dd/MM/yyyy à HH:mm");
  worksheet.getCell(`B${currentRow}`).font = { italic: true, size: 9 };

  // === FEUILLE CGV ===
  const cgvSheet = workbook.addWorksheet("CGV");
  cgvSheet.columns = [{ width: 100 }];
  
  let cgvRow = 1;
  
  // Titre CGV
  cgvSheet.getCell(`A${cgvRow}`).value = `CONDITIONS GÉNÉRALES DE VENTE - ${fournisseurConfig.nom}`;
  cgvSheet.getCell(`A${cgvRow}`).font = { size: 14, bold: true, color: { argb: "FF003366" } };
  cgvRow += 2;
  
  // Contenu CGV
  const cgvLines = fournisseurConfig.cgv.split('\n');
  for (const line of cgvLines) {
    cgvSheet.getCell(`A${cgvRow}`).value = line;
    cgvSheet.getCell(`A${cgvRow}`).alignment = { wrapText: true };
    cgvSheet.getCell(`A${cgvRow}`).font = { size: 10 };
    cgvRow++;
  }
  
  cgvRow += 2;
  cgvSheet.getCell(`A${cgvRow}`).value = `Annexe CGV - Commande ${order.orderCode}`;
  cgvSheet.getCell(`A${cgvRow}`).font = { italic: true, size: 9, color: { argb: "FF666666" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
