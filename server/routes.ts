import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertOrderSchema, type Order, clients, insertClientSchema, updateClientSchema } from "@shared/schema";
import { generateOrderPDF } from "./utils/pdfGenerator";
import { generateOrderExcel } from "./utils/excelGenerator";
import { sendOrderEmails } from "./utils/emailSender";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { data, type Client as ExcelClient } from "./dataLoader";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

  // Routes pour les données de référence
  app.get("/api/data/commerciaux", (req, res) => {
    res.json(data.commerciaux);
  });

  app.get("/api/data/clients", (req, res) => {
    res.json(data.clients);
  });

  app.get("/api/data/fournisseurs", (req, res) => {
    res.json(data.fournisseurs);
  });

  app.get("/api/data/themes", (req, res) => {
    const { fournisseur } = req.query;
    if (fournisseur) {
      const filtered = data.themes.filter(t => t.fournisseur === fournisseur);
      res.json(filtered);
    } else {
      res.json(data.themes);
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

  const httpServer = createServer(app);
  return httpServer;
}
