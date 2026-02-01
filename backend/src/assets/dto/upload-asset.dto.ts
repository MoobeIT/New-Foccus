import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAssetDto {
  @ApiProperty({ 
    description: 'Arquivos para upload',
    type: 'array',
    items: { type: 'string', format: 'binary' }
  })
  files: Express.Multer.File[];
}

export class GetUploadUrlDto {
  @ApiProperty({ description: 'Nome do arquivo', example: 'foto.jpg' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Tipo MIME do arquivo', example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Tamanho do arquivo em bytes', example: 1024000 })
  @IsString()
  size: string;
}

export class CompleteUploadDto {
  @ApiProperty({ description: 'Chave do arquivo no storage', example: 'assets/user123/photo.jpg' })
  @IsString()
  storageKey: string;

  @ApiProperty({ description: 'Nome original do arquivo', example: 'minha-foto.jpg' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Tipo MIME', example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Tamanho em bytes', example: 1024000 })
  @IsString()
  sizeBytes: string;

  @ApiProperty({ description: 'Processar automaticamente', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  autoProcess?: boolean;
}