/**
 * Utility functions for handling incident data
 */

export function getIncidentId(incident: any): string | null {
  if (!incident) return null;

  // Try different possible ID fields from the unified structure
  if (incident.id) return incident.id;
  if (incident.properties?.id) return incident.properties.id;
  
  // For TMR incidents - check for TMR source and get ID from properties
  if (incident.source === 'tmr' || incident.properties?.source === 'tmr') {
    const tmrId = incident.properties?.id;
    if (tmrId) {
      return `tmr:${tmrId}`;
    }
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

// Category UUID to human name mappings based on server category seeding
const CATEGORY_MAPPINGS: Record<string, string> = {
  '792759f4-1b98-4665-b14c-44a54e9969e9': 'Safety & Crime',
  '9b1d58d9-cfd1-4c31-93e9-754276a5f265': 'Infrastructure & Hazards',
  '54d31da5-fc10-4ad2-8eca-04bac680e668': 'Emergency Situations',
  'd03f47a9-10fb-4656-ae73-92e959d7566a': 'Wildlife & Nature',
  'deaca906-3561-4f80-b79f-ed99561c3b04': 'Community Issues',
  '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0': 'Pets',
  'd1dfcd4e-48e9-4e58-9476-4782a2a132f3': 'Lost & Found'
};

const SUBCATEGORY_MAPPINGS: Record<string, string> = {
  '1605bc8c-d0cc-4b56-9eb6-aaa6f008cdff': 'Dangerous Animals',
  '9e7942dc-cfa9-44a5-8c4f-55efcaa6d915': 'Animal Welfare',
  'a3f8e5b2-7c9d-4e1f-8a5b-2d7f9c6e8a4b': 'Environmental Issues',
  'b7c8f6a9-3e5d-4f2a-9c1b-8e7a6d5f4c3b': 'Violence & Threats',
  'c9d7e8f1-4a6b-5c3d-a2e9-7f8c6b5a4d3e': 'Theft & Property Crime',
  'd1e9f2a3-5b7c-6d4e-b3f1-8a9d7c6b5e4f': 'Suspicious Activity',
  'e2f1a4b5-6c8d-7e5f-c4a2-9b8e7d6c5f4a': 'Public Disturbances',
  'f3a2b5c6-7d9e-8f6a-d5b3-ac9f8e7d6c5b': 'Road Hazards',
  'a4b3c6d7-8e1f-9a7b-e6c4-bd1a9f8e7d6c': 'Missing Pets',
  'b5c4d7e8-9f2a-ab8c-f7d5-ce2b1a9f8e7d': 'Found Pets'
};

export function getIncidentCategory(incident: any): string {
  if (!incident) return '';
  
  // Get the raw category ID first
  let categoryId = '';
  
  if (incident.properties?.categoryId) {
    categoryId = incident.properties.categoryId;
  } else if (incident.properties?.category) {
    categoryId = incident.properties.category;
  } else if (incident.category) {
    categoryId = incident.category;
  }
  
  // If we have a UUID, try to map it to human name
  if (categoryId && CATEGORY_MAPPINGS[categoryId]) {
    return CATEGORY_MAPPINGS[categoryId];
  }
  
  // If it's already a human name, return as-is
  if (categoryId && !categoryId.includes('-')) {
    return categoryId;
  }
  
  return '';
}

export function getIncidentSubcategory(incident: any): string {
  if (!incident) return '';
  
  // Get the raw subcategory ID first
  let subcategoryId = '';
  
  if (incident.properties?.subcategoryId) {
    subcategoryId = incident.properties.subcategoryId;
  } else if (incident.properties?.subcategory) {
    subcategoryId = incident.properties.subcategory;
  } else if (incident.subcategory) {
    subcategoryId = incident.subcategory;
  }
  
  // If we have a UUID, try to map it to human name
  if (subcategoryId && SUBCATEGORY_MAPPINGS[subcategoryId]) {
    return SUBCATEGORY_MAPPINGS[subcategoryId];
  }
  
  // If it's already a human name, return as-is
  if (subcategoryId && !subcategoryId.includes('-')) {
    return subcategoryId;
  }
  
  return '';
}

// Helper to get the reporter's user ID consistently across both modals
export function getReporterUserId(incident: any): string | null {
  if (!incident) return null;
  
  // Fix: Check for non-empty values - try properties first since that's where the data actually is
  return incident.properties?.reporterId || 
         incident.properties?.userId || 
         (incident.userId && incident.userId.trim() !== '' ? incident.userId : null) ||
         null;
}

// Unified incident navigation system for consolidating map and feed modals
export function getCanonicalIncidentId(incident: any): string | null {
  if (!incident) return null;
  
  // Use the existing getIncidentId logic to get the primary identifier
  const primaryId = getIncidentId(incident);
  if (!primaryId) return null;
  
  // Ensure the ID is URL-safe by encoding special characters
  return encodeURIComponent(primaryId);
}

export function decodeIncidentId(encodedId: string): string {
  try {
    return decodeURIComponent(encodedId);
  } catch (e) {
    console.warn('Failed to decode incident ID:', encodedId);
    return encodedId;
  }
}

export function createIncidentUrl(incident: any): string | null {
  const canonicalId = getCanonicalIncidentId(incident);
  if (!canonicalId) return null;
  
  return `/incident/${canonicalId}`;
}

// Helper function for navigating to incidents from map or feed
export function navigateToIncident(incident: any, setLocation: (url: string) => void): void {
  const url = createIncidentUrl(incident);
  if (url) {
    setLocation(url);
  } else {
    console.warn('Could not create URL for incident:', incident);
  }
}

// Get appropriate icon for incident based on source and category
export function getIncidentIconProps(incident: any): { iconName: string, color: string } {
  if (!incident) return { iconName: 'AlertTriangle', color: 'text-gray-500' };
  
  const source = incident.source || incident.properties?.source;
  
  if (source === 'tmr') {
    // TMR Traffic Events
    const eventType = incident.properties?.event_type?.toLowerCase() || '';
    if (eventType.includes('congestion')) {
      return { iconName: 'Timer', color: 'text-orange-600' }; // Timer for congestion
    }
    return { iconName: 'Car', color: 'text-orange-600' }; // Car for other traffic events
  }
  
  if (source === 'emergency') {
    // Emergency Services - determine by incident type
    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    if (eventType.includes('fire') || description.includes('fire')) {
      return { iconName: 'Flame', color: 'text-red-600' };
    } else if (eventType.includes('medical') || description.includes('medical')) {
      return { iconName: 'Heart', color: 'text-green-600' };
    } else if (eventType.includes('police') || description.includes('police')) {
      return { iconName: 'Shield', color: 'text-blue-600' };
    }
    return { iconName: 'AlertTriangle', color: 'text-red-600' };
  }
  
  if (source === 'user') {
    // User Reports - category-specific icons
    const categoryId = incident.properties?.categoryId || incident.category;
    
    switch (categoryId) {
      case '792759f4-1b98-4665-b14c-44a54e9969e9': // Safety & Crime
        return { iconName: 'Shield', color: 'text-red-600' };
      case '9b1d58d9-cfd1-4c31-93e9-754276a5f265': // Infrastructure & Hazards  
        return { iconName: 'Construction', color: 'text-yellow-600' };
      case '54d31da5-fc10-4ad2-8eca-04bac680e668': // Emergency Situations
        return { iconName: 'Zap', color: 'text-red-500' };
      case 'd03f47a9-10fb-4656-ae73-92e959d7566a': // Wildlife & Nature
        return { iconName: 'Trees', color: 'text-green-600' };
      case 'deaca906-3561-4f80-b79f-ed99561c3b04': // Community Issues
        return { iconName: 'Users', color: 'text-blue-600' };
      case '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0': // Pets
        return { iconName: 'Heart', color: 'text-pink-600' };
      case 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3': // Lost & Found
        return { iconName: 'Search', color: 'text-indigo-600' };
      default:
        return { iconName: 'Users', color: 'text-purple-600' }; // Default for user reports
    }
  }
  
  // Fallback for legacy data
  if (incident.type === 'traffic' || incident.properties?.category === 'traffic') {
    return { iconName: 'Car', color: 'text-orange-600' };
  }
  
  if (incident.properties?.userReported) {
    return { iconName: 'Users', color: 'text-purple-600' };
  }
  
  // Default emergency icon
  return { iconName: 'AlertTriangle', color: 'text-red-600' };
}