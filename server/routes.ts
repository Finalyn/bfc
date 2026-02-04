import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  insertOrderSchema, type Order, 
  clients, insertClientSchema, updateClientSchema,
  commerciaux, insertCommercialSchema,
  fournisseurs, insertFournisseurSchema,
  themes, insertThemeSchema,
  orders, insertOrderDbSchema, updateOrderDatesSchema,
  pushSubscriptions, insertPushSubscriptionSchema
} from "@shared/schema";
import { generateOrderPDF } from "./utils/pdfGenerator";
import { generateOrderExcel } from "./utils/excelGenerator";
import { sendOrderEmails } from "./utils/emailSender";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { data, loadExcelData, type Client as ExcelClient } from "./dataLoader";
import { db } from "./db";
import { eq, or, sql, count, asc, desc } from "drizzle-orm";

// Stockage en mémoire des fichiers générés
const fileStorage = new Map<string, { pdf: Buffer; excel: Buffer; order: Order }>();

// Cache des commerciaux pour authentification rapide
let commerciauxCache: any[] | null = null;
let commerciauxCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute

async function getCommerciauxCached() {
  const now = Date.now();
  if (!commerciauxCache || now - commerciauxCacheTime > CACHE_DURATION) {
    commerciauxCache = await db.select().from(commerciaux);
    commerciauxCacheTime = now;
  }
  return commerciauxCache;
}

function invalidateCommerciauxCache() {
  commerciauxCache = null;
}

