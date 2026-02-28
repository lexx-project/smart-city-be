/**
 * Root Seeder - Orchestrator for all seeders
 *
 * Urutan eksekusi:
 * 1. Roles    → tidak bergantung pada data lain
 * 2. Agencies → tidak bergantung pada data lain
 * 3. Staff Users → membutuhkan roles & agencies
 * 4. Categories  → membutuhkan agencies
 * 5. Channels    → independen
 * 6. SLA Rules   → membutuhkan categories & roles
 * 7. External Integrations → membutuhkan agencies
 */

import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from './role.seeder';
import { seedAgencies } from './agency.seeder';
import { seedStaffUsers } from './staff-user.seeder';
import { seedCategories } from './category.seeder';
import { seedChannels } from './channel.seeder';
import { seedSlaRules } from './sla-rule.seeder';
import { seedExternalIntegrations } from './external-integration.seeder';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({
    adapter,
    log: process.env.SEED_VERBOSE === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
} as any);

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🌱 Smart Public Service - Seeder         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // ─────────────────────────────────────────
    // Step 1: Roles
    // ─────────────────────────────────────────
    console.log('📌 [1/7] Roles');
    const roles = await seedRoles(prisma);
    console.log('');

    // ─────────────────────────────────────────
    // Step 2: Agencies
    // ─────────────────────────────────────────
    console.log('📌 [2/7] Agencies');
    const agencies = await seedAgencies(prisma);
    console.log('');

    // ─────────────────────────────────────────
    // Step 3: Staff Users (termasuk Super Admin)
    // ─────────────────────────────────────────
    console.log('📌 [3/7] Staff Users');
    await seedStaffUsers(prisma, { roles, agencies });
    console.log('');

    // ─────────────────────────────────────────
    // Step 4: Categories
    // ─────────────────────────────────────────
    console.log('📌 [4/7] Categories');
    const categories = await seedCategories(prisma, { agencies });
    console.log('');

    // ─────────────────────────────────────────
    // Step 5: Channels
    // ─────────────────────────────────────────
    console.log('📌 [5/7] Channels');
    await seedChannels(prisma);
    console.log('');

    // ─────────────────────────────────────────
    // Step 6: SLA Rules
    // ─────────────────────────────────────────
    console.log('📌 [6/7] SLA Rules');
    await seedSlaRules(prisma, { categories, roles });
    console.log('');

    // ─────────────────────────────────────────
    // Step 7: External Integrations
    // ─────────────────────────────────────────
    console.log('📌 [7/7] External Integrations');
    await seedExternalIntegrations(prisma, { agencies });
    console.log('');

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       ✅ Seeding completed successfully!          ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
}

main()
    .catch((e) => {
        console.error('');
        console.error('❌ Seeding failed!');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
