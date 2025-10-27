# Application de Gestion de Commandes Commerciales

## Vue d'ensemble

Application web mobile pour les commerciaux permettant de saisir des commandes directement chez le client, capturer une signature électronique, générer automatiquement des documents (PDF et Excel) et envoyer des emails automatiques.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React avec Vite
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **Forms**: React Hook Form avec Zod validation
- **UI Components**: Shadcn UI + Tailwind CSS
- **Signature**: React Signature Canvas

### Backend (Express + TypeScript)
- **Server**: Express.js
- **PDF Generation**: jsPDF
- **Excel Generation**: xlsx
- **Email**: Nodemailer avec SMTP
- **Storage**: In-memory (Map)

## Fonctionnalités MVP

### 1. Formulaire de commande (Étape 1/4)
- Nom du client
- Email du client
- Fournisseur
- Thématique produit
- Quantité (avec annotation optionnelle)
- Date de livraison souhaitée
- Remarques (optionnel)

### 2. Signature électronique (Étape 2/4)
- Canvas HTML5 pour capture tactile
- Bouton effacer
- Validation obligatoire

### 3. Révision (Étape 3/4)
- Récapitulatif complet de la commande
- Affichage de toutes les informations saisies
- Bouton de génération

### 4. Succès et envoi (Étape 4/4)
- Affichage du numéro de commande (format: CMD-YYYY-MMDD-XXXX)
- Téléchargement direct des fichiers PDF et Excel
- **Envoi automatique des emails** lors de la génération
- Bouton de renvoi manuel en cas d'erreur
- Bouton "Nouvelle commande"

## Génération automatique

Lors de la génération d'une commande:
1. Création du numéro unique (CMD-YYYY-MMDD-XXXX)
2. Génération du PDF avec toutes les informations et la signature
3. Génération du fichier Excel avec les données structurées
4. **Envoi automatique de 2 emails**:
   - Au client: PDF du bon de commande
   - À l'agence BFC: PDF + Excel

## Configuration

### Variables d'environnement (Secrets)
- `SMTP_HOST`: Serveur SMTP
- `SMTP_PORT`: Port SMTP (587 ou 465)
- `SMTP_USER`: Utilisateur SMTP
- `SMTP_PASSWORD`: Mot de passe SMTP

### Emails configurés
- **Expéditeur**: contact@finalyn.com
- **Destinataires**:
  - Client: email saisi dans le formulaire
  - Agence BFC: jack@finalyn.com

## Structure des fichiers

```
client/
├── src/
│   ├── components/
│   │   ├── OrderForm.tsx (Formulaire de saisie)
│   │   ├── SignatureStep.tsx (Capture de signature)
│   │   ├── ReviewStep.tsx (Révision)
│   │   └── SuccessStep.tsx (Téléchargement et envoi)
│   ├── pages/
│   │   └── OrderPage.tsx (Orchestration des étapes)
│   └── App.tsx
server/
├── utils/
│   ├── pdfGenerator.ts (Génération PDF)
│   ├── excelGenerator.ts (Génération Excel)
│   └── emailSender.ts (Envoi d'emails)
└── routes.ts (API endpoints)
shared/
└── schema.ts (Schémas Zod et types TypeScript)
```

## API Endpoints

### POST /api/orders/generate
Génère une commande avec PDF, Excel et envoie automatiquement les emails.

**Body**:
```json
{
  "clientName": "string",
  "clientEmail": "string",
  "supplier": "string",
  "productTheme": "string",
  "quantity": "string",
  "quantityNote": "string?",
  "deliveryDate": "string (YYYY-MM-DD)",
  "remarks": "string?",
  "signature": "string (base64)"
}
```

**Response**:
```json
{
  "orderCode": "CMD-2025-1027-0001",
  "pdfUrl": "/api/orders/CMD-2025-1027-0001/pdf",
  "excelUrl": "/api/orders/CMD-2025-1027-0001/excel",
  "emailsSent": true,
  "emailError": null
}
```

### GET /api/orders/:orderCode/pdf
Télécharge le PDF de la commande.

### GET /api/orders/:orderCode/excel
Télécharge le fichier Excel de la commande.

### POST /api/orders/send-emails
Renvoie les emails (en cas d'échec de l'envoi automatique).

**Body**:
```json
{
  "orderCode": "CMD-2025-1027-0001",
  "clientEmail": "client@example.com"
}
```

## Design System

### Couleurs
- **Primary**: Bleu (#2563eb) - Actions principales
- **Destructive**: Rouge - Erreurs
- **Muted**: Gris - Informations secondaires

### Typographie
- **Font**: Roboto (400, 500, 700)
- **Titres**: 24px bold
- **Labels**: 14px medium
- **Inputs**: 16px (évite le zoom sur mobile)

### Composants
- **Inputs**: h-12 (48px) pour un touch target confortable
- **Buttons**: h-14 (56px) pour une facilité d'utilisation mobile
- **Cards**: border-2 avec border-radius
- **Spacing**: p-4, p-6 pour la cohérence

## Workflow utilisateur

1. Le commercial remplit le formulaire chez le client
2. Le client signe directement sur l'écran
3. Révision des informations avant génération
4. Clic sur "Générer la commande"
5. **Les emails sont envoyés automatiquement**
6. Possibilité de télécharger les fichiers manuellement
7. Option de renvoyer les emails en cas d'erreur
8. Bouton pour créer une nouvelle commande

## Notes techniques

- Tous les fichiers sont stockés en mémoire (Map)
- Les numéros de commande sont uniques grâce au timestamp
- La signature est stockée en base64 dans le PDF
- Le design est mobile-first et responsive
- Validation côté client et serveur avec Zod
- Gestion d'erreurs complète avec toasts

## Développement futur

Fonctionnalités prévues pour la phase suivante:
- Sauvegarde locale des commandes
- Historique avec recherche
- Configuration des emails dans l'interface
- Upload de photos de produits
- Mode hors-ligne avec synchronisation
