import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUUID, IsEnum, IsDateString, MaxLength } from 'class-validator';

export enum ApprovalStatus {
  PENDING = 'pending',
  VIEWED = 'viewed',
  APPROVED = 'approved',
  REVISION = 'revision',
  REJECTED = 'rejected',
}

export class CreateApprovalDto {
  @ApiProperty({ description: 'ID do projeto' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'ID do cliente (opcional)' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ description: 'Nome do cliente' })
  @IsString()
  @MaxLength(100)
  clientName: string;

  @ApiProperty({ description: 'Email do cliente' })
  @IsEmail()
  clientEmail: string;

  @ApiPropertyOptional({ description: 'Data de expiração do link' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateApprovalDto {
  @ApiPropertyOptional({ description: 'Status da aprovação', enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Feedback do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;

  @ApiPropertyOptional({ description: 'Notas de revisão' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  revisionNotes?: string;
}

export class ApprovalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  projectName?: string;

  @ApiPropertyOptional()
  clientId?: string;

  @ApiProperty()
  clientName: string;

  @ApiProperty()
  clientEmail: string;

  @ApiProperty({ enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiProperty()
  token: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  sentAt: Date;

  @ApiPropertyOptional()
  viewedAt?: Date;

  @ApiPropertyOptional()
  respondedAt?: Date;

  @ApiPropertyOptional()
  feedback?: string;

  @ApiPropertyOptional()
  revisionNotes?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ApprovalStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  viewed: number;

  @ApiProperty()
  approved: number;

  @ApiProperty()
  revision: number;

  @ApiProperty()
  rejected: number;
}

export class PublicApprovalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  photographerName: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  previewUrl?: string;

  @ApiProperty()
  isExpired: boolean;
}
