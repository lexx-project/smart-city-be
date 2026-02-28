import { PrismaClient } from '../../generated/prisma/client';

export async function seedChannels(prisma: PrismaClient) {
    console.log('  → Seeding channels...');

    const channels = [
        {
            name: 'WhatsApp',
            provider: 'whatsapp',
            isActive: true,
        },
        {
            name: 'Web Chat',
            provider: 'web',
            isActive: true,
        },
        {
            name: 'Telegram',
            provider: 'telegram',
            isActive: true,
        },
        {
            name: 'Email',
            provider: 'email',
            isActive: false, // Nonaktif secara default, bisa diaktifkan nanti
        },
        {
            name: 'SMS',
            provider: 'sms',
            isActive: false, // Nonaktif secara default
        },
    ];

    const createdChannels: Awaited<ReturnType<typeof prisma.channel.create>>[] = [];

    for (const channel of channels) {
        const existing = await prisma.channel.findFirst({
            where: { provider: channel.provider },
        });

        if (!existing) {
            const created = await prisma.channel.create({ data: channel });
            createdChannels.push(created);
            console.log(`     ✓ Channel "${channel.name}" (${channel.provider}) created`);
        } else {
            createdChannels.push(existing);
            console.log(`     ~ Channel "${channel.name}" already exists, skipped`);
        }
    }

    return createdChannels;
}
