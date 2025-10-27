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
- **Excel Generation**: ExcelJS (supporte les images)
- **Email**: Nodemailer avec SMTP
- **Storage**: In-memory (Map)
- **Timezone**: date-fns-tz (Europe/Paris)

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
1. Création du numéro unique (CMD-YYYY-MMDD-XXXX) basé sur le fuseau horaire de Paris
2. Génération du PDF avec toutes les informations et la signature en image
3. Génération du fichier Excel avec les données structurées **et l'image de signature**
4. **Envoi automatique de 2 emails**:
   - Au client: PDF du bon de commande
   - À l'agence BFC: PDF + Excel

**Notes importantes :**
- Toutes les dates et heures utilisent le fuseau horaire **Europe/Paris** (UTC+1/UTC+2)
- La signature est incluse comme **image** dans le PDF et l'Excel (pas de texte)

## Configuration

### Variables d'environnement (Secrets)
- `SMTP_HOST`: Serveur SMTP
- `SMTP_PORT`: Port SMTP (recommandé: 587 avec STARTTLS)
- `SMTP_USER`: Utilisateur SMTP
- `SMTP_PASSWORD`: Mot de passe SMTP

### Configuration SMTP actuelle (27 octobre 2025)
- **Serveur**: smtp.ethereal.email (serveur de test)
- **Port**: 587 (STARTTLS)
- **Utilisateur**: jacktoutsimplesurpc@gmail.com
- **Expéditeur dynamique**: Utilise automatiquement `SMTP_USER` comme adresse d'expédition
- **Destinataires**:
  - Client: email saisi dans le formulaire
  - Agence BFC: jacktoutsimplesurpc@gmail.com

**Notes importantes**:
- Ethereal Email est un service de test qui capture les emails sans les délivrer réellement
- Pour la production, remplacer par un vrai serveur SMTP (Hostinger, Gmail, SendGrid, etc.)
- ⚠️ **Sécurité**: `tls.rejectUnauthorized = false` est activé pour Ethereal - doit être réactivé en production
- Le port 587 (STARTTLS) fonctionne mieux que le port 465 (SSL) sur les plateformes cloud

## Structure des fichiers

```
client/
├── src/
│   ├── components/
│   │   ├── OrderForm.tsx (Formulaire de saisie)
│   │   ├── SignatureStep.tsx (Capture de signature)
│   │   ├── ReviewStep.tsx (Révision)
│   │   └── SuccessStep.tsx (Téléchargement et envoi)
│   ├── lib/
│   │   └── queryClient.ts (Configuration TanStack Query + apiRequest)
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
- **Important**: `apiRequest` dans `queryClient.ts` parse automatiquement les réponses JSON

## Corrections de bugs appliquées (27 octobre 2025)

### Bug critique résolu: Numéro de commande non affiché
**Problème**: Le numéro de commande n'apparaissait pas dans l'interface après génération, même si le serveur renvoyait correctement les données.

**Cause**: La fonction `apiRequest` dans `client/src/lib/queryClient.ts` retournait l'objet `Response` brut au lieu de parser le JSON.

**Solution**: Modifié `apiRequest` pour:
- Changer le type de retour de `Promise<Response>` à `Promise<T>`
- Ajouter `return await res.json()` au lieu de `return res`
- Ajouter un paramètre générique `<T = any>` pour le typage

### Bug corrigé: État d'envoi d'email bloqué
**Problème**: L'interface restait bloquée sur "Envoi en cours..." même après échec SMTP, au lieu d'afficher l'erreur et le bouton de renvoi.

**Cause**: La logique de condition dans `SuccessStep.tsx` vérifiait `emailError ?` qui retournait `false` pour une chaîne vide `""`.

**Solution**: Modifié les conditions pour vérifier `emailError && emailError.length > 0` afin de correctement détecter la présence d'une erreur.

### Bug corrigé: Canvas de signature apparaissait noir
**Problème**: Le canvas de signature s'affichait comme un bloc noir au lieu d'un fond blanc, rendant impossible la capture de signature.

**Cause**: Les couleurs utilisaient des variables CSS (`hsl(var(--card))` et `hsl(var(--foreground))`) qui n'étaient pas correctement interprétées par react-signature-canvas.

**Solution**: 
- Changé `backgroundColor` de variable CSS à `#ffffff` (blanc fixe)
- Changé `penColor` de variable CSS à `#000000` (noir fixe)
- Ajouté des paramètres de sensibilité optimisés pour doigt et stylet
- Style CSS inline explicite pour garantir le fond blanc

