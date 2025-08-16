export interface typeStopsRequete {
  Siri: {
    StopPointsDelivery: {
      AnnotatedStopPointRef: {
        StopPointRef: { value: string };
        StopName: { value: string };
        Location: { longitude: number; latitude: number };
        Lines: [{ value: string }];
      }[];
    };
  };
}

interface typeStopsBRTProperties {
  gid: number;
  libelle: string;
  source: "SAEIV_BUS" | "SAEIV_TRAM" | "SIG_KEOLIS";
}

export type typeStopsBRTRequete = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  typeStopsBRTProperties
>;

export interface typeStops {
  id: string[];
  lignes: Record<string, string[]>;
  name: string;
  position: Record<string, number[]>;
}

export interface typeStopsBRT {
  id: string[];
  name: string;
}

export interface typeStopsSNCF {
  id: string;
  name: string;
  position: number[];
  inGironde: boolean;
}
