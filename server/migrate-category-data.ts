import { db } from "./db";
import { unifiedIncidents, categories, subcategories } from "@shared/schema";
import { eq, sql, like } from "drizzle-orm";

/**
 * Migration script to backfill category_uuid and subcategory_uuid for user incidents
 * that have UUIDs stored in the category/subcategory fields instead of human-readable names
 */
export async function migrateCategoryData() {
  console.log("Starting category data migration...");
  
  try {
    // Find all user incidents with UUIDs in category field (contains dashes in UUID pattern)
    const incidentsWithUuidCategories = await db
      .select({
        id: unifiedIncidents.id,
        category: unifiedIncidents.category,
        subcategory: unifiedIncidents.subcategory,
        categoryUuid: unifiedIncidents.categoryUuid,
        subcategoryUuid: unifiedIncidents.subcategoryUuid,
      })
      .from(unifiedIncidents)
      .where(
        sql`${unifiedIncidents.source} = 'user' AND ${unifiedIncidents.category} LIKE '%-%-%-%-%'`
      );

    console.log(`Found ${incidentsWithUuidCategories.length} incidents to migrate`);

    // Get all categories and subcategories for lookup
    const allCategories = await db.select().from(categories);
    const allSubcategories = await db.select().from(subcategories);

    let successCount = 0;
    let errorCount = 0;

    for (const incident of incidentsWithUuidCategories) {
      try {
        // Find category by UUID
        const category = allCategories.find(c => c.id === incident.category);
        
        // Find subcategory by UUID (if exists)
        const subcategory = incident.subcategory 
          ? allSubcategories.find(s => s.id === incident.subcategory)
          : null;

        if (!category) {
          console.warn(`Category UUID not found: ${incident.category} for incident ${incident.id}`);
          errorCount++;
          continue;
        }

        // Update the incident with proper values
        await db
          .update(unifiedIncidents)
          .set({
            category: category.name,
            categoryUuid: category.id,
            subcategory: subcategory?.name || null,
            subcategoryUuid: subcategory?.id || null,
          })
          .where(eq(unifiedIncidents.id, incident.id));

        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`Migrated ${successCount} incidents...`);
        }
      } catch (error) {
        console.error(`Error migrating incident ${incident.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Successfully migrated: ${successCount} incidents`);
    console.log(`Errors: ${errorCount} incidents`);
    
    return { success: successCount, errors: errorCount, total: incidentsWithUuidCategories.length };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCategoryData()
    .then(result => {
      console.log("Migration result:", result);
      process.exit(0);
    })
    .catch(error => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
