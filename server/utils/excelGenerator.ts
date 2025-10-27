import * as XLSX from "xlsx";
import { type Order } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function generateOrderExcel(order: Order): Buffer {
  // Créer les données pour le fichier Excel
  const data = [
    ["BON DE COMMANDE"],
    [""],
    ["Numéro de commande", order.orderCode],
    ["Date de création", format(new Date(order.createdAt), "d MMMM yyyy", { locale: fr })],
    [""],
    ["INFORMATIONS CLIENT"],
    ["Nom du client", order.clientName],
    ["Email", order.clientEmail],
    [""],
    ["DÉTAILS DE LA COMMANDE"],
    ["Fournisseur", order.supplier],
    ["Thématique produit", order.productTheme],
    ["Quantité", order.quantity],
  ];
  
  if (order.quantityNote) {
    data.push(["Note sur la quantité", order.quantityNote]);
  }
  
  data.push(
    ["Date de livraison souhaitée", format(new Date(order.deliveryDate), "d MMMM yyyy", { locale: fr })],
    [""]
  );
  
  if (order.remarks) {
    data.push(
      ["REMARQUES"],
      [order.remarks],
      [""]
    );
  }
  
  data.push(
    ["SIGNATURE"],
    ["Signature capturée électroniquement"],
    [""],
    ["Document généré le", format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })]
  );
  
  // Créer une feuille de calcul
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet["!cols"] = [
    { wch: 30 },
    { wch: 50 }
  ];
  
  // Créer un classeur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commande");
  
  // Générer le buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  
  return excelBuffer;
}
