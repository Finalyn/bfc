import { z } from "zod";
import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Table des clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nom: text("nom").notNull(),
  adresse1: text("adresse1").default(""),
  adresse2: text("adresse2").default(""),
  codePostal: text("code_postal").default(""),
  ville: text("ville").default(""),
  pays: text("pays").default(""),
  interloc: text("interloc").default(""),
  tel: text("tel").default(""),
  portable: text("portable").default(""),
  fax: text("fax").default(""),
  mail: text("mail").default(""),
  isFromExcel: boolean("is_from_excel").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateClientSchema = insertClientSchema.partial();

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;

// Liste des thèmes disponibles
export const THEMES_TOUTE_ANNEE = [
  "MENAGER / PATISSERIE",
  "FOIRE TOP VENTE",
  "BRICOLAGE",
  "RANGEMENT / ENTRETIEN",
  "HIGH TECH",
  "CHAUSSETTES",
  "SENTEUR",
  "COLORIAGE",
  "SPORT",
  "ANIMAUX",
  "SUPPORTER",
] as const;

export const THEMES_SAISONNIER = [
  "JARDIN",
  "PÂQUES",
  "BARBECUE",
  "MAILLOT DE BAIN",
  "JOUETS ÉTÉ",
  "CITRONNELLE",
  "RENTREE DES CLASSES",
  "HALLOWEEN",
  "TEXTILE HIVER",
  "CHAUSSETTES HIVER",
  "NOEL",
  "DECO DE TABLE",
] as const;

// Schema pour une sélection de thème
export const themeSelectionSchema = z.object({
  theme: z.string(),
  category: z.enum(["TOUTE_ANNEE", "SAISONNIER"]),
  quantity: z.string().optional(),
  deliveryDate: z.string().optional(),
});

export type ThemeSelection = z.infer<typeof themeSelectionSchema>;

// Schema pour une commande BDIS 2026
export const orderSchema = z.object({
  orderCode: z.string(),
  orderDate: z.string().min(1, "La date est requise"),
  
  // Commercial
  salesRepName: z.string().min(1, "Le nom du commercial est requis"),
  
  // Responsable magasin
  responsableName: z.string().min(1, "Le nom du responsable est requis"),
  responsableTel: z.string().min(1, "Le téléphone du responsable est requis"),
  responsableEmail: z.string().email("Email responsable invalide"),
  
  // Service comptabilité (optionnel)
  comptaTel: z.string().optional(),
  comptaEmail: z.string().optional(),
  
  // Thèmes sélectionnés (JSON array)
  themeSelections: z.string(), // JSON stringified array of ThemeSelection
  
  // Livraison
  livraisonEnseigne: z.string().min(1, "L'enseigne est requise"),
  livraisonAdresse: z.string().min(1, "L'adresse de livraison est requise"),
  livraisonCpVille: z.string().min(1, "Le CP/Ville de livraison est requis"),
  livraisonHoraires: z.string().optional(),
  livraisonHayon: z.boolean(),
  
  // Facturation
  facturationRaisonSociale: z.string().min(1, "La raison sociale est requise"),
  facturationAdresse: z.string().min(1, "L'adresse de facturation est requise"),
  facturationCpVille: z.string().min(1, "Le CP/Ville de facturation est requis"),
  facturationMode: z.enum(["VIREMENT", "CHEQUE", "LCR"]),
  facturationRib: z.string().optional(), // Numéro de RIB pour mode LCR
  
  // Remarques
  remarks: z.string().optional(),
  
  // CGV
  cgvAccepted: z.boolean().refine(val => val === true, { message: "Vous devez accepter les CGV" }),
  
  // Signature client (Le Magasin)
  signature: z.string().min(1, "La signature est requise"),
  signatureLocation: z.string().min(1, "Le lieu de signature est requis"),
  signatureDate: z.string().min(1, "La date de signature est requise"),
  clientSignedName: z.string().min(1, "Le nom du signataire est requis"),
  
  // Métadonnées
  createdAt: z.string(),
  
  // Champs legacy pour compatibilité (seront supprimés)
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  supplier: z.string().optional(),
  productTheme: z.string().optional(),
  quantity: z.string().optional(),
  quantityNote: z.string().optional(),
  deliveryDate: z.string().optional(),
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
