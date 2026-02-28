import { PrismaClient } from '../../generated/prisma/client';

interface SeedSlaRulesOptions {
    categories: { id: string; name: string }[];
    roles: Record<string, { id: string }>;
}

export async function seedSlaRules(prisma: PrismaClient, { categories, roles }: SeedSlaRulesOptions) {
    console.log('  → Seeding SLA rules...');

    const supervisorRoleId = roles['SUPERVISOR'].id;

    // Mapping kategori ke aturan SLA
    const slaConfigs = [
        {
            categoryName: 'Infrastruktur',
            maxHours: 48,
            escalationLevel1Hours: 24,
            escalationLevel2Hours: 36,
        },
        {
            categoryName: 'Layanan Publik',
            maxHours: 24,
            escalationLevel1Hours: 8,
            escalationLevel2Hours: 16,
        },
        {
            categoryName: 'Keamanan & Ketertiban',
            maxHours: 12,
            escalationLevel1Hours: 4,
            escalationLevel2Hours: 8,
        },
        {
            categoryName: 'Kependudukan',
            maxHours: 72,
            escalationLevel1Hours: 36,
            escalationLevel2Hours: 54,
        },
        {
            categoryName: 'Bantuan Sosial',
            maxHours: 48,
            escalationLevel1Hours: 24,
            escalationLevel2Hours: 36,
        },
        {
            categoryName: 'Lingkungan Hidup',
            maxHours: 48,
            escalationLevel1Hours: 24,
            escalationLevel2Hours: 36,
        },
    ];

    const createdRules: Awaited<ReturnType<typeof prisma.slaRule.create>>[] = [];

    for (const config of slaConfigs) {
        const category = categories.find((c) => c.name === config.categoryName);

        if (!category) {
            console.log(`     ⚠ Category "${config.categoryName}" not found, SLA rule skipped`);
            continue;
        }

        // Cek apakah SLA rule sudah ada untuk kategori ini
        const existing = await prisma.slaRule.findFirst({
            where: { categoryId: category.id },
        });

        if (!existing) {
            const created = await prisma.slaRule.create({
                data: {
                    categoryId: category.id,
                    maxHours: config.maxHours,
                    escalationLevel1Hours: config.escalationLevel1Hours,
                    escalationLevel2Hours: config.escalationLevel2Hours,
                    escalationRoleId: supervisorRoleId,
                },
            });
            createdRules.push(created);
            console.log(`     ✓ SLA Rule for "${config.categoryName}" created (max: ${config.maxHours}h)`);
        } else {
            createdRules.push(existing);
            console.log(`     ~ SLA Rule for "${config.categoryName}" already exists, skipped`);
        }
    }

    return createdRules;
}
