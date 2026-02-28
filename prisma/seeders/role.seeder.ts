import { PrismaClient } from '../../generated/prisma/client';

export async function seedRoles(prisma: PrismaClient) {
    console.log('  → Seeding roles...');

    const roles = [
        {
            name: 'ADMIN',
            description: 'Super Administrator dengan akses penuh ke semua fitur sistem',
        },
        {
            name: 'SUPERVISOR',
            description: 'Supervisor yang dapat memantau dan mengelola tiket namun tidak dapat mengubah konfigurasi sistem',
        },
        {
            name: 'STAFF',
            description: 'Staff/Agen yang bertugas membalas dan menangani tiket pengaduan',
        },
    ];

    const createdRoles: Record<string, Awaited<ReturnType<typeof prisma.role.upsert>>> = {};

    for (const role of roles) {
        const created = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: role,
        });
        createdRoles[role.name] = created;
        console.log(`     ✓ Role "${role.name}" seeded`);
    }

    return createdRoles;
}
