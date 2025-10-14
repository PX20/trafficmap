/**
 * ============================================================================
 * BACKFILL CATEGORY UUIDS FOR TMR AND EMERGENCY INCIDENTS
 * ============================================================================
 * 
 * Migrates existing TMR and Emergency Services incidents to use UUID-based
 * categorization instead of text-only categories.
 * 
 * Usage: npm run db:backfill-api-categories
 */

import { db } from "./db";
import { unifiedIncidents } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { 
  mapTMRCategory, 
  mapTMRSubcategory, 
  mapEmergencyCategory, 
  mapEmergencySubcategory 
} from "./utils/category-mapping";

async function backfillAPICategoryUUIDs() {
  console.log('🔄 Starting category UUID backfill for TMR and Emergency incidents...\n');
  
  try {
    // Fetch all TMR and Emergency incidents
    const apiIncidents = await db
      .select()
      .from(unifiedIncidents)
      .where(or(
        eq(unifiedIncidents.source, 'tmr'),
        eq(unifiedIncidents.source, 'emergency')
      ));
    
    console.log(`📊 Found ${apiIncidents.length} API incidents to process`);
    
    let tmrUpdated = 0;
    let emergencyUpdated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches for better performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < apiIncidents.length; i += BATCH_SIZE) {
      const batch = apiIncidents.slice(i, i + BATCH_SIZE);
      
      // Process each incident in the batch
      const updates = batch.map(async (incident) => {
        try {
          // Skip if already has categoryUuid (already migrated)
          if (incident.categoryUuid) {
            skipped++;
            return null;
          }
          
          let categoryUuid: string | undefined;
          let categoryName: string = incident.category;
          let subcategoryUuid: string | undefined;
          let subcategoryName: string | undefined = incident.subcategory || undefined;
          
          if (incident.source === 'tmr') {
            // Map TMR categories
            const category = mapTMRCategory(incident.category);
            categoryUuid = category.uuid;
            categoryName = category.name;
            
            // Map TMR subcategory if exists
            if (incident.subcategory) {
              const subcategory = mapTMRSubcategory(incident.subcategory);
              if (subcategory) {
                subcategoryUuid = subcategory.uuid;
                subcategoryName = subcategory.name;
              }
            }
            
            tmrUpdated++;
          } else if (incident.source === 'emergency') {
            // Map Emergency categories
            const category = mapEmergencyCategory(incident.category);
            categoryUuid = category.uuid;
            categoryName = category.name;
            
            // Map Emergency subcategory if exists
            if (incident.subcategory) {
              const subcategory = mapEmergencySubcategory(incident.subcategory);
              if (subcategory) {
                subcategoryUuid = subcategory.uuid;
                subcategoryName = subcategory.name;
              }
            }
            
            emergencyUpdated++;
          }
          
          // Update the incident with UUID fields
          if (categoryUuid) {
            return db
              .update(unifiedIncidents)
              .set({
                categoryUuid: categoryUuid,
                category: categoryName,
                subcategoryUuid: subcategoryUuid || incident.subcategoryUuid,
                subcategory: subcategoryName || incident.subcategory,
                updatedAt: new Date()
              })
              .where(eq(unifiedIncidents.id, incident.id));
          }
          
          return null;
        } catch (error) {
          console.error(`❌ Error processing incident ${incident.id}:`, error);
          errors++;
          return null;
        }
      });
      
      // Wait for all updates in the batch to complete
      await Promise.all(updates);
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, apiIncidents.length)} / ${apiIncidents.length} incidents...`);
    }
    
    console.log('\n✅ Backfill complete!');
    console.log(`📊 Results:`);
    console.log(`   - TMR incidents updated: ${tmrUpdated}`);
    console.log(`   - Emergency incidents updated: ${emergencyUpdated}`);
    console.log(`   - Skipped (already migrated): ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
backfillAPICategoryUUIDs()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

export { backfillAPICategoryUUIDs };
