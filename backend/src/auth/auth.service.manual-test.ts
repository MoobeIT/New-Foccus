/**
 * Teste manual do AuthService
 * Este arquivo pode ser usado para testar manualmente as funcionalidades do AuthService
 */

import { AuthService } from './auth.service';

// Exemplo de uso do AuthService
export class AuthServiceManualTest {
  constructor(private authService: AuthService) {}

  async testRegister() {
    const registerDto = {
      email: 'test@example.com',
      password: 'TestPassword@123',
      firstName: 'Test',
      lastName: 'User',
    };

    try {
      const result = await this.authService.register(registerDto, 'test-tenant');
      console.log('✅ Register successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Register failed:', error.message);
      throw error;
    }
  }

  async testLogin() {
    const loginDto = {
      email: 'test@example.com',
      password: 'TestPassword@123',
    };

    try {
      const result = await this.authService.login(loginDto, 'test-tenant');
      console.log('✅ Login successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async testRefreshToken(refreshToken: string) {
    try {
      const result = await this.authService.refreshToken(refreshToken);
      console.log('✅ Token refresh successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  }

  async testChangePassword(userId: string, tenantId: string) {
    const changePasswordDto = {
      currentPassword: 'TestPassword@123',
      newPassword: 'NewTestPassword@456',
    };

    try {
      const result = await this.authService.changePassword(userId, changePasswordDto, tenantId);
      console.log('✅ Password change successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Password change failed:', error.message);
      throw error;
    }
  }
}