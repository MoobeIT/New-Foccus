import { ApiProperty } from '@nestjs/swagger';

export enum AssetProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class AssetEntity {
  @ApiProperty({ description: 'ID único do asset' })
  id: string;

  @ApiProperty({ description: 'ID do usuário proprietário' })
  userId: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'Chave no storage' })
  storageKey: string;

  @ApiProperty({ description: 'Nome do arquivo' })
  filename: string;

  @ApiProperty({ description: 'Tipo MIME' })
  mimeType: string;

  @ApiProperty({ description: 'Tamanho em bytes' })
  sizeBytes: string;

  @ApiProperty({ description: 'Largura da imagem' })
  width: number;

  @ApiProperty({ description: 'Altura da imagem' })
  height: number;

  @ApiProperty({ description: 'DPI da imagem' })
  dpi: number;

  @ApiProperty({ description: 'Dados EXIF' })
  exifData: Record<string, any>;

  @ApiProperty({ description: 'Dados de faces detectadas' })
  faces: any[];

  @ApiProperty({ description: 'Hash perceptual para deduplicação' })
  phash: string;

  @ApiProperty({ description: 'URLs dos thumbnails' })
  thumbnailUrls: Record<string, string>;

  @ApiProperty({ description: 'Status do processamento', enum: AssetProcessingStatus })
  processingStatus: AssetProcessingStatus;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // URLs computadas
  @ApiProperty({ description: 'URL pública do asset' })
  url?: string;

  @ApiProperty({ description: 'URL do thumbnail pequeno' })
  thumbnailSmall?: string;

  @ApiProperty({ description: 'URL do thumbnail médio' })
  thumbnailMedium?: string;

  @ApiProperty({ description: 'URL do thumbnail grande' })
  thumbnailLarge?: string;

  constructor(partial: Partial<AssetEntity>) {
    Object.assign(this, partial);
  }
}