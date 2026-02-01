import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, type UserRole } from '@/stores/auth';

export function useAuthGuard() {
  const router = useRouter();
  const authStore = useAuthStore();

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const isPhotographer = computed(() => authStore.isPhotographer);
  const userRole = computed(() => authStore.userRole);
  const user = computed(() => authStore.user);

  /**
   * Guard para rotas que requerem autenticação
   */
  const requireAuth = (): boolean => {
    if (!isAuthenticated.value) {
      router.push('/login');
      return false;
    }
    return true;
  };

  /**
   * Guard para rotas que requerem privilégios de admin
   */
  const requireAdmin = (): boolean => {
    if (!isAuthenticated.value) {
      router.push('/login');
      return false;
    }
    
    if (!isAdmin.value) {
      router.push('/unauthorized');
      return false;
    }
    
    return true;
  };

  /**
   * Guard para rotas do fotógrafo (studio)
   */
  const requirePhotographer = (): boolean => {
    if (!isAuthenticated.value) {
      router.push('/login');
      return false;
    }
    
    // Admin também pode acessar área do fotógrafo
    if (!isPhotographer.value && !isAdmin.value) {
      router.push('/unauthorized');
      return false;
    }
    
    return true;
  };

  /**
   * Guard para rotas que só devem ser acessadas por usuários não autenticados
   */
  const requireGuest = (): boolean => {
    if (isAuthenticated.value) {
      router.push(authStore.defaultRoute);
      return false;
    }
    return true;
  };

  /**
   * Verifica se o usuário tem uma role específica
   */
  const hasRole = (role: UserRole): boolean => {
    return user.value?.role === role;
  };

  /**
   * Verifica se o usuário tem permissão para acessar um recurso
   */
  const hasPermission = (permission: string): boolean => {
    if (!user.value) return false;
    
    // Admins têm todas as permissões
    if (user.value.role === 'admin') return true;
    
    return false;
  };

  /**
   * Logout e redirecionamento
   */
  const logout = (): void => {
    authStore.logout();
    router.push('/login');
  };

  /**
   * Redireciona para a rota padrão do usuário
   */
  const redirectToDefault = (): void => {
    router.push(authStore.defaultRoute);
  };

  return {
    isAuthenticated,
    isAdmin,
    isPhotographer,
    userRole,
    user,
    requireAuth,
    requireAdmin,
    requirePhotographer,
    requireGuest,
    hasRole,
    hasPermission,
    logout,
    redirectToDefault,
  };
}

/**
 * Navigation Guards para Vue Router
 */
export const authGuards = {
  /**
   * Guard para rotas protegidas (qualquer usuário autenticado)
   * Salva a rota de destino para redirect após login
   */
  requireAuth: (to: any, from: any, next: any) => {
    const authStore = useAuthStore();
    
    if (!authStore.isAuthenticated) {
      // Salva a rota que o usuário tentou acessar
      authStore.setRedirectAfterLogin(to.fullPath);
      next('/login');
    } else {
      next();
    }
  },

  /**
   * Guard para rotas de admin
   */
  requireAdmin: (to: any, from: any, next: any) => {
    const authStore = useAuthStore();
    
    if (!authStore.isAuthenticated) {
      authStore.setRedirectAfterLogin(to.fullPath);
      next('/login');
    } else if (!authStore.isAdmin) {
      next('/unauthorized');
    } else {
      next();
    }
  },

  /**
   * Guard para rotas do fotógrafo (studio)
   * Admin também pode acessar
   */
  requirePhotographer: (to: any, from: any, next: any) => {
    const authStore = useAuthStore();
    
    if (!authStore.isAuthenticated) {
      authStore.setRedirectAfterLogin(to.fullPath);
      next('/login');
    } else if (!authStore.isPhotographer && !authStore.isAdmin) {
      next('/unauthorized');
    } else {
      next();
    }
  },

  /**
   * Guard para rotas de convidado (login/register)
   */
  requireGuest: (to: any, from: any, next: any) => {
    const authStore = useAuthStore();
    
    if (authStore.isAuthenticated) {
      next(authStore.defaultRoute);
    } else {
      next();
    }
  },

  /**
   * Guard para aprovação pública (sem auth, via token)
   */
  publicApproval: (to: any, from: any, next: any) => {
    // Aprovação é pública, só precisa do token na URL
    if (!to.params.token && !to.params.projectId) {
      next('/404');
    } else {
      next();
    }
  },
};
