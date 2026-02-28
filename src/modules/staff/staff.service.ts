import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infra/database/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

const HASH_ROUNDS = 12;

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────
    async create(dto: CreateStaffDto) {
        const existing = await this.prisma.staffUser.findFirst({
            where: { email: dto.email, deletedAt: null },
        });
        if (existing) {
            throw new ConflictException(`Staff dengan email "${dto.email}" sudah terdaftar`);
        }

        const passwordHash = await bcrypt.hash(dto.password, HASH_ROUNDS);

        const staff = await this.prisma.staffUser.create({
            data: {
                agencyId: dto.agencyId,
                roleId: dto.roleId,
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                isActive: dto.isActive ?? true,
            },
            include: {
                agency: { select: { id: true, name: true } },
                role: { select: { id: true, name: true } },
            },
        });

        this.logger.log(`Staff created: ${staff.fullName} (${staff.email})`);

        // Omit passwordHash from response
        const { passwordHash: _, ...result } = staff;
        return result;
    }

    // ─── Read All (with pagination) ───────────────────────────────────
    async findAll(
        filters?: { agencyId?: string; roleId?: string; search?: string },
        page = 1,
        limit = 10,
    ): Promise<PaginatedResult<any>> {
        const where = {
            deletedAt: null,
            ...(filters?.agencyId && { agencyId: filters.agencyId }),
            ...(filters?.roleId && { roleId: filters.roleId }),
            ...(filters?.search && {
                OR: [
                    { fullName: { contains: filters.search, mode: 'insensitive' as const } },
                    { email: { contains: filters.search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.staffUser.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                    agency: { select: { id: true, name: true } },
                    role: { select: { id: true, name: true } },
                },
                orderBy: { fullName: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.staffUser.count({ where }),
        ]);

        return paginate(data, total, page, limit);
    }

    // ─── Read One ─────────────────────────────────────────────────────
    async findOne(id: string) {
        const staff = await this.prisma.staffUser.findUnique({
            where: { id },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                agency: { select: { id: true, name: true } },
                role: { select: { id: true, name: true } },
                assignedTickets: {
                    where: { isActive: true },
                    include: {
                        ticket: { select: { id: true, ticketNumber: true, status: true } },
                    },
                },
            },
        });

        if (!staff) throw new NotFoundException(`Staff #${id} tidak ditemukan`);
        return staff;
    }

    // ─── Update ───────────────────────────────────────────────────────
    async update(id: string, dto: UpdateStaffDto) {
        await this.findOne(id);
        return this.prisma.staffUser.update({
            where: { id },
            data: dto,
            select: {
                id: true, fullName: true, email: true, phone: true,
                isActive: true, updatedAt: true,
            },
        });
    }

    // ─── Change Password ──────────────────────────────────────────────
    async changePassword(id: string, dto: ChangePasswordDto) {
        await this.findOne(id);
        const passwordHash = await bcrypt.hash(dto.newPassword, HASH_ROUNDS);
        await this.prisma.staffUser.update({
            where: { id },
            data: { passwordHash },
        });
        return { message: 'Password berhasil diubah' };
    }

    // ─── Toggle Active ────────────────────────────────────────────────
    async toggleActive(id: string) {
        const staff = await this.prisma.staffUser.findUnique({ where: { id } });
        if (!staff) throw new NotFoundException(`Staff #${id} tidak ditemukan`);
        return this.prisma.staffUser.update({
            where: { id },
            data: { isActive: !staff.isActive },
            select: { id: true, fullName: true, isActive: true },
        });
    }

    // ─── Soft Delete ──────────────────────────────────────────────────
    async remove(id: string) {
        await this.findOne(id);
        this.logger.warn(`Staff soft-deleted: ${id}`);
        return this.prisma.staffUser.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }

    // ─── Roles (dropdown for CMS) ─────────────────────────────────────
    getRoles() {
        return this.prisma.role.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
}
