/**
 * ============================================================================
 * CATEGORY MAPPING UTILITIES
 * ============================================================================
 * 
 * Maps external API text categories to internal UUID-based categories.
 * Ensures consistent categorization across TMR, QFES, and user reports.
 * 
 * Database Tables:
 * - categories: Primary categories with UUIDs
 * - subcategories: Subcategories linked to categories
 */

// ============================================================================
// CATEGORY UUIDS (from database categories table)
// ============================================================================

export const CATEGORY_UUIDS = {
  COMMUNITY: 'deaca906-3561-4f80-b79f-ed99561c3b04',
  EMERGENCY: '54d31da5-fc10-4ad2-8eca-04bac680e668',
  INFRASTRUCTURE: '9b1d58d9-cfd1-4c31-93e9-754276a5f265',
  LOST_FOUND: 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3',
  PETS: '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0',
  SAFETY_CRIME: '792759f4-1b98-4665-b14c-44a54e9969e9',
  WILDLIFE: 'd03f47a9-10fb-4656-ae73-92e959d7566a'
} as const;

// ============================================================================
// SUBCATEGORY UUIDS (from database subcategories table)
// ============================================================================

export const SUBCATEGORY_UUIDS = {
  // Emergency Situations subcategories
  CHEMICAL_HAZMAT: '3f7adaca-dcf9-4151-88ae-324041a8da30',
  FIRE_SMOKE: 'c3980ed0-46b0-43df-b4d8-fa8a83ce9452',
  MEDICAL_EMERGENCIES: 'e69d5194-4885-47a2-985e-3568e30833dd',
  NATURAL_DISASTERS: 'a6719ffd-b353-4dee-8969-dd917093285d',
  
  // Safety & Crime subcategories
  PUBLIC_DISTURBANCES: 'e39e8d3f-4358-4a91-ac09-38dbb25d4832',
  SUSPICIOUS_ACTIVITY: '7b1ba0b9-b9d5-437e-a106-886f96660f99',
  THEFT_PROPERTY: 'e6a187d7-428b-47e6-a2d0-617db1963aee',
  VIOLENCE_THREATS: '97a99d33-f10a-4391-b22f-78631eff8805',
  
  // Infrastructure & Hazards subcategories
  BUILDING_PROBLEMS: 'd81dc944-8b65-4a14-96da-fc539e883249',
  ENVIRONMENTAL_HAZARDS: 'e03aeb13-b061-4bf1-b524-2037fdfd948f',
  ROAD_HAZARDS: 'ca42fc3b-9ac1-4054-a30e-c65650599d02',
  UTILITY_ISSUES: '83b09678-a090-4b08-8123-e316524a0d57',
  
  // Wildlife & Nature subcategories
  ANIMAL_WELFARE: '668fe7c1-401a-4aff-a388-903622651418',
  DANGEROUS_ANIMALS: '819a1a14-e6f5-46e4-aefb-daa55e2c0342',
  ENVIRONMENTAL_ISSUES: '607f0066-5b11-4a06-ac14-5d136bafbcab',
  PEST_PROBLEMS: '7fbd7375-6352-4b50-b067-19c66c99ba96',
  
  // Lost & Found subcategories
  FOUND_ITEMS: '4c6da291-c786-4212-bc12-c77f16a5e016',
  FOUND_PETS_LOST: '0ed39343-bf5f-48ea-829a-fb6ae6be77fd',
  
  // Pets subcategories
  FOUND_PETS: '2dd8cb36-fc5d-4c34-a40f-196fcf79320d',
  MISSING_PETS: '3dc966d4-e732-4f91-8aa0-3fb00be77265'
} as const;

// ============================================================================
// TMR CATEGORY MAPPING
// ============================================================================

/**
 * Maps TMR traffic event categories to internal UUIDs
 * TMR uses 'traffic' as the primary category
 */
