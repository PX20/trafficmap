import { db } from './db';
import { unifiedIncidents } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Migration script to backfill category_uuid and subcategory_uuid columns
 * in the unified_incidents table from existing string values
 */

// Helper to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Category name to UUID mapping (from categories table)
const CATEGORY_UUID_MAP: Record<string, string> = {
  'Wildlife & Nature': 'd03f47a9-10fb-4656-ae73-92e959d7566a',
  'Safety & Crime': '792759f4-1b98-4665-b14c-44a54e9969e9',
  'Infrastructure & Hazards': '9b1d58d9-39d4-4fb1-a9b8-e1b1f8e62f25',
  'Emergency Situations': '54d31da5-fc10-4ad2-8eca-04bac680e668',
  'Pets': '4ea3a6f0-c3e6-4e88-a29f-dc61e4b8a0fd',
  'Community Issues': 'deaca906-6b22-41ec-9dd3-89ad2a71aef1',
  'Lost & Found': 'd1dfcd4e-8cfe-4278-a51b-2b0b0e919f8a',
  // Legacy string values from TMR/Emergency ingestion
  'traffic': '9b1d58d9-39d4-4fb1-a9b8-e1b1f8e62f25', // Maps to Infrastructure & Hazards
  'fire': '54d31da5-fc10-4ad2-8eca-04bac680e668', // Maps to Emergency Situations
  'emergency': '54d31da5-fc10-4ad2-8eca-04bac680e668', // Maps to Emergency Situations
};

// Reverse mapping: UUID to human-readable name (for fixing corrupted data)
const UUID_TO_CATEGORY_NAME: Record<string, string> = {
  'd03f47a9-10fb-4656-ae73-92e959d7566a': 'Wildlife & Nature',
  '792759f4-1b98-4665-b14c-44a54e9969e9': 'Safety & Crime',
  '9b1d58d9-39d4-4fb1-a9b8-e1b1f8e62f25': 'Infrastructure & Hazards',
  '54d31da5-fc10-4ad2-8eca-04bac680e668': 'Emergency Situations',
  '4ea3a6f0-c3e6-4e88-a29f-dc61e4b8a0fd': 'Pets',
  'deaca906-6b22-41ec-9dd3-89ad2a71aef1': 'Community Issues',
  'd1dfcd4e-8cfe-4278-a51b-2b0b0e919f8a': 'Lost & Found',
  // Handle wrong UUIDs from corrupted data
  '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0': 'Pets', // Old/wrong Pets UUID
};

// Subcategory name to UUID mapping (from subcategories table)
const SUBCATEGORY_UUID_MAP: Record<string, string> = {
  // Safety & Crime subcategories
  'Violence & Threats': '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
  'Theft & Property Crime': '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
  'Suspicious Activity': '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
  'Public Disturbances': '4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
  
  // Infrastructure & Hazards subcategories
  'Road Hazards': '5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t',
  'Utility Issues': '6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u',
  'Building Problems': '7g8h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v',
  'Environmental Hazards': '8h9i0j1k-2l3m-4n5o-6p7q-8r9s0t1u2v3w',
  
  // Emergency Situations subcategories
  'Fire & Smoke': '9i0j1k2l-3m4n-5o6p-7q8r-9s0t1u2v3w4x',
  'Medical Emergencies': '0j1k2l3m-4n5o-6p7q-8r9s-0t1u2v3w4x5y',
  'Natural Disasters': '1k2l3m4n-5o6p-7q8r-9s0t-1u2v3w4x5y6z',
  'Chemical/Hazmat': '2l3m4n5o-6p7q-8r9s-0t1u-2v3w4x5y6z7a',
  
  // Wildlife & Nature subcategories
  'Dangerous Animals': '3m4n5o6p-7q8r-9s0t-1u2v-3w4x5y6z7a8b',
  'Animal Welfare': '4n5o6p7q-8r9s-0t1u-2v3w-4x5y6z7a8b9c',
  'Environmental Issues': '5o6p7q8r-9s0t-1u2v-3w4x-5y6z7a8b9c0d',
  'Pest Problems': '6p7q8r9s-0t1u-2v3w-4x5y-6z7a8b9c0d1e',
  
  // Community Issues subcategories
  'Noise Complaints': '7q8r9s0t-1u2v-3w4x-5y6z-7a8b9c0d1e2f',
  'Traffic Issues': '8r9s0t1u-2v3w-4x5y-6z7a-8b9c0d1e2f3g',
  'Public Space Problems': '9s0t1u2v-3w4x-5y6z-7a8b-9c0d1e2f3g4h',
  'Events & Gatherings': '0t1u2v3w-4x5y-6z7a-8b9c-0d1e2f3g4h5i',
  
  // Pets subcategories
  'Missing Pets': '1u2v3w4x-5y6z-7a8b-9c0d-1e2f3g4h5i6j',
  'Found Pets': '2v3w4x5y-6z7a-8b9c-0d1e-2f3g4h5i6j7k',
  
  // Lost & Found subcategories
  'Lost Items': '3w4x5y6z-7a8b-9c0d-1e2f-3g4h5i6j7k8l',
  'Found Items': '4x5y6z7a-8b9c-0d1e-2f3g-4h5i6j7k8l9m',
};

export async function migrateUnifiedIncidents() {
  console.log('🔄 Starting unified incidents UUID migration...');
  
  try {
    // Get all incidents that need migration (where category_uuid or subcategory_uuid is null)
    const incidents = await db
      .select()
      .from(unifiedIncidents)
      .where(sql`category_uuid IS NULL OR subcategory_uuid IS NULL`);
    
    console.log(`📊 Found ${incidents.length} incidents to migrate`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Update each incident
    for (const incident of incidents) {
      try {
        const updates: any = {};
        
        // Handle category field - could contain UUID or name
        if (!incident.categoryUuid && incident.category) {
          if (isUUID(incident.category)) {
            // Category field contains UUID (corrupted data) - fix it!
            updates.categoryUuid = incident.category;
            const categoryName = UUID_TO_CATEGORY_NAME[incident.category];
            if (categoryName) {
              updates.category = categoryName; // Fix the display name
            }
          } else {
            // Category field contains name - map to UUID
            const categoryUuid = CATEGORY_UUID_MAP[incident.category];
            if (categoryUuid) {
              updates.categoryUuid = categoryUuid;
            }
          }
        }
        
        // Map subcategory to UUID if not already set
        if (!incident.subcategoryUuid && incident.subcategory) {
          const subcategoryUuid = SUBCATEGORY_UUID_MAP[incident.subcategory];
          if (subcategoryUuid) {
            updates.subcategoryUuid = subcategoryUuid;
          } else {
            console.warn(`⚠️  No UUID mapping for subcategory: ${incident.subcategory} (incident: ${incident.id})`);
          }
        }
        
        // Only update if we have changes
        if (Object.keys(updates).length > 0) {
          await db
            .update(unifiedIncidents)
            .set(updates)
            .where(sql`id = ${incident.id}`);
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`✅ Migrated ${updated} incidents...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error migrating incident ${incident.id}:`, error);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('✅ Migration complete!');
    
    return { updated, skipped, errors };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUnifiedIncidents()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
