import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../common/services/logger.service';
import { HashService } from '../common/services/hash.service';
import { ValidationService } from '../common/services/validation.service';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface AuthResult {
  user: UserEntity;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
    private hashService: HashService,
    private validationService: ValidationService,
  ) {}

  /**
   * Registra um novo usuário
   */
  async register(registerDto: RegisterDto, tenantId: string): Promise<AuthResult> {
    const { email, password, firstName, lastName } = registerDto;

    // Verificar se usuário já existe
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      this.logger.warn('User registration failed - email already exists', 'AuthService');
      throw new ConflictException('User already exists');
    }

    // Validar senha
    const passwordValidation = this.validationService.isValidPassword(password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash da senha
    const hashedPassword = await this.hashService.hashPassword(password);

    // Criar usuário
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      tenantId,
      role: 'customer',
    });

    // Gerar tokens
    const tokens = await this.generateTokens(user, tenantId);

    this.logger.info('User registered successfully', 'AuthService', { userId: user.id, email, tenantId });

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Realiza login do usuário
   */
  async login(loginDto: LoginDto, tenantId: string): Promise<AuthResult> {
    const { email, password } = loginDto;

    // Buscar usuário
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn('Failed login attempt - user not found', 'AuthService', { email, tenantId });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar senha
    const isPasswordValid = await this.hashService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Failed login attempt - invalid password', 'AuthService', { email, tenantId, userId: user.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar se usuário está ativo
    if (!user.active) {
      this.logger.warn('Failed login attempt - user inactive', 'AuthService', { email, tenantId, userId: user.id });
      throw new UnauthorizedException('User account is inactive');
    }

    // Gerar tokens usando o tenantId do usuário (não o do header)
    const tokens = await this.generateTokens(user, user.tenantId);

    this.logger.info('User logged in successfully', 'AuthService', { userId: user.id, email, tenantId: user.tenantId });

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Renova token de acesso usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verificar e decodificar refresh token
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;

      // Verificar se é um refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Buscar usuário
      const user = await this.usersService.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verificar se usuário está ativo
      if (!user.active) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Gerar novos tokens
      const tokens = await this.generateTokens(user, payload.tenantId);

      this.logger.info('Token refreshed successfully', 'AuthService', { userId: user.id, tenantId: payload.tenantId });

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      this.logger.warn('Failed token refresh attempt', 'AuthService', { error: error.message });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Valida usuário para estratégia local
   */
  async validateUser(userId: string, tenantId: string): Promise<UserEntity | null> {
    try {
      const user = await this.usersService.findById(userId);
      
      if (!user || !user.active || user.tenantId !== tenantId) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(userId: string, tenantId: string): Promise<boolean> {
    this.logger.info('User logged out successfully', 'AuthService', { userId, tenantId });
    
    // TODO: Implementar blacklist de tokens se necessário
    // Por enquanto apenas logamos o evento
    
    return true;
  }

  /**
   * Altera senha do usuário
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto, tenantId: string): Promise<boolean> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Buscar usuário
    const user = await this.usersService.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new UnauthorizedException('User not found');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await this.hashService.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      this.logger.warn('Failed password change attempt - invalid current password', 'AuthService', { userId, tenantId });
      throw new BadRequestException('Current password is incorrect');
    }

    // Validar nova senha
    const passwordValidation = this.validationService.isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash da nova senha
    const hashedNewPassword = await this.hashService.hashPassword(newPassword);

    // Atualizar senha diretamente no banco
    await this.usersService.changePassword(userId, { currentPassword, newPassword });

    this.logger.info('Password changed successfully', 'AuthService', { userId, tenantId });

    return true;
  }

  /**
   * Gera par de tokens (access + refresh)
   */
  async generateTokens(user: UserEntity, tenantId: string): Promise<TokenPair> {
    const basePayload = {
      userId: user.id,
      email: user.email,
      tenantId,
      role: user.role,
    };

    // Access Token (curta duração)
    const accessTokenPayload: JwtPayload = {
      ...basePayload,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.configService.get('jwt.expiresIn', '15m'),
    });

    // Refresh Token (longa duração)
    const refreshTokenPayload: JwtPayload = {
      ...basePayload,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.configService.get('jwt.refreshExpiresIn', '7d'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Valida token JWT
   */
  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }
}