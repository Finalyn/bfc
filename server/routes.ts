import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertOrderSchema, type Order } from "@shared/schema";
import { generateOrderPDF } from "./utils/pdfGenerator";
import { generateOrderExcel } from "./utils/excelGenerator";
import { sendOrderEmails } from "./utils/emailSender";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

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

// Middleware d'authentification
function requireAuth(req: any, res: any, next: any) {
  if (req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Non authentifié" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Route de login simple
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    
    if (password === "slf25") {
      req.session.authenticated = true;
      return res.json({ success: true });
    }
    
    return res.status(401).json({ message: "Mot de passe incorrect" });
  });

  // Route pour vérifier l'authentification
  app.get("/api/auth/check", (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
  });

  // Générer une commande avec PDF et Excel
  app.post("/api/orders/generate", requireAuth, async (req, res) => {
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
          order.clientEmail
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
  app.get("/api/orders/:orderCode/pdf", requireAuth, (req, res) => {
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
  app.get("/api/orders/:orderCode/excel", requireAuth, (req, res) => {
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
  app.post("/api/orders/send-emails", requireAuth, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
