import { ApiProperty } from '@nestjs/swagger';

export class TemplateEntity {
  @ApiProperty({ description: 'ID único do template' })
  id: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'Tipo de produto' })
  productType: string;

  @ApiProperty({ description: 'Tipo de template' })
  templateType: string;

  @ApiProperty({ description: 'Categoria do template' })
  category: string;

  @ApiProperty({ description: 'Nome do template' })
  name: string;

  @ApiProperty({ description: 'Descrição do template', required: false })
  description?: string;

  @ApiProperty({ description: 'URL da imagem de preview', required: false })
  previewUrl?: string;

  @ApiProperty({ description: 'URL da thumbnail', required: false })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Dimensões do template' })
  dimensions: any;

  @ApiProperty({ description: 'Margens do template' })
  margins: any;

  @ApiProperty({ description: 'Área segura do template' })
  safeArea: any;

  @ApiProperty({ description: 'Elementos do template' })
  elements: any;

  @ApiProperty({ description: 'Paleta de cores' })
  colors: any;

  @ApiProperty({ description: 'Fontes utilizadas' })
  fonts: any;

  @ApiProperty({ description: 'Tags do template' })
  tags: any;

  @ApiProperty({ description: 'Se é template do sistema' })
  isSystem: boolean;

  @ApiProperty({ description: 'Se o template está ativo' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  constructor(partial: Partial<TemplateEntity> | any) {
    if (partial) {
      Object.assign(this, partial);
      // Parse JSON strings if needed
      this.dimensions = this.parseJson(partial.dimensions, {});
      this.margins = this.parseJson(partial.margins, {});
      this.safeArea = this.parseJson(partial.safeArea, {});
      this.elements = this.parseJson(partial.elements, []);
      this.colors = this.parseJson(partial.colors, []);
      this.fonts = this.parseJson(partial.fonts, []);
      this.tags = this.parseJson(partial.tags, []);
    }
  }

  private parseJson(value: any, defaultValue: any): any {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value;
  }
}
