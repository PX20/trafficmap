/**
 * Agency Information Utilities
 * Handles source information for official government agencies only (tmr/emergency)
 * User reports should use ReporterAttribution component instead
 */

export interface AgencyInfo {
  name: string;
  type: string;
  avatar: string;
  color: string;
  photoUrl?: string | null;
}

/**
 * Returns agency information for official sources only (TMR/Emergency)
 * Returns null for user reports - they should use ReporterAttribution component
 */
export function getAgencyInfo(incident: any): AgencyInfo | null {
  // Only handle official government sources
  const source = incident.source || incident.properties?.source;
  
  if (source === 'tmr') {
    // Government API Feed - Transport and Main Roads
    return { 
      name: 'Transport and Main Roads', 
      type: 'TMR Official', 
      avatar: 'TMR', 
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      photoUrl: null
    };
  }
  
  if (source === 'emergency') {
    // Government API Feed - Emergency Services
    // Determine specific emergency service based on incident data
    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    if (eventType.includes('fire') || eventType.includes('burn') || eventType.includes('hazmat') || description.includes('fire')) {
      return { 
        name: 'Queensland Fire & Emergency', 
        type: 'QFES Official', 
        avatar: 'QFE', 
        color: 'bg-gradient-to-br from-red-500 to-red-600',
        photoUrl: null
      };
    } else if (eventType.includes('police') || eventType.includes('crime') || eventType.includes('traffic enforcement') || description.includes('police')) {
      return { 
        name: 'Queensland Police Service', 
        type: 'QPS Official', 
        avatar: 'QPS', 
        color: 'bg-gradient-to-br from-blue-700 to-blue-800',
        photoUrl: null
      };
    } else if (eventType.includes('medical') || eventType.includes('ambulance') || eventType.includes('cardiac') || description.includes('medical') || description.includes('ambulance')) {
      return { 
        name: 'Queensland Ambulance Service', 
        type: 'QAS Official', 
        avatar: 'QAS', 
        color: 'bg-gradient-to-br from-green-600 to-green-700',
        photoUrl: null
      };
    } else {
      // Default to general emergency services
      return { 
        name: 'Emergency Services Queensland', 
        type: 'ESQ Official', 
        avatar: 'ESQ', 
        color: 'bg-gradient-to-br from-red-500 to-red-600',
        photoUrl: null
      };
    }
  }
  
  // Legacy support for traffic incidents without unified source field
  if (incident.type === 'traffic') {
    return { 
      name: 'Transport and Main Roads', 
      type: 'TMR Official', 
      avatar: 'TMR', 
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      photoUrl: null
    };
  }
  
  // Legacy support for emergency incidents without unified source field
  if (!incident.properties?.userReported && !source) {
    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    if (eventType.includes('fire') || eventType.includes('burn') || eventType.includes('hazmat') || description.includes('fire')) {
      return { 
        name: 'Queensland Fire & Emergency', 
        type: 'QFES Official', 
        avatar: 'QFE', 
        color: 'bg-gradient-to-br from-red-500 to-red-600',
        photoUrl: null
      };
    } else if (eventType.includes('police') || eventType.includes('crime') || eventType.includes('traffic enforcement') || description.includes('police')) {
      return { 
        name: 'Queensland Police Service', 
        type: 'QPS Official', 
        avatar: 'QPS', 
        color: 'bg-gradient-to-br from-blue-700 to-blue-800',
        photoUrl: null
      };
    } else if (eventType.includes('medical') || eventType.includes('ambulance') || eventType.includes('cardiac') || description.includes('medical') || description.includes('ambulance')) {
      return { 
        name: 'Queensland Ambulance Service', 
        type: 'QAS Official', 
        avatar: 'QAS', 
        color: 'bg-gradient-to-br from-green-600 to-green-700',
        photoUrl: null
      };
    } else if (eventType || description) {
      // Has emergency-like data but not clearly categorized
      return { 
        name: 'Emergency Services Queensland', 
        type: 'ESQ Official', 
        avatar: 'ESQ', 
        color: 'bg-gradient-to-br from-red-500 to-red-600',
        photoUrl: null
      };
    }
  }
  
  // Return null for user reports and unknown sources
  // User reports should use ReporterAttribution component instead
  return null;
}

/**
 * Helper function to check if an incident is from an official agency
 */
export function isOfficialAgency(incident: any): boolean {
  return getAgencyInfo(incident) !== null;
}

/**
 * Helper function to check if an incident is a user report
 */
export function isUserReport(incident: any): boolean {
  const source = incident.source || incident.properties?.source;
  return source === 'user' || incident.properties?.userReported === true;
}