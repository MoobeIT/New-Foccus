import { ApiProperty } from '@nestjs/swagger';

export class TenantEntity {
  @ApiProperty({ description: 'ID único do tenant' })
  id: string;

  @ApiProperty({ description: 'Nome do tenant' })
  name: string;

  @ApiProperty({ description: 'Slug único do tenant' })
  slug: string;

  @ApiProperty({ description: 'Configurações de tema' })
  themeConfig: Record<string, any>;

  @ApiProperty({ description: 'Configurações gerais' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Se o tenant está ativo' })
  active: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(partial: Partial<TenantEntity>) {
    Object.assign(this, partial);
  }
}