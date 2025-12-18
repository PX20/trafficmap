export interface FilterState {
  showTrafficEvents: boolean;
  showIncidents: boolean;
  showQFES: boolean;
  showUserReports: boolean;
  showUserSafetyCrime: boolean;
  showUserWildlife: boolean;
  showUserCommunity: boolean;
  showUserTraffic: boolean;
  showUserLostFound: boolean;
  showUserPets: boolean;
  showActiveIncidents: boolean;
  showResolvedIncidents: boolean;
  showHighPriority: boolean;
  showMediumPriority: boolean;
  showLowPriority: boolean;
  autoRefresh: boolean;
  distanceFilter: 'all' | '1km' | '2km' | '5km' | '10km' | '25km' | '50km';
  radius?: number;
  locationFilter: boolean;
  homeLocation?: string;
  homeCoordinates?: { lat: number; lon: number };
  homeBoundingBox?: [number, number, number, number];
  showExpiredIncidents: boolean;
  agingSensitivity: 'normal' | 'extended' | 'disabled';
  [key: string]: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined;
}
