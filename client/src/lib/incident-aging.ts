/**
 * Smart incident aging system - determines how long incidents remain visible
 * and their opacity based on category, severity, and time elapsed
 */

// Standardized two-tier aging system
export const AGING_TIERS = {
  standard: 12, // 12 hours for most incidents
  major: 24     // 24 hours for significant incidents
};

/**
 * Choose aging tier based on incident significance
 */
export function chooseTier(incident: {
  category: string;
  severity?: string;
  status?: string;
  source?: string;
  properties?: any;
}): 'standard' | 'major' {
  // Normalize status for case-insensitive comparison
  const normalizedStatus = incident.status?.toLowerCase();
  const normalizedSeverity = incident.severity?.toLowerCase();
  
  // Major tier for clearly significant incidents
  if (
    // Emergency services with active status
    (incident.source === 'emergency' || incident.source === 'qfes') && normalizedStatus === 'active' ||
    // Multiple vehicles on scene
    incident.properties?.VehiclesOnScene >= 3 ||
    // High impact traffic events
    incident.properties?.impact_type === 'major' ||
    // High/critical severity
    normalizedSeverity === 'high' || normalizedSeverity === 'critical'
  ) {
    return 'major';
  }
  
  // Everything else uses standard tier
  return 'standard';
}


export interface IncidentAgingData {
  agePercentage: number;
  isVisible: boolean;
  timeRemaining: number; // minutes
  shouldAutoHide: boolean;
}

/**
 * Calculate aging data for an incident based on its properties
 */
export function calculateIncidentAging(incident: {
  category: string;
  severity?: string;
  status?: string;
  source?: string;
  lastUpdated: string;
  incidentTime?: string;
  properties?: any;
}, options?: {
  agingSensitivity?: 'normal' | 'extended' | 'disabled';
  showExpiredIncidents?: boolean;
}): IncidentAgingData {
  // Handle aging sensitivity options
  const agingSensitivity = options?.agingSensitivity || 'normal';
  const showExpiredIncidents = options?.showExpiredIncidents || false;
  
  // If aging is disabled, always show indefinitely
  if (agingSensitivity === 'disabled') {
    return {
      agePercentage: 0,
      isVisible: true,
      timeRemaining: Infinity,
      shouldAutoHide: false
    };
  }
  
  // Choose tier and get base TTL hours
  const tier = chooseTier(incident);
  const ttlHours = AGING_TIERS[tier];
  
  // Apply aging sensitivity multiplier
  let sensitivityMultiplier = 1.0;
  if (agingSensitivity === 'extended') {
    sensitivityMultiplier = 1.5; // 50% longer visibility
  }
  
  // Calculate total duration in milliseconds
  const totalDurationHours = ttlHours * sensitivityMultiplier;
  const totalDurationMs = totalDurationHours * 60 * 60 * 1000;
  
  // Calculate time elapsed since incident
  const referenceTime = incident.incidentTime || incident.lastUpdated;
  const timeElapsed = Date.now() - new Date(referenceTime).getTime();
  
  // Calculate age percentage
  const agePercentage = Math.max(0, Math.min(timeElapsed / totalDurationMs, 1.0));
  
  // Calculate time remaining
  const timeRemainingMs = Math.max(0, totalDurationMs - timeElapsed);
  const timeRemainingMinutes = Math.floor(timeRemainingMs / (60 * 1000));
  
  // Determine visibility - auto-hide all incidents past aging duration
  const shouldAutoHide = agePercentage >= 1.0 && !showExpiredIncidents;
  const isVisible = !shouldAutoHide;
  
  return {
    agePercentage,
    isVisible,
    timeRemaining: timeRemainingMinutes,
    shouldAutoHide
  };
}

/**
 * Get aging summary for display in UI
 */
export function getAgingSummary(agingData: IncidentAgingData): string {
  if (!agingData.isVisible) {
    return 'Hidden (expired)';
  }
  
  if (agingData.timeRemaining > 60) {
    const hoursRemaining = Math.floor(agingData.timeRemaining / 60);
    return `${hoursRemaining}h remaining`;
  } else if (agingData.timeRemaining > 0) {
    return `${agingData.timeRemaining}m remaining`;
  } else {
    return 'Expiring soon';
  }
}

/**
 * Check if an incident should be refreshed based on its age
 */
export function shouldRefreshIncident(incident: {
  lastUpdated: string;
  status: string;
}): boolean {
  const timeSinceUpdate = Date.now() - new Date(incident.lastUpdated).getTime();
  const hoursSinceUpdate = timeSinceUpdate / (60 * 60 * 1000);
  
  // Refresh active incidents more frequently
  if (incident.status === 'active') {
    return hoursSinceUpdate > 0.5; // 30 minutes
  }
  
  // Refresh other incidents less frequently
  return hoursSinceUpdate > 2; // 2 hours
}

/**
 * Color interpolation utilities for aging system
 */

// Convert hex color to RGB values
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB values to hex color
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Interpolate between two colors based on percentage (0-1)
export function interpolateColors(color1: string, color2: string, percentage: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    return color1; // fallback to original color if parsing fails
  }
  
  // Clamp percentage to 0-1 range
  const t = Math.max(0, Math.min(1, percentage));
  
  // Linear interpolation for each color component
  const r = rgb1.r + (rgb2.r - rgb1.r) * t;
  const g = rgb1.g + (rgb2.g - rgb1.g) * t;
  const b = rgb1.b + (rgb2.b - rgb1.b) * t;
  
  return rgbToHex(r, g, b);
}

// Get aged color that gradually shifts from original to grey
export function getAgedColor(originalColor: string, agePercentage: number): string {
  const greyColor = '#e5e7eb'; // Light grey color for aged incidents - much more subtle
  
  // Use a smoother curve for color aging - slower at first, faster later
  const colorAgePercentage = Math.pow(agePercentage, 1.5);
  
  return interpolateColors(originalColor, greyColor, colorAgePercentage);
}