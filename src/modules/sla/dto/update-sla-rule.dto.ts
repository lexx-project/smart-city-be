import { PartialType } from '@nestjs/swagger';
import { CreateSlaRuleDto } from './create-sla-rule.dto';

export class UpdateSlaRuleDto extends PartialType(CreateSlaRuleDto) { }
