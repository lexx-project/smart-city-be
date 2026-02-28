import {
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infra/database/prisma.service';
import { JwtPayload } from 'src/infra/auth/jwt-payload.interface';
import { StaffLoginDto } from './dto/staff-login.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    // ─── Staff Login → JWT ────────────────────────────────────────────
    async staffLogin(dto: StaffLoginDto) {
        // Find active staff by email
        const staff = await this.prisma.staffUser.findFirst({
            where: { email: dto.email, deletedAt: null },
            include: {
                role: { select: { id: true, name: true } },
                agency: { select: { id: true, name: true } },
            },
        });

        if (!staff) {
            throw new UnauthorizedException('Email atau password salah');
        }

        if (!staff.isActive) {
            throw new UnauthorizedException('Akun Anda telah dinonaktifkan');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, staff.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email atau password salah');
        }

        // Build JWT payload
        const payload: JwtPayload = {
            sub: staff.id,
            email: staff.email,
            role: staff.role.name,
            agencyId: staff.agencyId,
        };

        const accessToken = this.jwtService.sign(payload);

        this.logger.log(`Staff login: ${staff.email} (${staff.role.name})`);

        return {
            accessToken,
            tokenType: 'Bearer',
            staff: {
                id: staff.id,
                fullName: staff.fullName,
                email: staff.email,
                role: staff.role.name,
                agency: staff.agency,
            },
        };
    }

    // ─── Validate JWT Payload (used by JwtStrategy) ───────────────────
    async validateStaff(staffId: string) {
        const staff = await this.prisma.staffUser.findUnique({
            where: { id: staffId },
            include: { role: { select: { name: true } } },
        });

        if (!staff || !staff.isActive || staff.deletedAt) {
            throw new UnauthorizedException('Sesi tidak valid');
        }

        return staff;
    }

    // ─── Get current staff profile ────────────────────────────────────
    async getMe(staffId: string) {
        const staff = await this.prisma.staffUser.findUnique({
            where: { id: staffId },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                isActive: true,
                createdAt: true,
                role: { select: { id: true, name: true, description: true } },
                agency: { select: { id: true, name: true } },
            },
        });

        if (!staff) throw new NotFoundException('Staff tidak ditemukan');
        return staff;
    }
}
