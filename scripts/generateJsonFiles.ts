import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDirs = ["brt", "sncf", "tbm"];
const baseDir = __dirname;
const dataRootDir = path.join(baseDir, "..", "data");
const metaPath = path.join(dataRootDir, "meta.json");

// Charger l'ancien meta.json s'il existe
let meta: Record<
  string,
  {
    [file: string]: { lastUpdated: string; hash: string };
  }
> = {};

if (fs.existsSync(metaPath)) {
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {}
}

// Fonction utilitaire pour calculer un hash MD5 d'un JSON
const hashContent = (content: string) => {
  return crypto.createHash("md5").update(content).digest("hex");
};

for (const dir of scriptDirs) {
  const dirPath = path.join(baseDir, dir);
  if (!fs.existsSync(dirPath)) continue;

  console.log(`\nExécution des scripts dans le répertoire: ${dirPath}`);
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const filePath = path.join(dirPath, file);

    try {
      execSync(`tsx "${filePath}"`, { stdio: "inherit" });

      const dataDir = path.join(baseDir, "..", "data", dir);
      if (!fs.existsSync(dataDir)) continue;

      const jsonFile = file
        .toLowerCase()
        .replace("generate", "")
        .replace("first_", "")
        .replace("second_", "")
        .replace(".ts", ".json");
      const jsonPath = path.join(dataDir, jsonFile);

      const content = fs.readFileSync(jsonPath, "utf8");
      const minified = JSON.stringify(JSON.parse(content));
      fs.writeFileSync(jsonPath, minified, "utf8");

      // Calcul du hash et mise à jour du meta.json
      const newHash = hashContent(minified);
      if (!meta[dir]) meta[dir] = {};
      if (!meta[dir][jsonFile] || meta[dir][jsonFile].hash !== newHash) {
        meta[dir][jsonFile] = {
          lastUpdated: new Date().toISOString(),
          hash: newHash,
        };
        console.log(`→ Données mises à jour pour ${dir}/${jsonFile}`);
      }
    } catch (e) {
      console.error(`❌ Erreur pour ${filePath} :`, e);
      process.exitCode = 1;
    }
  }
}

// Écrire le meta.json mis à jour
try {
  const metaStringify = JSON.stringify(meta, null, 2);
  const metaMinified = JSON.stringify(JSON.parse(metaStringify));
  fs.writeFileSync(metaPath, metaMinified, "utf8");
  console.log(`\n→ meta.json mis à jour : ${metaPath}`);
} catch (e) {
  console.error(`❌ Erreur lors de l'écriture de meta.json :`, e);
  process.exitCode = 1;
}
