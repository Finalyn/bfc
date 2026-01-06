# BFC APP - Application de Gestion de Commandes Commerciales

## Overview
This project is a mobile-first PWA (BFC APP) designed for sales representatives to streamline the order management process. It features role-based dashboards where Ludovic (admin) has global oversight of all commercials' data, while individual commercials have personalized views. The app enables order creation, PDF/Excel generation, email sending, offline support, and push notifications.

## User Preferences
I prefer clear and concise communication. For any significant changes or new features, please provide a high-level overview of the proposed solution before diving into implementation details. When suggesting code, prioritize readability and maintainability. I value iterative development, so small, reviewable changes are preferred over large, monolithic updates. Please ensure all dates and times displayed and processed throughout the application adhere to the "Europe/Paris" timezone. Do not make changes to the existing file structure in `client/` and `server/`.

## System Architecture

### UI/UX Decisions
The application features a mobile-first, responsive design with a specific BDIS 2026 template implementation.
- **Color Scheme**: Primary Blue (`#2563eb`), Destructive Red, Muted Gray, with BDIS-specific colors for document generation (blue `#003366`, orange `#E67E22`).
- **Typography**: Roboto font (400, 500, 700 weights); 24px bold titles, 14px medium labels, 16px inputs.
- **Components**: Inputs are 48px high, buttons are 56px high. Cards feature a 2px border and border-radius. Consistent `p-4`, `p-6` spacing. The form is structured into 4 sections: General Info, Contacts, Themes, Delivery/Invoicing, with a double-column layout for themes.

### Technical Implementations
The application uses a client-server architecture.
- **Frontend**: React with TypeScript, Vite, Wouter for routing, TanStack Query v5 for state, React Hook Form with Zod for validation, Shadcn UI and Tailwind CSS for styling, and React Signature Canvas for e-signatures. Autocomplete features leverage a custom `Combobox` component.
- **Backend**: Express.js server in TypeScript. It utilizes `express-session` for authentication, `jsPDF` for PDF generation, `ExcelJS` for Excel generation (including signature images), `Nodemailer` for email services, and `date-fns-tz` for "Europe/Paris" timezone handling. Data is stored in-memory using JavaScript Maps. A `dataLoader.ts` module parses `data.xlsx` for autocomplete data.

### Feature Specifications
- **Authentication**: Client-side session-based authentication. Default password is "bfc26" for commercials, "slf26" for admin (ludovicfraioli). Sessions are stored in sessionStorage.
- **Navigation Hub**: Central navigation with cards for Order Creation, Personal Dashboard, Profile, and Admin Database (admin-only).
- **Order Form (4 steps)**:
    1.  **Form Input**: Captures `orderDate`, `salesRepName`, client info, `responsableName`, `responsableTel`, `responsableEmail`, optional `comptaTel`, `comptaEmail`, `themeSelections` (TOUTE_ANNEE and SAISONNIER categories with quantity and delivery date), `livraisonEnseigne`, `livraisonAdresse`, `livraisonCpVille`, `livraisonHoraires`, `livraisonHayon`, `facturationRaisonSociale`, `facturationAdresse`, `facturationCpVille`, `facturationMode` (VIREMENT/CHEQUE/LCR), `facturationRib`, and `cgvAccepted`. Autocomplete is integrated for sales reps, clients, suppliers, and themes using data from `data.xlsx`.
    2.  **E-Signature**: HTML5 canvas for signature capture, `signatureLocation`, `signatureDate` (pre-filled), and `clientSignedName`.
    3.  **Review**: Comprehensive summary of all captured order details.
    4.  **Success & Dispatch**: Displays a unique order number, enables PDF/Excel downloads, triggers automatic email sending, and offers manual re-send and "New Order" options.
- **Automatic Generation**: Generates a unique order code, a PDF containing all order details and signature based on the BDIS 2026 template, and an Excel file with structured data including the signature image. All dates are in "Europe/Paris" timezone.
- **Email Dispatch**: Two automated emails: one to the client with the PDF, and another to `jack@finalyn.com` with both PDF and Excel, including detailed order information.
- **Data Storage**: All order data is stored in PostgreSQL database with orders table.
- **Personal Dashboard (MyDashboard)**: Each commercial sees their own stats (total, pending, in-progress, delivered), orders list, and calendar with delivery dates.
- **Profile Page**: Users can manage notification settings (push/email) and view their account info.

### System Design Choices
- **Validation**: Client-side and server-side validation using Zod for all form fields, including the mandatory `cgvAccepted` checkbox.
- **Error Handling**: Comprehensive error management with toast notifications.
- **API Interaction**: `apiRequest` utility for JSON response parsing.
- **Excel Data Integration**: `dataLoader.ts` module loads commercial, client, supplier, and theme data from an Excel file at server startup, providing API endpoints for frontend autocomplete functionality.

## External Dependencies

- **SMTP Service**: Configured to use an external SMTP server for sending emails, currently `smtp.ethereal.email` for testing.
- **Environment Variables (Secrets)**:
    -   `SESSION_SECRET`: For session cookie signing.
    -   `SMTP_HOST`: SMTP server address.
    -   `SMTP_PORT`: SMTP server port.
    -   `SMTP_USER`: SMTP authentication username.
    -   `SMTP_PASSWORD`: SMTP authentication password.
- **data.xlsx**: An Excel file located in the server directory, used as a database for autocomplete features (commercials, clients, suppliers, themes).