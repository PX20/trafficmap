export interface TrafficEvent {
  id: string;
  event_type: string;
  event_subtype?: string;
  event_priority: string;
  description: string;
  information?: string;
  advice?: string;
  status: string;
  published: string;
  last_updated: string;
  road_summary: {
    road_name: string;
    locality: string;
    postcode: string;
    local_government_area: string;
    district: string;
  };
  impact: {
    direction: string;
    towards: string;
    impact_type: string;
    impact_subtype: string;
    delay: string;
  };
  duration: {
    start: string;
    end: string;
    active_days: string[];
  };
  source: {
    source_name: string;
    provided_by: string;
    provided_by_url?: string;
  };
  geometry: {
    type: string;
    geometries: Array<{
      type: string;
      coordinates: number[][];
    }>;
  };
}

export interface TrafficCamera {
  id: string;
  name: string;
  location: string;
  status: string;
  image_url?: string;
  last_updated: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export interface QldTrafficResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: any;
    properties: any;
  }>;
  published: string;
  rights: {
    owner: string;
    disclaimer: string;
    copyright: string;
  };
}
