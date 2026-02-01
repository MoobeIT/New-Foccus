import { ApiProperty } from '@nestjs/swagger';

export enum ProjectStatus {
  DRAFT = 'draft',
  EDITING = 'editing',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PRODUCTION = 'production',
  LOCKED = 'locked',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
}

export class ProjectEntity {
  @ApiProperty({ description: 'ID único do projeto' })
  id: string;

  @ApiProperty({ description: 'ID do usuário proprietário' })
  userId: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  name: string;

  @ApiProperty({ description: 'Status do projeto', enum: ProjectStatus })
  status: ProjectStatus;

  @ApiProperty({ description: 'ID do produto', required: false })
  productId?: string;

  @ApiProperty({ description: 'ID do formato', required: false })
  formatId?: string;

  @ApiProperty({ description: 'ID do papel', required: false })
  paperId?: string;

  @ApiProperty({ description: 'ID do tipo de capa', required: false })
  coverTypeId?: string;

  @ApiProperty({ description: 'Número de páginas' })
  pageCount: number;

  @ApiProperty({ description: 'Largura da lombada (mm)' })
  spineWidth: number;

  @ApiProperty({ description: 'Largura (mm)' })
  width: number;

  @ApiProperty({ description: 'Altura (mm)' })
  height: number;

  @ApiProperty({ description: 'Sangria (mm)' })
  bleed: number;

  @ApiProperty({ description: 'Margem de segurança (mm)' })
  safeMargin: number;

  @ApiProperty({ description: 'Margem da lombada (mm)' })
  gutterMargin: number;

  @ApiProperty({ description: 'Configurações do projeto' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Versão atual do projeto' })
  currentVersion: number;

  @ApiProperty({ description: 'Data de bloqueio', required: false })
  lockedAt?: Date;

  @ApiProperty({ description: 'ID da versão bloqueada', required: false })
  lockedVersionId?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // Dados computados/relacionados
  @ApiProperty({ description: 'Informações do produto', required: false })
  product?: any;

  @ApiProperty({ description: 'Informações do formato', required: false })
  format?: any;

  @ApiProperty({ description: 'Informações do papel', required: false })
  paper?: any;

  @ApiProperty({ description: 'Informações do tipo de capa', required: false })
  coverType?: any;

  @ApiProperty({ description: 'Número total de páginas (calculado)' })
  totalPages?: number;

  @ApiProperty({ description: 'Número de elementos no projeto' })
  totalElements?: number;

  constructor(partial: Partial<ProjectEntity>) {
    Object.assign(this, partial);
    
    // Parse settings if it's a string
    if (typeof this.settings === 'string') {
      try {
        this.settings = JSON.parse(this.settings);
      } catch {
        this.settings = {};
      }
    }
  }
}