export function mapTMRCategory(tmrCategory: string): { uuid: string; name: string } {
  // All TMR events are traffic-related, map to Infrastructure & Hazards
  return {
    uuid: CATEGORY_UUIDS.INFRASTRUCTURE,
    name: 'Infrastructure & Hazards'
  };
}

/**
 * Maps TMR subcategories (event types) to subcategory UUIDs
 */
export function mapTMRSubcategory(tmrSubcategory: string): { uuid: string; name: string } | null {
  const normalized = tmrSubcategory.toLowerCase().trim();
  
  // Map ALL TMR subcategories to Road Hazards (most appropriate)
  // TMR subcategories include: congestion, other, road-closure, heavy-delays, 
  // moderate-delays, incident, roadwork, accident
  if (normalized.includes('road') || normalized.includes('closure') || 
      normalized.includes('delay') || normalized.includes('incident') || 
      normalized.includes('roadwork') || normalized.includes('hazard') ||
      normalized.includes('congestion') || normalized.includes('other') ||
      normalized.includes('accident')) {
    return {
      uuid: SUBCATEGORY_UUIDS.ROAD_HAZARDS,
      name: 'Road Hazards'
    };
  }
  
  // Log truly unmapped TMR subcategory (shouldn't happen with above coverage)
  if (normalized && normalized !== 'undefined' && normalized !== 'null') {
    logUnmappedCategory('tmr', 'traffic', normalized);
  }
  
  // Fallback to Road Hazards for any TMR event
  return {
    uuid: SUBCATEGORY_UUIDS.ROAD_HAZARDS,
    name: 'Road Hazards'
  };
}

// ============================================================================
// EMERGENCY SERVICES (QFES) CATEGORY MAPPING
// ============================================================================

/**
 * Maps Emergency Services categories to internal UUIDs
 * QFES already uses the Emergency Situations UUID
 */
export function mapEmergencyCategory(emergencyCategory: string): { uuid: string; name: string } {
  // All QFES incidents are emergencies
  return {
    uuid: CATEGORY_UUIDS.EMERGENCY,
    name: 'Emergency Situations'
  };
}

/**
 * Maps Emergency Services subcategories (incident types) to subcategory UUIDs
 */
export function mapEmergencySubcategory(emergencySubcategory: string): { uuid: string; name: string } | null {
  const normalized = emergencySubcategory.toLowerCase().trim();
  
  // Fire & Smoke
  if (normalized.includes('fire') || normalized.includes('smoke') || 
      normalized.includes('burning') || normalized.includes('alarm')) {
    return {
      uuid: SUBCATEGORY_UUIDS.FIRE_SMOKE,
      name: 'Fire & Smoke'
    };
  }
  
  // Medical Emergencies
  if (normalized.includes('medical') || normalized.includes('ambulance') || 
      normalized.includes('injury') || normalized.includes('rescue') ||
      normalized.includes('crash') || normalized.includes('accident')) {
    return {
      uuid: SUBCATEGORY_UUIDS.MEDICAL_EMERGENCIES,
      name: 'Medical Emergencies'
    };
  }
  
  // Chemical/Hazmat
  if (normalized.includes('chemical') || normalized.includes('hazmat') || 
      normalized.includes('gas') || normalized.includes('spill')) {
    return {
      uuid: SUBCATEGORY_UUIDS.CHEMICAL_HAZMAT,
      name: 'Chemical/Hazmat'
    };
  }
  
  // Natural Disasters
  if (normalized.includes('flood') || normalized.includes('storm') || 
      normalized.includes('disaster') || normalized.includes('weather')) {
    return {
      uuid: SUBCATEGORY_UUIDS.NATURAL_DISASTERS,
      name: 'Natural Disasters'
    };
  }
  
  // Log unmapped emergency subcategory
  if (normalized && normalized !== 'undefined' && normalized !== 'null') {
    logUnmappedCategory('emergency', 'Emergency Situations', normalized);
  }
  
  // Default to Fire & Smoke for unknown emergency types
  return {
    uuid: SUBCATEGORY_UUIDS.FIRE_SMOKE,
    name: 'Fire & Smoke'
  };
}

