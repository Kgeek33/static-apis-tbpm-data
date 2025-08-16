import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { typeStopsRequete, typeStops } from "../../types/Tstops";

const fetchStops = async (): Promise<typeStops[]> => {
  const res = await fetch(
    "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/stoppoints-discovery.json?AccountKey=opendata-bordeaux-metropole-flux-gtfs-rt",
  );
  const data = (await res.json()) as typeStopsRequete;
  const stopsList: typeStops[] = [];

  data.Siri.StopPointsDelivery.AnnotatedStopPointRef.forEach((el) => {
    const stopId = el.StopPointRef.value.split(":")[3];
    const lignes = el.Lines.map((l) => l.value.split(":")[2]);
    stopsList.push({
      id: [stopId],
      lignes: { [stopId]: lignes },
      name: el.StopName.value,
      position: { [stopId]: [el.Location.longitude, el.Location.latitude] },
    });
  });

  const stops: Record<string, typeStops[][number]> = {};

  stopsList.forEach((el) => {
    const key = el.name;
    const currentId = el.id[0];
    if (!(key in stops)) {
      stops[key] = {
        id: el.id,
        lignes: { ...el.lignes },
        name: key,
        position: { ...el.position },
      };
    } else {
      if (!stops[key].id.includes(currentId)) stops[key].id.push(currentId);
      if (!stops[key].lignes[currentId]) {
        stops[key].lignes[currentId] = [...el.lignes[currentId]];
      } else {
        el.lignes[currentId].forEach((ligne) => {
          if (!stops[key].lignes[currentId].includes(ligne)) {
            stops[key].lignes[currentId].push(ligne);
          }
        });
      }
      if (!stops[key].position[currentId]) {
        stops[key].position[currentId] = el.position[currentId];
      }
    }
    stops[key].id.sort((a, b) => parseInt(a) - parseInt(b));
  });

  return Object.values(stops).sort((a, b) => a.name.localeCompare(b.name));
};

const saveStopsToFile = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(
    __dirname,
    "../../data/tbm/stops.json",
  );

  const stops = await fetchStops();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stops, null, 2), "utf-8");

  console.log(`✅ Données TBM stops.json générées : ${stops.length} lignes`);
};

saveStopsToFile().catch((err) => {
  console.error("❌ Erreur lors de la génération de stops.json :", err);
  process.exit(1);
});
