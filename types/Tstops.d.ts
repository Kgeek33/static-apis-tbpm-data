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

export interface typeStopsListRequete {
  code: string;
  documents: [
    {
      endDate: string;
      startDate: string;
      title: string;
      type: string;
      url: string;
    }
  ];
  iconUrl: string;
  id: string;
  isOperating: boolean;
  isSpecial: boolean;
  mapUrl: string;
  mode: string;
  name: string;
  routes: {
    id: string;
    name: string;
    stopPoints: [
      {
        coordinates: {
          latitude: number;
          longitude: number;
        };
        hasWheelchairBoarding: boolean;
        id: string;
        isPartialTerminus: boolean;
        name: string;
        stopAreaId: string;
      }
    ];
  }[];
  style: {
    color: string;
    textColor: string;
  };
  timetableUrl: string;
}

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
