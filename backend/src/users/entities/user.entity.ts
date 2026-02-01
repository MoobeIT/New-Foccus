import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserEntity {
  @ApiProperty({ description: 'ID único do usuário' })
  id: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @Exclude()
  password: string;

  @ApiProperty({ description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ description: 'Telefone do usuário' })
  phone?: string;

  @ApiProperty({ description: 'Papel do usuário' })
  role: string;

  @ApiProperty({ description: 'Se o email está verificado' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Se o usuário está ativo' })
  active: boolean;

  @ApiProperty({ description: 'Último login' })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // Computed properties for compatibility
  get firstName(): string {
    return this.name?.split(' ')[0] || '';
  }

  get lastName(): string {
    const parts = this.name?.split(' ') || [];
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
