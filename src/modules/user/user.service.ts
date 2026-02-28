import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    create(dto: CreateUserDto) {
        return this.prisma.user.create({ data: dto });
    }

    async findAll(search?: string, page = 1, limit = 10): Promise<PaginatedResult<any>> {
        const where = search
            ? {
                OR: [
                    { phoneNumber: { contains: search } },
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : { deletedAt: null };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return paginate(data, total, page, limit);
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException(`User #${id} tidak ditemukan`);
        return user;
    }

    update(id: string, dto: UpdateUserDto) {
        return this.prisma.user.update({ where: { id }, data: dto });
    }

    remove(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
