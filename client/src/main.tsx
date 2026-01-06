import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt, initDB, requestNotificationPermission } from "./lib/pwa";

registerServiceWorker();
setupInstallPrompt();
initDB().catch(console.error);

setTimeout(() => {
  requestNotificationPermission();
}, 2000);

createRoot(document.getElementById("root")!).render(<App />);
