import { Body, Controller, Get, Post } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { Public } from 'src/infra/decorators/public.decorator';
import { CurrentUser } from 'src/infra/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * POST /auth/staff/login
     * Public — tidak butuh JWT token
     */
    @Public()
    @Post('staff/login')
    @ApiOperation({
        summary: 'Login staff',
        description:
            'Autentikasi akun staff menggunakan email dan password. Mengembalikan JWT access token yang digunakan untuk mengakses endpoint terproteksi.',
    })
    @ApiResponse({
        status: 200,
        description: 'Login berhasil. Mengembalikan access token dan data profil staff.',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                staff: {
                    id: 'uuid',
                    fullName: 'Budi Santoso',
                    email: 'budi@dinas.go.id',
                    role: { id: 'uuid', name: 'OPERATOR' },
                    agency: { id: 'uuid', name: 'Dinas Perhubungan' },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Email atau password salah.' })
    @ApiResponse({ status: 403, description: 'Akun staff dinonaktifkan.' })
    staffLogin(@Body() dto: StaffLoginDto) {
        return this.authService.staffLogin(dto);
    }

    /**
     * GET /auth/me
     * Protected — butuh Authorization: Bearer <token>
     */
    @Get('me')
    @ApiBearerAuth('jwt-auth')
    @ApiOperation({
        summary: 'Profil sesi aktif',
        description: 'Mengembalikan data profil staff yang sedang login berdasarkan JWT token.',
    })
    @ApiResponse({
        status: 200,
        description: 'Data profil staff berhasil diambil.',
        schema: {
            example: {
                id: 'uuid',
                fullName: 'Budi Santoso',
                email: 'budi@dinas.go.id',
                phone: '081234567890',
                isActive: true,
                role: { id: 'uuid', name: 'OPERATOR' },
                agency: { id: 'uuid', name: 'Dinas Perhubungan' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Token tidak valid atau sudah kadaluarsa.' })
    getMe(@CurrentUser('id') staffId: string) {
        return this.authService.getMe(staffId);
    }
}
