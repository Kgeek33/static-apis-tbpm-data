import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { typeRoutesRequete, typeRoutes } from "../../types/Troutes";

// Utilitaire pour le nettoyage du nom de terminus
const cleanPlaceName = (raw: string): string => {
  const noms = raw.split(" / ");
  const normalised = new Set(
    noms.map((n) =>
      n
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim(),
    ),
  );

  return [...normalised].map((id) => {
    return noms.find((n) =>
      n
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(id),
    )!;
  })[0];
};

const checkLigne = (ligne: string, terminus: string): string => {
  const lignesIgnore = ["59", "60", "61", "62", "901"];
  return lignesIgnore.includes(ligne) ? terminus : cleanPlaceName(terminus);
};

const fetchRoutes = async (): Promise<typeRoutes[]> => {
  const res = await fetch(
    "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/lines-discovery.json?AccountKey=opendata-bordeaux-metropole-flux-gtfs-rt",
  );

  const data = (await res.json()) as typeRoutesRequete;
  const routes: typeRoutes[] = [];

  data.Siri.LinesDelivery.AnnotatedLineRef.forEach((element) => {
    const ligneId = element.LineRef.value.split(":")[2];
    const destinations: typeRoutes[][number]["terminus"] = [];

    element.Destinations.forEach((directionElement) => {
      const raw = directionElement.PlaceName[0].value;
      const direction = checkLigne(ligneId, raw);

      if (!destinations.some((d) => d.direction === direction)) {
        destinations.push({
          direction,
          id: directionElement.DirectionRef.value,
        });
      }
    });

    routes.push({
      id: ligneId,
      name: element.LineName[0]?.value ?? element.LineCode.value,
      nameShort: element.LineCode.value,
      terminus: destinations,
    });
  });

  return routes.sort((a, b) => parseInt(a.id) - parseInt(b.id));
};

const saveRoutesToFile = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(
    __dirname,
    "../../data/tbm/routes.json",
  );

  const routes = await fetchRoutes();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2), "utf-8");

  console.log(`✅ Données TBM routes.json générées : ${routes.length} lignes`);
};

saveRoutesToFile().catch((err) => {
  console.error("❌ Erreur lors de la génération de routes.json :", err);
  process.exit(1);
});
