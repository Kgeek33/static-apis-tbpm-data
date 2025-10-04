export interface typeRoutesRequete {
  Siri: {
    LinesDelivery: {
      AnnotatedLineRef: {
        Destinations: [
          {
            DirectionRef: { value: string };
            PlaceName: [{ value: string }];
          }
        ];
        LineCode: { value: string };
        LineName: [{ value: string } | null];
        LineRef: { value: string };
      }[];
    };
  };
}

export interface typeRoutes {
  id: string;
  name: string;
  nameShort: string;
  terminus: {
    direction: string;
    id: string;
  }[];
}

export interface typeRoutesSNCF extends typeRoutes {
  tripIds: string[];
}
