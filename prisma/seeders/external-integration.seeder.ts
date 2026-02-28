import { PrismaClient } from '../../generated/prisma/client';

interface SeedExternalIntegrationsOptions {
    agencies: { id: string; name: string }[];
}

export async function seedExternalIntegrations(prisma: PrismaClient, { agencies }: SeedExternalIntegrationsOptions) {
    console.log('  → Seeding external integrations...');

    const mainAgency = agencies.find((a) => a.name.includes('Komunikasi')) ?? agencies[0];
    const dpuprAgency = agencies.find((a) => a.name.includes('Pekerjaan Umum')) ?? agencies[0];
    const dukcapilAgency = agencies.find((a) => a.name.includes('Kependudukan')) ?? agencies[0];

    const integrations = [
        {
            agencyId: dukcapilAgency.id,
            name: 'API Dukcapil',
            serviceType: 'DUKCAPIL',
            endpoint: 'https://api.dukcapil.go.id/v1',
            httpMethod: 'POST',
            authType: 'API_KEY',
            credentials: {
                apiKey: 'YOUR_DUKCAPIL_API_KEY', // Ganti dengan key nyata di .env
            },
            requestSchema: {
                requiredFields: ['nik'],
                optionalFields: ['nama', 'tanggal_lahir'],
            },
            responseSchema: {
                nameField: 'nama_lengkap',
                nikField: 'nik',
                addressField: 'alamat',
            },
            isActive: false, // Nonaktif by default, aktifkan saat key tersedia
            timeout: 15000,
        },
        {
            agencyId: mainAgency.id,
            name: 'API Pajak Daerah',
            serviceType: 'PAJAK',
            endpoint: 'https://api.pajak.go.id/v1/wajib-pajak',
            httpMethod: 'GET',
            authType: 'BEARER',
            credentials: {
                token: 'YOUR_PAJAK_BEARER_TOKEN', // Ganti dengan token nyata di .env
            },
            requestSchema: {
                requiredFields: ['nop'],
                optionalFields: ['tahun'],
            },
            responseSchema: {
                nopField: 'nomor_objek_pajak',
                namaField: 'nama_wajib_pajak',
                nilaiField: 'nilai_pajak',
            },
            isActive: false,
            timeout: 10000,
        },
        {
            agencyId: mainAgency.id,
            name: 'API PDAM (Air Minum)',
            serviceType: 'PDAM',
            endpoint: 'https://api.pdam-local.go.id/pelanggan',
            httpMethod: 'POST',
            authType: 'BASIC',
            credentials: {
                username: 'pdam_user',
                password: 'pdam_pass', // Ganti dengan kredensial nyata
            },
            requestSchema: {
                requiredFields: ['no_pelanggan'],
                optionalFields: [],
            },
            responseSchema: {
                namaField: 'nama',
                alamatField: 'alamat',
                tagihanField: 'tagihan_bulan_ini',
            },
            isActive: false,
            timeout: 10000,
        },
        {
            agencyId: dpuprAgency.id,
            name: 'Sistem Pelaporan DPUPR',
            serviceType: 'INTERNAL',
            endpoint: 'https://silapor.dpupr.go.id/api/laporan',
            httpMethod: 'POST',
            authType: 'API_KEY',
            credentials: {
                apiKey: 'YOUR_DPUPR_API_KEY',
            },
            requestSchema: {
                requiredFields: ['jenis_laporan', 'lokasi', 'deskripsi'],
                optionalFields: ['foto_url', 'koordinat'],
            },
            responseSchema: {
                nomorTiketField: 'nomor_tiket',
                statusField: 'status',
            },
            isActive: false,
            timeout: 10000,
        },
    ];

    const createdIntegrations: Awaited<ReturnType<typeof prisma.externalIntegration.create>>[] = [];

    for (const integration of integrations) {
        const existing = await prisma.externalIntegration.findFirst({
            where: {
                name: integration.name,
                agencyId: integration.agencyId,
            },
        });

        if (!existing) {
            const created = await prisma.externalIntegration.create({ data: integration });
            createdIntegrations.push(created);
            console.log(`     ✓ Integration "${integration.name}" (${integration.serviceType}) created`);
        } else {
            createdIntegrations.push(existing);
            console.log(`     ~ Integration "${integration.name}" already exists, skipped`);
        }
    }

    return createdIntegrations;
}
