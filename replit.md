# Application de Gestion de Commandes Commerciales

## Overview
This project is a mobile-first web application designed for sales representatives. Its primary purpose is to streamline the order management process by enabling sales reps to capture orders directly from clients, obtain electronic signatures, automatically generate essential documents (PDF and Excel), and send automated email notifications. The application aims to enhance efficiency in commercial operations by providing a robust, user-friendly tool for on-site order processing.

## User Preferences
I prefer clear and concise communication. For any significant changes or new features, please provide a high-level overview of the proposed solution before diving into implementation details. When suggesting code, prioritize readability and maintainability. I value iterative development, so small, reviewable changes are preferred over large, monolithic updates. Please ensure all dates and times displayed and processed throughout the application adhere to the "Europe/Paris" timezone. Do not make changes to the existing file structure in `client/` and `server/`.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, responsive design.
- **Color Scheme**: Primary Blue (`#2563eb`), Destructive Red, Muted Gray.
- **Typography**: Roboto font (400, 500, 700 weights); 24px bold titles, 14px medium labels, 16px inputs.
- **Components**: Inputs are 48px high, buttons are 56px high for comfortable touch targets. Cards feature a 2px border and border-radius. Consistent `p-4`, `p-6` spacing is used.

### Technical Implementations
The application follows a client-server architecture:
- **Frontend**: Built with React and TypeScript, using Vite for tooling. Wouter handles routing, TanStack Query v5 manages state, and React Hook Form with Zod provides form validation. UI components are styled with Shadcn UI and Tailwind CSS. React Signature Canvas is used for electronic signature capture.
- **Backend**: An Express.js server in TypeScript handles API requests. It uses `express-session` for authentication, `jsPDF` for PDF generation, `ExcelJS` for Excel generation (including signature images), and `Nodemailer` for email services. Data is stored in-memory using JavaScript Maps. `date-fns-tz` ensures all date/time operations are handled in the "Europe/Paris" timezone.

### Feature Specifications
- **Authentication**: Simple session-based authentication with a hardcoded password ("slf25"). Session temporaire sans persistance (redemander à chaque rechargement de page).
- **Order Form (4 steps)**:
    1.  **Form Input**: Captures sales rep name, client name/email, supplier, product theme, quantity, delivery date, and remarks.
    2.  **E-Signature**: HTML5 canvas for touch signature capture with enhanced information: signature location, signature date (pre-filled), client written name, and the visual signature itself. All fields are mandatory and validated.
    3.  **Review**: Displays a comprehensive summary of the order including sales rep name, all client information, and complete signature details (name, location, date) before generation.
    4.  **Success & Dispatch**: Shows a unique order number (CMD-YYYY-MMDD-XXXX), enables direct PDF/Excel downloads, triggers automatic email sending, and offers a manual re-send option and a "New Order" button.
- **Automatic Generation**: Upon order submission, a unique order code is generated. A PDF is created containing all order details including sales rep name, complete signature information (client name, location, date) and the signature image. An Excel file is generated with structured data including all new fields and the signature image. Two emails are automatically dispatched: one with the PDF to the client, and another with both PDF and Excel to the BFC agency (slf@orange.fr). All dates and times in generated documents and emails are in "Europe/Paris" timezone. The signature is embedded as an image in both PDF and Excel.
- **Data Storage**: All order data is stored in-memory using JavaScript Maps for simplicity.

### System Design Choices
- **Validation**: Client-side and server-side validation using Zod.
- **Error Handling**: Comprehensive error management with toast notifications.
- **API Interaction**: `apiRequest` utility automatically parses JSON responses.

## External Dependencies

- **SMTP Service**: Configured to use an external SMTP server for sending emails. Currently uses `smtp.ethereal.email` for testing purposes.
- **Environment Variables (Secrets)**:
    -   `SESSION_SECRET`: For session cookie signing.
    -   `SMTP_HOST`: SMTP server address.
    -   `SMTP_PORT`: SMTP server port (recommended 587 with STARTTLS).
    -   `SMTP_USER`: SMTP authentication username.
    -   `SMTP_PASSWORD`: SMTP authentication password.

