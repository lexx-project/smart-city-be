import { PrismaClient } from '../../generated/prisma/client';

export async function seedAgencies(prisma: PrismaClient) {
    console.log('  → Seeding agencies...');

    const agencies = [
        {
            name: 'Dinas Komunikasi dan Informatika',
            description: 'Instansi pusat pengelola sistem layanan publik digital',
            contactEmail: 'diskominfo@pemkot.go.id',
            contactPhone: '02112345678',
            isActive: true,
        },
        {
            name: 'Dinas Pekerjaan Umum',
            description: 'Instansi pengelola infrastruktur publik, jalan, jembatan, dan drainase',
            contactEmail: 'dpupr@pemkot.go.id',
            contactPhone: '02112345679',
            isActive: true,
        },
        {
            name: 'Dinas Kependudukan dan Pencatatan Sipil',
            description: 'Instansi pengelola data kependudukan, KTP, dan akta sipil',
            contactEmail: 'dukcapil@pemkot.go.id',
            contactPhone: '02112345680',
            isActive: true,
        },
        {
            name: 'Dinas Sosial',
            description: 'Instansi pelayanan sosial, bantuan sosial, dan pemberdayaan masyarakat',
            contactEmail: 'dinsos@pemkot.go.id',
            contactPhone: '02112345681',
            isActive: true,
        },
    ];

    const createdAgencies: Awaited<ReturnType<typeof prisma.agency.create>>[] = [];

    for (const agencyData of agencies) {
        // Cek apakah agency sudah ada berdasarkan nama
        const existing = await prisma.agency.findFirst({
            where: { name: agencyData.name },
        });

        if (!existing) {
            const created = await prisma.agency.create({ data: agencyData });
            createdAgencies.push(created);
            console.log(`     ✓ Agency "${agencyData.name}" created`);
        } else {
            createdAgencies.push(existing);
            console.log(`     ~ Agency "${agencyData.name}" already exists, skipped`);
        }
    }

    return createdAgencies;
}
