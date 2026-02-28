import { Module } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { AgencyController } from './agency.controller';
import { PrismaModule } from 'src/infra/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AgencyController],
    providers: [AgencyService],
    exports: [AgencyService],
})
export class AgencyModule { }
