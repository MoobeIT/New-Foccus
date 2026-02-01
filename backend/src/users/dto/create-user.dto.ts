import { IsString, IsEmail, IsNotEmpty, IsOptional, IsUUID, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'ID do tenant', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Email do usuário', example: 'usuario@exemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Senha do usuário', example: 'MinhaSenh@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Primeiro nome do usuário', example: 'João' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ description: 'Último nome do usuário', example: 'Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ description: 'Nome do usuário', example: 'João Silva', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Telefone do usuário', example: '+5511999999999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    description: 'Papel do usuário', 
    example: 'customer',
    enum: ['customer', 'admin', 'super_admin'],
    required: false 
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Se o email está verificado', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({ description: 'Se o usuário está ativo', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}