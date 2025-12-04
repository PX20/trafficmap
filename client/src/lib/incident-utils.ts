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

// Category UUID to human name mappings based on actual database UUIDs
const CATEGORY_MAPPINGS: Record<string, string> = {
  '5e39584c-de45-45d6-ae4b-a0fb048a70f1': 'Safety & Crime',
  'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e': 'Infrastructure & Hazards',
  '0a250604-2cd7-4a7c-8d98-5567c403e514': 'Emergency Situations',
  '84218599-712d-49c3-8458-7a9153519e5d': 'Wildlife & Nature',
  '0c3251ec-e3aa-4bef-8c17-960d73f8cbdc': 'Community Issues',
  '1f45d947-a688-4fa7-b8bd-e80c9f91a4d9': 'Pets',
  '796a25d1-58b1-444e-8520-7ed8a169b5ad': 'Lost & Found'
};

const SUBCATEGORY_MAPPINGS: Record<string, string> = {
  // Safety & Crime
  '4bf4f9e3-8b4e-4ed7-87f2-df13d92ad598': 'Violence & Threats',
  '14e7c586-54b0-48f7-900a-efe0465afce2': 'Theft & Property Crime',
  'bdf75914-8a51-449c-b63e-905eb36b9ce2': 'Suspicious Activity',
  '782d8d63-6877-4a7f-ac6c-097188c5645c': 'Public Disturbances',
  
  // Infrastructure & Hazards
  '7282c862-0977-472d-a795-b33355fc04a8': 'Road Hazards',
  '32284643-ea49-4b2c-a23a-2a18da14f7d8': 'Utility Issues',
  'a0b701b9-9ed4-4ef9-897f-0cf9d348b3ac': 'Building Problems',
  '72426b0d-b297-4d64-af14-627c4562336a': 'Environmental Hazards',
  
  // Emergency Situations
  '8f4abb73-e944-48c3-98c7-5c96b4f6e57e': 'Fire & Smoke',
  'd10959cd-6da7-4a9a-bc9e-0f27c346b30e': 'Medical Emergencies',
  '4f2ae0bc-65e8-4e76-a045-6ce97f83afda': 'Natural Disasters',
  '1287eadf-5a31-496d-8233-8e879b4ba99d': 'Chemical/Hazmat',
  
  // Wildlife & Nature
  'bbdb5e60-3582-4c33-96c7-3899df86615c': 'Dangerous Animals',
  '3380e790-e3f5-47b8-8409-79523c922720': 'Animal Welfare',
  '017aa46f-1a36-4db4-9d51-87f2bca35442': 'Environmental Issues',
  'be8839dc-58c9-4713-9f5e-aa4fca26ea81': 'Pest Problems',
  
  // Community Issues
  '55c207c9-1e65-4541-9d4d-3c1f48d04c79': 'Noise Complaints',
  '374a4c8c-7c56-4963-b14b-736e461eafcd': 'Traffic Issues',
  '8538f32a-4128-4535-9ae3-66eb2b5f3ca7': 'Public Space Problems',
  'd8af0a90-a3af-4842-a211-772463cbe2e7': 'Events & Gatherings',
  
  // Pets
  '717add8e-7168-4de2-bd06-acb57ac9884d': 'Missing Pets',
  '13745b7c-cdda-40af-a133-d600882ee2d1': 'Found Pets',
  
  // Lost & Found
  '2183c2b4-36cb-4de8-8a6c-36106c0cf426': 'Lost Items',
  'b48cbcb0-5971-44f5-b277-4a0eb06fd52b': 'Found Items'
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
      case '5e39584c-de45-45d6-ae4b-a0fb048a70f1': // Safety & Crime
        return { iconName: 'Shield', color: 'text-red-600' };
      case 'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e': // Infrastructure & Hazards  
        return { iconName: 'Construction', color: 'text-yellow-600' };
      case '0a250604-2cd7-4a7c-8d98-5567c403e514': // Emergency Situations
        return { iconName: 'Zap', color: 'text-red-500' };
      case '84218599-712d-49c3-8458-7a9153519e5d': // Wildlife & Nature
        return { iconName: 'Trees', color: 'text-green-600' };
      case '0c3251ec-e3aa-4bef-8c17-960d73f8cbdc': // Community Issues
        return { iconName: 'Users', color: 'text-blue-600' };
      case '1f45d947-a688-4fa7-b8bd-e80c9f91a4d9': // Pets
        return { iconName: 'Heart', color: 'text-pink-600' };
      case '796a25d1-58b1-444e-8520-7ed8a169b5ad': // Lost & Found
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