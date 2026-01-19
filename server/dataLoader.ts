import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Commercial {
  id: string;
  raisonSocial: string;
  nom: string;
  prenom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  fax: string;
  portable: string;
  mail: string;
  departements: string;
  displayName: string; // Nom complet pour affichage
}

export interface Client {
  id: string;
  code: string;
  nom: string;
  adresse1: string;
  adresse2: string;
  codePostal: string;
  ville: string;
  pays: string;
  interloc: string;
  tel: string;
  portable: string;
  fax: string;
  mail: string;
  displayName: string; // Nom + ville pour affichage
}

export interface Fournisseur {
  id: string;
  nom: string;
  nomCourt: string; // Nom utilisé dans les thèmes
  adresse: string;
  codePostal: string;
  ville: string;
  tel: string;
  portable: string;
  mail: string;
  web: string;
}

export interface Theme {
  id: string;
  fournisseur: string;
  theme: string;
  categorie: string;
}

export interface DatabaseData {
  commerciaux: Commercial[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  themes: Theme[];
}

let cachedData: DatabaseData | null = null;

// Mapping manuel des noms de fournisseurs (nom complet -> nom court pour thèmes)
const FOURNISSEUR_MAPPING: Record<string, string> = {
  "B DIS BOISSELLERIE DISTRIBUTION": "BDIS",
  "SIROCO": "SIROCO",
  "VDH": "VDH",
  "COTTREAU": "COTTREAU",
  "NAYATS": "NAYAT", // Attention: "NAYATS" dans Fournisseurs, "NAYAT" dans Themes
  "MAEVA": "MAEVA",
  "VENT D'OUEST": "VENT D'OUEST",
};

export function loadExcelData(): DatabaseData {
  if (cachedData) {
    return cachedData;
  }

  // Essayer plusieurs chemins pour trouver data.xlsx
  // En dev: server/data.xlsx depuis __dirname
  // En prod: server/data.xlsx depuis la racine du projet
  const possiblePaths = [
    path.join(__dirname, "data.xlsx"),           // Dev: depuis le dossier courant
    path.join(process.cwd(), "server", "data.xlsx"), // Prod: depuis la racine
    path.join(__dirname, "..", "data.xlsx"),     // Au cas où dist/ est utilisé
  ];

  let filePath = "";
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      filePath = testPath;
      console.log(`✅ Fichier Excel trouvé: ${testPath}`);
      break;
    }
  }

  if (!filePath) {
    throw new Error(`❌ Fichier data.xlsx introuvable. Chemins testés: ${possiblePaths.join(", ")}`);
  }

  const workbook = XLSX.readFile(filePath);

  // Charger les commerciaux
  const commerciauxSheet = workbook.Sheets["BASE COMMERCIAUX"];
  const commerciauxRaw = XLSX.utils.sheet_to_json(commerciauxSheet, { header: 1 }) as any[][];
  const commerciaux: Commercial[] = commerciauxRaw
    .slice(2) // Sauter les 2 premières lignes (vide + en-têtes)
    .filter(row => row && row[1]) // Filtrer les lignes vides
    .map((row, index) => ({
      id: `com-${index}`,
      raisonSocial: row[0] || "",
      nom: row[1] || "",
      prenom: row[2] || "",
      adresse: row[3] || "",
      codePostal: String(row[4] || ""),
      ville: row[5] || "",
      fax: row[6] || "",
      portable: row[7] || "",
      mail: row[8] || "",
      departements: row[9] || "",
      displayName: `${row[2] || ""} ${row[1] || ""}`.trim() || row[0] || "",
    }));

  // Charger les clients
  const clientsSheet = workbook.Sheets["BASE CLIENTS"];
  const clientsRaw = XLSX.utils.sheet_to_json(clientsSheet, { header: 1 }) as any[][];
  const clients: Client[] = clientsRaw
    .slice(1) // Sauter la ligne d'en-têtes
    .filter(row => row && row[3]) // Filtrer les lignes vides
    .map((row, index) => ({
      id: `cli-${index}`,
      code: row[2] || "",
      nom: row[3] || "",
      adresse1: row[4] || "",
      adresse2: row[5] || "",
      codePostal: String(row[6] || ""),
      ville: row[8] || "",
      pays: row[9] || "",
      interloc: row[10] || "",
      tel: row[11] || "",
      portable: row[12] || "",
      fax: row[13] || "",
      mail: row[14] || "",
      displayName: `${row[3] || ""} - ${row[8] || ""}`.trim(),
    }));

  // Charger les fournisseurs
  const fournisseursSheet = workbook.Sheets["BASE FOURNISSEURS"];
  const fournisseursRaw = XLSX.utils.sheet_to_json(fournisseursSheet, { header: 1 }) as any[][];
  const fournisseurs: Fournisseur[] = fournisseursRaw
    .slice(1) // Sauter la ligne d'en-têtes
    .filter(row => row && row[0]) // Filtrer les lignes vides
    .map((row, index) => {
      const nom = row[0] || "";
      return {
        id: `four-${index}`,
        nom,
        nomCourt: FOURNISSEUR_MAPPING[nom] || nom, // Utiliser le mapping ou le nom complet si pas trouvé
        adresse: row[1] || "",
        codePostal: String(row[2] || ""),
        ville: row[3] || "",
        tel: row[4] || "",
        portable: row[5] || "",
        mail: row[6] || "",
        web: row[7] || "",
      };
    });

  // Charger les thèmes
  const themesSheet = workbook.Sheets["BASE THEMES"];
  const themesRaw = XLSX.utils.sheet_to_json(themesSheet, { header: 1 }) as any[][];
  const themes: Theme[] = themesRaw
    .slice(1) // Sauter la ligne d'en-têtes
    .filter(row => row && row[0] && row[1]) // Filtrer les lignes vides
    .map((row, index) => ({
      id: `theme-${index}`,
      fournisseur: row[0] || "",
      theme: row[1] || "",
      categorie: row[2] || "TOUTE_ANNEE",
    }));

  cachedData = {
    commerciaux,
    clients,
    fournisseurs,
    themes,
  };

  console.log(`✅ Données chargées: ${commerciaux.length} commerciaux, ${clients.length} clients, ${fournisseurs.length} fournisseurs, ${themes.length} thèmes`);

  return cachedData;
}

// Charger les données au démarrage
export const data = loadExcelData();
