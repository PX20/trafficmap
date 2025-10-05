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
  if (incident.properties?.userReported && incident.properties?.reporterId) {
    return incident.properties.reporterId;
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
  // Safety & Crime
  '97a99d33-f10a-4391-b22f-78631eff8805': 'Violence & Threats',
  'e6a187d7-428b-47e6-a2d0-617db1963aee': 'Theft & Property Crime',
  '7b1ba0b9-b9d5-437e-a106-886f96660f99': 'Suspicious Activity',
  'e39e8d3f-4358-4a91-ac09-38dbb25d4832': 'Public Disturbances',
  
  // Infrastructure & Hazards
  'ca42fc3b-9ac1-4054-a30e-c65650599d02': 'Road Hazards',
  '83b09678-a090-4b08-8123-e316524a0d57': 'Utility Issues',
  'd81dc944-8b65-4a14-96da-fc539e883249': 'Building Problems',
  'e03aeb13-b061-4bf1-b524-2037fdfd948f': 'Environmental Hazards',
  
  // Emergency Situations
  'c3980ed0-46b0-43df-b4d8-fa8a83ce9452': 'Fire & Smoke',
  'e69d5194-4885-47a2-985e-3568e30833dd': 'Medical Emergencies',
  'a6719ffd-b353-4dee-8969-dd917093285d': 'Natural Disasters',
  '3f7adaca-dcf9-4151-88ae-324041a8da30': 'Chemical/Hazmat',
  
  // Wildlife & Nature
  '819a1a14-e6f5-46e4-aefb-daa55e2c0342': 'Dangerous Animals',
  '668fe7c1-401a-4aff-a388-903622651418': 'Animal Welfare',
  '607f0066-5b11-4a06-ac14-5d136bafbcab': 'Environmental Issues',
  '7fbd7375-6352-4b50-b067-19c66c99ba96': 'Pest Problems',
  
  // Community Issues
  '7008ccc5-c376-4963-90f1-40023e943175': 'Noise Complaints',
  '67871bf3-f8e6-4692-8ef3-d1169bf0ed46': 'Traffic Issues',
  '8fc5a6e3-0333-45af-8199-adc37b7acaa9': 'Public Space Problems',
  'f8667a02-8d21-4d85-b207-d6841da18c68': 'Events & Gatherings',
  
  // Pets
  '3dc966d4-e732-4f91-8aa0-3fb00be77265': 'Missing Pets',
  '2dd8cb36-fc5d-4c34-a40f-196fcf79320d': 'Found Pets',
  
  // Lost & Found
  'e23ad345-970c-44bf-9aaa-708a88d23072': 'Lost Items',
  '4c6da291-c786-4212-bc12-c77f16a5e016': 'Found Items'
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
  
  // Extract user ID - prioritize top-level userId from unified API response
  const userId = incident.userId || incident.properties?.reporterId || incident.properties?.userId;
  
  // Return null if empty string or null/undefined
  return userId && userId.trim() !== '' ? userId : null;
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
    // QFES Emergency Services - check GroupedType FIRST for rescue/crash overrides
    const groupedType = incident.GroupedType || incident.properties?.GroupedType;
    if (groupedType) {
      const type = String(groupedType).toLowerCase();
      if (type.includes('rescue') || type.includes('crash')) {
        return { iconName: 'Crash', color: 'text-orange-600' };
      }
    }
    
    // Fall back to subcategory-based icons
    const subcategory = incident.subcategory || incident.properties?.subcategory || '';
    
    // Category-specific icons for QFES incidents
    switch (subcategory) {
      case 'Fire & Smoke':
        return { iconName: 'Flame', color: 'text-red-600' };
      case 'Rescue Operation':
        return { iconName: 'Crash', color: 'text-orange-600' };
      case 'Medical Emergencies':
        return { iconName: 'Heart', color: 'text-green-600' };
      case 'Chemical/Hazmat':
        return { iconName: 'AlertTriangle', color: 'text-yellow-600' };
      case 'Power/Gas Emergency':
        return { iconName: 'Zap', color: 'text-purple-600' };
      case 'Storm/SES':
        return { iconName: 'CloudLightning', color: 'text-blue-600' };
      case 'Public Safety':
        return { iconName: 'Shield', color: 'text-blue-600' };
      default:
        // Default QFES icon for unclassified emergencies
        return { iconName: 'Siren', color: 'text-red-600' };
    }
  }
  
  if (source === 'user') {
    // User Reports - Check SUBCATEGORY first for specific icons
    const subcategoryId = incident.subcategory || incident.properties?.subcategory || '';
    const subcategory = getIncidentSubcategory(incident); // Convert UUID to human name
    
    // Subcategory-specific icons for community reports
    switch (subcategory) {
      // Safety & Crime subcategories
      case 'Violence & Threats':
        return { iconName: 'Shield', color: 'text-red-600' };
      case 'Theft & Property Crime':
        return { iconName: 'ShieldAlert', color: 'text-red-600' };
      case 'Suspicious Activity':
        return { iconName: 'Eye', color: 'text-orange-600' };
      case 'Public Disturbances':
        return { iconName: 'AlertTriangle', color: 'text-yellow-600' };
      
      // Infrastructure & Hazards subcategories
      case 'Road Hazards':
        return { iconName: 'Construction', color: 'text-orange-600' };
      case 'Utility Issues':
        return { iconName: 'Zap', color: 'text-yellow-600' };
      case 'Building Problems':
        return { iconName: 'Building', color: 'text-gray-600' };
      case 'Environmental Hazards':
        return { iconName: 'AlertTriangle', color: 'text-red-600' };
      
      // Emergency Situations subcategories
      case 'Fire & Smoke':
        return { iconName: 'Flame', color: 'text-red-600' };
      case 'Medical Emergencies':
        return { iconName: 'Heart', color: 'text-red-600' };
      case 'Natural Disasters':
        return { iconName: 'CloudLightning', color: 'text-blue-600' };
      case 'Chemical/Hazmat':
        return { iconName: 'AlertTriangle', color: 'text-purple-600' };
      
      // Wildlife & Nature subcategories
      case 'Dangerous Animals':
        return { iconName: 'Bug', color: 'text-red-600' };
      case 'Animal Welfare':
        return { iconName: 'Heart', color: 'text-green-600' };
      case 'Environmental Issues':
        return { iconName: 'Trees', color: 'text-green-600' };
      case 'Pest Problems':
        return { iconName: 'Bug', color: 'text-orange-600' };
      
      // Community Issues subcategories
      case 'Noise Complaints':
        return { iconName: 'Volume2', color: 'text-blue-600' };
      case 'Traffic Issues':
        return { iconName: 'Car', color: 'text-orange-600' };
      case 'Public Space Problems':
        return { iconName: 'MapPin', color: 'text-gray-600' };
      case 'Events & Gatherings':
        return { iconName: 'Users', color: 'text-blue-600' };
      
      // Pets subcategories
      case 'Missing Pets':
        return { iconName: 'Search', color: 'text-orange-600' };
      case 'Found Pets':
        return { iconName: 'CheckCircle', color: 'text-green-600' };
      
      // Lost & Found subcategories
      case 'Lost Items':
        return { iconName: 'Search', color: 'text-orange-600' };
      case 'Found Items':
        return { iconName: 'CheckCircle', color: 'text-green-600' };
    }
    
    // Fall back to category-specific icons if no subcategory match
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