// ============================================================================
// CATEGORY NAME LOOKUPS (for displaying human-readable names)
// ============================================================================

export const CATEGORY_NAMES: Record<string, string> = {
  [CATEGORY_UUIDS.COMMUNITY]: 'Community Issues',
  [CATEGORY_UUIDS.EMERGENCY]: 'Emergency Situations',
  [CATEGORY_UUIDS.INFRASTRUCTURE]: 'Infrastructure & Hazards',
  [CATEGORY_UUIDS.LOST_FOUND]: 'Lost & Found',
  [CATEGORY_UUIDS.PETS]: 'Pets',
  [CATEGORY_UUIDS.SAFETY_CRIME]: 'Safety & Crime',
  [CATEGORY_UUIDS.WILDLIFE]: 'Wildlife & Nature'
};

export const SUBCATEGORY_NAMES: Record<string, string> = {
  [SUBCATEGORY_UUIDS.CHEMICAL_HAZMAT]: 'Chemical/Hazmat',
  [SUBCATEGORY_UUIDS.FIRE_SMOKE]: 'Fire & Smoke',
  [SUBCATEGORY_UUIDS.MEDICAL_EMERGENCIES]: 'Medical Emergencies',
  [SUBCATEGORY_UUIDS.NATURAL_DISASTERS]: 'Natural Disasters',
  [SUBCATEGORY_UUIDS.PUBLIC_DISTURBANCES]: 'Public Disturbances',
  [SUBCATEGORY_UUIDS.SUSPICIOUS_ACTIVITY]: 'Suspicious Activity',
  [SUBCATEGORY_UUIDS.THEFT_PROPERTY]: 'Theft & Property Crime',
  [SUBCATEGORY_UUIDS.VIOLENCE_THREATS]: 'Violence & Threats',
  [SUBCATEGORY_UUIDS.BUILDING_PROBLEMS]: 'Building Problems',
  [SUBCATEGORY_UUIDS.ENVIRONMENTAL_HAZARDS]: 'Environmental Hazards',
  [SUBCATEGORY_UUIDS.ROAD_HAZARDS]: 'Road Hazards',
  [SUBCATEGORY_UUIDS.UTILITY_ISSUES]: 'Utility Issues',
  [SUBCATEGORY_UUIDS.ANIMAL_WELFARE]: 'Animal Welfare',
  [SUBCATEGORY_UUIDS.DANGEROUS_ANIMALS]: 'Dangerous Animals',
  [SUBCATEGORY_UUIDS.ENVIRONMENTAL_ISSUES]: 'Environmental Issues',
  [SUBCATEGORY_UUIDS.PEST_PROBLEMS]: 'Pest Problems',
  [SUBCATEGORY_UUIDS.FOUND_ITEMS]: 'Found Items',
  [SUBCATEGORY_UUIDS.FOUND_PETS_LOST]: 'Found Pets',
  [SUBCATEGORY_UUIDS.FOUND_PETS]: 'Found Pets',
  [SUBCATEGORY_UUIDS.MISSING_PETS]: 'Missing Pets'
};

// ============================================================================
// VALIDATION & LOGGING
// ============================================================================

/**
 * Validates and logs unmapped categories for monitoring
 */
export function logUnmappedCategory(source: 'tmr' | 'emergency', category: string, subcategory?: string) {
  console.warn(`⚠️ Unmapped ${source} category detected:`, {
    category,
    subcategory,
    timestamp: new Date().toISOString()
  });
}

/**
 * Helper to get category name from UUID
 */
export function getCategoryName(uuid: string): string {
  return CATEGORY_NAMES[uuid] || uuid;
}

/**
 * Helper to get subcategory name from UUID
 */
export function getSubcategoryName(uuid: string): string {
  return SUBCATEGORY_NAMES[uuid] || uuid;
}
