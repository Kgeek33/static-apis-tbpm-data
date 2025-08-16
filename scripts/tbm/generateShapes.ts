import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { typeShapesRequete, typeShapes } from "../../types/Tshapes";

const fetchShapes = async (): Promise<typeShapes[]> => {
  const res = await fetch(
    "https://transport.data.gouv.fr/resources/conversions/83024/GeoJSON",
  );

  const data = (await res.json()) as typeShapesRequete;
  const coorPerRoute: Record<string, GeoJSON.Position[][]> = {};
  const shapes: typeShapes[] = [];

  data.features
    .filter((f) => f.geometry.type === "LineString")
    .forEach((f) => {
      const routeId = f.properties.route_id;
      if (!coorPerRoute[routeId]) {
        coorPerRoute[routeId] = [];
      }
      coorPerRoute[routeId].push(
        f.geometry.coordinates.map((coor) => [
          coor[1],
          coor[0],
        ]) as GeoJSON.Position[],
      );
    });

  const idAlreadyAdd: string[] = [];
  data.features
    .filter((f) => f.geometry.type === "LineString")
    .forEach((f) => {
      const routeId = f.properties.route_id;

      if (!idAlreadyAdd.includes(routeId)) {
        idAlreadyAdd.push(routeId);

        shapes.push({
          geometry: {
            coordinates: coorPerRoute[routeId],
            type: "MultiLineString",
          },
          properties: {
            routeColor: f.properties.route_color,
            routeId,
            shapesId: NaN,
          },
          type: "Feature",
        });
      }
    });

  return shapes.sort(
    (a, b) => parseInt(a.properties.routeId) - parseInt(b.properties.routeId),
  );
};

const saveShapesToFile = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(
    __dirname,
    "../../data/tbm/shapes.json",
  );

  const shapes = await fetchShapes();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(shapes, null, 2), "utf-8");

  console.log(`✅ Données TBM shapes.json générées : ${shapes.length} lignes`);
};

saveShapesToFile().catch((err) => {
  console.error("❌ Erreur lors de la génération de shapes.json :", err);
  process.exit(1);
});
