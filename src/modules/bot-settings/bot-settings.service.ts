import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';

@Injectable()
export class BotSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.botSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return settings.reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  async upsertSetting(key: string, value: string, description?: string) {
    const existing = await this.prisma.botSetting.findUnique({
      where: { key },
    });

    if (!existing) {
      return this.prisma.botSetting.create({
        data: {
          key,
          value,
          description: description ?? null,
        },
      });
    }

    const data: { value: string; description?: string | null } = { value };

    // Jika description tidak dikirim, pertahankan deskripsi lama.
    if (description !== undefined) {
      data.description = description;
    }

    return this.prisma.botSetting.update({
      where: { key },
      data,
    });
  }

  async getAllAdmins() {
    return this.prisma.botAdmin.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { phoneNumber: 'asc' }],
    });
  }

  async addAdmin(phoneNumber: string, name?: string) {
    const existing = await this.prisma.botAdmin.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(`Admin dengan nomor ${phoneNumber} sudah aktif`);
      }

      return this.prisma.botAdmin.update({
        where: { phoneNumber },
        data: {
          isActive: true,
          ...(name !== undefined ? { name } : {}),
        },
      });
    }

    return this.prisma.botAdmin.create({
      data: {
        phoneNumber,
        name: name ?? null,
        isActive: true,
      },
    });
  }

  async removeAdmin(phoneNumber: string) {
    const existing = await this.prisma.botAdmin.findUnique({
      where: { phoneNumber },
    });

    if (!existing) {
      throw new NotFoundException(`Admin dengan nomor ${phoneNumber} tidak ditemukan`);
    }

    if (!existing.isActive) {
      return {
        message: 'Admin sudah nonaktif',
        phoneNumber,
      };
    }

    await this.prisma.botAdmin.update({
      where: { phoneNumber },
      data: { isActive: false },
    });

    return {
      message: 'Admin berhasil dinonaktifkan',
      phoneNumber,
    };
  }
}
