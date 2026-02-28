import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(
    OmitType(CreateStaffDto, ['password'] as const),
) { }
