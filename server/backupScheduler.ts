import cron from "node-cron";
import { pool } from "./db";
import { formatInTimeZone } from "date-fns-tz";
import * as fs from "fs";
import * as path from "path";

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "..", "bfc_backups");
const MAX_BACKUPS = 30;

async function ensureBackupDir(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`[BACKUP] Dossier créé: ${BACKUP_DIR}`);
  }
}

// Escape a value for SQL INSERT
function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  // String: escape quotes and backslashes
  const str = String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${str}'`;
}

async function dumpTable(connection: any, tableName: string): Promise<string> {
  let sql = "";

  // GET CREATE TABLE
  try {
    const [createResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    if (createResult.length > 0) {
      const createStatement = createResult[0]["Create Table"];
      sql += `-- Table: ${tableName}\n`;
      sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sql += `${createStatement};\n\n`;
    }
  } catch (e) {
    sql += `-- Erreur SHOW CREATE TABLE ${tableName}: ${e}\n\n`;
    return sql;
  }

  // GET DATA
  try {
    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(", ");

      // Batch inserts (100 rows per INSERT)
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const values = batch.map((row: any) => {
          const vals = columns.map(col => escapeSqlValue(row[col]));
          return `(${vals.join(", ")})`;
        });
        sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n${values.join(",\n")};\n\n`;
      }
    }
    sql += `-- ${rows.length} row(s) in ${tableName}\n\n`;
  } catch (e) {
    sql += `-- Erreur SELECT ${tableName}: ${e}\n\n`;
  }

  return sql;
}

async function performBackup(): Promise<string | null> {
  try {
    await ensureBackupDir();

    const dateStr = formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd_HH-mm");
    const filename = `backup_bfc_${dateStr}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const connection = await pool.getConnection();

    let sql = "";
    sql += `-- ============================================\n`;
    sql += `-- BFC APP - Backup Base de Données\n`;
    sql += `-- Date: ${formatInTimeZone(new Date(), "Europe/Paris", "dd/MM/yyyy à HH:mm:ss")}\n`;
    sql += `-- ============================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sql += `SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n`;

    // Get all tables
    const [tables] = await connection.query("SHOW TABLES") as any[];
    const tableNames: string[] = (tables as any[]).map((row: any) => Object.values(row)[0] as string);

    console.log(`[BACKUP] Dump de ${tableNames.length} tables: ${tableNames.join(", ")}`);

    for (const tableName of tableNames) {
      sql += await dumpTable(connection, tableName);
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- Fin du backup\n`;

    connection.release();

    fs.writeFileSync(filepath, sql, "utf-8");

    const sizeKB = Math.round(fs.statSync(filepath).size / 1024);
    console.log(`[BACKUP] Sauvegarde créée: ${filename} (${sizeKB} KB, ${tableNames.length} tables)`);

    return filepath;
  } catch (error) {
    console.error("[BACKUP] Erreur lors du backup:", error);
    return null;
  }
}

function cleanupOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("backup_bfc_") && f.endsWith(".sql"))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(f => {
        fs.unlinkSync(f.path);
        console.log(`[BACKUP] Ancien backup supprimé: ${f.name}`);
      });
    }
  } catch (error) {
    console.error("[BACKUP] Erreur nettoyage:", error);
  }
}

export async function startBackupScheduler(): Promise<void> {
  await ensureBackupDir();

  // Backup automatique tous les jours à 02:00 (Europe/Paris)
  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("[BACKUP] Lancement du backup automatique quotidien...");
      await performBackup();
      cleanupOldBackups();
    },
    { timezone: "Europe/Paris" }
  );

  // Backup au démarrage du serveur
  console.log("[BACKUP] Backup initial au démarrage...");
  await performBackup();
  cleanupOldBackups();

  console.log(`[BACKUP] Scheduler démarré (quotidien à 02:00, ${MAX_BACKUPS} fichiers max conservés dans ${BACKUP_DIR})`);
}
