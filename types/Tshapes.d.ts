interface shapesRequete {
  gid: number;
  route_color: string;
  route_id: string;
  route_long_name: string;
  route_short_name: string;
  route_text_color: string;
  rs_sv_ligne_a: number;
}

export type typeShapesRequete = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  shapesRequete
>;

interface shapes {
  routeColor: string;
  routeId: string;
  shapesId: number;
}

export type typeShapes = GeoJSON.Feature<GeoJSON.MultiLineString, shapes>;
