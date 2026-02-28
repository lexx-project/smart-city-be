import { PrismaClient } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';

interface SeedStaffUsersOptions {
    roles: Record<string, { id: string }>;
    agencies: { id: string; name: string }[];
}

export async function seedStaffUsers(prisma: PrismaClient, { roles, agencies }: SeedStaffUsersOptions) {
    console.log('  → Seeding staff users...');

    const SALT_ROUNDS = 12;

    // Ambil agency utama (Diskominfo sebagai pusat)
    const mainAgency = agencies.find((a) => a.name.includes('Komunikasi')) ?? agencies[0];
    const dpuprAgency = agencies.find((a) => a.name.includes('Pekerjaan Umum')) ?? agencies[0];
    const dukcapilAgency = agencies.find((a) => a.name.includes('Kependudukan')) ?? agencies[0];

    const staffData = [
        {
            fullName: 'Super Admin',
            email: 'admin@lpt.go.id',
            phone: '08111000001',
            password: 'Admin@123',
            agencyId: mainAgency.id,
            roleKey: 'ADMIN',
            isActive: true,
        },
        {
            fullName: 'Supervisor Diskominfo',
            email: 'supervisor@lpt.go.id',
            phone: '08111000002',
            password: 'Supervisor@123',
            agencyId: mainAgency.id,
            roleKey: 'SUPERVISOR',
            isActive: true,
        },
        {
            fullName: 'Budi Santoso',
            email: 'budi.santoso@lpt.go.id',
            phone: '08111000003',
            password: 'Staff@123',
            agencyId: mainAgency.id,
            roleKey: 'STAFF',
            isActive: true,
        },
        {
            fullName: 'Siti Rahma',
            email: 'siti.rahma@lpt.go.id',
            phone: '08111000004',
            password: 'Staff@123',
            agencyId: dpuprAgency.id,
            roleKey: 'STAFF',
            isActive: true,
        },
        {
            fullName: 'Ahmad Fauzi',
            email: 'ahmad.fauzi@lpt.go.id',
            phone: '08111000005',
            password: 'Staff@123',
            agencyId: dukcapilAgency.id,
            roleKey: 'STAFF',
            isActive: true,
        },
    ];

    const createdStaff: Awaited<ReturnType<typeof prisma.staffUser.create>>[] = [];

    for (const staff of staffData) {
        const existingUser = await prisma.staffUser.findFirst({
            where: { email: staff.email },
        });

        if (!existingUser) {
            const passwordHash = await bcrypt.hash(staff.password, SALT_ROUNDS);
            const created = await prisma.staffUser.create({
                data: {
                    agencyId: staff.agencyId,
                    roleId: roles[staff.roleKey].id,
                    fullName: staff.fullName,
                    email: staff.email,
                    phone: staff.phone,
                    passwordHash,
                    isActive: staff.isActive,
                },
            });
            createdStaff.push(created);
            console.log(`     ✓ Staff "${staff.fullName}" (${staff.email}) created`);
        } else {
            createdStaff.push(existingUser);
            console.log(`     ~ Staff "${staff.email}" already exists, skipped`);
        }
    }

    console.log('');
    console.log('     📋 Credential Summary:');
    console.log('     ─────────────────────────────────────────────────');
    for (const staff of staffData) {
        console.log(`     [${staff.roleKey.padEnd(10)}] ${staff.email} / ${staff.password}`);
    }
    console.log('     ─────────────────────────────────────────────────');

    return createdStaff;
}
