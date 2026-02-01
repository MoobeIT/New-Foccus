import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual', example: 'SenhaAtual123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'Nova senha', example: 'NovaSenha@456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}