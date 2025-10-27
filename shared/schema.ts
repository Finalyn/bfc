import { z } from "zod";

// Schema pour une commande
export const orderSchema = z.object({
  orderCode: z.string(),
  salesRepName: z.string().min(1, "Le nom du commercial est requis"),
  clientName: z.string().min(1, "Le nom du client est requis"),
  clientEmail: z.string().email("Email invalide"),
  supplier: z.string().min(1, "Le fournisseur est requis"),
  productTheme: z.string().min(1, "La thématique produit est requise"),
  quantity: z.string().min(1, "La quantité est requise"),
  quantityNote: z.string().optional(),
  deliveryDate: z.string().min(1, "La date de livraison est requise"),
  remarks: z.string().optional(),
  signature: z.string().min(1, "La signature est requise"),
  signatureLocation: z.string().min(1, "Le lieu de signature est requis"),
  signatureDate: z.string().min(1, "La date de signature est requise"),
  clientSignedName: z.string().min(1, "Le nom écrit du client est requis"),
  createdAt: z.string(),
});

export const insertOrderSchema = orderSchema.omit({ 
  orderCode: true,
  createdAt: true,
});

export type Order = z.infer<typeof orderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Schema pour la configuration des emails
export const emailConfigSchema = z.object({
  clientEmail: z.string().email("Email client invalide"),
  agencyEmail: z.string().email("Email agence invalide"),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;