## Recent Changes (October 27, 2025)

### Authentication Ultra-Simplifiée - Client-Side Only (October 27, 2025)
**Solution**: Authentication 100% côté client sans base de données ni sessions serveur.

**Comment ça marche** :
- L'utilisateur entre "slf25" sur /login
- Le mot de passe est vérifié dans le navigateur (pas d'appel serveur)
- Un flag `authenticated: true` est stocké dans `sessionStorage`
- L'utilisateur peut naviguer dans l'application
- **Au rechargement de la page** : le flag est automatiquement effacé via détection de `performance.navigation.type === 'reload'`
- L'utilisateur est redirigé vers /login et doit réentrer le mot de passe

**Avantages** :
- ✅ Aucune base de données nécessaire
- ✅ Aucune session serveur
- ✅ Fonctionne parfaitement avec déploiements multi-instances
- ✅ Aucun warning "MemoryStore"
- ✅ Ultra-simple et rapide
- ✅ Session temporaire : rechargement = reconnexion requise

**Code technique** :
```javascript
// Login (client/src/pages/LoginPage.tsx)
if (password === "slf25") {
  sessionStorage.setItem("authenticated", "true");
  setLocation("/");
}

// Vérification (client/src/pages/OrderPage.tsx)
const navigationType = performance.getEntriesByType('navigation')[0];
const isPageReload = navigationType?.type === 'reload';

if (isPageReload) {
  sessionStorage.removeItem("authenticated"); // Efface au rechargement
}

const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
if (!isAuthenticated) {
  setLocation("/login");
}
```

**Résultat** : Authentication fonctionnelle, simple, sans persistance, exactement comme demandé.

### Enhanced Commercial and Signature Fields (October 27, 2025)
**Changements** : Ajout de champs commerciaux et de signature enrichis pour une meilleure traçabilité.

**Nouveaux champs** :
- **Étape 1 - Formulaire** :
  - `salesRepName` : Nom du commercial (champ requis, validation Zod)
  
- **Étape 2 - Signature** :
  - `signatureLocation` : Lieu de signature (champ texte requis)
  - `signatureDate` : Date de signature (pré-remplie avec la date du jour, modifiable, requise)
  - `clientSignedName` : Nom écrit du client (champ texte requis pour confirmation d'identité)
  - Signature canvas (inchangé)

**Impact sur les documents** :
- **PDF** : Layout en 2 colonnes - colonne gauche pour commercial et client, colonne droite pour la signature (nom, lieu, date, image). Les détails de commande et remarques s'affichent en dessous sur toute la largeur pour éviter tout chevauchement.
- **Excel** : Layout en 4 colonnes (A-B pour gauche, C-D pour droite). Commercial et client dans les colonnes A-B, signature dans les colonnes C-D. Les remarques fusionnent les 4 colonnes pour occuper toute la largeur.
- **Page de révision** : Affiche le nom du commercial en premier, puis tous les détails de signature (nom, lieu, date formatée en français).

**Validation** :
- Tous les nouveaux champs utilisent React Hook Form avec validation Zod
- Champs requis avec messages d'erreur appropriés en français
- Date de signature pré-remplie avec `formatInTimeZone` pour Europe/Paris

**Fichiers modifiés** :
- `shared/schema.ts` : Ajout des 4 nouveaux champs au schéma Order
- `client/src/components/OrderForm.tsx` : Ajout du champ salesRepName
- `client/src/components/SignatureStep.tsx` : Ajout des 3 champs de signature
- `client/src/components/ReviewStep.tsx` : Affichage des nouvelles informations
- `client/src/pages/OrderPage.tsx` : Gestion du passage des données de signature
- `server/utils/pdfGenerator.ts` : Génération PDF avec nouvelles sections
- `server/utils/excelGenerator.ts` : Génération Excel avec nouvelles sections