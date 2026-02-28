import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { paginate, PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────
    async create(dto: CreateCategoryDto) {
        // Validate unique name within same parent & agency
        const existing = await this.prisma.category.findFirst({
            where: {
                agencyId: dto.agencyId,
                parentId: dto.parentId ?? null,
                name: dto.name,
                deletedAt: null,
            },
        });
        if (existing) {
            throw new ConflictException(
                `Kategori "${dto.name}" sudah ada pada level yang sama`,
            );
        }

        // Determine level automatically from parent
        let level = 0;
        if (dto.parentId) {
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) throw new NotFoundException(`Parent category tidak ditemukan`);
            level = parent.level + 1;
        }

        const category = await this.prisma.category.create({
            data: {
                agencyId: dto.agencyId,
                parentId: dto.parentId ?? null,
                name: dto.name,
                description: dto.description,
                defaultSlaHours: dto.defaultSlaHours,
                sortOrder: dto.sortOrder ?? 0,
                level,
                isActive: dto.isActive ?? true,
            },
            include: {
                parent: { select: { id: true, name: true } },
                agency: { select: { id: true, name: true } },
            },
        });

        this.logger.log(`Category created: ${category.name} (level ${level})`);
        return category;
    }

    // ─── Read All (flat list with pagination & optional filters) ────────
    async findAll(
        filters?: {
            agencyId?: string;
            parentId?: string | 'root';
            search?: string;
        },
        page = 1,
        limit = 10,
    ): Promise<PaginatedResult<any>> {
        const whereParentId =
            filters?.parentId === 'root'
                ? null
                : filters?.parentId
                    ? filters.parentId
                    : undefined;

        const where = {
            deletedAt: null,
            ...(filters?.agencyId && { agencyId: filters.agencyId }),
            ...(whereParentId !== undefined && { parentId: whereParentId }),
            ...(filters?.search && {
                name: { contains: filters.search, mode: 'insensitive' as const },
            }),
        };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.category.findMany({
                where,
                include: {
                    agency: { select: { id: true, name: true } },
                    parent: { select: { id: true, name: true } },
                    _count: { select: { children: true, tickets: true } },
                },
                orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
                skip,
                take: limit,
            }),
            this.prisma.category.count({ where }),
        ]);

        return paginate(data, total, page, limit);
    }

    // ─── Read One ─────────────────────────────────────────────────────
    async findOne(id: string) {
        const cat = await this.prisma.category.findUnique({
            where: { id },
            include: {
                agency: { select: { id: true, name: true } },
                parent: { select: { id: true, name: true, level: true } },
                children: {
                    where: { deletedAt: null, isActive: true },
                    orderBy: { sortOrder: 'asc' },
                },
                slaRules: true,
                _count: { select: { children: true, tickets: true } },
            },
        });
        if (!cat) throw new NotFoundException(`Category #${id} tidak ditemukan`);
        return cat;
    }

    // ─── Get full tree for an agency ──────────────────────────────────
    async getTree(agencyId: string) {
        const all = await this.prisma.category.findMany({
            where: { agencyId, deletedAt: null, isActive: true },
            orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
        });
        return this.buildTree(all, null);
    }

    // ─── Update ───────────────────────────────────────────────────────
    async update(id: string, dto: UpdateCategoryDto) {
        await this.findOne(id);

        // Prevent circular parentage
        if (dto.parentId === id) {
            throw new BadRequestException('Kategori tidak bisa menjadi parent dirinya sendiri');
        }

        // Recalculate level if parentId changes
        let level: number | undefined;
        if (dto.parentId !== undefined) {
            if (dto.parentId === null) {
                level = 0;
            } else {
                const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
                if (!parent) throw new NotFoundException(`Parent category tidak ditemukan`);
                level = parent.level + 1;
            }
        }

        return this.prisma.category.update({
            where: { id },
            data: {
                ...dto,
                ...(level !== undefined && { level }),
            },
        });
    }

    // ─── Reorder (update sortOrder) ──────────────────────────────────
    async reorder(items: { id: string; sortOrder: number }[]) {
        await Promise.all(
            items.map((item) =>
                this.prisma.category.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                }),
            ),
        );
        return { message: `${items.length} kategori berhasil diurutkan ulang` };
    }

    // ─── Toggle active ────────────────────────────────────────────────
    async toggleActive(id: string) {
        const cat = await this.findOne(id);
        return this.prisma.category.update({
            where: { id },
            data: { isActive: !cat.isActive },
        });
    }

    // ─── Soft Delete ──────────────────────────────────────────────────
    async remove(id: string) {
        const cat = await this.findOne(id);

        if (cat._count.children > 0) {
            throw new BadRequestException(
                'Hapus semua sub-kategori terlebih dahulu sebelum menghapus kategori ini',
            );
        }
        if (cat._count.tickets > 0) {
            throw new BadRequestException(
                'Kategori ini memiliki tiket terkait dan tidak dapat dihapus',
            );
        }

        return this.prisma.category.update({
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
