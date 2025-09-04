import { useQuery } from "@tanstack/react-query";

export interface ProcessedTrafficData {
  events: any[];
  incidents: any[];
  counts: {
    tmr: number;
    esq: number;
    qfes: number;
    userSafetyCrime: number;
    userWildlife: number;
    userCommunity: number;
    userTraffic: number;
  };
  filteredEvents: any[];
  filteredIncidents: any[];
}

export interface FilterState {
  homeLocation?: string;
  showTrafficEvents?: boolean;
  showIncidents?: boolean;
  showQFES?: boolean;
  showUserSafetyCrime?: boolean;
  showUserWildlife?: boolean;
  showUserCommunity?: boolean;
  showUserTraffic?: boolean;
  autoRefresh?: boolean;
}

// Shared helper function to identify QFES incidents
const isQFESIncident = (incident: any) => {
  const incidentType = incident.properties?.incidentType?.toLowerCase() || '';
  const groupedType = incident.properties?.GroupedType?.toLowerCase() || '';
  const description = incident.properties?.description?.toLowerCase() || '';
  
  return incidentType.includes('fire') || 
         incidentType.includes('smoke') || 
         incidentType.includes('chemical') || 
         incidentType.includes('hazmat') ||
         groupedType.includes('fire') || 
         groupedType.includes('smoke') || 
         groupedType.includes('chemical') || 
         groupedType.includes('hazmat') ||
         description.includes('fire') || 
         description.includes('smoke');
};

export function useTrafficData(filters: FilterState): ProcessedTrafficData {
  // Fetch traffic events with location filtering
  const { data: eventsData } = useQuery({
    queryKey: ["/api/traffic/events", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/traffic/events?suburb=${encodeURIComponent(suburb)}`
        : '/api/traffic/events';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch traffic events');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 30000 : false,
  });

  // Fetch incidents with location filtering
  const { data: incidentsData } = useQuery({
    queryKey: ["/api/incidents", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/incidents?suburb=${encodeURIComponent(suburb)}`
        : '/api/incidents';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 60000 : false,
  });

  // Process the data
  const events = Array.isArray(eventsData) ? eventsData : [];
  const incidents = Array.isArray(incidentsData) ? incidentsData : [];
  
  // Categorize incidents
  const nonUserIncidents = incidents.filter((i: any) => !i.properties?.userReported);
  const qfesIncidents = nonUserIncidents.filter(isQFESIncident);
  const esqIncidents = nonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  // Calculate counts
  const counts = {
    tmr: events.length,
    esq: esqIncidents.length,
    qfes: qfesIncidents.length,
    userSafetyCrime: incidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'crime'
    ).length,
    userWildlife: incidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'wildlife'
    ).length,
    userCommunity: incidents.filter((i: any) => 
      i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
    ).length,
    userTraffic: incidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'traffic'
    ).length,
  };

  // Apply filtering for display
  const filteredEvents = events.filter(() => filters.showTrafficEvents === true);
  
  const filteredIncidents = incidents.filter((incident: any) => {
    const isUserReported = incident.properties?.userReported;
    
    if (isUserReported) {
      const incidentType = incident.properties?.incidentType;
      
      if (incidentType === 'crime') {
        return filters.showUserSafetyCrime === true;
      } else if (incidentType === 'wildlife') {
        return filters.showUserWildlife === true;
      } else if (incidentType === 'traffic') {
        return filters.showUserTraffic === true;
      } else {
        return filters.showUserCommunity === true;
      }
    } else {
      // Official incidents
      const isQFES = isQFESIncident(incident);
      if (isQFES) {
        return filters.showQFES === true;
      } else {
        return filters.showIncidents === true;
      }
    }
  });

  return {
    events,
    incidents,
    counts,
    filteredEvents,
    filteredIncidents
  };
}