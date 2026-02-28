import { PartialType } from '@nestjs/swagger';
import { CreateSlaDto } from './create-sla.dto';

export class UpdateSlaDto extends PartialType(CreateSlaDto) { }
