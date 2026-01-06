import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt, initDB } from "./lib/pwa";

registerServiceWorker();
setupInstallPrompt();
initDB().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
