import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'MinhaSenh@123',
    minLength: 8,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Primeiro nome do usuário',
    example: 'João',
  })
  @IsString({ message: 'Primeiro nome deve ser uma string' })
  @MinLength(2, { message: 'Primeiro nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Primeiro nome deve ter no máximo 50 caracteres' })
  firstName: string;

  @ApiProperty({
    description: 'Último nome do usuário',
    example: 'Silva',
  })
  @IsString({ message: 'Último nome deve ser uma string' })
  @MinLength(2, { message: 'Último nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Último nome deve ter no máximo 50 caracteres' })
  lastName: string;
}