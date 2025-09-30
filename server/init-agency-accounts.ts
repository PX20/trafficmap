import { SYSTEM_USER_IDS } from '@shared/schema';
import type { IStorage } from './storage';

/**
 * Initialize system agency user accounts
 * These accounts are used for attribution of official incidents from TMR, QFES, etc.
 * This function ensures they exist in the database, creating them if missing.
 */
export async function initializeAgencyAccounts(storage: IStorage): Promise<void> {
  console.log('[Agency Init] Checking system agency accounts...');
  
  const agencyAccounts = [
    {
      id: SYSTEM_USER_IDS.TMR,
      displayName: 'Transport and Main Roads',
      firstName: 'TMR',
      lastName: 'Queensland',
      accountType: 'business' as const,
      isOfficialAgency: true,
      businessName: 'Transport and Main Roads Queensland',
      businessDescription: 'Official Queensland Government transport and road safety authority',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
    {
      id: SYSTEM_USER_IDS.QFES,
      displayName: 'Queensland Fire and Emergency Services',
      firstName: 'QFES',
      lastName: 'Queensland',
      accountType: 'business' as const,
      isOfficialAgency: true,
      businessName: 'Queensland Fire and Emergency Services',
      businessDescription: 'Official Queensland Government emergency services authority',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
    {
      id: SYSTEM_USER_IDS.QAS,
      displayName: 'Queensland Ambulance Service',
      firstName: 'QAS',
      lastName: 'Queensland',
      accountType: 'business' as const,
      isOfficialAgency: true,
      businessName: 'Queensland Ambulance Service',
      businessDescription: 'Official Queensland Government ambulance and emergency medical services',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
    {
      id: SYSTEM_USER_IDS.QPS,
      displayName: 'Queensland Police Service',
      firstName: 'QPS',
      lastName: 'Queensland',
      accountType: 'business' as const,
      isOfficialAgency: true,
      businessName: 'Queensland Police Service',
      businessDescription: 'Official Queensland Government police service',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
    {
      id: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      displayName: 'Legacy System Archive',
      firstName: 'System',
      lastName: 'Archive',
      accountType: 'regular' as const,
      isOfficialAgency: false,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const account of agencyAccounts) {
    try {
      // Check if account already exists
      const existing = await storage.getUser(account.id);
      
      if (existing) {
        existingCount++;
        console.log(`[Agency Init] ✓ ${account.displayName} account already exists`);
      } else {
        // Create the account
        await storage.createUser(account);
        createdCount++;
        console.log(`[Agency Init] ✓ Created ${account.displayName} account (${account.id})`);
      }
    } catch (error) {
      console.error(`[Agency Init] ✗ Failed to initialize ${account.displayName}:`, error);
    }
  }

  console.log(`[Agency Init] Complete: ${existingCount} existing, ${createdCount} created`);
}