### Bug corrigé: Envoi d'emails SMTP
**Problème**: Les emails ne pouvaient pas être envoyés, avec erreurs "Greeting never received" ou "Sender address rejected".

**Causes multiples**:
1. Port 465 (SSL) bloqué sur l'environnement Replit
2. FROM_EMAIL ne correspondait pas à SMTP_USER authentifié
3. Serveur Hostinger inaccessible depuis Replit

**Solutions**:
- Changé port de 465 à 587 (STARTTLS plus compatible avec cloud)
- FROM_EMAIL utilise maintenant `process.env.SMTP_USER` automatiquement
- Ajouté `requireTLS: true` pour port 587
- Configuration de timeouts appropriés (10s)
- Basculé sur Ethereal Email pour tests en développement

**Résultat**: Emails maintenant envoyés avec succès via Ethereal Email (test) et prêt pour production avec n'importe quel serveur SMTP.

## Améliorations appliquées (27 octobre 2025)

### Ajout de l'image de signature dans l'Excel
**Objectif**: Afficher la signature comme une vraie image dans le fichier Excel au lieu d'un texte.

**Changements**:
- Remplacé la bibliothèque `xlsx` par `ExcelJS` qui supporte l'insertion d'images
- Modifié `server/utils/excelGenerator.ts` pour convertir la signature base64 en buffer PNG
- Inséré l'image dans le fichier Excel (200x100px)
- La fonction `generateOrderExcel()` est maintenant asynchrone

**Résultat**: Les fichiers Excel contiennent maintenant une image visible de la signature du client, identique à celle du PDF.

### Correction du fuseau horaire pour Paris
**Objectif**: Toutes les dates et heures doivent utiliser le fuseau horaire Europe/Paris (UTC+1 ou UTC+2) **partout** dans l'application.

**Changements**:
- Installé la bibliothèque `date-fns-tz`
- Modifié tous les générateurs pour utiliser `formatInTimeZone()` avec "Europe/Paris":
  - `server/utils/excelGenerator.ts` : Toutes les dates affichées
  - `server/utils/pdfGenerator.ts` : Toutes les dates affichées
  - `server/utils/emailSender.ts` : Toutes les dates dans les emails
- Modifié `server/routes.ts` pour :
  - `generateOrderCode()` : utilise `toZonedTime()` pour le numéro
  - `createdAt` : utilise `formatInTimeZone(..., "Europe/Paris", "yyyy-MM-dd'T'HH:mm:ssXXX")` pour stocker avec l'offset

**Format du createdAt** : ISO 8601 avec offset (exemple: `2025-10-27T13:54:30+01:00` au lieu de `2025-10-27T12:54:30Z`)

**Résultat**: 
- ✅ Tous les documents (PDF, Excel, emails) affichent l'heure de Paris
- ✅ Le numéro de commande est basé sur la date de Paris
- ✅ Le timestamp `createdAt` est stocké avec l'offset de Paris (+01:00 ou +02:00)

### Changement de l'email de l'agence BFC
**Changement**: L'email de destination de l'agence BFC a été modifié de `jack@finalyn.com` à `jacktoutsimplesurpc@gmail.com`.

**Raison**: Avec le serveur de test Ethereal Email, tous les emails capturés (client + agence) sont visibles au même endroit en se connectant avec `jacktoutsimplesurpc@gmail.com` sur https://ethereal.email.

## Tests end-to-end

L'application a été testée avec Playwright et valide les scénarios suivants:
- ✅ Saisie complète du formulaire avec validation
- ✅ Capture de signature tactile
- ✅ Révision des informations
- ✅ Génération de commande avec numéro unique
- ✅ Affichage correct du numéro de commande (format CMD-YYYY-MMDD-XXXX)
- ✅ Téléchargement PDF et Excel
- ✅ Gestion des erreurs d'envoi d'email avec option de renvoi manuel
- ✅ Réinitialisation pour nouvelle commande

**Note**: L'envoi SMTP peut échouer en environnement de développement si le serveur SMTP n'est pas accessible. C'est un comportement normal et attendu. L'application gère correctement cette situation en affichant l'erreur et en proposant un renvoi manuel.

## Développement futur

Fonctionnalités prévues pour la phase suivante:
- Sauvegarde locale des commandes
- Historique avec recherche
- Configuration des emails dans l'interface
- Upload de photos de produits
- Mode hors-ligne avec synchronisation
