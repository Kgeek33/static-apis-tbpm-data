import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { typeStopsBRTRequete, typeStopsBRT } from "../../types/Tstops";

const fetchStopsBRT = async (): Promise<typeStopsBRT[]> => {
  const res = await fetch(
    `https://data.bordeaux-metropole.fr/geojson?key=258BILMNYZ&typename=sv_arret_p&attributes=["gid","libelle","source"]`,
  );
  const data = (await res.json()) as typeStopsBRTRequete;
  const stopsList: typeStopsBRT[] = [];

  data.features
    .filter((el) => el.properties.source !== "SIG_KEOLIS")
    .forEach((el) => {
      stopsList.push({
        id: [el.properties.gid.toString()],
        name: el.properties.libelle,
      });
    });

  const stops: Record<string, typeStopsBRT[][number]> = {};
  stopsList.forEach((el) => {
    const key = el.name;
    const currentId = el.id[0];
    if (!(key in stops)) {
      stops[key] = { id: el.id, name: key };
    } else {
      if (!stops[key].id.includes(currentId)) {
        stops[key].id.push(currentId);
      }
    }
    stops[key].id.sort((a, b) => parseInt(a) - parseInt(b));
  });

  return Object.values(stops).sort((a, b) => a.name.localeCompare(b.name));
};

const saveStopsBRTToFile = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(
    __dirname,
    "../../data/brt/stops.json",
  );

  const stopsBRT = await fetchStopsBRT();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stopsBRT, null, 2), "utf-8");

  console.log(`✅ Données BRT stops.json générées : ${stopsBRT.length} arrêts`);
};

saveStopsBRTToFile().catch((err) => {
  console.error("❌ Erreur lors de la génération de stops.json :", err);
  process.exit(1);
});
