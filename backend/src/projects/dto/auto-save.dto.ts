import { IsObject, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AutoSaveDto {
  @ApiProperty({ 
    description: 'Configurações do projeto',
    example: { colorProfile: 'sRGB' },
    required: false 
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Versão atual do projeto (para controle de concorrência)', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
