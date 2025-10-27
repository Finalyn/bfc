import ExcelJS from "exceljs";
import { type Order } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export async function generateOrderExcel(order: Order): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Commande");
  
  // Définir la largeur des colonnes (4 colonnes pour layout avec signature à droite)
  worksheet.columns = [
    { width: 25 },  // A - Labels colonne gauche
    { width: 35 },  // B - Valeurs colonne gauche
    { width: 25 },  // C - Labels colonne droite (signature)
    { width: 35 }   // D - Valeurs colonne droite (signature)
  ];
  
  let currentRow = 1;
  
  // Titre
  worksheet.getCell(`A${currentRow}`).value = "BON DE COMMANDE";
  worksheet.getCell(`A${currentRow}`).font = { size: 16, bold: true };
  currentRow += 2;
  
  // Informations de commande
  worksheet.getCell(`A${currentRow}`).value = "Numéro de commande";
  worksheet.getCell(`B${currentRow}`).value = order.orderCode;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Date de création";
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(order.createdAt), "Europe/Paris", "d MMMM yyyy", { locale: fr });
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow += 2;
  
  // Sauvegarder la ligne de départ pour la signature à droite
  const startRow = currentRow;
  
  // Commercial (colonne gauche)
  worksheet.getCell(`A${currentRow}`).value = "COMMERCIAL";
  worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Nom du commercial";
  worksheet.getCell(`B${currentRow}`).value = order.salesRepName;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow += 2;
  
  // Informations client (colonne gauche)
  worksheet.getCell(`A${currentRow}`).value = "INFORMATIONS CLIENT";
  worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Nom du client";
  worksheet.getCell(`B${currentRow}`).value = order.clientName;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Email";
  worksheet.getCell(`B${currentRow}`).value = order.clientEmail;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  
  // Signature (colonne droite - à côté des infos client)
  let signatureRow = startRow;
  worksheet.getCell(`C${signatureRow}`).value = "SIGNATURE DU CLIENT";
  worksheet.getCell(`C${signatureRow}`).font = { size: 12, bold: true };
  signatureRow++;
  
  worksheet.getCell(`C${signatureRow}`).value = "Nom et prénom";
  worksheet.getCell(`D${signatureRow}`).value = order.clientSignedName;
  worksheet.getCell(`C${signatureRow}`).font = { bold: true };
  signatureRow++;
  
  worksheet.getCell(`C${signatureRow}`).value = "Lieu";
  worksheet.getCell(`D${signatureRow}`).value = order.signatureLocation;
  worksheet.getCell(`C${signatureRow}`).font = { bold: true };
  signatureRow++;
  
  worksheet.getCell(`C${signatureRow}`).value = "Date";
  worksheet.getCell(`D${signatureRow}`).value = formatInTimeZone(new Date(order.signatureDate), "Europe/Paris", "d MMMM yyyy", { locale: fr });
  worksheet.getCell(`C${signatureRow}`).font = { bold: true };
  signatureRow++;
  
  // Ajouter l'image de signature dans la colonne droite
  if (order.signature) {
    const base64Data = order.signature.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });
    
    // Insérer l'image dans la colonne droite (colonne C-D)
    worksheet.addImage(imageId, {
      tl: { col: 2, row: signatureRow },
      ext: { width: 180, height: 90 }
    });
    
    signatureRow += 5;
  }
  
  // Continuer après la zone la plus basse
  currentRow = Math.max(currentRow, signatureRow) + 2;
  
  // Détails de la commande
  worksheet.getCell(`A${currentRow}`).value = "DÉTAILS DE LA COMMANDE";
  worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Fournisseur";
  worksheet.getCell(`B${currentRow}`).value = order.supplier;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Thématique produit";
  worksheet.getCell(`B${currentRow}`).value = order.productTheme;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = "Quantité";
  worksheet.getCell(`B${currentRow}`).value = order.quantity;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;
  
  if (order.quantityNote) {
    worksheet.getCell(`A${currentRow}`).value = "Note sur la quantité";
    worksheet.getCell(`B${currentRow}`).value = order.quantityNote;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
  }
  
  worksheet.getCell(`A${currentRow}`).value = "Date de livraison souhaitée";
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(order.deliveryDate), "Europe/Paris", "d MMMM yyyy", { locale: fr });
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  currentRow += 2;
  
  // Remarques (sur toute la largeur)
  if (order.remarks) {
    worksheet.getCell(`A${currentRow}`).value = "REMARQUES";
    worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    currentRow++;
    
    // Fusionner les cellules pour les remarques sur toute la largeur
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = order.remarks;
    worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
    currentRow += 2;
  }
  
  currentRow++;
  worksheet.getCell(`A${currentRow}`).value = "Document généré le";
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(), "Europe/Paris", "d MMMM yyyy à HH:mm", { locale: fr });
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  
  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