function generateOrderCode(): string {
  const parisTime = toZonedTime(new Date(), "Europe/Paris");
  const year = parisTime.getFullYear();
  const month = String(parisTime.getMonth() + 1).padStart(2, "0");
  const day = String(parisTime.getDate()).padStart(2, "0");
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `CMD-${year}-${month}${day}-${sequence}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint d'authentification
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Identifiant et mot de passe requis" });
      }
      
      // Chercher le commercial par identifiant (prenom+nom en minuscule) - utilise le cache
      const allCommerciaux = await getCommerciauxCached();
      const commercial = allCommerciaux.find(c => {
        const identifier = (c.prenom + c.nom).toLowerCase().replace(/\s/g, '');
        return identifier === username.toLowerCase().replace(/\s/g, '');
      });
      
      if (!commercial) {
        return res.status(401).json({ error: "Identifiant non trouvé" });
      }
      
      // Vérifier le mot de passe (stocké en base, ou défaut "bfc26")
      const userPassword = commercial.motDePasse || "bfc26";
      if (password !== userPassword) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }
      
      if (!commercial.actif) {
        return res.status(401).json({ error: "Accès révoqué. Contactez un administrateur." });
      }
      
      res.json({
        success: true,
        user: {
          id: commercial.id,
          prenom: commercial.prenom,
          nom: commercial.nom,
          fullName: `${commercial.prenom} ${commercial.nom}`.trim() || commercial.nom,
          role: commercial.role
        }
      });
    } catch (error: any) {
      console.error("Erreur auth:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Validation de la signature
  const validateSignature = (signature: string | null | undefined): { valid: boolean; error?: string } => {
    if (!signature) {
      return { valid: false, error: "Signature manquante" };
    }
    
    // Vérifier le format base64 PNG/JPEG
    const validPrefixes = [
      "data:image/png;base64,",
      "data:image/jpeg;base64,",
      "data:image/jpg;base64,"
    ];
    
    const hasValidPrefix = validPrefixes.some(prefix => signature.startsWith(prefix));
    if (!hasValidPrefix) {
      return { valid: false, error: "Format de signature invalide. Attendu: image PNG ou JPEG" };
    }
    
    // Vérifier la taille (max 500KB en base64 ~ 375KB image)
    const maxSizeBytes = 500 * 1024;
    if (signature.length > maxSizeBytes) {
      return { valid: false, error: "Signature trop volumineuse (max 500KB)" };
    }
    
    // Vérifier que le contenu base64 est valide
    try {
      const base64Content = signature.split(",")[1];
      if (!base64Content || base64Content.length < 100) {
        return { valid: false, error: "Contenu de signature invalide ou vide" };
      }
      Buffer.from(base64Content, "base64");
    } catch (e) {
      return { valid: false, error: "Données de signature corrompues" };
    }
    
    return { valid: true };
  };

  // Récupérer toutes les commandes (avec pagination)
  app.get("/api/orders", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = (page - 1) * limit;
      
      // Récupérer les commandes avec pagination
      const ordersList = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
      
      // Compter le total
      const totalResult = await db.select({ count: count() }).from(orders);
      const total = totalResult[0]?.count || 0;
      
      res.json({
        data: ordersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(Number(total) / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des commandes" });
    }
  });

  // Générer une commande avec PDF et Excel
  app.post("/api/orders/generate", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      
      // Valider la signature
      const signatureValidation = validateSignature(validatedData.signature);
      if (!signatureValidation.valid) {
        return res.status(400).json({ 
          message: signatureValidation.error,
          signatureError: true
        });
      }
      
      const orderCode = generateOrderCode();
      const order: Order = {
        ...validatedData,
        orderCode,
        createdAt: formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd'T'HH:mm:ssXXX"),
      };

      // Générer les fichiers
      const pdfBuffer = generateOrderPDF(order);
      const excelBuffer = await generateOrderExcel(order);

      // Stocker les fichiers en mémoire
      fileStorage.set(orderCode, {
        pdf: pdfBuffer,
        excel: excelBuffer,
        order,
      });

      // Calculer la date de livraison depuis les thèmes
      let dateLivraison: string | null = null;
      try {
        const themes = JSON.parse(order.themeSelections || "[]");
        const dates = themes
          .map((t: any) => t.deliveryDate)
          .filter((d: any) => d && typeof d === "string");
        if (dates.length > 0) {
          // Prendre la première date de livraison des thèmes
          dateLivraison = dates[0];
        }
      } catch (e) {}

      // Sauvegarder la commande en base de données
      await db.insert(orders).values({
        orderCode,
        orderDate: order.orderDate,
        fournisseur: order.fournisseur || "BDIS",
        salesRepName: order.salesRepName,
        clientName: order.responsableName || order.clientName || "",
        clientEmail: order.responsableEmail || order.clientEmail || "",
        clientTel: order.responsableTel || "",
        themeSelections: order.themeSelections,
        livraisonEnseigne: order.livraisonEnseigne,
        livraisonAdresse: order.livraisonAdresse,
        livraisonCpVille: order.livraisonCpVille,
        livraisonHoraires: order.livraisonHoraires || "",
        livraisonHayon: order.livraisonHayon,
        facturationRaisonSociale: order.facturationRaisonSociale,
        facturationAdresse: order.facturationAdresse,
        facturationCpVille: order.facturationCpVille,
        facturationMode: order.facturationMode,
        facturationRib: order.facturationRib || "",
        numeroTva: order.numeroTva || "",
        remarks: order.remarks || "",
        signature: order.signature,
        signatureLocation: order.signatureLocation,
        signatureDate: order.signatureDate,
        clientSignedName: order.clientSignedName,
        newsletterAccepted: (order as any).newsletterAccepted ?? true,
        dateLivraison,
      });

      // Envoyer les emails automatiquement
      let emailsSent = false;
      let emailError = null;
      try {
        await sendOrderEmails(
          order,
          pdfBuffer,
          excelBuffer,
          order.clientEmail || order.responsableEmail
        );
        emailsSent = true;
      } catch (error: any) {
        console.error("Erreur lors de l'envoi des emails:", error);
        emailError = error.message || "Erreur lors de l'envoi des emails";
      }

      res.json({
        orderCode,
        pdfUrl: `/api/orders/${orderCode}/pdf`,
        excelUrl: `/api/orders/${orderCode}/excel`,
        emailsSent,
        emailError,
      });
    } catch (error: any) {
      console.error("Erreur lors de la génération de la commande:", error);
      res.status(400).json({ 
        message: error.message || "Erreur lors de la génération de la commande" 
      });
    }
  });

  // Télécharger le PDF
  app.get("/api/orders/:orderCode/pdf", (req, res) => {
    const { orderCode } = req.params;
    const files = fileStorage.get(orderCode);

    if (!files) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${orderCode}.pdf"`);
    res.send(files.pdf);
  });

  // Télécharger l'Excel
  app.get("/api/orders/:orderCode/excel", (req, res) => {
    const { orderCode } = req.params;
    const files = fileStorage.get(orderCode);

    if (!files) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${orderCode}.xlsx"`);
    res.send(files.excel);
  });

  // Envoyer les emails
  app.post("/api/orders/send-emails", async (req, res) => {
    try {
      const { orderCode, clientEmail } = req.body;

      if (!orderCode || !clientEmail) {
        return res.status(400).json({ 
          message: "orderCode et clientEmail sont requis" 
        });
      }

      const files = fileStorage.get(orderCode);
      if (!files) {
        return res.status(404).json({ message: "Commande non trouvée" });
      }

      await sendOrderEmails(
        files.order,
        files.pdf,
        files.excel,
        clientEmail
      );

      res.json({ success: true, message: "Emails envoyés avec succès" });
    } catch (error: any) {
      console.error("Erreur lors de l'envoi des emails:", error);
      res.status(500).json({ 
        message: error.message || "Erreur lors de l'envoi des emails" 
      });
    }
  });

  // Synchroniser une commande hors ligne
  app.post("/api/orders/sync-offline", async (req, res) => {
    try {
      const { order } = req.body;
      
      if (!order || !order.orderCode) {
        return res.status(400).json({ message: "Order data is required" });
      }

      // Vérifier si la commande existe déjà
      const [existing] = await db.select().from(orders).where(eq(orders.orderCode, order.orderCode));
      
      if (!existing) {
        // Calculer la date de livraison depuis les thèmes
        let dateLivraison: string | null = null;
        try {
          const themes = JSON.parse(order.themeSelections || "[]");
          const dates = themes
            .map((t: any) => t.deliveryDate)
            .filter((d: any) => d && typeof d === "string");
          if (dates.length > 0) {
            dateLivraison = dates[0];
          }
        } catch (e) {}

        // Insérer la commande
        await db.insert(orders).values({
          orderCode: order.orderCode,
          orderDate: order.orderDate,
          fournisseur: order.fournisseur || "BDIS",
          salesRepName: order.salesRepName,
          clientName: order.responsableName || order.clientName || "",
          clientEmail: order.responsableEmail || order.clientEmail || "",
          clientTel: order.responsableTel || "",
          themeSelections: order.themeSelections,
          livraisonEnseigne: order.livraisonEnseigne,
          livraisonAdresse: order.livraisonAdresse,
          livraisonCpVille: order.livraisonCpVille,
          livraisonHoraires: order.livraisonHoraires || "",
          livraisonHayon: order.livraisonHayon,
          facturationRaisonSociale: order.facturationRaisonSociale,
          facturationAdresse: order.facturationAdresse,
          facturationCpVille: order.facturationCpVille,
          facturationMode: order.facturationMode,
          facturationRib: order.facturationRib || "",
          remarks: order.remarks || "",
          champsPersonnalises: order.champsPersonnalises || "{}",
          signature: order.signature,
          signatureLocation: order.signatureLocation,
          signatureDate: order.signatureDate,
          clientSignedName: order.clientSignedName,
          newsletterAccepted: order.newsletterAccepted ?? true,
          dateLivraison,
        });
      }

      // Générer PDF et Excel pour l'envoi d'email
      const pdfBuffer = generateOrderPDF(order);
      const excelBuffer = await generateOrderExcel(order);

      // Stocker en mémoire pour l'envoi ultérieur
      fileStorage.set(order.orderCode, {
        pdf: pdfBuffer,
        excel: excelBuffer,
        order,
      });

      // Envoyer les emails
      let emailsSent = false;
      let emailError = null;
      try {
        await sendOrderEmails(
          order,
          pdfBuffer,
          excelBuffer,
          order.clientEmail || order.responsableEmail
        );
        emailsSent = true;
      } catch (error: any) {
        console.error("Erreur lors de l'envoi des emails (sync):", error);
        emailError = error.message || "Erreur lors de l'envoi des emails";
      }

      res.json({
        success: true,
        emailsSent,
        emailError,
        orderCode: order.orderCode,
      });
    } catch (error: any) {
      console.error("Erreur sync offline:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Routes pour les données de référence (fusionnant Excel + BDD)
  app.get("/api/data/commerciaux", async (req, res) => {
    try {
      // Récupérer les commerciaux de la BDD
      const dbCommerciaux = await db.select().from(commerciaux);
      
      if (dbCommerciaux.length > 0) {
        // Si on a des données en BDD, les utiliser
        const result = dbCommerciaux.map(c => ({
          id: c.id,
          nom: c.nom,
          displayName: c.nom
        }));
        res.json(result);
      } else {
        // Sinon, fallback sur les données Excel
        res.json(data.commerciaux);
      }
    } catch (error) {
      console.error("Erreur récupération commerciaux:", error);
      res.json(data.commerciaux);
    }
  });

  app.get("/api/data/clients", async (req, res) => {
    try {
      // Récupérer les clients de la BDD
      const dbClients = await db.select().from(clients);
      const dbClientsByCode = new Map(dbClients.map(c => [c.code, c]));
      
      // Fusionner : BDD a priorité sur Excel
      const mergedClients = data.clients.map(excelClient => {
        const dbClient = dbClientsByCode.get(excelClient.code);
        if (dbClient) {
          return {
            id: `db-${dbClient.id}`,
            code: dbClient.code,
            nom: dbClient.nom,
            adresse1: dbClient.adresse1 || "",
            codePostal: dbClient.codePostal || "",
            ville: dbClient.ville || "",
            interloc: dbClient.interloc || "",
            tel: dbClient.tel || "",
            portable: dbClient.portable || "",
            mail: dbClient.mail || "",
            displayName: `${dbClient.nom} - ${dbClient.ville || ""}`.trim(),
            isFromDb: true,
          };
        }
        return excelClient;
      });
      
      // Ajouter les clients BDD qui ne sont pas dans Excel
      const excelCodes = new Set(data.clients.map(c => c.code));
      dbClients.forEach(dbClient => {
        if (!excelCodes.has(dbClient.code)) {
          mergedClients.push({
            id: `db-${dbClient.id}`,
            code: dbClient.code,
            nom: dbClient.nom,
            adresse1: dbClient.adresse1 || "",
            codePostal: dbClient.codePostal || "",
            ville: dbClient.ville || "",
            interloc: dbClient.interloc || "",
            tel: dbClient.tel || "",
            portable: dbClient.portable || "",
            mail: dbClient.mail || "",
            displayName: `${dbClient.nom} - ${dbClient.ville || ""}`.trim(),
            isFromDb: true,
          });
        }
      });
      
      res.json(mergedClients);
    } catch (error) {
      console.error("Erreur récupération clients:", error);
      res.json(data.clients);
    }
  });

  app.get("/api/data/fournisseurs", async (req, res) => {
    try {
      // Récupérer les fournisseurs de la BDD
      const dbFournisseurs = await db.select().from(fournisseurs);
      
      if (dbFournisseurs.length > 0) {
        // Si on a des données en BDD, les utiliser
        const result = dbFournisseurs.map(f => ({
          id: f.id,
          nom: f.nom,
          nomCourt: f.nomCourt || f.nom
        }));
        res.json(result);
      } else {
        // Sinon, fallback sur les données Excel
        res.json(data.fournisseurs);
      }
    } catch (error) {
      console.error("Erreur récupération fournisseurs:", error);
      res.json(data.fournisseurs);
    }
  });

  app.get("/api/data/themes", async (req, res) => {
    try {
      const { fournisseur } = req.query;
      
      // Récupérer les thèmes de la BDD
      const dbThemes = await db.select().from(themes);
      
      if (dbThemes.length > 0) {
        // Si on a des données en BDD, les utiliser
        let result = dbThemes.map(t => ({
          id: t.id,
          theme: t.theme,
          fournisseur: t.fournisseur,
          categorie: t.categorie || "TOUTE_ANNEE"
        }));
        
        if (fournisseur) {
          result = result.filter(t => t.fournisseur === fournisseur);
        }
        
        res.json(result);
      } else {
        // Sinon, fallback sur les données Excel
        if (fournisseur) {
          const filtered = data.themes.filter(t => t.fournisseur === fournisseur);
          res.json(filtered);
        } else {
          res.json(data.themes);
        }
      }
    } catch (error) {
      console.error("Erreur récupération thèmes:", error);
      if (req.query.fournisseur) {
        const filtered = data.themes.filter(t => t.fournisseur === req.query.fournisseur);
        res.json(filtered);
      } else {
        res.json(data.themes);
      }
    }
  });

  // Routes pour la gestion des clients (création/modification)
  
  // Récupérer tous les clients (fusionner Excel + DB)
  app.get("/api/clients", async (req, res) => {
    try {
      // Récupérer les clients de la base de données
      const dbClients = await db.select().from(clients);
      
      // Créer un map des clients DB par code pour fusion rapide
      const dbClientsByCode = new Map(dbClients.map(c => [c.code, c]));
      
      // Fusionner : DB a priorité sur Excel
      const mergedClients = data.clients.map(excelClient => {
        const dbClient = dbClientsByCode.get(excelClient.code);
        if (dbClient) {
          // Client mis à jour en DB - utiliser les données DB
          return {
            id: `db-${dbClient.id}`,
            code: dbClient.code,
            nom: dbClient.nom,
            adresse1: dbClient.adresse1 || "",
            adresse2: dbClient.adresse2 || "",
            codePostal: dbClient.codePostal || "",
            ville: dbClient.ville || "",
            pays: dbClient.pays || "",
            interloc: dbClient.interloc || "",
            tel: dbClient.tel || "",
            portable: dbClient.portable || "",
            fax: dbClient.fax || "",
            mail: dbClient.mail || "",
            displayName: `${dbClient.nom} - ${dbClient.ville || ""}`.trim(),
            isFromDb: true,
          };
        }
        return { ...excelClient, isFromDb: false };
      });
      
      // Ajouter les clients DB qui ne sont pas dans Excel (nouveaux clients)
      const excelCodes = new Set(data.clients.map(c => c.code));
      const newDbClients = dbClients
        .filter(c => !excelCodes.has(c.code))
        .map(c => ({
          id: `db-${c.id}`,
          code: c.code,
          nom: c.nom,
          adresse1: c.adresse1 || "",
          adresse2: c.adresse2 || "",
          codePostal: c.codePostal || "",
          ville: c.ville || "",
          pays: c.pays || "",
          interloc: c.interloc || "",
          tel: c.tel || "",
          portable: c.portable || "",
          fax: c.fax || "",
          mail: c.mail || "",
          displayName: `${c.nom} - ${c.ville || ""}`.trim(),
          isFromDb: true,
        }));
      
      res.json([...mergedClients, ...newDbClients]);
    } catch (error: any) {
      console.error("Erreur lors de la récupération des clients:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Créer un nouveau client
  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      
      // Vérifier si le code existe déjà
      const existing = await db.select().from(clients).where(eq(clients.code, validatedData.code));
      if (existing.length > 0) {
        return res.status(400).json({ message: "Un client avec ce code existe déjà" });
      }
      
      await db.insert(clients).values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const insertId = Number((idResult as any).id);
      const [newClient] = await db.select().from(clients).where(eq(clients.id, insertId));
      
      res.json({
        id: `db-${newClient.id}`,
        code: newClient.code,
        nom: newClient.nom,
        adresse1: newClient.adresse1 || "",
        adresse2: newClient.adresse2 || "",
        codePostal: newClient.codePostal || "",
        ville: newClient.ville || "",
        pays: newClient.pays || "",
        interloc: newClient.interloc || "",
        tel: newClient.tel || "",
        portable: newClient.portable || "",
        fax: newClient.fax || "",
        mail: newClient.mail || "",
        displayName: `${newClient.nom} - ${newClient.ville || ""}`.trim(),
        isFromDb: true,
      });
    } catch (error: any) {
      console.error("Erreur lors de la création du client:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Mettre à jour un client (par code)
  app.patch("/api/clients/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const validatedData = updateClientSchema.parse(req.body);
      
      // Chercher si le client existe déjà en DB
      const existing = await db.select().from(clients).where(eq(clients.code, code));
      
      if (existing.length > 0) {
        const oldClient = existing[0];
        
        // Sauvegarder les anciennes valeurs pour comparaison
        const previousValues = JSON.stringify({
          interloc: oldClient.interloc || "",
          tel: oldClient.tel || "",
          portable: oldClient.portable || "",
          mail: oldClient.mail || "",
        });
        
        // Mettre à jour le client existant avec approbation en attente
        const [updated] = await db
          .update(clients)
          .set({ 
            ...validatedData, 
            updatedAt: new Date(),
            previousValues,
            modificationApproved: false,
          })
          .where(eq(clients.code, code));
        const [updated] = await db.select().from(clients).where(eq(clients.code, code));
        
        res.json({
          id: `db-${updated.id}`,
          code: updated.code,
          nom: updated.nom,
          adresse1: updated.adresse1 || "",
          adresse2: updated.adresse2 || "",
          codePostal: updated.codePostal || "",
          ville: updated.ville || "",
          pays: updated.pays || "",
          interloc: updated.interloc || "",
          tel: updated.tel || "",
          portable: updated.portable || "",
          fax: updated.fax || "",
          mail: updated.mail || "",
          displayName: `${updated.nom} - ${updated.ville || ""}`.trim(),
          isFromDb: true,
        });
      } else {
        // Créer un nouveau client à partir des données Excel + modifications
        const excelClient = data.clients.find(c => c.code === code);
        if (!excelClient) {
          return res.status(404).json({ message: "Client non trouvé" });
        }
        
        const newClientData = {
          code: excelClient.code,
          nom: validatedData.nom || excelClient.nom,
          adresse1: validatedData.adresse1 ?? excelClient.adresse1,
          adresse2: validatedData.adresse2 ?? excelClient.adresse2,
          codePostal: validatedData.codePostal ?? excelClient.codePostal,
          ville: validatedData.ville ?? excelClient.ville,
          pays: validatedData.pays ?? excelClient.pays,
          interloc: validatedData.interloc ?? excelClient.interloc,
          tel: validatedData.tel ?? excelClient.tel,
          portable: validatedData.portable ?? excelClient.portable,
          fax: validatedData.fax ?? excelClient.fax,
          mail: validatedData.mail ?? excelClient.mail,
          isFromExcel: true,
        };
        
        await db.insert(clients).values(newClientData);
        const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const insertId = Number((idResult as any).id);
        const [newClient] = await db.select().from(clients).where(eq(clients.id, insertId));
        
        res.json({
          id: `db-${newClient.id}`,
          code: newClient.code,
          nom: newClient.nom,
          adresse1: newClient.adresse1 || "",
          adresse2: newClient.adresse2 || "",
          codePostal: newClient.codePostal || "",
          ville: newClient.ville || "",
          pays: newClient.pays || "",
          interloc: newClient.interloc || "",
          tel: newClient.tel || "",
          portable: newClient.portable || "",
          fax: newClient.fax || "",
          mail: newClient.mail || "",
          displayName: `${newClient.nom} - ${newClient.ville || ""}`.trim(),
          isFromDb: true,
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du client:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Routes admin - Statistiques globales
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const allClients = await db.select().from(clients);
      const excelClients = data.clients || [];
      const dbClientCodes = new Set(allClients.map(c => c.code));
      const uniqueExcelClients = excelClients.filter(c => !dbClientCodes.has(c.code));
      const totalClients = allClients.length + uniqueExcelClients.length;

      const allThemes = await db.select().from(themes);
      const excelThemes = data.themes || [];
      const dbThemeNames = new Set(allThemes.map(t => t.theme));
      const uniqueExcelThemes = excelThemes.filter(t => !dbThemeNames.has(t.theme));
      const totalThemes = allThemes.length + uniqueExcelThemes.length;

      const allCommerciaux = await db.select().from(commerciaux);
      const excelCommerciaux = data.commerciaux || [];
      const totalCommerciaux = allCommerciaux.length || excelCommerciaux.length;

      const allFournisseurs = await db.select().from(fournisseurs);
      const excelFournisseurs = data.fournisseurs || [];
      const totalFournisseurs = allFournisseurs.length || excelFournisseurs.length;

      const allOrders = await db.select().from(orders);
      const totalOrders = allOrders.length;

      // Comptage par état des dates
      const dateCounts = {
        withLivraison: allOrders.filter(o => o.dateLivraison).length,
        withInventairePrevu: allOrders.filter(o => o.dateInventairePrevu).length,
        withInventaire: allOrders.filter(o => o.dateInventaire).length,
        withRetour: allOrders.filter(o => o.dateRetour).length,
      };

      res.json({
        totalClients,
        totalThemes,
        totalCommerciaux,
        totalFournisseurs,
        totalOrders,
        dateCounts
      });
    } catch (error: any) {
      console.error("Erreur stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Récupérer les emails avec newsletter acceptée
  app.get("/api/admin/newsletter-emails", async (req, res) => {
    try {
      const allOrders = await db.select().from(orders);
      
      // Filtrer les commandes avec newsletter acceptée
      const newsletterOrders = allOrders.filter(o => o.newsletterAccepted === true);
      
      // Extraire les emails uniques
      const emailSet = new Set<string>();
      const emailData: { email: string; clientName: string; orderCode: string; orderDate: string }[] = [];
      
      newsletterOrders.forEach(order => {
        if (order.clientEmail && !emailSet.has(order.clientEmail)) {
          emailSet.add(order.clientEmail);
          emailData.push({
            email: order.clientEmail,
            clientName: order.clientName,
            orderCode: order.orderCode,
            orderDate: order.orderDate,
          });
        }
      });
      
      res.json({
        total: emailData.length,
        emails: emailData,
      });
    } catch (error: any) {
      console.error("Erreur newsletter emails:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Routes admin - Export Excel
  app.get("/api/admin/export/:entity", async (req, res) => {
    try {
      const { entity } = req.params;
      const ExcelJS = await import("exceljs");
      const Workbook = ExcelJS.default?.Workbook || ExcelJS.Workbook;
      const workbook = new Workbook();
      
      let sheet;
      let filename = "";
      
      switch (entity) {
        case "clients": {
          sheet = workbook.addWorksheet("Clients");
          sheet.columns = [
            { header: "Code", key: "code", width: 15 },
            { header: "Nom", key: "nom", width: 40 },
            { header: "Adresse", key: "adresse1", width: 40 },
            { header: "Adresse 2", key: "adresse2", width: 30 },
            { header: "Code Postal", key: "codePostal", width: 12 },
            { header: "Ville", key: "ville", width: 25 },
            { header: "Interlocuteur", key: "interloc", width: 25 },
            { header: "Téléphone", key: "tel", width: 18 },
            { header: "Portable", key: "portable", width: 18 },
            { header: "Email", key: "mail", width: 35 },
          ];
          
          // Récupérer clients de la BDD
          const dbClients = await db.select().from(clients);
          const dbClientCodes = new Set(dbClients.map(c => c.code));
          
          // Ajouter clients BDD
          dbClients.forEach(client => {
            sheet!.addRow({
              code: client.code,
              nom: client.nom,
              adresse1: client.adresse1,
              adresse2: client.adresse2,
              codePostal: client.codePostal,
              ville: client.ville,
              interloc: client.interloc,
              tel: client.tel,
              portable: client.portable,
              mail: client.mail,
            });
          });
          
          // Ajouter clients Excel non présents en BDD
          data.clients.forEach(client => {
            if (!dbClientCodes.has(client.code)) {
              sheet!.addRow({
                code: client.code,
                nom: client.nom,
                adresse1: client.adresse1,
                adresse2: client.adresse2,
                codePostal: client.codePostal,
                ville: client.ville,
                interloc: client.interloc,
                tel: client.tel,
                portable: client.portable,
                mail: client.mail,
              });
            }
          });
          
          filename = "clients_export.xlsx";
          break;
        }
        
        case "themes": {
          sheet = workbook.addWorksheet("Thèmes");
          sheet.columns = [
            { header: "Thème", key: "theme", width: 40 },
            { header: "Fournisseur", key: "fournisseur", width: 25 },
          ];
          
          data.themes.forEach(theme => {
            sheet!.addRow({
              theme: theme.theme,
              fournisseur: theme.fournisseur || "",
            });
          });
          
          filename = "themes_export.xlsx";
          break;
        }
        
        case "commerciaux": {
          sheet = workbook.addWorksheet("Commerciaux");
          sheet.columns = [
            { header: "ID", key: "id", width: 15 },
            { header: "Nom", key: "nom", width: 40 },
          ];
          
          data.commerciaux.forEach(commercial => {
            sheet!.addRow({
              id: commercial.id,
              nom: commercial.nom,
            });
          });
          
          filename = "commerciaux_export.xlsx";
          break;
        }
        
        case "fournisseurs": {
          sheet = workbook.addWorksheet("Fournisseurs");
          sheet.columns = [
            { header: "Code", key: "code", width: 15 },
            { header: "Nom", key: "nom", width: 40 },
          ];
          
          data.fournisseurs.forEach(fournisseur => {
            sheet!.addRow({
              code: fournisseur.nomCourt,
              nom: fournisseur.nom,
            });
          });
          
          filename = "fournisseurs_export.xlsx";
          break;
        }
        
        case "orders": {
          sheet = workbook.addWorksheet("Commandes");
          sheet.columns = [
            { header: "N° Commande", key: "orderNumber", width: 18 },
            { header: "Date", key: "orderDate", width: 12 },
            { header: "Commercial", key: "salesRepName", width: 25 },
            { header: "Client", key: "clientName", width: 35 },
            { header: "Responsable", key: "responsableName", width: 25 },
            { header: "Tél Responsable", key: "responsableTel", width: 15 },
            { header: "Email Responsable", key: "responsableEmail", width: 30 },
            { header: "Thèmes", key: "themes", width: 50 },
            { header: "Livraison Enseigne", key: "livraisonEnseigne", width: 30 },
            { header: "Livraison Adresse", key: "livraisonAdresse", width: 35 },
            { header: "Livraison CP/Ville", key: "livraisonCpVille", width: 25 },
            { header: "Facturation Raison Sociale", key: "facturationRaisonSociale", width: 35 },
            { header: "Facturation Adresse", key: "facturationAdresse", width: 35 },
            { header: "Facturation CP/Ville", key: "facturationCpVille", width: 25 },
            { header: "Mode Paiement", key: "facturationMode", width: 15 },
            { header: "Statut", key: "status", width: 15 },
            { header: "Créée le", key: "createdAt", width: 18 },
          ];
          
          const allOrders = await db.select().from(orders).orderBy(orders.createdAt);
          
          allOrders.forEach(order => {
            let themesList = "";
            try {
              const parsed = typeof order.themeSelections === "string" ? JSON.parse(order.themeSelections) : order.themeSelections;
              if (Array.isArray(parsed)) {
                themesList = parsed.map(t => `${t.theme} (${t.category}) x${t.quantity}`).join(", ");
              }
            } catch (e) {}
            
            sheet!.addRow({
              orderNumber: order.orderCode,
              orderDate: order.orderDate,
              salesRepName: order.salesRepName,
              clientName: order.clientName,
              responsableName: order.clientName,
              responsableTel: order.clientTel || "",
              responsableEmail: order.clientEmail,
              themes: themesList,
              livraisonEnseigne: order.livraisonEnseigne,
              livraisonAdresse: order.livraisonAdresse,
              livraisonCpVille: order.livraisonCpVille,
              facturationRaisonSociale: order.facturationRaisonSociale,
              facturationAdresse: order.facturationAdresse,
              facturationCpVille: order.facturationCpVille,
              facturationMode: order.facturationMode,
              dateLivraison: order.dateLivraison || "",
              dateInventaire: order.dateInventaire || "",
              dateRetour: order.dateRetour || "",
              createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR") : "",
            });
          });
          
          filename = "commandes_export.xlsx";
          break;
        }
        
        default:
          return res.status(400).json({ message: "Entité invalide" });
      }
      
      // Style l'en-tête
      if (sheet) {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF003366" },
        };
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(Buffer.from(buffer as ArrayBuffer));
      
    } catch (error: any) {
      console.error("Erreur lors de l'export:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Export ALL database tables
  app.get("/api/admin/export-all", async (req, res) => {
    try {
      const ExcelJS = await import("exceljs");
      const Workbook = ExcelJS.default?.Workbook || ExcelJS.Workbook;
      const workbook = new Workbook();
      
      // Style helper
      const styleHeader = (sheet: any) => {
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF003366" },
        };
      };
      
      // Get all orders first to check newsletter status
      const allOrders = await db.select().from(orders).orderBy(orders.createdAt);
      
      // Build newsletter subscribers map by email
      const newsletterEmails = new Set<string>();
      allOrders
        .filter(o => o.newsletterAccepted === true)
        .forEach(order => {
          const email = (order.clientEmail || "").toLowerCase().trim();
          if (email) newsletterEmails.add(email);
        });
      
      // ===== CLIENTS =====
      const clientSheet = workbook.addWorksheet("Clients");
      clientSheet.columns = [
        { header: "Code", key: "code", width: 15 },
        { header: "Nom", key: "nom", width: 40 },
        { header: "Adresse", key: "adresse1", width: 40 },
        { header: "Code Postal", key: "codePostal", width: 12 },
        { header: "Ville", key: "ville", width: 25 },
        { header: "Interlocuteur", key: "interloc", width: 25 },
        { header: "Téléphone", key: "tel", width: 18 },
        { header: "Portable", key: "portable", width: 18 },
        { header: "Email", key: "mail", width: 35 },
        { header: "Newsletter", key: "newsletter", width: 12 },
      ];
      
      const dbClients = await db.select().from(clients);
      const dbClientCodes = new Set(dbClients.map(c => c.code));
      
      dbClients.forEach(client => {
        const email = (client.mail || "").toLowerCase().trim();
        clientSheet.addRow({
          code: client.code,
          nom: client.nom,
          adresse1: client.adresse1,
          codePostal: client.codePostal,
          ville: client.ville,
          interloc: client.interloc,
          tel: client.tel,
          portable: client.portable,
          mail: client.mail,
          newsletter: newsletterEmails.has(email) ? "Oui" : "Non",
        });
      });
      
      data.clients.forEach(client => {
        if (!dbClientCodes.has(client.code)) {
          const email = (client.mail || "").toLowerCase().trim();
          clientSheet.addRow({
            code: client.code,
            nom: client.nom,
            adresse1: client.adresse1,
            codePostal: client.codePostal,
            ville: client.ville,
            interloc: client.interloc,
            tel: client.tel,
            portable: client.portable,
            mail: client.mail,
            newsletter: newsletterEmails.has(email) ? "Oui" : "Non",
          });
        }
      });
      styleHeader(clientSheet);
      
      // ===== COMMANDES =====
      const orderSheet = workbook.addWorksheet("Commandes");
      orderSheet.columns = [
        { header: "N° Commande", key: "orderCode", width: 18 },
        { header: "Date", key: "orderDate", width: 12 },
        { header: "Commercial", key: "salesRepName", width: 25 },
        { header: "Fournisseur", key: "fournisseur", width: 20 },
        { header: "Client", key: "clientName", width: 35 },
        { header: "Tél Client", key: "clientTel", width: 15 },
        { header: "Email Client", key: "clientEmail", width: 30 },
        { header: "Thèmes", key: "themes", width: 60 },
        { header: "Livraison Enseigne", key: "livraisonEnseigne", width: 30 },
        { header: "Livraison Adresse", key: "livraisonAdresse", width: 35 },
        { header: "Livraison CP/Ville", key: "livraisonCpVille", width: 25 },
        { header: "Facturation Raison Sociale", key: "facturationRaisonSociale", width: 35 },
        { header: "Facturation CP/Ville", key: "facturationCpVille", width: 25 },
        { header: "Mode Paiement", key: "facturationMode", width: 15 },
        { header: "Date Livraison", key: "dateLivraison", width: 15 },
        { header: "Date Inventaire Prévu", key: "dateInventairePrevu", width: 18 },
        { header: "Date Inventaire", key: "dateInventaire", width: 15 },
        { header: "Date Retour", key: "dateRetour", width: 15 },
        { header: "Créée le", key: "createdAt", width: 18 },
      ];
      
      allOrders.forEach(order => {
        let themesList = "";
        try {
          const parsed = typeof order.themeSelections === "string" ? JSON.parse(order.themeSelections) : order.themeSelections;
          if (Array.isArray(parsed)) {
            themesList = parsed.map((t: any) => `${t.theme}${t.quantity ? ` x${t.quantity}` : ""}${t.deliveryDate ? ` (${t.deliveryDate})` : ""}`).join("; ");
          }
        } catch (e) {}
        
        orderSheet.addRow({
          orderCode: order.orderCode,
          orderDate: order.orderDate,
          salesRepName: order.salesRepName,
          fournisseur: order.fournisseur || "",
          clientName: order.clientName,
          clientTel: order.clientTel || "",
          clientEmail: order.clientEmail,
          themes: themesList,
          livraisonEnseigne: order.livraisonEnseigne,
          livraisonAdresse: order.livraisonAdresse,
          livraisonCpVille: order.livraisonCpVille,
          facturationRaisonSociale: order.facturationRaisonSociale,
          facturationCpVille: order.facturationCpVille,
          facturationMode: order.facturationMode,
          dateLivraison: order.dateLivraison || "",
          dateInventairePrevu: order.dateInventairePrevu || "",
          dateInventaire: order.dateInventaire || "",
          dateRetour: order.dateRetour || "",
          createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR") : "",
        });
      });
      styleHeader(orderSheet);
      
      // ===== THEMES =====
      const themeSheet = workbook.addWorksheet("Thèmes");
      themeSheet.columns = [
        { header: "Thème", key: "theme", width: 50 },
        { header: "Fournisseur", key: "fournisseur", width: 25 },
        { header: "Source", key: "source", width: 15 },
      ];
      
      // Collect themes from database
      const dbThemes = await db.select().from(themes);
      dbThemes.forEach(theme => {
        themeSheet.addRow({
          theme: theme.theme,
          fournisseur: theme.fournisseur || "",
          source: "Base de données",
        });
      });
      
      // Add themes from orders (not already in database) - use composite key theme+fournisseur
      const existingThemeKeys = new Set(
        dbThemes.map(t => `${t.theme.toLowerCase()}|${(t.fournisseur || "").toLowerCase()}`)
      );
      const orderThemes = new Map<string, { theme: string; fournisseur: string }>();
      
      allOrders.forEach(order => {
        try {
          const orderFournisseur = order.fournisseur || "";
          const parsed = typeof order.themeSelections === "string" ? JSON.parse(order.themeSelections) : order.themeSelections;
          if (Array.isArray(parsed)) {
            parsed.forEach((t: any) => {
              if (t.theme) {
                const compositeKey = `${t.theme.toLowerCase()}|${orderFournisseur.toLowerCase()}`;
                if (!existingThemeKeys.has(compositeKey) && !orderThemes.has(compositeKey)) {
                  orderThemes.set(compositeKey, {
                    theme: t.theme,
                    fournisseur: orderFournisseur,
                  });
                }
              }
            });
          }
        } catch (e) {}
      });
      
      Array.from(orderThemes.values()).forEach(t => {
        themeSheet.addRow({
          theme: t.theme,
          fournisseur: t.fournisseur,
          source: "Bons de commande",
        });
      });
      styleHeader(themeSheet);
      
      // ===== COMMERCIAUX =====
      const commercialSheet = workbook.addWorksheet("Commerciaux");
      commercialSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Prénom", key: "prenom", width: 20 },
        { header: "Nom", key: "nom", width: 25 },
        { header: "Rôle", key: "role", width: 15 },
        { header: "Actif", key: "actif", width: 10 },
      ];
      
      const dbCommerciaux = await db.select().from(commerciaux);
      dbCommerciaux.forEach(c => {
        commercialSheet.addRow({
          id: c.id,
          prenom: c.prenom || "",
          nom: c.nom,
          role: c.role || "commercial",
          actif: c.actif ? "Oui" : "Non",
        });
      });
      
      if (dbCommerciaux.length === 0) {
        data.commerciaux.forEach((c, i) => {
          commercialSheet.addRow({
            id: i + 1,
            prenom: "",
            nom: c.displayName || c.nom,
            role: "commercial",
            actif: "Oui",
          });
        });
      }
      styleHeader(commercialSheet);
      
      // ===== FOURNISSEURS =====
      const fournisseurSheet = workbook.addWorksheet("Fournisseurs");
      fournisseurSheet.columns = [
        { header: "Code", key: "nomCourt", width: 15 },
        { header: "Nom", key: "nom", width: 40 },
      ];
      
      const dbFournisseurs = await db.select().from(fournisseurs);
      
      if (dbFournisseurs.length > 0) {
        dbFournisseurs.forEach(f => {
          fournisseurSheet.addRow({
            nomCourt: f.nomCourt,
            nom: f.nom,
          });
        });
      } else {
        data.fournisseurs.forEach(f => {
          fournisseurSheet.addRow({
            nomCourt: f.nomCourt,
            nom: f.nom,
          });
        });
      }
      styleHeader(fournisseurSheet);
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="export_base_complete_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.send(Buffer.from(buffer as ArrayBuffer));
      
    } catch (error: any) {
      console.error("Erreur lors de l'export complet:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ======= ADMIN CRUD ROUTES WITH PAGINATION =======

  // Helper function for pagination
  const getPaginationParams = (req: any) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const search = (req.query.search as string) || "";
    const sortField = (req.query.sortField as string) || "id";
    const sortDir = (req.query.sortDir as string) === "desc" ? "desc" : "asc";
    return { page, pageSize, search, sortField, sortDir, offset: (page - 1) * pageSize };
  };

  // Import Excel data to PostgreSQL
  app.post("/api/admin/import-excel", async (req, res) => {
    try {
      const excelData = loadExcelData();
      let imported = { commerciaux: 0, fournisseurs: 0, themes: 0, clients: 0 };
      
      // Import commerciaux
      const existingCommerciaux = await db.select().from(commerciaux);
      if (existingCommerciaux.length === 0) {
        for (const c of excelData.commerciaux) {
          await db.insert(commerciaux).values({ nom: c.displayName || c.nom });
        }
        imported.commerciaux = excelData.commerciaux.length;
      }
      
      // Import fournisseurs
      const existingFournisseurs = await db.select().from(fournisseurs);
      if (existingFournisseurs.length === 0) {
        for (const f of excelData.fournisseurs) {
          await db.insert(fournisseurs).values({ nom: f.nom, nomCourt: f.nomCourt });
        }
        imported.fournisseurs = excelData.fournisseurs.length;
      }
      
      // Import themes
      const existingThemes = await db.select().from(themes);
      if (existingThemes.length === 0) {
        for (const t of excelData.themes) {
          await db.insert(themes).values({ 
            theme: t.theme, 
            fournisseur: t.fournisseur,
            categorie: t.categorie || "TOUTE_ANNEE"
          });
        }
        imported.themes = excelData.themes.length;
      }
      
      // Import clients from Excel (batch insert)
      const existingClients = await db.select().from(clients);
      const existingCodes = new Set(existingClients.map(c => c.code));
      const now = new Date();
      
      const clientsToInsert = excelData.clients
        .filter(c => !existingCodes.has(c.code))
        .map(c => ({
          code: c.code,
          nom: c.nom,
          adresse1: c.adresse1 || "",
          adresse2: c.adresse2 || "",
          codePostal: c.codePostal || "",
          ville: c.ville || "",
          pays: c.pays || "",
          interloc: c.interloc || "",
          tel: c.tel || "",
          portable: c.portable || "",
          fax: c.fax || "",
          mail: c.mail || "",
          isFromExcel: true,
          createdAt: now,
          updatedAt: now,
        }));
      
      // Insert in batches of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
        const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
        if (batch.length > 0) {
          await db.insert(clients).values(batch);
        }
      }
      imported.clients = clientsToInsert.length;
      
      res.json({ success: true, imported });
    } catch (error: any) {
      console.error("Erreur import Excel:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CLIENTS PAGINATED =====
  app.get("/api/admin/clients", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      // Get DB clients
      const dbClients = await db.select().from(clients);
      const dbClientsByCode = new Map(dbClients.map(c => [c.code, c]));
      
      // Merge with Excel clients
      let allClients = data.clients.map(excelClient => {
        const dbClient = dbClientsByCode.get(excelClient.code);
        if (dbClient) {
          return {
            id: dbClient.id,
            code: dbClient.code,
            nom: dbClient.nom,
            adresse1: dbClient.adresse1 || "",
            codePostal: dbClient.codePostal || "",
            ville: dbClient.ville || "",
            interloc: dbClient.interloc || "",
            tel: dbClient.tel || "",
            portable: dbClient.portable || "",
            mail: dbClient.mail || "",
            createdAt: dbClient.createdAt,
            updatedAt: dbClient.updatedAt,
            isFromExcel: dbClient.isFromExcel || false,
            previousValues: dbClient.previousValues,
            modificationApproved: dbClient.modificationApproved ?? true,
            approvedAt: dbClient.approvedAt,
          };
        }
        return {
          id: 0,
          code: excelClient.code,
          nom: excelClient.nom,
          adresse1: excelClient.adresse1,
          codePostal: excelClient.codePostal,
          ville: excelClient.ville,
          interloc: excelClient.interloc,
          tel: excelClient.tel,
          portable: excelClient.portable,
          mail: excelClient.mail,
          createdAt: null,
          updatedAt: null,
          isFromExcel: true,
          previousValues: null,
          modificationApproved: true,
          approvedAt: null,
        };
      });
      
      // Add new DB clients not in Excel
      const excelCodes = new Set(data.clients.map(c => c.code));
      const newDbClients = dbClients
        .filter(c => !excelCodes.has(c.code))
        .map(c => ({
          id: c.id,
          code: c.code,
          nom: c.nom,
          adresse1: c.adresse1 || "",
          codePostal: c.codePostal || "",
          ville: c.ville || "",
          interloc: c.interloc || "",
          tel: c.tel || "",
          portable: c.portable || "",
          mail: c.mail || "",
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          isFromExcel: c.isFromExcel || false,
          previousValues: c.previousValues,
          modificationApproved: c.modificationApproved ?? true,
          approvedAt: c.approvedAt,
        }));
      
      allClients = [...allClients, ...newDbClients];
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        allClients = allClients.filter(c => 
          c.code.toLowerCase().includes(searchLower) ||
          c.nom.toLowerCase().includes(searchLower) ||
          c.ville.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by badge category
      const badgeFilter = req.query.badgeFilter as string;
      if (badgeFilter && badgeFilter !== "ALL") {
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // For NEWSLETTER filter, get newsletter subscribers from orders
        let newsletterEmails = new Set<string>();
        if (badgeFilter === "NEWSLETTER") {
          const allOrders = await db.select().from(orders);
          allOrders
            .filter(o => o.newsletterAccepted === true)
            .forEach(order => {
              const email = (order.clientEmail || "").toLowerCase().trim();
              if (email) newsletterEmails.add(email);
            });
        }
        
        allClients = allClients.filter(c => {
          const createdAt = c.createdAt ? new Date(c.createdAt) : null;
          const isNew = createdAt && createdAt > oneMonthAgo && !c.isFromExcel;
          const hasPendingModification = c.modificationApproved === false && c.previousValues;
          
          if (badgeFilter === "NEW") {
            return isNew;
          } else if (badgeFilter === "MODIFIED") {
            return hasPendingModification;
          } else if (badgeFilter === "LAMBDA") {
            return !isNew && !hasPendingModification;
          } else if (badgeFilter === "NEWSLETTER") {
            const clientEmail = (c.mail || "").toLowerCase().trim();
            return clientEmail && newsletterEmails.has(clientEmail);
          }
          return true;
        });
      }
      
      // Sort
      allClients.sort((a, b) => {
        const aVal = String((a as any)[sortField] || "").toLowerCase();
        const bVal = String((b as any)[sortField] || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
      
      const total = allClients.length;
      const paginatedClients = allClients.slice(offset, offset + pageSize);
      
      res.json({
        data: paginatedClients,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error: any) {
      console.error("Erreur clients:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create client
  app.post("/api/admin/clients", async (req, res) => {
    try {
      const validated = insertClientSchema.parse(req.body);
      await db.insert(clients).values({
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const insertId = Number((idResult as any).id);
      const [created] = await db.select().from(clients).where(eq(clients.id, insertId));
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update client
  app.patch("/api/admin/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === 0) {
        // For Excel-sourced clients, create a new DB entry with their data
        const validated = insertClientSchema.parse(req.body);
        await db.insert(clients).values({
          ...validated,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const insertId = Number((idResult as any).id);
        const [created] = await db.select().from(clients).where(eq(clients.id, insertId));
        return res.json(created);
      }
      
      // Get current client to save previous values
      const [currentClient] = await db.select().from(clients).where(eq(clients.id, id));
      if (!currentClient) {
        return res.status(404).json({ message: "Non trouvé" });
      }
      
      const validated = updateClientSchema.parse(req.body);
      
      // Check if contact fields are being modified
      const contactFields = ['interloc', 'portable', 'tel', 'mail'];
      const hasContactChanges = contactFields.some(field => {
        const newVal = (validated as any)[field];
        const oldVal = (currentClient as any)[field] || "";
        return newVal !== undefined && newVal !== oldVal;
      });
      
      // Prepare update data
      const updateData: any = {
        ...validated,
        updatedAt: new Date(),
      };
      
      // If contact fields changed, store previous values and mark as pending approval
      if (hasContactChanges) {
        // Only store if not already pending (to keep original values)
        if (currentClient.modificationApproved !== false) {
          updateData.previousValues = JSON.stringify({
            interloc: currentClient.interloc || "",
            portable: currentClient.portable || "",
            tel: currentClient.tel || "",
            mail: currentClient.mail || "",
          });
          updateData.modificationApproved = false;
        }
      }
      
      await db.update(clients).set(updateData).where(eq(clients.id, id));
      const [updated] = await db.select().from(clients).where(eq(clients.id, id));
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete client
  app.delete("/api/admin/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id === 0) {
        return res.status(400).json({ message: "Impossible de supprimer un client Excel" });
      }
      await db.delete(clients).where(eq(clients.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve client modification
  app.post("/api/admin/clients/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id === 0) {
        return res.status(400).json({ message: "Client non trouvé" });
      }
      
      await db.update(clients).set({
        modificationApproved: true,
        approvedAt: new Date(),
        previousValues: null,
      }).where(eq(clients.id, id));
      const [updated] = await db.select().from(clients).where(eq(clients.id, id));
      
      if (!updated) {
        return res.status(404).json({ message: "Client non trouvé" });
      }
      
      res.json({ success: true, client: updated });
    } catch (error: any) {
      console.error("Erreur approbation client:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== COMMERCIAUX CRUD =====
  app.get("/api/admin/commerciaux", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      let allCommerciaux = await db.select().from(commerciaux);
      
      // Fallback to Excel if empty
      if (allCommerciaux.length === 0) {
        allCommerciaux = data.commerciaux.map((c, i) => ({
          id: i + 1,
          prenom: "",
          nom: c.displayName || c.nom,
          role: "commercial",
          actif: true,
          motDePasse: "bfc26"
        })) as typeof allCommerciaux;
      }
      
      // Filter
      if (search) {
        const searchLower = search.toLowerCase();
        allCommerciaux = allCommerciaux.filter(c => 
          c.nom.toLowerCase().includes(searchLower) || 
          (c.prenom || "").toLowerCase().includes(searchLower)
        );
      }
      
      // Sort
      allCommerciaux.sort((a, b) => {
        const aVal = String((a as any)[sortField] || "").toLowerCase();
        const bVal = String((b as any)[sortField] || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
      
      const total = allCommerciaux.length;
      const paginated = allCommerciaux.slice(offset, offset + pageSize);
      
      res.json({
        data: paginated,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/commerciaux", async (req, res) => {
    try {
      const validated = insertCommercialSchema.parse(req.body);
      await db.insert(commerciaux).values(validated);
      const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const insertId = Number((idResult as any).id);
      const [created] = await db.select().from(commerciaux).where(eq(commerciaux.id, insertId));
      invalidateCommerciauxCache();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/commerciaux/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertCommercialSchema.partial().parse(req.body);
      await db.update(commerciaux).set(validated).where(eq(commerciaux.id, id));
      const [updated] = await db.select().from(commerciaux).where(eq(commerciaux.id, id));
      if (!updated) return res.status(404).json({ message: "Non trouvé" });
      invalidateCommerciauxCache();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/commerciaux/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(commerciaux).where(eq(commerciaux.id, id));
      invalidateCommerciauxCache();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== FOURNISSEURS CRUD =====
  app.get("/api/admin/fournisseurs", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      let allFournisseurs = await db.select().from(fournisseurs);
      
      // Fallback to Excel if empty
      if (allFournisseurs.length === 0) {
        allFournisseurs = data.fournisseurs.map((f, i) => ({
          id: i + 1,
          nom: f.nom,
          nomCourt: f.nomCourt
        }));
      }
      
      // Filter
      if (search) {
        const searchLower = search.toLowerCase();
        allFournisseurs = allFournisseurs.filter(f => 
          f.nom.toLowerCase().includes(searchLower) ||
          f.nomCourt.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort
      allFournisseurs.sort((a, b) => {
        const aVal = String((a as any)[sortField] || "").toLowerCase();
        const bVal = String((b as any)[sortField] || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
      
      const total = allFournisseurs.length;
      const paginated = allFournisseurs.slice(offset, offset + pageSize);
      
      res.json({
        data: paginated,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/fournisseurs", async (req, res) => {
    try {
      const validated = insertFournisseurSchema.parse(req.body);
      await db.insert(fournisseurs).values(validated);
      const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const insertId = Number((idResult as any).id);
      const [created] = await db.select().from(fournisseurs).where(eq(fournisseurs.id, insertId));
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/fournisseurs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertFournisseurSchema.partial().parse(req.body);
      await db.update(fournisseurs).set(validated).where(eq(fournisseurs.id, id));
      const [updated] = await db.select().from(fournisseurs).where(eq(fournisseurs.id, id));
      if (!updated) return res.status(404).json({ message: "Non trouvé" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/fournisseurs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(fournisseurs).where(eq(fournisseurs.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== THEMES CRUD =====
  app.get("/api/admin/themes", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      let allThemes = await db.select().from(themes);
      
      // Fallback to Excel if empty
      if (allThemes.length === 0) {
        allThemes = data.themes.map((t, i) => ({
          id: i + 1,
          theme: t.theme,
          fournisseur: t.fournisseur,
          categorie: null
        }));
      }
      
      // Filter
      if (search) {
        const searchLower = search.toLowerCase();
        allThemes = allThemes.filter(t => 
          t.theme.toLowerCase().includes(searchLower) ||
          t.fournisseur.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort
      const sortKey = sortField === "theme" || sortField === "fournisseur" ? sortField : "theme";
      allThemes.sort((a, b) => {
        const aVal = String((a as any)[sortKey] || "").toLowerCase();
        const bVal = String((b as any)[sortKey] || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
      
      const total = allThemes.length;
      const paginated = allThemes.slice(offset, offset + pageSize);
      
      res.json({
        data: paginated,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/themes", async (req, res) => {
    try {
      const validated = insertThemeSchema.parse(req.body);
      await db.insert(themes).values(validated);
      const [idResult] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const insertId = Number((idResult as any).id);
      const [created] = await db.select().from(themes).where(eq(themes.id, insertId));
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertThemeSchema.partial().parse(req.body);
      await db.update(themes).set(validated).where(eq(themes.id, id));
      const [updated] = await db.select().from(themes).where(eq(themes.id, id));
      if (!updated) return res.status(404).json({ message: "Non trouvé" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(themes).where(eq(themes.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sync themes from orders to database
  app.post("/api/admin/themes/sync-from-orders", async (req, res) => {
    try {
      // Get all orders
      const allOrders = await db.select().from(orders);
      
      // Get existing themes - create composite key (theme+fournisseur)
      const existingThemes = await db.select().from(themes);
      const existingThemeSet = new Set(
        existingThemes.map(t => `${t.theme.toLowerCase()}|${(t.fournisseur || "").toLowerCase()}`)
      );
      
      // Extract unique themes from orders (keyed by theme+fournisseur)
      const themesFromOrders = new Map<string, { theme: string; fournisseur: string }>();
      
      allOrders.forEach(order => {
        try {
          const orderFournisseur = order.fournisseur || "";
          const parsed = typeof order.themeSelections === "string" ? JSON.parse(order.themeSelections) : order.themeSelections;
          if (Array.isArray(parsed)) {
            parsed.forEach((t: any) => {
              if (t.theme) {
                const compositeKey = `${t.theme.toLowerCase()}|${orderFournisseur.toLowerCase()}`;
                if (!existingThemeSet.has(compositeKey) && !themesFromOrders.has(compositeKey)) {
                  themesFromOrders.set(compositeKey, {
                    theme: t.theme,
                    fournisseur: orderFournisseur,
                  });
                }
              }
            });
          }
        } catch (e) {}
      });
      
      // Insert new themes into database
      let added = 0;
      const themesToAdd = Array.from(themesFromOrders.values());
      for (const themeData of themesToAdd) {
        await db.insert(themes).values({
          theme: themeData.theme,
          fournisseur: themeData.fournisseur,
        });
        added++;
      }
      
      res.json({ 
        success: true, 
        message: `${added} nouveaux thèmes synchronisés depuis les bons de commande`,
        added,
        total: existingThemes.length + added,
      });
    } catch (error: any) {
      console.error("Erreur sync themes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Migration: Synchroniser les catégories depuis Excel vers la base de données
  app.post("/api/admin/themes/migrate-categories", async (req, res) => {
    try {
      // Charger les données du fichier Excel
      const excelData = data;
      
      // Récupérer tous les thèmes de la base de données
      const dbThemes = await db.select().from(themes);
      
      let updated = 0;
      let notFound = 0;
      const details: string[] = [];
      
      // Pour chaque thème de la DB, chercher sa catégorie dans Excel
      for (const dbTheme of dbThemes) {
        // Chercher dans Excel avec correspondance flexible
        const excelTheme = excelData.themes.find(et => 
          et.theme.toLowerCase().trim() === dbTheme.theme.toLowerCase().trim() &&
          et.fournisseur.toLowerCase().trim() === dbTheme.fournisseur.toLowerCase().trim()
        );
        
        if (excelTheme && excelTheme.categorie) {
          // Mettre à jour la catégorie si différente
          if (dbTheme.categorie !== excelTheme.categorie) {
            await db.update(themes)
              .set({ categorie: excelTheme.categorie })
              .where(eq(themes.id, dbTheme.id));
            updated++;
            details.push(`${dbTheme.theme} (${dbTheme.fournisseur}): ${dbTheme.categorie || 'null'} -> ${excelTheme.categorie}`);
          }
        } else {
          notFound++;
        }
      }
      
      // Ajouter les thèmes Excel manquants dans la DB
      let added = 0;
      for (const excelTheme of excelData.themes) {
        const exists = dbThemes.some(dt => 
          dt.theme.toLowerCase().trim() === excelTheme.theme.toLowerCase().trim() &&
          dt.fournisseur.toLowerCase().trim() === excelTheme.fournisseur.toLowerCase().trim()
        );
        
        if (!exists) {
          await db.insert(themes).values({
            theme: excelTheme.theme,
            fournisseur: excelTheme.fournisseur,
            categorie: excelTheme.categorie || "TOUTE_ANNEE"
          });
          added++;
          details.push(`AJOUTÉ: ${excelTheme.theme} (${excelTheme.fournisseur}) - ${excelTheme.categorie}`);
        }
      }
      
      res.json({
        success: true,
        message: `Migration terminée: ${updated} catégories mises à jour, ${added} thèmes ajoutés`,
        updated,
        added,
        notFound,
        details: details.slice(0, 50) // Limiter les détails
      });
    } catch (error: any) {
      console.error("Erreur migration catégories:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get themes grouped by fournisseur (for order form)
  app.get("/api/data/themes-by-fournisseur", async (req, res) => {
    try {
      const { fournisseur } = req.query;
      
      // Get themes from database
      const dbThemes = await db.select().from(themes);
      
      // Also extract themes from orders to include themes that might be missing
      // Use composite key (theme+fournisseur) for uniqueness
      const allOrders = await db.select().from(orders);
      const orderThemes = new Map<string, { theme: string; fournisseur: string }>();
      
      allOrders.forEach(order => {
        try {
          const orderFournisseur = order.fournisseur || "";
          const parsed = typeof order.themeSelections === "string" ? JSON.parse(order.themeSelections) : order.themeSelections;
          if (Array.isArray(parsed)) {
            parsed.forEach((t: any) => {
              if (t.theme) {
                const compositeKey = `${t.theme.toLowerCase()}|${orderFournisseur.toLowerCase()}`;
                if (!orderThemes.has(compositeKey)) {
                  orderThemes.set(compositeKey, {
                    theme: t.theme,
                    fournisseur: orderFournisseur,
                  });
                }
              }
            });
          }
        } catch (e) {}
      });
      
      // Merge database themes with order themes using composite key
      const mergedThemes = new Map<string, { theme: string; fournisseur: string; source: string }>();
      
      dbThemes.forEach(t => {
        const compositeKey = `${t.theme.toLowerCase()}|${(t.fournisseur || "").toLowerCase()}`;
        mergedThemes.set(compositeKey, {
          theme: t.theme,
          fournisseur: t.fournisseur,
          source: "database",
        });
      });
      
      orderThemes.forEach((t, key) => {
        if (!mergedThemes.has(key)) {
          mergedThemes.set(key, {
            theme: t.theme,
            fournisseur: t.fournisseur,
            source: "orders",
          });
        }
      });
      
      // Group by fournisseur
      const grouped: { [fournisseur: string]: string[] } = {};
      
      mergedThemes.forEach(t => {
        if (!fournisseur || t.fournisseur === fournisseur) {
          if (!grouped[t.fournisseur]) {
            grouped[t.fournisseur] = [];
          }
          grouped[t.fournisseur].push(t.theme);
        }
      });
      
      // Sort themes within each fournisseur
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => a.localeCompare(b, "fr"));
      });
      
      res.json(grouped);
    } catch (error: any) {
      console.error("Erreur themes by fournisseur:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ORDERS CRUD =====
  app.get("/api/admin/orders", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      let allOrders = await db.select().from(orders);
      
      // Filter by fournisseur
      const fournisseur = req.query.fournisseur as string | undefined;
      if (fournisseur && fournisseur !== "ALL") {
        allOrders = allOrders.filter(o => o.fournisseur === fournisseur);
      }
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        allOrders = allOrders.filter(o => 
          o.orderCode.toLowerCase().includes(searchLower) ||
          o.clientName.toLowerCase().includes(searchLower) ||
          o.livraisonEnseigne.toLowerCase().includes(searchLower) ||
          o.salesRepName.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort
      const validSortFields = ["orderCode", "orderDate", "clientName", "status", "createdAt"];
      const sortKey = validSortFields.includes(sortField) ? sortField : "createdAt";
      allOrders.sort((a, b) => {
        const aVal = String((a as any)[sortKey] || "").toLowerCase();
        const bVal = String((b as any)[sortKey] || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
      
      // Par défaut, trier par date décroissante
      if (!req.query.sortField) {
        allOrders.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });
      }
      
      const total = allOrders.length;
      const paginated = allOrders.slice(offset, offset + pageSize);
      
      res.json({
        data: paginated,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single order
  app.get("/api/admin/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      if (!order) return res.status(404).json({ message: "Commande non trouvée" });
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update order dates
  app.patch("/api/admin/orders/:id/dates", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { 
        dateLivraison, 
        dateInventairePrevu, 
        dateInventaire, 
        dateRetour 
      } = updateOrderDatesSchema.parse(req.body);
      
      // Get current order
      const [currentOrder] = await db.select().from(orders).where(eq(orders.id, id));
      if (!currentOrder) return res.status(404).json({ message: "Commande non trouvée" });
      
      // Build update object with only provided fields
      const updateData: any = { updatedAt: new Date() };
      if (dateLivraison !== undefined) updateData.dateLivraison = dateLivraison;
      if (dateInventairePrevu !== undefined) updateData.dateInventairePrevu = dateInventairePrevu;
      if (dateInventaire !== undefined) updateData.dateInventaire = dateInventaire;
      if (dateRetour !== undefined) updateData.dateRetour = dateRetour;
      
      // Update the order
      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, id));
      const [updated] = await db.select().from(orders).where(eq(orders.id, id));
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete order
  app.delete("/api/admin/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(orders).where(eq(orders.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download PDF for order
  app.get("/api/admin/orders/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [orderDb] = await db.select().from(orders).where(eq(orders.id, id));
      if (!orderDb) return res.status(404).json({ message: "Commande non trouvée" });

      const order: Order = {
        orderDate: orderDb.orderDate,
        fournisseur: orderDb.fournisseur || "BDIS",
        salesRepName: orderDb.salesRepName,
        responsableName: orderDb.clientName,
        responsableEmail: orderDb.clientEmail,
        responsableTel: orderDb.clientTel || "",
        themeSelections: orderDb.themeSelections,
        livraisonEnseigne: orderDb.livraisonEnseigne,
        livraisonAdresse: orderDb.livraisonAdresse,
        livraisonCpVille: orderDb.livraisonCpVille,
        livraisonHoraires: orderDb.livraisonHoraires || "",
        livraisonHayon: orderDb.livraisonHayon || false,
        facturationRaisonSociale: orderDb.facturationRaisonSociale,
        facturationAdresse: orderDb.facturationAdresse,
        facturationCpVille: orderDb.facturationCpVille,
        facturationMode: orderDb.facturationMode as "VIREMENT" | "CHEQUE" | "LCR",
        facturationRib: orderDb.facturationRib || "",
        numeroTva: orderDb.numeroTva || "",
        remarks: orderDb.remarks || "",
        signature: orderDb.signature,
        signatureLocation: orderDb.signatureLocation,
        signatureDate: orderDb.signatureDate,
        clientSignedName: orderDb.clientSignedName,
        cgvAccepted: true,
        newsletterAccepted: orderDb.newsletterAccepted ?? true,
        orderCode: orderDb.orderCode,
        createdAt: orderDb.createdAt?.toISOString() || "",
      };

      const pdfBuffer = generateOrderPDF(order);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${orderDb.orderCode}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download Excel for order
  app.get("/api/admin/orders/:id/excel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [orderDb] = await db.select().from(orders).where(eq(orders.id, id));
      if (!orderDb) return res.status(404).json({ message: "Commande non trouvée" });

      const order: Order = {
        orderDate: orderDb.orderDate,
        fournisseur: orderDb.fournisseur || "BDIS",
        salesRepName: orderDb.salesRepName,
        responsableName: orderDb.clientName,
        responsableEmail: orderDb.clientEmail,
        responsableTel: orderDb.clientTel || "",
        themeSelections: orderDb.themeSelections,
        livraisonEnseigne: orderDb.livraisonEnseigne,
        livraisonAdresse: orderDb.livraisonAdresse,
        livraisonCpVille: orderDb.livraisonCpVille,
        livraisonHoraires: orderDb.livraisonHoraires || "",
        livraisonHayon: orderDb.livraisonHayon || false,
        facturationRaisonSociale: orderDb.facturationRaisonSociale,
        facturationAdresse: orderDb.facturationAdresse,
        facturationCpVille: orderDb.facturationCpVille,
        facturationMode: orderDb.facturationMode as "VIREMENT" | "CHEQUE" | "LCR",
        facturationRib: orderDb.facturationRib || "",
        numeroTva: orderDb.numeroTva || "",
        remarks: orderDb.remarks || "",
        signature: orderDb.signature,
        signatureLocation: orderDb.signatureLocation,
        signatureDate: orderDb.signatureDate,
        clientSignedName: orderDb.clientSignedName,
        cgvAccepted: true,
        newsletterAccepted: orderDb.newsletterAccepted ?? true,
        orderCode: orderDb.orderCode,
        createdAt: orderDb.createdAt?.toISOString() || "",
      };

      const excelBuffer = await generateOrderExcel(order);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${orderDb.orderCode}.xlsx"`);
      res.send(excelBuffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export stats to PDF
  app.post("/api/stats/export-pdf", async (req, res) => {
    try {
      const { fournisseurData, allThemes, clientAnalytics, monthlyData, totalQuantity, chartImages } = req.body;
      
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      const blue = "#003366";
      let yPos = 20;
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(blue);
      doc.text("Rapport Statistiques", 105, yPos, { align: "center" });
      yPos += 15;
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor("#666666");
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, yPos, { align: "center" });
      yPos += 15;
      
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(blue);
      doc.text("Résumé", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setTextColor("#000000");
      doc.text(`Quantité totale: ${totalQuantity || 0}`, 14, yPos);
      yPos += 6;
      doc.text(`Nombre de thèmes: ${allThemes?.length || 0}`, 14, yPos);
      yPos += 6;
      doc.text(`Nombre de clients: ${clientAnalytics?.length || 0}`, 14, yPos);
      yPos += 6;
      doc.text(`Nombre de fournisseurs: ${fournisseurData?.length || 0}`, 14, yPos);
      yPos += 12;
      
      // Add chart images if available
      if (chartImages?.monthly) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setTextColor(blue);
        doc.text("Évolution mensuelle des commandes", 14, yPos);
        yPos += 8;
        try {
          doc.addImage(chartImages.monthly, 'PNG', 14, yPos, 180, 70);
          yPos += 80;
        } catch (e) { console.log("Failed to add monthly chart"); }
      }
      
      if (chartImages?.fournisseur) {
        if (yPos > 180) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(blue);
        doc.text("Répartition par fournisseur", 14, yPos);
        yPos += 8;
        try {
          doc.addImage(chartImages.fournisseur, 'PNG', 14, yPos, 90, 70);
          yPos += 80;
        } catch (e) { console.log("Failed to add fournisseur chart"); }
      }
      
      if (chartImages?.themes) {
        if (yPos > 120) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(blue);
        doc.text("Top 10 Thèmes les plus vendus", 14, yPos);
        yPos += 8;
        try {
          doc.addImage(chartImages.themes, 'PNG', 14, yPos, 180, 80);
          yPos += 90;
        } catch (e) { console.log("Failed to add themes chart"); }
      }
      
      // New page for data tables
      doc.addPage();
      yPos = 20;
      
      // By Supplier
      doc.setFontSize(14);
      doc.setTextColor(blue);
      doc.text("Données par Fournisseur", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor("#000000");
      (fournisseurData || []).forEach((f: any) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.text(`${f.name}: ${f.value} commandes, ${f.quantity} unités`, 14, yPos);
        yPos += 6;
      });
      yPos += 6;
      
      // Top 10 Themes
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(blue);
      doc.text("Top 10 Thèmes", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor("#000000");
      (allThemes || []).slice(0, 10).forEach((t: any, i: number) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const themeName = t.name.length > 40 ? t.name.substring(0, 40) + "..." : t.name;
        doc.text(`${i + 1}. ${themeName} - ${t.quantity} unités (${t.orders} cmd)`, 14, yPos);
        yPos += 5;
      });
      yPos += 6;
      
      // Top 10 Clients
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(blue);
      doc.text("Top 10 Clients", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor("#000000");
      (clientAnalytics || []).slice(0, 10).forEach((c: any, i: number) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const clientName = (c.enseigne || c.name || "").substring(0, 35);
        doc.text(`${i + 1}. ${clientName} - ${c.totalOrders} cmd, ${c.totalQuantity || 0} unités`, 14, yPos);
        yPos += 5;
      });
      
      const pdfBuffer = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="statistiques.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error("Error exporting stats PDF:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Export stats to Excel
  app.post("/api/stats/export-excel", async (req, res) => {
    try {
      const { fournisseurData, allThemes, clientAnalytics, monthlyData, totalQuantity, chartImages } = req.body;
      
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      
      // Résumé
      const summarySheet = workbook.addWorksheet("Résumé");
      summarySheet.columns = [
        { header: "Indicateur", key: "indicateur", width: 30 },
        { header: "Valeur", key: "valeur", width: 20 },
      ];
      summarySheet.addRow({ indicateur: "Quantité totale", valeur: totalQuantity || 0 });
      summarySheet.addRow({ indicateur: "Nombre de thèmes", valeur: allThemes?.length || 0 });
      summarySheet.addRow({ indicateur: "Nombre de clients", valeur: clientAnalytics?.length || 0 });
      summarySheet.addRow({ indicateur: "Nombre de fournisseurs", valeur: fournisseurData?.length || 0 });
      
      // Style header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      summarySheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Par fournisseur
      const fournisseurSheet = workbook.addWorksheet("Par fournisseur");
      fournisseurSheet.columns = [
        { header: "Fournisseur", key: "fournisseur", width: 25 },
        { header: "Commandes", key: "commandes", width: 15 },
        { header: "Quantité", key: "quantite", width: 15 },
      ];
      (fournisseurData || []).forEach((f: any) => {
        fournisseurSheet.addRow({ fournisseur: f.name, commandes: f.value, quantite: f.quantity });
      });
      fournisseurSheet.getRow(1).font = { bold: true };
      fournisseurSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      fournisseurSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Thèmes
      const themesSheet = workbook.addWorksheet("Thèmes");
      themesSheet.columns = [
        { header: "Thème", key: "theme", width: 40 },
        { header: "Fournisseur", key: "fournisseur", width: 20 },
        { header: "Commandes", key: "commandes", width: 12 },
        { header: "Quantité", key: "quantite", width: 12 },
      ];
      (allThemes || []).forEach((t: any) => {
        themesSheet.addRow({ theme: t.name, fournisseur: t.fournisseur, commandes: t.orders, quantite: t.quantity });
      });
      themesSheet.getRow(1).font = { bold: true };
      themesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      themesSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Clients
      const clientsSheet = workbook.addWorksheet("Clients");
      clientsSheet.columns = [
        { header: "Client", key: "client", width: 35 },
        { header: "Enseigne", key: "enseigne", width: 25 },
        { header: "Commandes", key: "commandes", width: 12 },
        { header: "Quantité", key: "quantite", width: 12 },
      ];
      (clientAnalytics || []).forEach((c: any) => {
        clientsSheet.addRow({ client: c.name, enseigne: c.enseigne, commandes: c.totalOrders, quantite: c.totalQuantity });
      });
      clientsSheet.getRow(1).font = { bold: true };
      clientsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      clientsSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Mensuel
      const monthlySheet = workbook.addWorksheet("Par mois");
      monthlySheet.columns = [
        { header: "Mois", key: "mois", width: 15 },
        { header: "Commandes", key: "commandes", width: 15 },
      ];
      (monthlyData || []).forEach((m: any) => {
        monthlySheet.addRow({ mois: m.name, commandes: m.commandes });
      });
      monthlySheet.getRow(1).font = { bold: true };
      monthlySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      monthlySheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Add charts sheet with images
      if (chartImages && (chartImages.monthly || chartImages.fournisseur || chartImages.themes)) {
        const chartsSheet = workbook.addWorksheet("Graphiques");
        chartsSheet.getColumn(1).width = 80;
        
        let rowNum = 1;
        
        if (chartImages.monthly) {
          try {
            const base64Data = chartImages.monthly.replace(/^data:image\/\w+;base64,/, '');
            const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
            chartsSheet.addImage(imageId, { tl: { col: 0, row: rowNum }, ext: { width: 600, height: 200 } });
            rowNum += 15;
          } catch (e) { console.log("Failed to add monthly chart to Excel"); }
        }
        
        if (chartImages.fournisseur) {
          try {
            const base64Data = chartImages.fournisseur.replace(/^data:image\/\w+;base64,/, '');
            const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
            chartsSheet.addImage(imageId, { tl: { col: 0, row: rowNum }, ext: { width: 400, height: 200 } });
            rowNum += 15;
          } catch (e) { console.log("Failed to add fournisseur chart to Excel"); }
        }
        
        if (chartImages.themes) {
          try {
            const base64Data = chartImages.themes.replace(/^data:image\/\w+;base64,/, '');
            const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
            chartsSheet.addImage(imageId, { tl: { col: 0, row: rowNum }, ext: { width: 600, height: 250 } });
          } catch (e) { console.log("Failed to add themes chart to Excel"); }
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="statistiques.xlsx"`);
      res.send(Buffer.from(buffer as ArrayBuffer));
    } catch (error: any) {
      console.error("Error exporting stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Export planning to Excel (accessible to all authenticated users)
  app.post("/api/planning/export", async (req, res) => {
    try {
      const { orders } = req.body;
      
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      
      const planningSheet = workbook.addWorksheet("Planning");
      planningSheet.columns = [
        { header: "Code Commande", key: "orderCode", width: 20 },
        { header: "Commercial", key: "salesRepName", width: 25 },
        { header: "Client", key: "livraisonEnseigne", width: 30 },
        { header: "Fournisseur", key: "fournisseur", width: 20 },
        { header: "Date Commande", key: "orderDate", width: 15 },
        { header: "Date Livraison", key: "dateLivraison", width: 15 },
        { header: "Inventaire Prévu", key: "dateInventairePrevu", width: 15 },
        { header: "Inventaire", key: "dateInventaire", width: 15 },
        { header: "Retour", key: "dateRetour", width: 15 },
        { header: "Adresse Livraison", key: "livraisonAdresse", width: 35 },
        { header: "CP Ville", key: "livraisonCpVille", width: 20 },
      ];
      
      // Sort orders by delivery date
      const sortedOrders = (orders || []).sort((a: any, b: any) => {
        const dateA = a.dateLivraison || a.orderDate || '';
        const dateB = b.dateLivraison || b.orderDate || '';
        return dateA.localeCompare(dateB);
      });
      
      sortedOrders.forEach((order: any) => {
        planningSheet.addRow({
          orderCode: order.orderCode,
          salesRepName: order.salesRepName,
          livraisonEnseigne: order.livraisonEnseigne || '-',
          fournisseur: order.fournisseur || '-',
          orderDate: order.orderDate || '-',
          dateLivraison: order.dateLivraison || '-',
          dateInventairePrevu: order.dateInventairePrevu || '-',
          dateInventaire: order.dateInventaire || '-',
          dateRetour: order.dateRetour || '-',
          livraisonAdresse: order.livraisonAdresse || '-',
          livraisonCpVille: order.livraisonCpVille || '-',
        });
      });
      
      // Style header row
      planningSheet.getRow(1).font = { bold: true };
      planningSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
      planningSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      
      // Add borders
      planningSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="planning_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(Buffer.from(buffer as ArrayBuffer));
    } catch (error: any) {
      console.error("Error exporting planning:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // === NOTIFICATIONS PUSH ===
  
  // Enregistrer une souscription push
  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const { subscription, userName } = req.body;
      
      if (!subscription || !userName || typeof userName !== 'string') {
        return res.status(400).json({ error: "Subscription et userName requis" });
      }

      const { endpoint, keys } = subscription;
      if (!endpoint || typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Subscription invalide" });
      }

      // Valider avec le schéma
      const validationResult = insertPushSubscriptionSchema.safeParse({
        userName: userName.trim(),
        endpoint: endpoint.trim(),
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      if (!validationResult.success) {
        return res.status(400).json({ error: "Données de souscription invalides" });
      }

      // Supprimer l'ancienne souscription si elle existe
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

      // Insérer la nouvelle souscription
      await db.insert(pushSubscriptions).values(validationResult.data);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Désinscrire une souscription push
  app.post("/api/notifications/unsubscribe", async (req, res) => {
    try {
      const { userName } = req.body;
      
      if (!userName || typeof userName !== 'string') {
        return res.status(400).json({ error: "userName requis" });
      }

      const trimmedUserName = userName.trim();
      if (!trimmedUserName) {
        return res.status(400).json({ error: "userName invalide" });
      }

      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userName, trimmedUserName));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vérifier si un utilisateur est inscrit aux notifications
  app.get("/api/notifications/status/:userName", async (req, res) => {
    try {
      const { userName } = req.params;
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userName, userName));
      
      res.json({ subscribed: subscriptions.length > 0 });
    } catch (error: any) {
      console.error("Error checking notification status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Récupérer les événements à venir pour notifications (livraisons, inventaires, retours)
  app.get("/api/notifications/events/:userName", async (req, res) => {
    try {
      const { userName } = req.params;
      const { days = "7" } = req.query;
      const daysAhead = parseInt(days as string) || 7;
      
      const parisNow = formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd");
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureStr = formatInTimeZone(futureDate, "Europe/Paris", "yyyy-MM-dd");

      // Récupérer les commandes du commercial
      const userOrders = await db.select().from(orders)
        .where(eq(orders.salesRepName, userName));

      const events: Array<{
        type: 'livraison' | 'inventaire_prevu' | 'inventaire' | 'retour';
        date: string;
        orderCode: string;
        clientName: string;
      }> = [];

      for (const order of userOrders) {
        // Vérifier les livraisons
        if (order.dateLivraison && order.dateLivraison >= parisNow && order.dateLivraison <= futureStr) {
          events.push({
            type: 'livraison',
            date: order.dateLivraison,
            orderCode: order.orderCode,
            clientName: order.clientName || '',
          });
        }

        // Vérifier les inventaires prévus
        if (order.dateInventairePrevu && order.dateInventairePrevu >= parisNow && order.dateInventairePrevu <= futureStr) {
          events.push({
            type: 'inventaire_prevu',
            date: order.dateInventairePrevu,
            orderCode: order.orderCode,
            clientName: order.clientName || '',
          });
        }

        // Vérifier les retours
        if (order.dateRetour && order.dateRetour >= parisNow && order.dateRetour <= futureStr) {
          events.push({
            type: 'retour',
            date: order.dateRetour,
            orderCode: order.orderCode,
            clientName: order.clientName || '',
          });
        }
      }

      // Trier par date
      events.sort((a, b) => a.date.localeCompare(b.date));

      res.json({ events });
    } catch (error: any) {
      console.error("Error fetching notification events:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
