import { PrismaClient } from '../../generated/prisma/client';

interface SeedCategoriesOptions {
    agencies: { id: string; name: string }[];
}

export async function seedCategories(prisma: PrismaClient, { agencies }: SeedCategoriesOptions) {
    console.log('  → Seeding categories...');

    const mainAgency = agencies.find((a) => a.name.includes('Komunikasi')) ?? agencies[0];
    const dpuprAgency = agencies.find((a) => a.name.includes('Pekerjaan Umum')) ?? agencies[0];
    const dukcapilAgency = agencies.find((a) => a.name.includes('Kependudukan')) ?? agencies[0];
    const dinsosAgency = agencies.find((a) => a.name.includes('Sosial')) ?? agencies[0];

    // Kategori tingkat 0 (Root)
    const rootCategories = [
        {
            agencyId: dpuprAgency.id,
            name: 'Infrastruktur',
            description: 'Laporan seputar infrastruktur publik seperti jalan rusak, jembatan, dan drainase',
            defaultSlaHours: 48,
            level: 0,
            sortOrder: 1,
            isActive: true,
        },
        {
            agencyId: mainAgency.id,
            name: 'Layanan Publik',
            description: 'Kualitas layanan instansi pemerintah, pungli, lambat melayani, dan sejenisnya',
            defaultSlaHours: 24,
            level: 0,
            sortOrder: 2,
            isActive: true,
        },
        {
            agencyId: mainAgency.id,
            name: 'Keamanan & Ketertiban',
            description: 'Laporan terkait keamanan lingkungan, kriminalitas, dan ketertiban umum',
            defaultSlaHours: 12,
            level: 0,
            sortOrder: 3,
            isActive: true,
        },
        {
            agencyId: dukcapilAgency.id,
            name: 'Kependudukan',
            description: 'Layanan administrasi kependudukan seperti KTP, KK, akta kelahiran',
            defaultSlaHours: 72,
            level: 0,
            sortOrder: 4,
            isActive: true,
        },
        {
            agencyId: dinsosAgency.id,
            name: 'Bantuan Sosial',
            description: 'Pengaduan terkait bantuan sosial, BPNT, PKH, dan program sosial lainnya',
            defaultSlaHours: 48,
            level: 0,
            sortOrder: 5,
            isActive: true,
        },
        {
            agencyId: mainAgency.id,
            name: 'Lingkungan Hidup',
            description: 'Laporan terkait kebersihan lingkungan, sampah, polusi, dan kerusakan alam',
            defaultSlaHours: 48,
            level: 0,
            sortOrder: 6,
            isActive: true,
        },
    ];

    const createdRoots: Awaited<ReturnType<typeof prisma.category.create>>[] = [];

    for (const cat of rootCategories) {
        const existing = await prisma.category.findFirst({
            where: { name: cat.name, agencyId: cat.agencyId, level: 0 },
        });

        if (!existing) {
            const created = await prisma.category.create({ data: cat });
            createdRoots.push(created);
            console.log(`     ✓ Category "${cat.name}" created`);
        } else {
            createdRoots.push(existing);
            console.log(`     ~ Category "${cat.name}" already exists, skipped`);
        }
    }

    // Kategori tingkat 1 (Sub-kategori dari Infrastruktur)
    const infraCategory = createdRoots.find((c) => c.name === 'Infrastruktur');
    const layananCategory = createdRoots.find((c) => c.name === 'Layanan Publik');

    if (infraCategory) {
        const subInfra = [
            { name: 'Jalan Rusak', description: 'Laporan kerusakan jalan, berlubang, atau bergelombang', sortOrder: 1, defaultSlaHours: 48 },
            { name: 'Jembatan', description: 'Kerusakan jembatan atau struktur penyeberangan', sortOrder: 2, defaultSlaHours: 72 },
            { name: 'Drainase & Saluran Air', description: 'Banjir akibat drainase tersumbat atau rusak', sortOrder: 3, defaultSlaHours: 36 },
            { name: 'Lampu Jalan', description: 'Lampu jalan mati atau rusak', sortOrder: 4, defaultSlaHours: 24 },
            { name: 'Fasilitas Publik', description: 'Kerusakan taman, halte, atau fasilitas umum lainnya', sortOrder: 5, defaultSlaHours: 48 },
        ];

        for (const sub of subInfra) {
            const existing = await prisma.category.findFirst({
                where: { name: sub.name, parentId: infraCategory.id },
            });

            if (!existing) {
                await prisma.category.create({
                    data: {
                        agencyId: dpuprAgency.id,
                        parentId: infraCategory.id,
                        name: sub.name,
                        description: sub.description,
                        defaultSlaHours: sub.defaultSlaHours,
                        level: 1,
                        sortOrder: sub.sortOrder,
                        isActive: true,
                    },
                });
                console.log(`     ✓ Sub-category "${sub.name}" created`);
            } else {
                console.log(`     ~ Sub-category "${sub.name}" already exists, skipped`);
            }
        }
    }

    if (layananCategory) {
        const subLayanan = [
            { name: 'Pelayanan Lambat', description: 'Pelayanan instansi yang terlalu lambat', sortOrder: 1, defaultSlaHours: 24 },
            { name: 'Pungutan Liar', description: 'Laporan dugaan pungutan liar oleh oknum pegawai', sortOrder: 2, defaultSlaHours: 12 },
            { name: 'Tidak Profesional', description: 'Sikap petugas yang tidak profesional atau tidak ramah', sortOrder: 3, defaultSlaHours: 24 },
        ];

        for (const sub of subLayanan) {
            const existing = await prisma.category.findFirst({
                where: { name: sub.name, parentId: layananCategory.id },
            });

            if (!existing) {
                await prisma.category.create({
                    data: {
                        agencyId: mainAgency.id,
                        parentId: layananCategory.id,
                        name: sub.name,
                        description: sub.description,
                        defaultSlaHours: sub.defaultSlaHours,
                        level: 1,
                        sortOrder: sub.sortOrder,
                        isActive: true,
                    },
                });
                console.log(`     ✓ Sub-category "${sub.name}" created`);
            } else {
                console.log(`     ~ Sub-category "${sub.name}" already exists, skipped`);
            }
        }
    }

    return createdRoots;
}
