import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './infra/decorators/public.decorator';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Endpoint sederhana untuk memastikan server berjalan dengan baik.',
  })
  @ApiResponse({ status: 200, description: 'Server running.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
