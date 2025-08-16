import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDirs = ["brt", "sncf", "tbm"];
const baseDir = __dirname;

for (const dir of scriptDirs) {
  const dirPath = path.join(baseDir, dir);
  if (!fs.existsSync(dirPath)) continue;

  console.log(`\nExécution des scripts dans le répertoire: ${dirPath}`);
  console.log(
    "Scripts trouvés :",
    fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts")),
    "\n"
  );
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`Exécution de ${filePath}…`);
    console.log("--------------");

    try {
      execSync(`tsx "${filePath}"`, { stdio: "inherit" });
      console.log(`→ Exécuté, minification du fichier JSON… : ${filePath}`);

      const dataDir = path.join(baseDir, "..", "data", dir);
      if (fs.existsSync(dataDir)) {
        const jsonFile = file
          .toLowerCase()
          .replace("generate", "")
          .replace("first_", "")
          .replace("second_", "")
          .replace(".ts", ".json");
        const jsonPath = path.join(dataDir, jsonFile);

        try {
          const content = fs.readFileSync(jsonPath, "utf8");
          const minified = JSON.stringify(JSON.parse(content));
          fs.writeFileSync(jsonPath, minified, "utf8");

          console.log(`→ Minifié : ${jsonPath}`);
        } catch (e) {
          console.error(`❌ Erreur de minification pour ${jsonPath} :`, e);
          process.exitCode = 1;
        }
      }
    } catch (e) {
      console.error(`❌ Erreur lors de l'exécution de ${filePath}, erreur:`, e);
      process.exitCode = 1;
    }

    console.log("--------------");
  }
}

const dataRootDir = path.join(baseDir, "..", "data");
const metaPath = path.join(dataRootDir, "meta.json");
const now = new Date();
const iso = now.toISOString();
const meta = { lastUpdated: iso };
try {
  fs.writeFileSync(metaPath, JSON.stringify(meta), "utf8");
  console.log(`→ meta.json généré à la racine : ${metaPath}`);
} catch (e) {
  console.error(
    `❌ Erreur lors de la génération de meta.json à la racine :`,
    e
  );
  process.exitCode = 1;
}
