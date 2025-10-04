import fs from "fs";
import https from "https";
import path from "path";
import readline from "readline";
import unzipper from "unzipper";
import { fileURLToPath } from "url";
import type { typeRoutesSNCF } from "../../types/Troutes";
import type { typeStopsListRequete, typeStopsSNCF } from "../../types/Tstops";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.resolve(__dirname, "../../data/sncf");

const GTFS_URL =
  "https://eu.ftp.opendatasoft.com/sncf/plandata/export-opendata-sncf-gtfs.zip";
const TEMP_ZIP = "export-opendata-sncf-gtfs.zip";

const STOP_TIMES_NAME_FILE = "stop_times.txt";
const TRIP_NAME_FILE = "trips.txt";
const ROUTES_NAME_FILE = "routes.txt";

const STOPS_JSON = path.join(basePath, "stops.json");
const OUTPUT_PATH = path.join(basePath, "routes.json");

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

const extractFiles = async (
  zipPath: string,
  outputDir: string = __dirname
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const expectedFiles = new Set([
      STOP_TIMES_NAME_FILE,
      TRIP_NAME_FILE,
      ROUTES_NAME_FILE,
    ]);
    const extracted = new Set<string>();

    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on("entry", (entry) => {
        const fileName = entry.path;
        if (expectedFiles.has(fileName)) {
          entry.pipe(fs.createWriteStream(path.join(outputDir, fileName)));
          extracted.add(fileName);
        } else {
          entry.autodrain();
        }
      })
      .on("close", () => {
        if ([...expectedFiles].every((f) => extracted.has(f))) {
          resolve();
        } else {
          reject(
            `Fichiers manquants dans le ZIP (trouvés: ${Array.from(
              extracted
            ).join(", ")})`
          );
        }
      })
      .on("error", reject);
  });
};

const loadStopNameToIdMap = (
  rawStops: typeStopsSNCF[]
): Record<string, string> => {
  const map: Record<string, string> = {};
  rawStops.forEach((s) => {
    const name = s.name.toLowerCase();
    map[name] = s.id[0] ?? "";
  });
  return map;
};

const findStopIdByName = (
  name: string,
  stopNameToId: Record<string, string>
): string | null => {
  const target = name.trim().toLowerCase();
  for (const [nom, id] of Object.entries(stopNameToId)) {
    if (nom === target || nom.includes(target) || target.includes(nom)) {
      return id;
    }
  }
  return null;
};

const getRoutesFiltered = async (): Promise<typeRoutesSNCF[]> => {
  const inputPathStopTimes = path.join(__dirname, STOP_TIMES_NAME_FILE);
  const inputPathTrip = path.join(__dirname, TRIP_NAME_FILE);
  const inputPathRoutes = path.join(__dirname, ROUTES_NAME_FILE);

  const stopsNA = JSON.parse(
    fs.readFileSync(STOPS_JSON, "utf-8")
  ) as typeStopsSNCF[];
  const stopsGi = stopsNA.filter((stop) => stop.inGironde);

  const girondeStopIds = new Set(stopsGi.map((s) => s.id[0]));

  const stopNameToId = loadStopNameToIdMap(stopsNA);

  // Étape 1 : détecter les trips qui passent par la Gironde
  const tripIds = new Set<string>();
  const stopTimesRL = readline.createInterface({
    input: fs.createReadStream(inputPathStopTimes),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  for await (const line of stopTimesRL) {
    const cols = line.split(",");
    if (!headers.length) {
      headers = cols;
      continue;
    }
    const record = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
    if (
      record.stop_id.includes("Train TER") &&
      girondeStopIds.has(`StopArea:OCE${record.stop_id.split("-")[1]}`)
    ) {
      tripIds.add(record.trip_id);
    }
  }

  // Étape 2 : associer trips → route_id
  const routeIds = new Set<string>();
  const routeIdToTripIds: Record<string, string[]> = {};
  const tripsRL = readline.createInterface({
    input: fs.createReadStream(inputPathTrip),
    crlfDelay: Infinity,
  });

  headers = [];
  for await (const line of tripsRL) {
    const cols = line.split(",");
    if (!headers.length) {
      headers = cols;
      continue;
    }
    const record = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
    if (tripIds.has(record.trip_id)) {
      routeIds.add(record.route_id);
      if (!routeIdToTripIds[record.route_id]) {
        routeIdToTripIds[record.route_id] = [];
      }
      routeIdToTripIds[record.route_id].push(record.trip_id.split(":")[0]);
    }
  }

  // Étape 3 : filtrer routes
  const routes: typeRoutesSNCF[] = [];
  const seen = new Set<string>();
  const routesRL = readline.createInterface({
    input: fs.createReadStream(inputPathRoutes),
    crlfDelay: Infinity,
  });

  headers = [];
  for await (const line of routesRL) {
    const cols = line.split(",");
    if (!headers.length) {
      headers = cols;
      continue;
    }

    const record = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
    if (!routeIds.has(record.route_id) || seen.has(record.route_id)) continue;

    const longName = record.route_long_name || "";
    const shortName = record.route_short_name || "";

    const directionWithoutNumber = longName.split(".")[1]?.trim() || "";
    const listStops = directionWithoutNumber
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);

    const firstStop = listStops[0];
    const lastStop = listStops[listStops.length - 1];

    const idA = findStopIdByName(firstStop, stopNameToId);
    const idB = findStopIdByName(lastStop, stopNameToId);

    const terminus: typeRoutesSNCF["terminus"] = [];
    const res = await fetch(
      `https://gateway-apim.infotbm.com/maas-web/web/v1/timetables/lines/line:SNC:${record.route_id}`
    );
    const data = (await res.json()) as typeStopsListRequete;
    const firstDirection = data.routes[0];
    const firstStopId = firstDirection.stopPoints[0].id;
    const stopId = `StopArea:OCE${firstStopId.split("-")[1]}`;
    if (stopId === idB) {
      terminus.push({ direction: firstStop, id: idA ?? "0" });
      terminus.push({ direction: lastStop, id: idB ?? "1" });
    } else {
      terminus.push({ direction: lastStop, id: idB ?? "0" });
      terminus.push({ direction: firstStop, id: idA ?? "1" });
    }

    routes.push({
      id: record.route_id,
      name: longName || shortName,
      nameShort: shortName,
      terminus,
      tripIds: routeIdToTripIds[record.route_id] || [],
    });
    seen.add(record.route_id);
  }

  return routes.sort((a, b) => a.nameShort.localeCompare(b.nameShort));
};

const saveRoutes = async () => {
  console.log("📥 Téléchargement GTFS SNCF...");
  await downloadGTFS(GTFS_URL, TEMP_ZIP);
  console.log("📦 Extraction fichiers...");
  await extractFiles(TEMP_ZIP);
  console.log("🔍 Filtrage routes...");
  const routes = await getRoutesFiltered();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(routes, null, 2), "utf-8");
  console.log(`✅ ${routes.length} lignes TER trouvées`);
};

saveRoutes().catch((err) => {
  console.error("❌ Erreur génération routes SNCF :", err);
  process.exit(1);
});
