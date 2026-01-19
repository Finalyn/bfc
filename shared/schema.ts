import { z } from "zod";
import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
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
  previousValues: text("previous_values"),
  modificationApproved: boolean("modification_approved").default(true),
  approvedAt: timestamp("approved_at"),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  previousValues: true,
  modificationApproved: true,
  approvedAt: true,
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
  category: z.string(),
  quantity: z.string().optional(),
  deliveryDate: z.string().optional(),
});

export type ThemeSelection = z.infer<typeof themeSelectionSchema>;

// Schema pour une commande BDIS 2026
export const orderSchema = z.object({
  orderCode: z.string(),
  orderDate: z.string().min(1, "La date est requise"),
  
  // Fournisseur
  fournisseur: z.string().min(1, "Le fournisseur est requis"),
  
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
  numeroTva: z.string().optional(), // Numéro de TVA intracommunautaire
  
  // Remarques
  remarks: z.string().optional(),
  
  // CGV
  cgvAccepted: z.boolean().refine(val => val === true, { message: "Vous devez accepter les CGV" }),
  
  // Signature client (Le Magasin)
  signature: z.string().min(1, "La signature est requise"),
  signatureLocation: z.string().min(1, "Le lieu de signature est requis"),
  signatureDate: z.string().min(1, "La date de signature est requise"),
  clientSignedName: z.string().min(1, "Le nom du signataire est requis"),
  
  // Newsletter
  newsletterAccepted: z.boolean().optional().default(true),
  
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

// Table des commerciaux
export const commerciaux = pgTable("commerciaux", {
  id: serial("id").primaryKey(),
  prenom: text("prenom").notNull().default(""),
  nom: text("nom").notNull(),
  role: text("role").notNull().default("commercial"), // "admin" ou "commercial"
  actif: boolean("actif").notNull().default(true), // accès activé ou révoqué
  motDePasse: text("mot_de_passe").notNull().default("bfc26"), // mot de passe par défaut
});

export const insertCommercialSchema = createInsertSchema(commerciaux).omit({
  id: true,
});

export type Commercial = typeof commerciaux.$inferSelect;
export type InsertCommercial = z.infer<typeof insertCommercialSchema>;

// Table des fournisseurs
export const fournisseurs = pgTable("fournisseurs", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  nomCourt: text("nom_court").notNull(),
});

export const insertFournisseurSchema = createInsertSchema(fournisseurs).omit({
  id: true,
});

export type Fournisseur = typeof fournisseurs.$inferSelect;
export type InsertFournisseur = z.infer<typeof insertFournisseurSchema>;

// Table des thèmes
export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  theme: text("theme").notNull(),
  fournisseur: text("fournisseur").notNull(),
  categorie: text("categorie").default("TOUTE_ANNEE"),
});

export const insertThemeSchema = createInsertSchema(themes).omit({
  id: true,
});

export type Theme = typeof themes.$inferSelect;
export type InsertTheme = z.infer<typeof insertThemeSchema>;

// Table des commandes
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").notNull().unique(),
  orderDate: text("order_date").notNull(),
  
  // Fournisseur
  fournisseur: text("fournisseur").notNull().default("BDIS"),
  
  // Commercial
  salesRepName: text("sales_rep_name").notNull(),
  commercialId: integer("commercial_id"),
  
  // Client/Responsable
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientTel: text("client_tel").default(""),
  
  // Thèmes (JSON)
  themeSelections: text("theme_selections").notNull(),
  
  // Livraison
  livraisonEnseigne: text("livraison_enseigne").notNull(),
  livraisonAdresse: text("livraison_adresse").notNull(),
  livraisonCpVille: text("livraison_cp_ville").notNull(),
  livraisonHoraires: text("livraison_horaires").default(""),
  livraisonHayon: boolean("livraison_hayon").default(false),
  
  // Facturation
  facturationRaisonSociale: text("facturation_raison_sociale").notNull(),
  facturationAdresse: text("facturation_adresse").notNull(),
  facturationCpVille: text("facturation_cp_ville").notNull(),
  facturationMode: text("facturation_mode").notNull(),
  facturationRib: text("facturation_rib").default(""),
  numeroTva: text("numero_tva").default(""), // N° de TVA intracommunautaire
  
  // Remarques
  remarks: text("remarks").default(""),
  
  // Champs personnalisés du fournisseur (JSON)
  champsPersonnalises: text("champs_personnalises").default("{}"),
  
  // Signature
  signature: text("signature").notNull(),
  signatureLocation: text("signature_location").notNull(),
  signatureDate: text("signature_date").notNull(),
  clientSignedName: text("client_signed_name").notNull(),
  
  // Newsletter
  newsletterAccepted: boolean("newsletter_accepted").default(true),
  
  // Dates clés du cycle commercial (le statut est implicite selon les dates remplies)
  dateLivraison: text("date_livraison"),                 // Date de livraison (calculée des thèmes à la création)
  dateInventairePrevu: text("date_inventaire_prevu"),    // Date d'inventaire prévu
  dateInventaire: text("date_inventaire"),               // Date d'inventaire effective
  dateRetour: text("date_retour"),                       // Date de retour
  
  // Métadonnées
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderDbSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOrderDatesSchema = z.object({
  dateLivraison: z.string().optional(),
  dateInventairePrevu: z.string().optional(),
  dateInventaire: z.string().optional(),
  dateRetour: z.string().optional(),
});

export type OrderDb = typeof orders.$inferSelect;
export type InsertOrderDb = z.infer<typeof insertOrderDbSchema>;
export type UpdateOrderDates = z.infer<typeof updateOrderDatesSchema>;

// Table des souscriptions push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
