/**
 * ============================================================================
 * INGESTION ORCHESTRATOR
 * ============================================================================
 * 
 * Central orchestrator for syncing staged events to the posts table.
 * This provides a consistent pattern for all API sources:
 * 
 * 1. Source adapters fetch data and write to staging_events table
 * 2. Orchestrator reads unsynced staging events
 * 3. Orchestrator normalizes and upserts to posts table
 * 4. Marks staging events as synced or records errors
 * 
 * This separation allows:
 * - Different polling intervals per source
 * - Consistent deduplication via (source, sourceId) unique constraint
 * - Error tracking and retry logic
 * - Easy addition of new API sources
 */

import { storage } from "./storage";
import { SYSTEM_USER_IDS, type DataSource, type SelectStagingEvent } from "@shared/schema";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYNC_INTERVAL = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STAGING_RETENTION_DAYS = 3; // Keep staging events for 3 days

// Map data sources to their system user IDs
const SOURCE_USER_MAP: Record<Exclude<DataSource, 'user'>, string> = {
  tmr: SYSTEM_USER_IDS.TMR,
  nsw_live: SYSTEM_USER_IDS.TMR, // TODO: Create NSW user when adding that source
  vic_roads: SYSTEM_USER_IDS.TMR, // TODO: Create VIC user when adding that source
  emergency: SYSTEM_USER_IDS.QFES,
  qfes: SYSTEM_USER_IDS.QFES,
};

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

class IngestionOrchestrator {
  private syncTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isSyncing = false;

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Orchestrator] Already running, skipping start');
      return;
    }

    console.log('[Orchestrator] Starting ingestion orchestrator...');
    this.isRunning = true;

    // Initial sync after short delay
    setTimeout(() => this.syncStagingToPosts(), 5000);

    // Set up recurring sync
    this.syncTimer = setInterval(() => {
      this.syncStagingToPosts();
    }, SYNC_INTERVAL);

    // Set up daily cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldStaging();
    }, CLEANUP_INTERVAL);

    console.log(`[Orchestrator] Started - sync every ${SYNC_INTERVAL / 1000}s, cleanup every ${CLEANUP_INTERVAL / 3600000}h`);
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    console.log('[Orchestrator] Stopped');
  }

  /**
   * Sync unsynced staging events to posts table
   */
  private async syncStagingToPosts(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Orchestrator] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let synced = 0;
    let errors = 0;

    try {
      const unsyncedEvents = await storage.getUnsyncedStagingEvents();
      
      if (unsyncedEvents.length === 0) {
        this.isSyncing = false;
        return; // No events to sync, stay quiet
      }

      console.log(`[Orchestrator] Syncing ${unsyncedEvents.length} staging events to posts...`);

      for (const event of unsyncedEvents) {
        try {
          await this.syncEventToPost(event);
          await storage.markStagingEventSynced(event.id);
          synced++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Orchestrator] Error syncing event ${event.id}:`, errorMessage);
          await storage.markStagingEventError(event.id, errorMessage);
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Orchestrator] Sync complete: ${synced} synced, ${errors} errors (${duration}ms)`);

    } catch (error) {
      console.error('[Orchestrator] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single staging event to posts table
   */
  private async syncEventToPost(event: SelectStagingEvent): Promise<void> {
    const source = event.source as Exclude<DataSource, 'user'>;
    const userId = SOURCE_USER_MAP[source] || SYSTEM_USER_IDS.TMR;

    await storage.upsertPostFromSource(source, event.sourceId, {
      userId,
      title: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      categoryId: event.categoryId ?? undefined,
      subcategoryId: event.subcategoryId ?? undefined,
      geometry: event.geometry ?? undefined,
      centroidLat: event.centroidLat ?? undefined,
      centroidLng: event.centroidLng ?? undefined,
      status: (event.status as 'active' | 'resolved' | 'closed') ?? 'active',
      incidentTime: event.incidentTime ?? undefined,
      expiresAt: event.expiresAt ?? undefined,
      properties: {
        ...(event.properties as object || {}),
        severity: event.severity,
        iconType: this.getIconTypeForSource(source),
      },
    });
  }

  /**
   * Get the appropriate icon type for a data source
   */
  private getIconTypeForSource(source: DataSource): string {
    switch (source) {
      case 'tmr':
      case 'nsw_live':
      case 'vic_roads':
        return 'traffic';
      case 'emergency':
      case 'qfes':
        return 'emergency';
      default:
        return 'incident';
    }
  }

  /**
   * Cleanup old staging events
   */
  private async cleanupOldStaging(): Promise<void> {
    try {
      const deleted = await storage.cleanupOldStagingEvents(STAGING_RETENTION_DAYS);
      if (deleted > 0) {
        console.log(`[Orchestrator] Cleaned up ${deleted} old staging events`);
      }
    } catch (error) {
      console.error('[Orchestrator] Cleanup failed:', error);
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus(): { isRunning: boolean; isSyncing: boolean } {
    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
    };
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let orchestrator: IngestionOrchestrator | null = null;

export function startIngestionOrchestrator(): void {
  if (!orchestrator) {
    orchestrator = new IngestionOrchestrator();
  }
  orchestrator.start();
}

export function stopIngestionOrchestrator(): void {
  if (orchestrator) {
    orchestrator.stop();
  }
}

export function getOrchestratorStatus(): { isRunning: boolean; isSyncing: boolean } {
  return orchestrator?.getStatus() ?? { isRunning: false, isSyncing: false };
}

export { IngestionOrchestrator };
