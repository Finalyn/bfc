import type { Express } from "express";
import { createServer, type Server } from "http";
import { 
  insertOrderSchema, type Order, 
  clients, insertClientSchema, updateClientSchema,
  commerciaux, insertCommercialSchema,
  fournisseurs, insertFournisseurSchema,
  themes, insertThemeSchema,
  orders, insertOrderDbSchema, updateOrderStatusSchema, ORDER_STATUSES
} from "@shared/schema";
import { generateOrderPDF } from "./utils/pdfGenerator";
import { generateOrderExcel } from "./utils/excelGenerator";
import { sendOrderEmails } from "./utils/emailSender";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { data, loadExcelData, type Client as ExcelClient } from "./dataLoader";
import { db } from "./db";
import { eq, ilike, or, sql, count, asc, desc } from "drizzle-orm";

// Stockage en mémoire des fichiers générés
const fileStorage = new Map<string, { pdf: Buffer; excel: Buffer; order: Order }>();

function generateOrderCode(): string {
  const parisTime = toZonedTime(new Date(), "Europe/Paris");
  const year = parisTime.getFullYear();
  const month = String(parisTime.getMonth() + 1).padStart(2, "0");
  const day = String(parisTime.getDate()).padStart(2, "0");
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `CMD-${year}-${month}${day}-${sequence}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Générer une commande avec PDF et Excel
  app.post("/api/orders/generate", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      
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

      // Sauvegarder la commande en base de données
      await db.insert(orders).values({
        orderCode,
        orderDate: order.orderDate,
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
        signature: order.signature,
        signatureLocation: order.signatureLocation,
        signatureDate: order.signatureDate,
        clientSignedName: order.clientSignedName,
        status: "EN_ATTENTE",
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
          fournisseur: t.fournisseur
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
      
      const [newClient] = await db.insert(clients).values(validatedData).returning();
      
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
        // Mettre à jour le client existant
        const [updated] = await db
          .update(clients)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(clients.code, code))
          .returning();
        
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
        
        const [newClient] = await db.insert(clients).values(newClientData).returning();
        
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
            const themesList = order.themeSelections
              ? (order.themeSelections as any[])
                  .map(t => `${t.theme} (${t.category}) x${t.quantity}`)
                  .join(", ")
              : "";
            
            sheet!.addRow({
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              salesRepName: order.salesRepName,
              clientName: order.clientName,
              responsableName: order.responsableName,
              responsableTel: order.responsableTel,
              responsableEmail: order.responsableEmail,
              themes: themesList,
              livraisonEnseigne: order.livraisonEnseigne,
              livraisonAdresse: order.livraisonAdresse,
              livraisonCpVille: order.livraisonCpVille,
              facturationRaisonSociale: order.facturationRaisonSociale,
              facturationAdresse: order.facturationAdresse,
              facturationCpVille: order.facturationCpVille,
              facturationMode: order.facturationMode,
              status: order.status,
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
      let imported = { commerciaux: 0, fournisseurs: 0, themes: 0 };
      
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
          await db.insert(themes).values({ theme: t.theme, fournisseur: t.fournisseur });
        }
        imported.themes = excelData.themes.length;
      }
      
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
      const [created] = await db.insert(clients).values(validated).returning();
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
        const [created] = await db.insert(clients).values(validated).returning();
        return res.json(created);
      }
      const validated = updateClientSchema.parse(req.body);
      const [updated] = await db.update(clients).set(validated).where(eq(clients.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Non trouvé" });
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

  // ===== COMMERCIAUX CRUD =====
  app.get("/api/admin/commerciaux", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      
      let allCommerciaux = await db.select().from(commerciaux);
      
      // Fallback to Excel if empty
      if (allCommerciaux.length === 0) {
        allCommerciaux = data.commerciaux.map((c, i) => ({
          id: i + 1,
          nom: c.displayName || c.nom
        }));
      }
      
      // Filter
      if (search) {
        const searchLower = search.toLowerCase();
        allCommerciaux = allCommerciaux.filter(c => c.nom.toLowerCase().includes(searchLower));
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
      const [created] = await db.insert(commerciaux).values(validated).returning();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/commerciaux/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertCommercialSchema.partial().parse(req.body);
      const [updated] = await db.update(commerciaux).set(validated).where(eq(commerciaux.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Non trouvé" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/commerciaux/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(commerciaux).where(eq(commerciaux.id, id));
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
      const [created] = await db.insert(fournisseurs).values(validated).returning();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/fournisseurs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertFournisseurSchema.partial().parse(req.body);
      const [updated] = await db.update(fournisseurs).set(validated).where(eq(fournisseurs.id, id)).returning();
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
          fournisseur: t.fournisseur
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
      const [created] = await db.insert(themes).values(validated).returning();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/themes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertThemeSchema.partial().parse(req.body);
      const [updated] = await db.update(themes).set(validated).where(eq(themes.id, id)).returning();
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

  // ===== ORDERS CRUD =====
  app.get("/api/admin/orders", async (req, res) => {
    try {
      const { page, pageSize, search, sortField, sortDir, offset } = getPaginationParams(req);
      const { status } = req.query;
      
      let allOrders = await db.select().from(orders);
      
      // Filter by status
      if (status && status !== "ALL") {
        allOrders = allOrders.filter(o => o.status === status);
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

  // Update order status
  app.patch("/api/admin/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = updateOrderStatusSchema.parse(req.body);
      const [updated] = await db.update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Commande non trouvée" });
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

  // Get order statuses
  app.get("/api/admin/order-statuses", (req, res) => {
    res.json(ORDER_STATUSES);
  });

  // Download PDF for order
  app.get("/api/admin/orders/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [orderDb] = await db.select().from(orders).where(eq(orders.id, id));
      if (!orderDb) return res.status(404).json({ message: "Commande non trouvée" });

      const order: Order = {
        orderDate: orderDb.orderDate,
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
        remarks: orderDb.remarks || "",
        signature: orderDb.signature,
        signatureLocation: orderDb.signatureLocation,
        signatureDate: orderDb.signatureDate,
        clientSignedName: orderDb.clientSignedName,
        cgvAccepted: true,
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
        remarks: orderDb.remarks || "",
        signature: orderDb.signature,
        signatureLocation: orderDb.signatureLocation,
        signatureDate: orderDb.signatureDate,
        clientSignedName: orderDb.clientSignedName,
        cgvAccepted: true,
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

  const httpServer = createServer(app);
  return httpServer;
}
