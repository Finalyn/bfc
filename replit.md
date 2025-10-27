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
- **Authentication**: Simple session-based authentication with a hardcoded password ("slf25").
- **Order Form (4 steps)**:
    1.  **Form Input**: Captures client name/email, supplier, product theme, quantity, delivery date, and remarks.
    2.  **E-Signature**: HTML5 canvas for touch signature capture, with clear and mandatory validation.
    3.  **Review**: Displays a comprehensive summary of the order before generation.
    4.  **Success & Dispatch**: Shows a unique order number (CMD-YYYY-MMDD-XXXX), enables direct PDF/Excel downloads, triggers automatic email sending, and offers a manual re-send option and a "New Order" button.
- **Automatic Generation**: Upon order submission, a unique order code is generated. A PDF is created containing all order details and the signature image. An Excel file is generated with structured data and the signature image. Two emails are automatically dispatched: one with the PDF to the client, and another with both PDF and Excel to the BFC agency. All dates and times in generated documents and emails are in "Europe/Paris" timezone. The signature is embedded as an image in both PDF and Excel.
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

## Recent Fixes (October 27, 2025)

### Authentication Session Fix for Published Deployments
**Issue**: After deploying the application to production (published site), users were unable to stay logged in. After entering the password "slf25", the page would redirect back to the login page immediately, creating an infinite loop.

**Root Cause**: The session cookie configuration was using `process.env.NODE_ENV === "production"` to detect production environment, but Replit doesn't automatically set this variable when deploying. Additionally, the `sameSite` attribute was missing from cookie configuration.

**Solution**:
- Changed production detection from `NODE_ENV` to `REPLIT_DEPLOYMENT` (automatically set to `1` by Replit on published deployments)
- Added `sameSite: 'lax'` to allow cookies during redirects
- Set `secure: true` only when `REPLIT_DEPLOYMENT` is present (ensuring HTTPS-only cookies in production)

**Configuration** (in `server/index.ts`):
```javascript
const isProduction = !!process.env.REPLIT_DEPLOYMENT;

app.use(session({
  secret: process.env.SESSION_SECRET || "default-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

**Result**: Sessions now persist correctly on published deployments. Users can log in once and remain authenticated for 24 hours.

### Authentication Check Missing Credentials
**Issue**: After successful login on the published site, users were immediately redirected back to the login page, even though the session was created successfully.

**Root Cause**: In `OrderPage.tsx`, the authentication check used a direct `fetch("/api/auth/check")` call without the `credentials: 'include'` option. On published sites, this prevented session cookies from being sent with the request, causing the server to return `authenticated: false`.

**Solution**:
Changed the fetch call in `OrderPage.tsx` to include credentials:
```javascript
const response = await fetch("/api/auth/check", {
  credentials: 'include' // Sends session cookies
});
```

**Result**: After login, users can now access the order creation page correctly on the published site.

### Session Storage Migration to PostgreSQL (October 27, 2025)
**Issue**: Even with session cookies properly configured, authentication still failed on published deployments. Users would successfully log in but be immediately redirected back to the login page. Server logs showed:
- Session IDs changing between requests (`z6bGR-i-mBKCthWRIlm-g1Isw2_BjEF3` → `eS173Gl_KZvFcsMS5dBBTaXx9EQxo-Bi`)
- `cookies: undefined` on subsequent requests
- `authenticated: undefined` even after successful login
- Warning: "MemoryStore is not designed for a production environment"

**Root Cause**: 
1. Published Replit deployments use **multiple server instances** for scalability
2. Sessions stored in MemoryStore exist only in the RAM of a single server instance
3. When a user logs in on Server A, the session is stored only in that server's memory
4. Subsequent requests may route to Server B, which has no record of the session
5. This caused sessions to appear "lost" even though they were correctly saved

**Solution**:
Migrated from in-memory session storage to PostgreSQL-backed persistent storage:

1. **Created PostgreSQL database** using Replit's built-in database service
2. **Configured connect-pg-simple** to store sessions in the database instead of memory:
   ```javascript
   import connectPgSimple from "connect-pg-simple";
   import { Pool, neonConfig } from "@neondatabase/serverless";
   import ws from "ws";

   // Configure WebSocket for Neon (required for Node.js)
   neonConfig.webSocketConstructor = ws;

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });

   const sessionStore = new PgSession({
     pool: pool,
     tableName: 'session',
     createTableIfMissing: true,
   });

   app.use(session({
     store: sessionStore, // PostgreSQL instead of MemoryStore
     // ... other config
   }));
   ```
3. **Added WebSocket configuration** for Neon database connectivity (`neonConfig.webSocketConstructor = ws`)
4. **Forced session save** in login endpoint to ensure session is written to database before responding

**Benefits**:
- ✅ Sessions persist across all server instances
- ✅ Sessions survive server restarts
- ✅ Scales horizontally with multiple servers
- ✅ Production-ready session management
- ✅ No more "MemoryStore" warnings

**Testing Results**:
End-to-end test confirmed:
- ✅ Login with "slf25" succeeds
- ✅ User redirected to order page
- ✅ **Page reload maintains authentication** (session persists)
- ✅ User stays logged in across requests

**Result**: Sessions now persist reliably on published deployments. Users remain authenticated across all server instances and page reloads.