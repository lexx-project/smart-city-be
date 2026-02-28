import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class AgencyService {
    private readonly logger = new Logger(AgencyService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────
    async create(dto: CreateAgencyDto) {
        const existing = await this.prisma.agency.findFirst({
            where: { name: dto.name, deletedAt: null },
        });
        if (existing) {
            throw new ConflictException(`Dinas dengan nama "${dto.name}" sudah ada`);
        }

        const agency = await this.prisma.agency.create({ data: dto });
        this.logger.log(`Agency created: ${agency.name} (${agency.id})`);
        return agency;
    }

    // ─── Read All (with pagination) ───────────────────────────────────
    async findAll(search?: string, page = 1, limit = 10): Promise<PaginatedResult<any>> {
        const where = {
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.agency.findMany({
                where,
                include: {
                    _count: { select: { categories: true, staffUsers: true } },
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.agency.count({ where }),
        ]);

        return paginate(data, total, page, limit);
    }

    // ─── Read One ─────────────────────────────────────────────────────
    async findOne(id: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { id },
            include: {
                categories: {
                    where: { deletedAt: null, isActive: true },
                    select: { id: true, name: true, level: true, parentId: true },
                    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
                },
                staffUsers: {
                    where: { deletedAt: null, isActive: true },
                    select: { id: true, fullName: true, email: true, role: { select: { name: true } } },
                },
                _count: { select: { categories: true, staffUsers: true } },
            },
        });

        if (!agency) throw new NotFoundException(`Agency #${id} tidak ditemukan`);
        return agency;
    }

    // ─── Get categories tree for an agency ───────────────────────────
    async getCategoryTree(agencyId: string) {
        await this.findOne(agencyId); // ensure exists

        const allCategories = await this.prisma.category.findMany({
            where: { agencyId, deletedAt: null, isActive: true },
            orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
        });

        return this.buildTree(allCategories, null);
    }

    // ─── Update ───────────────────────────────────────────────────────
    async update(id: string, dto: UpdateAgencyDto) {
        await this.findOne(id);
        return this.prisma.agency.update({ where: { id }, data: dto });
    }

    // ─── Toggle Active ────────────────────────────────────────────────
    async toggleActive(id: string) {
        const agency = await this.findOne(id);
        return this.prisma.agency.update({
            where: { id },
            data: { isActive: !agency.isActive },
        });
    }

    // ─── Soft Delete ──────────────────────────────────────────────────
    async remove(id: string) {
        await this.findOne(id);
        this.logger.warn(`Agency soft-deleted: ${id}`);
        return this.prisma.agency.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    private buildTree(categories: any[], parentId: string | null): any[] {
        return categories
            .filter((c) => c.parentId === parentId)
            .map((c) => ({
                ...c,
                children: this.buildTree(categories, c.id),
            }));
    }
}
