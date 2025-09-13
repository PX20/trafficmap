/**
 * Smart incident aging system - determines how long incidents remain visible
 * and their opacity based on category, severity, and time elapsed
 */

export interface AgingConfig {
  baseDurationHours: number;
  severityMultiplier: number;
  maxOpacity: number;
  minOpacity: number;
}

// Define aging configurations for different incident types
export const AGING_CONFIGS: Record<string, AgingConfig> = {
  // Critical Priority - Stay visible longest (24+ hours)
  'fire': {
    baseDurationHours: 24,
    severityMultiplier: 2.0,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  'medical': {
    baseDurationHours: 24,
    severityMultiplier: 2.0,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  'rescue': {
    baseDurationHours: 24,
    severityMultiplier: 2.0,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  
  // High Priority - Medium aging (8-12 hours)
  'crime': {
    baseDurationHours: 12,
    severityMultiplier: 1.5,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  'traffic': {
    baseDurationHours: 4,
    severityMultiplier: 1.2,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  'emergency': {
    baseDurationHours: 12,
    severityMultiplier: 1.5,
    maxOpacity: 1.0,
    minOpacity: 0.15
  },
  
  // Standard Priority - Normal aging (3-6 hours)
  'wildlife': {
    baseDurationHours: 6,
    severityMultiplier: 1.2,
    maxOpacity: 0.9,
    minOpacity: 0.1
  },
  'community': {
    baseDurationHours: 4,
    severityMultiplier: 1.1,
    maxOpacity: 0.8,
    minOpacity: 0.1
  },
  'safety': {
    baseDurationHours: 6,
    severityMultiplier: 1.3,
    maxOpacity: 0.9,
    minOpacity: 0.1
  },
  
  // Low Priority - Quick aging (1-3 hours)
  'pets': {
    baseDurationHours: 3,
    severityMultiplier: 1.0,
    maxOpacity: 0.7,
    minOpacity: 0.05
  },
  'lost-found': {
    baseDurationHours: 2,
    severityMultiplier: 1.0,
    maxOpacity: 0.6,
    minOpacity: 0.05
  },
  
  // Default for unknown categories
  'default': {
    baseDurationHours: 4,
    severityMultiplier: 1.2,
    maxOpacity: 0.8,
    minOpacity: 0.1
  }
};

// Severity multipliers
export const SEVERITY_MULTIPLIERS = {
  'critical': 2.0,
  'high': 1.5,
  'medium': 1.0,
  'low': 0.7
};

// Status adjustments
export const STATUS_ADJUSTMENTS = {
  'active': 1.0,
  'monitoring': 0.8,
  'resolved': 0.3,
  'closed': 0.1
};

export interface IncidentAgingData {
  opacity: number;
  isVisible: boolean;
  agePercentage: number;
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
  
  // If aging is disabled, always show at full opacity
  if (agingSensitivity === 'disabled') {
    return {
      opacity: 1.0,
      isVisible: true,
      agePercentage: 0,
      timeRemaining: Infinity,
      shouldAutoHide: false
    };
  }
  
  // Get aging configuration for this category
  const config = AGING_CONFIGS[incident.category] || AGING_CONFIGS.default;
  
  // Calculate base duration with severity multiplier
  const severityMultiplier = SEVERITY_MULTIPLIERS[incident.severity as keyof typeof SEVERITY_MULTIPLIERS] || 1.0;
  const statusAdjustment = STATUS_ADJUSTMENTS[incident.status as keyof typeof STATUS_ADJUSTMENTS] || 1.0;
  
  // Check for special conditions that extend visibility
  let extendedMultiplier = 1.0;
  
  // Emergency services with multiple vehicles get extended time
  if (incident.properties?.VehiclesOnScene >= 3 || incident.properties?.VehiclesOnRoute >= 3) {
    extendedMultiplier *= 1.5;
  }
  
  // High-impact traffic events get extended time
  if (incident.category === 'traffic' && incident.properties?.impact_type === 'major') {
    extendedMultiplier *= 1.3;
  }
  
  // Community-verified reports get longer visibility
  if (incident.properties?.verificationStatus === 'community_verified') {
    extendedMultiplier *= 1.2;
  }
  
  // Apply aging sensitivity multiplier
  let sensitivityMultiplier = 1.0;
  if (agingSensitivity === 'extended') {
    sensitivityMultiplier = 1.5; // 50% longer visibility
  }
  
  // Calculate total duration in milliseconds
  const totalDurationHours = config.baseDurationHours * 
                            config.severityMultiplier * 
                            severityMultiplier * 
                            statusAdjustment * 
                            extendedMultiplier * 
                            sensitivityMultiplier;
  
  const totalDurationMs = totalDurationHours * 60 * 60 * 1000;
  
  // Calculate time elapsed since incident
  const referenceTime = incident.incidentTime || incident.lastUpdated;
  const timeElapsed = Date.now() - new Date(referenceTime).getTime();
  
  // Calculate age percentage
  const agePercentage = Math.min(timeElapsed / totalDurationMs, 1.0);
  
  // Calculate opacity based on age with proper 5-stage scaling
  let opacity = config.maxOpacity;
  
  if (agePercentage > 0.9) {
    // 90-100%: Very low opacity (15% stage)
    opacity = config.maxOpacity * 0.15;
  } else if (agePercentage > 0.75) {
    // 75-90%: Low opacity (35% stage)
    opacity = config.maxOpacity * 0.35;
  } else if (agePercentage > 0.5) {
    // 50-75%: Medium opacity (60% stage)
    opacity = config.maxOpacity * 0.6;
  } else if (agePercentage > 0.25) {
    // 25-50%: High opacity (85% stage)
    opacity = config.maxOpacity * 0.85;
  }
  // 0-25%: Full opacity (100% stage)
  
  // Apply minimum opacity floor only for the 15% stage
  opacity = Math.max(opacity, config.minOpacity);
  
  // Calculate time remaining
  const timeRemainingMs = Math.max(0, totalDurationMs - timeElapsed);
  const timeRemainingMinutes = Math.floor(timeRemainingMs / (60 * 1000));
  
  // Clamp age percentage to valid range
  const clampedAgePercentage = Math.max(0, Math.min(agePercentage, 1.0));
  
  // Determine if incident should be hidden - auto-hide all incidents past aging duration
  const shouldAutoHide = clampedAgePercentage >= 1.0 && !showExpiredIncidents;
  const isVisible = !shouldAutoHide && opacity > 0.05;
  
  return {
    opacity,
    isVisible,
    agePercentage: clampedAgePercentage,
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