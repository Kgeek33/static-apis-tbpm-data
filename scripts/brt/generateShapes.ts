import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { typeShapesRequete, typeShapes } from "../../types/Tshapes";

const fetchshapesBRT = async (): Promise<typeShapes[]> => {
  const coorPerRoute: Record<number, GeoJSON.Position[][]> = {};
  const geoIdsPerRoute: Record<number, number[]> = {};
  const shapes: typeShapes[] = [];

  const ids: number[] = [];
  for (let id = 123; id <= 198; id++) {
    if (
      (id >= 154 && id <= 157) ||
      id === 177 ||
      id === 178 ||
      (id >= 188 && id <= 191)
    ) {
      continue;
    }
    ids.push(id);
  }

  const filter = JSON.stringify({
    rs_sv_ligne_a: { $in: ids },
    principal: 1,
  });

  const res = await fetch(
    `https://data.bordeaux-metropole.fr/geojson?key=258BILMNYZ&typename=SV_CHEM_L&attributes=["geom","gid","rs_sv_ligne_a"]&filter=${filter}`,
  );
  const data = (await res.json()) as typeShapesRequete;

  const getColor = (id: number) =>
    id >= 123 && id <= 150
      ? "rgb(131,31,130)"
      : id === 151 || (id >= 158 && id <= 176)
        ? "rgb(229,0,64)"
        : id === 152 || (id >= 179 && id <= 186)
          ? "rgb(211,80,152)"
          : "rgb(146,98,163)";

  data.features.forEach((f) => {
    const routeId = f.properties.rs_sv_ligne_a;
    if (!coorPerRoute[routeId]) {
      coorPerRoute[routeId] = [];
    }
    if (!geoIdsPerRoute[routeId]) {
      geoIdsPerRoute[routeId] = [];
    }

    if (f.geometry.type === "MultiLineString") {
      f.geometry.coordinates.forEach((coor) => {
        coorPerRoute[routeId].push(
          coor.map((coorLine) => [
            coorLine[1],
            coorLine[0],
          ]) as GeoJSON.Position[],
        );
      });
    } else {
      coorPerRoute[routeId].push(
        f.geometry.coordinates.map((coor) => [
          coor[1],
          coor[0],
        ]) as GeoJSON.Position[],
      );
    }

    geoIdsPerRoute[routeId].push(f.properties.gid);
  });

  const idAlreadyAdd: number[] = [];
  data.features.forEach((f) => {
    const id = f.properties.rs_sv_ligne_a;

    if (!idAlreadyAdd.includes(id)) {
      idAlreadyAdd.push(id);
      const color = getColor(id);

      shapes.push({
        geometry: { coordinates: coorPerRoute[id], type: "MultiLineString" },
        properties: {
          routeColor: color,
          routeId: id.toString(),
          shapesId: f.properties.gid,
        },
        type: "Feature",
      });
    }
  });

  return shapes.sort(
    (a, b) => parseInt(a.properties.routeId) - parseInt(b.properties.routeId),
  );
};

const saveShapesBRTToFile = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(
    __dirname,
    "../../public/data/brt/shapes.json",
  );

  const shapesBRT = await fetchshapesBRT();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(shapesBRT, null, 2), "utf-8");

  console.log(
    `✅ Données BRT shapes.json générées : ${shapesBRT.length} lignes`,
  );
};

saveShapesBRTToFile().catch((err) => {
  console.error("❌ Erreur lors de la génération de shapes.json :", err);
  process.exit(1);
});
