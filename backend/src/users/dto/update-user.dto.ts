import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Remove password e tenantId do update (devem ter endpoints específicos)
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'tenantId'] as const)
) {}