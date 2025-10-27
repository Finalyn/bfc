import ExcelJS from "exceljs";
import { type Order } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export async function generateOrderExcel(order: Order): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Commande");
  
  // Définir la largeur des colonnes
  worksheet.columns = [
    { width: 30 },
    { width: 50 }
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
  
  // Informations client
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
  currentRow += 2;
  
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
  
  // Remarques
  if (order.remarks) {
    worksheet.getCell(`A${currentRow}`).value = "REMARQUES";
    worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = order.remarks;
    currentRow += 2;
  }
  
  // Signature
  worksheet.getCell(`A${currentRow}`).value = "SIGNATURE";
  worksheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
  currentRow++;
  
  // Ajouter l'image de signature
  if (order.signature) {
    // Convertir base64 en buffer
    const base64Data = order.signature.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: "png",
    });
    
    // Insérer l'image (largeur: 3 colonnes, hauteur: 4 lignes)
    worksheet.addImage(imageId, {
      tl: { col: 0, row: currentRow - 1 },
      ext: { width: 200, height: 100 }
    });
    
    currentRow += 6;
  }
  
  currentRow++;
  worksheet.getCell(`A${currentRow}`).value = "Document généré le";
  worksheet.getCell(`B${currentRow}`).value = formatInTimeZone(new Date(), "Europe/Paris", "d MMMM yyyy à HH:mm", { locale: fr });
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  
  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
