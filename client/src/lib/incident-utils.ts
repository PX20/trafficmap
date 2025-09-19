/**
 * Utility functions for handling incident data
 */

export function getIncidentId(incident: any): string | null {
  if (!incident) return null;

  // Try different possible ID fields from the unified structure
  if (incident.id) return incident.id;
  if (incident.properties?.id) return incident.properties.id;
  
  // For TMR incidents
  if (incident.properties?.originalProperties?.id) {
    return `tmr:${incident.properties.originalProperties.id}`;
  }
  
  // For emergency incidents
  if (incident.properties?.Master_Incident_Number) {
    return `esq:${incident.properties.Master_Incident_Number}`;
  }
  if (incident.properties?.Incident_Number) {
    return `esq:${incident.properties.Incident_Number}`;
  }
  if (incident.properties?.IncidentNumber) {
    return `esq:${incident.properties.IncidentNumber}`;
  }
  
  // For user reports
  if (incident.properties?.userReported && incident.properties?.reportId) {
    return incident.properties.reportId;
  }
  
  // Fallback: create a deterministic ID from available data
  const eventType = incident.properties?.Event_Type || incident.properties?.event_type || '';
  const description = incident.properties?.description || '';
  const location = incident.properties?.Location || incident.properties?.location || '';
  
  if (eventType || description || location) {
    return `generated:${eventType}-${description}-${location}`.replace(/[^a-zA-Z0-9:-]/g, '-');
  }
  
  return null;
}

export function getIncidentTitle(incident: any): string {
  if (!incident) return 'Unknown Incident';
  
  // Use the unified structure title if available
  if (incident.properties?.title) {
    return incident.properties.title;
  }
  
  // Fallback to other title fields
  if (incident.title) return incident.title;
  if (incident.properties?.Event_Type) return incident.properties.Event_Type;
  if (incident.properties?.event_type) return incident.properties.event_type;
  if (incident.properties?.description) return incident.properties.description;
  
  return 'Incident';
}

export function getIncidentLocation(incident: any): string {
  if (!incident) return 'Unknown Location';
  
  // Use the unified structure location if available
  if (incident.properties?.location) {
    return incident.properties.location;
  }
  
  // Fallback to other location fields
  if (incident.location) return incident.location;
  if (incident.properties?.Location) return incident.properties.Location;
  if (incident.properties?.Locality) return incident.properties.Locality;
  
  // For traffic events, try road summary
  const roadInfo = incident.properties?.road_summary;
  if (roadInfo?.road_name && roadInfo?.locality) {
    return `${roadInfo.road_name}, ${roadInfo.locality}`;
  }
  if (roadInfo?.road_name) return roadInfo.road_name;
  if (roadInfo?.locality) return roadInfo.locality;
  
  return 'Location not specified';
}

export function getIncidentCategory(incident: any): string {
  if (!incident) return '';
  
  // Use the unified structure category if available
  if (incident.properties?.category) {
    return incident.properties.category;
  }
  
  // Fallback to other category fields
  if (incident.category) return incident.category;
  
  return '';
}

export function getIncidentSubcategory(incident: any): string {
  if (!incident) return '';
  
  // Use the unified structure subcategory if available
  if (incident.properties?.subcategory) {
    return incident.properties.subcategory;
  }
  
  // Fallback to other subcategory fields
  if (incident.subcategory) return incident.subcategory;
  
  return '';
}