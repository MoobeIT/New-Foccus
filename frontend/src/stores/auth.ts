import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Tipos de usuário do sistema
export type UserRole = 'admin' | 'photographer' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  tenantId?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('accessToken'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const redirectAfterLogin = ref<string | null>(localStorage.getItem('redirectAfterLogin'));

  // Computed
  const isAuthenticated = computed(() => !!user.value && !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isPhotographer = computed(() => user.value?.role === 'photographer');
  const userRole = computed(() => user.value?.role || null);
  const userName = computed(() => user.value?.name || '');
  const userEmail = computed(() => user.value?.email || '');
  
  // Rota padrão baseada no role
  const defaultRoute = computed(() => {
    // Se há uma rota salva para redirect, usa ela
    if (redirectAfterLogin.value) {
      const route = redirectAfterLogin.value;
      // Limpa o redirect após usar
      redirectAfterLogin.value = null;
      localStorage.removeItem('redirectAfterLogin');
      return route;
    }
    
    if (!user.value) return '/login';
    switch (user.value.role) {
      case 'admin': return '/admin';
      case 'photographer': return '/studio';
      default: return '/';
    }
  });
  
  // Salvar rota para redirect após login
  const setRedirectAfterLogin = (route: string) => {
    redirectAfterLogin.value = route;
    localStorage.setItem('redirectAfterLogin', route);
  };
  
  const clearRedirectAfterLogin = () => {
    redirectAfterLogin.value = null;
    localStorage.removeItem('redirectAfterLogin');
  };

  // Actions
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('🔐 [AUTH] Iniciando login...');
      console.log('📧 Email:', credentials.email);
      console.log('🌐 URL:', '/api/v1/auth/login');
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 [AUTH] Status da resposta:', response.status, response.statusText);
      console.log('📋 [AUTH] Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [AUTH] Erro na resposta:', errorData);
        throw new Error(errorData.message || errorData.error || 'Credenciais inválidas');
      }

      const data = await response.json();
      console.log('✅ [AUTH] Login bem-sucedido!');
      console.log('👤 [AUTH] Dados recebidos:', { hasToken: !!data.accessToken, hasUser: !!data.user });
      
      // Salvar token
      token.value = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      console.log('💾 [AUTH] Token salvo no localStorage');
      
      // Salvar dados do usuário (extrair do token se não vier no response)
      if (data.user) {
        user.value = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          name: data.user.name || data.user.email.split('@')[0],
        };
        localStorage.setItem('user', JSON.stringify(user.value));
        console.log('💾 [AUTH] Usuário salvo:', user.value.email, '- Role:', user.value.role);
      } else {
        // Decodificar token JWT para obter dados do usuário
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        user.value = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.email.split('@')[0],
        };
        localStorage.setItem('user', JSON.stringify(user.value));
        console.log('💾 [AUTH] Usuário extraído do token:', user.value.email, '- Role:', user.value.role);
      }

      console.log('🎉 [AUTH] Login completo! Redirecionando...');
      return true;
    } catch (err) {
      console.error('❌ [AUTH] Erro no login:', err);
      error.value = err instanceof Error ? err.message : 'Erro no login';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta');
      }

      const data = await response.json();
      
      // Auto-login após registro
      token.value = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      
      user.value = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name || data.user.email.split('@')[0],
      };
      localStorage.setItem('user', JSON.stringify(user.value));

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro no registro';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = (): void => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    error.value = null;
  };

  const loadUserFromStorage = (): void => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');

    if (storedUser && storedToken) {
      try {
        user.value = JSON.parse(storedUser);
        token.value = storedToken;
      } catch (err) {
        console.error('Erro ao carregar usuário do localStorage:', err);
        logout();
      }
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<boolean> => {
    if (!user.value) return false;

    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil');
      }

      const updatedUser = await response.json();
      user.value = { ...user.value, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(user.value));

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar senha');
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao alterar senha';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!token.value) return false;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const data = await response.json();
      token.value = data.token;
      localStorage.setItem('accessToken', data.token);

      return true;
    } catch (err) {
      console.error('Erro ao renovar token:', err);
      logout();
      return false;
    }
  };

  const clearError = (): void => {
    error.value = null;
  };

  // Inicializar store
  const initialize = (): void => {
    loadUserFromStorage();
  };

  return {
    // Estado
    user,
    token,
    isLoading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,
    isPhotographer,
    userRole,
    defaultRoute,
    userName,
    userEmail,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    clearError,
    initialize,
    setRedirectAfterLogin,
    clearRedirectAfterLogin,
  };
});