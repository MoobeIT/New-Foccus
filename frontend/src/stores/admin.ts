import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface DashboardStats {
  products: number;
  templates: number;
  ordersToday: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface Activity {
  id: string;
  type: 'product_created' | 'order_placed' | 'user_registered' | 'template_uploaded';
  title: string;
  description: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'editor';
  status: 'active' | 'inactive';
  lastLogin?: Date;
  permissions: string[];
}

export const useAdminStore = defineStore('admin', () => {
  // Estado
  const dashboardStats = ref<DashboardStats>({
    products: 156,
    templates: 89,
    ordersToday: 24,
    monthlyRevenue: 45280.50,
    totalUsers: 1247,
    activeUsers: 892,
    conversionRate: 3.2,
    averageOrderValue: 89.50,
  });
  
  const recentActivities = ref<Activity[]>([
    {
      id: '1',
      type: 'product_created',
      title: 'Produto criado',
      description: 'Novo fotolivro A4 adicionado ao catálogo',
      user: { id: '1', name: 'João Silva' },
      timestamp: new Date(Date.now() - 300000), // 5 min ago
      metadata: { productName: 'Fotolivro A4' }
    },
    {
      id: '2',
      type: 'order_placed',
      title: 'Pedido realizado',
      description: 'Novo pedido #2024001 recebido',
      user: { id: '2', name: 'Maria Santos' },
      timestamp: new Date(Date.now() - 900000), // 15 min ago
      metadata: { orderId: '2024001' }
    },
    {
      id: '3',
      type: 'user_registered',
      title: 'Usuário registrado',
      description: 'Novo usuário se cadastrou na plataforma',
      user: { id: '3', name: 'Pedro Costa' },
      timestamp: new Date(Date.now() - 1800000), // 30 min ago
    },
    {
      id: '4',
      type: 'template_uploaded',
      title: 'Template adicionado',
      description: 'Novo template "Casamento Elegante" foi adicionado',
      user: { id: '1', name: 'João Silva' },
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      metadata: { templateName: 'Casamento Elegante' }
    }
  ]);
  
  const adminUsers = ref<AdminUser[]>([
    {
      id: '1',
      name: 'Admin Sistema',
      email: 'admin@editor.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(),
      permissions: ['all']
    },
    {
      id: '2',
      name: 'João Manager',
      email: 'joao@editor.com',
      role: 'manager',
      status: 'active',
      lastLogin: new Date(Date.now() - 86400000),
      permissions: ['products', 'orders', 'users']
    },
    {
      id: '3',
      name: 'Maria Editor',
      email: 'maria@editor.com',
      role: 'editor',
      status: 'active',
      lastLogin: new Date(Date.now() - 172800000),
      permissions: ['products', 'templates']
    }
  ]);
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Computed
  const statsGrowth = computed(() => ({
    products: '+5.2%',
    templates: '+12.1%',
    ordersToday: '+8.7%',
    monthlyRevenue: '+15.3%',
    totalUsers: '+23.4%',
    activeUsers: '+18.9%',
    conversionRate: '+2.1%',
    averageOrderValue: '+7.8%',
  }));
  
  const activitiesByType = computed(() => {
    const grouped = recentActivities.value.reduce((acc, activity) => {
      if (!acc[activity.type]) {
        acc[activity.type] = [];
      }
      acc[activity.type].push(activity);
      return acc;
    }, {} as Record<string, Activity[]>);
    
    return grouped;
  });
  
  const adminUsersByRole = computed(() => {
    return adminUsers.value.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {} as Record<string, AdminUser[]>);
  });
  
  // Actions
  const loadDashboardStats = async (): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with fresh mock data
      dashboardStats.value = {
        products: 156 + Math.floor(Math.random() * 10),
        templates: 89 + Math.floor(Math.random() * 5),
        ordersToday: 24 + Math.floor(Math.random() * 10),
        monthlyRevenue: 45280.50 + Math.random() * 1000,
        totalUsers: 1247 + Math.floor(Math.random() * 50),
        activeUsers: 892 + Math.floor(Math.random() * 20),
        conversionRate: 3.2 + Math.random() * 0.5,
        averageOrderValue: 89.50 + Math.random() * 10,
      };
    } catch (err) {
      error.value = 'Erro ao carregar estatísticas do dashboard';
      console.error('Erro ao carregar stats:', err);
    } finally {
      loading.value = false;
    }
  };
  
  const loadRecentActivities = async (limit: number = 20): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return limited activities
      recentActivities.value = recentActivities.value.slice(0, limit);
    } catch (err) {
      error.value = 'Erro ao carregar atividades recentes';
      console.error('Erro ao carregar atividades:', err);
    }
  };
  
  const loadAdminUsers = async (): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data is already loaded in the ref
    } catch (err) {
      error.value = 'Erro ao carregar usuários administrativos';
      console.error('Erro ao carregar admin users:', err);
    }
  };
  
  const refreshStats = async (): Promise<void> => {
    await loadDashboardStats();
  };
  
  const createAdminUser = async (userData: Partial<AdminUser>): Promise<AdminUser> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newUser: AdminUser = {
        id: Date.now().toString(),
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'editor',
        status: userData.status || 'active',
        permissions: userData.permissions || [],
      };
      
      adminUsers.value.push(newUser);
      return newUser;
    } catch (err) {
      throw new Error('Erro ao criar usuário administrativo');
    }
  };
  
  const updateAdminUser = async (userId: string, userData: Partial<AdminUser>): Promise<AdminUser> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = adminUsers.value.findIndex(user => user.id === userId);
      if (index !== -1) {
        adminUsers.value[index] = { ...adminUsers.value[index], ...userData };
        return adminUsers.value[index];
      }
      throw new Error('Usuário não encontrado');
    } catch (err) {
      throw new Error('Erro ao atualizar usuário administrativo');
    }
  };
  
  const deleteAdminUser = async (userId: string): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const index = adminUsers.value.findIndex(user => user.id === userId);
      if (index !== -1) {
        adminUsers.value.splice(index, 1);
      }
    } catch (err) {
      throw new Error('Erro ao excluir usuário administrativo');
    }
  };
  
  const updateUserPermissions = async (userId: string, permissions: string[]): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const user = adminUsers.value.find(u => u.id === userId);
      if (user) {
        user.permissions = permissions;
      }
    } catch (err) {
      throw new Error('Erro ao atualizar permissões do usuário');
    }
  };
  
  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>): void => {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    recentActivities.value.unshift(newActivity);
    
    // Keep only the last 50 activities
    if (recentActivities.value.length > 50) {
      recentActivities.value = recentActivities.value.slice(0, 50);
    }
  };
  
  // Utilitários
  const formatActivityTitle = (activity: Activity): string => {
    switch (activity.type) {
      case 'product_created':
        return `Produto "${activity.metadata?.productName}" criado`;
      case 'order_placed':
        return `Pedido #${activity.metadata?.orderId} realizado`;
      case 'user_registered':
        return `Novo usuário registrado`;
      case 'template_uploaded':
        return `Template "${activity.metadata?.templateName}" adicionado`;
      default:
        return activity.title;
    }
  };
  
  const getActivityIcon = (type: Activity['type']): string => {
    switch (type) {
      case 'product_created':
        return '📦';
      case 'order_placed':
        return '🛒';
      case 'user_registered':
        return '👤';
      case 'template_uploaded':
        return '🎨';
      default:
        return '📋';
    }
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };
  
  const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };
  
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'agora mesmo';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    }
  };
  
  return {
    // Estado
    dashboardStats,
    recentActivities,
    adminUsers,
    loading,
    error,
    
    // Computed
    statsGrowth,
    activitiesByType,
    adminUsersByRole,
    
    // Actions
    loadDashboardStats,
    loadRecentActivities,
    loadAdminUsers,
    refreshStats,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    updateUserPermissions,
    addActivity,
    
    // Utilitários
    formatActivityTitle,
    getActivityIcon,
    formatCurrency,
    formatNumber,
    formatPercentage,
    getRelativeTime,
  };
});