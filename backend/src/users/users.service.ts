import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { HashService } from '../common/services/hash.service';
import { ValidationService } from '../common/services/validation.service';
import { LoggerService } from '../common/services/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, password, tenantId, firstName, lastName, ...userData } = createUserDto;

    // Validar email
    if (!this.validationService.isValidEmail(email)) {
      throw new BadRequestException('Email inválido');
    }

    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: password, // Já vem hasheado do AuthService
          tenantId,
          name: `${firstName} ${lastName}`,
          role: userData.role || 'photographer',
          active: true,
          emailVerified: false,
        },
      });

      this.logger.info('User created successfully', 'UsersService', { userId: user.id, tenantId });

      return new UserEntity(user);
    } catch (error) {
      this.logger.error('Error creating user', error.stack, 'UsersService');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return new UserEntity(user);
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return new UserEntity(user);
  }

  async validatePassword(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return null;
    }

    const isValid = await this.hashService.comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Atualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return new UserEntity(user);
  }

  async update(userId: string, updateData: Partial<UpdateUserDto>, tenantId?: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (tenantId && user.tenantId !== tenantId) {
      throw new NotFoundException('Usuário não encontrado');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData as any,
      });

      this.logger.info('User updated successfully', 'UsersService', { userId, tenantId });

      return new UserEntity(updatedUser);
    } catch (error) {
      this.logger.error('Error updating user', error.stack, 'UsersService');
      throw error;
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await this.hashService.comparePassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Validar nova senha
    const passwordValidation = this.validationService.isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash da nova senha
    const newPasswordHash = await this.hashService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash },
    });

    this.logger.info('Password changed successfully', 'UsersService', { userId });
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<UserEntity[]> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const users = await this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => new UserEntity(user));
  }
}