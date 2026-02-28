import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('jwt-auth')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('overview')
  @ApiOperation({
    summary: 'Ringkasan KPI dashboard',
    description:
      'Mengambil data KPI ringkasan untuk header dashboard: total tiket, tiket open, tiket overdue, rata-rata waktu penyelesaian, dan persentase SLA compliance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data overview berhasil diambil.',
    schema: {
      example: {
        totalTickets: 1240,
        openTickets: 87,
        overdueTickets: 12,
        resolvedToday: 34,
        avgResolutionHours: 18.5,
        slaComplianceRate: 92.3,
      },
    },
  })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('trend')
  @ApiOperation({
    summary: 'Tren harian tiket',
    description:
      'Mengambil data tren jumlah tiket masuk dan diselesaikan per hari dalam rentang N hari ke belakang. Digunakan untuk chart pada dashboard.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Jumlah hari ke belakang untuk data tren. Default: 7.',
    example: '30',
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: 'Data tren berhasil diambil.',
    schema: {
      example: [
        { date: '2024-01-01', created: 12, resolved: 8 },
        { date: '2024-01-02', created: 15, resolved: 11 },
      ],
    },
  })
  getTrend(@Query('days') days?: string) {
    return this.analyticsService.getTrendData(days ? parseInt(days) : 7);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Breakdown tiket per kategori',
    description:
      'Mengambil statistik jumlah tiket yang dikelompokkan per kategori layanan. Berguna untuk chart donut/pie dan analisis kategori terpopuler.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data breakdown kategori berhasil diambil.',
    schema: {
      example: [
        { categoryId: 'uuid', categoryName: 'Pengaduan Jalan Rusak', count: 234, percentage: 18.9 },
        { categoryId: 'uuid', categoryName: 'Kebersihan Lingkungan', count: 187, percentage: 15.1 },
      ],
    },
  })
  getCategoryBreakdown() {
    return this.analyticsService.getCategoryBreakdown();
  }
}
