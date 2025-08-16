import fs from "fs";
import https from "https";
import path from "path";
import readline from "readline";
import type { typeStaticAPIs } from "types/T_APIs";
import unzipper from "unzipper";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GTFS_URL =
  "https://eu.ftp.opendatasoft.com/sncf/plandata/export-opendata-sncf-gtfs.zip";
const TEMP_ZIP = "export-opendata-sncf-gtfs.zip";
const STOP_FILE = "stops.txt";

const BBOX_GIRONDE = {
  minLat: 44.19381,
  maxLat: 45.57469,
  minLon: -1.26205,
  maxLon: 0.31507,
};

const BBOX_NOUVELLE_AQUITAINE = {
  minLat: 42.77752,
  maxLat: 47.17576,
  minLon: -1.79235,
  maxLon: 2.61157,
};

const basePath = path.resolve(__dirname, "../../public/data/sncf");

const downloadGTFS = (url: string, dest: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) return reject("Download failed.");
        response.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", reject);
  });
};

const extractStopsFile = async (
  zipPath: string,
  outputDir: string = __dirname,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.ParseOne(new RegExp(`^${STOP_FILE}$`)))
      .pipe(fs.createWriteStream(path.join(outputDir, STOP_FILE)))
      .on("finish", () => resolve())
      .on("error", reject);
  });
};

const parseStops = async (
  bboxNA: typeof BBOX_NOUVELLE_AQUITAINE,
  bboxGi: typeof BBOX_GIRONDE,
): Promise<typeStaticAPIs["sncf_stops"]> => {
  const output: typeStaticAPIs["sncf_stops"] = [];
  const inputPath = path.join(__dirname, STOP_FILE);
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  let headers: string[] | undefined;
  for await (const line of rl) {
    const cols = line.split(",");
    if (!headers) {
      headers = cols;
      continue;
    }
    const obj: Record<string, string> = Object.fromEntries(
      headers.map((h, i) => [h, cols[i]]),
    );
    const lat = parseFloat(obj.stop_lat);
    const lon = parseFloat(obj.stop_lon);
    const type = obj.location_type;

    if (
      type === "1" &&
      lat >= bboxNA.minLat &&
      lat <= bboxNA.maxLat &&
      lon >= bboxNA.minLon &&
      lon <= bboxNA.maxLon
    ) {
      const inGironde =
        lat >= bboxGi.minLat &&
        lat <= bboxGi.maxLat &&
        lon >= bboxGi.minLon &&
        lon <= bboxGi.maxLon;
      output.push({
        id: obj.stop_id,
        name: obj.stop_name,
        position: [lat, lon],
        inGironde,
      });
    }
  }
  return output.sort((a, b) => a.name.localeCompare(b.name));
};

const saveStops = async () => {
  console.log("📥 Téléchargement GTFS SNCF...");
  await downloadGTFS(GTFS_URL, TEMP_ZIP);
  console.log("📦 Extraction stops.txt...");
  await extractStopsFile(TEMP_ZIP);

  console.log("📍 Filtrage des arrêts...");
  const stopsNA = await parseStops(BBOX_NOUVELLE_AQUITAINE, BBOX_GIRONDE);
  fs.mkdirSync(basePath, { recursive: true });
  fs.writeFileSync(
    path.join(basePath, "stops.json"),
    JSON.stringify(stopsNA, null, 2),
    "utf-8",
  );
  console.log(
    `✅ ${stopsNA.length} arrêts en Nouvelle-Aquitaine, dont ${stopsNA.filter((stop) => stop.inGironde).length} en Gironde`,
  );
};

saveStops().catch((err) => {
  console.error("❌ Erreur génération stops :", err);
  process.exit(1);
});
