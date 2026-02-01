<template>
  <div class="users-management">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
        <p class="text-gray-600">Gerencie usuários e permissões do sistema</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Novo Usuário
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Total de Usuários"
        :value="stats.totalUsers"
        icon="users"
        color="blue"
        :change="stats.usersChange"
      />
      <StatsCard
        title="Usuários Ativos"
        :value="stats.activeUsers"
        icon="user-check"
        color="green"
      />
      <StatsCard
        title="Novos Este Mês"
        :value="stats.newThisMonth"
        icon="user-plus"
        color="purple"
        :change="stats.newUsersChange"
      />
      <StatsCard
        title="Administradores"
        :value="stats.admins"
        icon="shield-check"
        color="indigo"
      />
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Buscar por nome, email ou ID..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        <select
          v-model="filters.role"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas as funções</option>
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="user">Usuário</option>
        </select>
        <select
          v-model="filters.status"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="suspended">Suspenso</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Função
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Acesso
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projetos
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div 
                      v-if="user.avatar"
                      class="h-10 w-10 rounded-full overflow-hidden"
                    >
                      <img :src="user.avatar" :alt="user.name" class="h-full w-full object-cover">
                    </div>
                    <div 
                      v-else
                      class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center"
                    >
                      <span class="text-sm font-medium text-gray-700">
                        {{ getUserInitials(user.name) }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getRoleClasses(user.role)"
                >
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusClasses(user.status)"
                >
                  {{ getStatusLabel(user.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.lastLogin ? formatDate(user.lastLogin) : 'Nunca' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ user.projectsCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button 
                    @click="editUser(user)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    Editar
                  </button>
                  <button 
                    @click="toggleUserStatus(user)"
                    :class="user.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'"
                  >
                    {{ user.status === 'active' ? 'Suspender' : 'Ativar' }}
                  </button>
                  <button 
                    @click="deleteUser(user.id)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingUser" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          {{ editingUser ? 'Editar Usuário' : 'Novo Usuário' }}
        </h2>
        
        <form @submit.prevent="saveUser" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                v-model="userForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="userForm.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Função</label>
              <select
                v-model="userForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="user">Usuário</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="userForm.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
          </div>

          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              v-model="userForm.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {{ editingUser ? 'Atualizar' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import StatsCard from './StatsCard.vue';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  lastLogin?: Date;
  projectsCount: number;
  createdAt: Date;
}

const emit = defineEmits<{
  'user-updated': [];
}>();

// Estado
const users = ref<User[]>([]);
const showCreateModal = ref(false);
const editingUser = ref<User | null>(null);
const filters = ref({
  search: '',
  role: '',
  status: ''
});

const stats = ref({
  totalUsers: 156,
  usersChange: 8,
  activeUsers: 142,
  newThisMonth: 23,
  newUsersChange: 15,
  admins: 5
});

const userForm = ref({
  name: '',
  email: '',
  role: 'user' as User['role'],
  status: 'active' as User['status'],
  password: ''
});

// Computed
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch = !filters.value.search || 
      user.name.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      user.id.includes(filters.value.search);
    
    const matchesRole = !filters.value.role || user.role === filters.value.role;
    const matchesStatus = !filters.value.status || user.status === filters.value.status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
});

// Methods
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleLabel = (role: User['role']): string => {
  const labels = {
    admin: 'Administrador',
    editor: 'Editor',
    user: 'Usuário'
  };
  return labels[role];
};

const getRoleClasses = (role: User['role']): string => {
  const classes = {
    admin: 'bg-red-100 text-red-800',
    editor: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-800'
  };
  return classes[role];
};

const getStatusLabel = (status: User['status']): string => {
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    suspended: 'Suspenso'
  };
  return labels[status];
};

const getStatusClasses = (status: User['status']): string => {
  const classes = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-yellow-100 text-yellow-800'
  };
  return classes[status];
};

const editUser = (user: User): void => {
  editingUser.value = user;
  userForm.value = {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    password: ''
  };
};

const cancelEdit = (): void => {
  showCreateModal.value = false;
  editingUser.value = null;
  userForm.value = {
    name: '',
    email: '',
    role: 'user',
    status: 'active',
    password: ''
  };
};

const saveUser = (): void => {
  // Implementar salvamento
  console.log('Salvando usuário:', userForm.value);
  cancelEdit();
  emit('user-updated');
};

const toggleUserStatus = (user: User): void => {
  user.status = user.status === 'active' ? 'suspended' : 'active';
  emit('user-updated');
};

const deleteUser = (id: string): void => {
  if (confirm('Tem certeza que deseja excluir este usuário?')) {
    const index = users.value.findIndex(u => u.id === id);
    if (index > -1) {
      users.value.splice(index, 1);
      emit('user-updated');
    }
  }
};

// Inicializar dados mock
onMounted(() => {
  users.value = [
    {
      id: '1',
      name: 'Admin Sistema',
      email: 'admin@editor.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(),
      projectsCount: 0,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'João Silva',
      email: 'joao@email.com',
      role: 'user',
      status: 'active',
      lastLogin: new Date(Date.now() - 86400000),
      projectsCount: 5,
      createdAt: new Date('2024-02-15')
    },
    {
      id: '3',
      name: 'Maria Santos',
      email: 'maria@email.com',
      role: 'editor',
      status: 'active',
      lastLogin: new Date(Date.now() - 172800000),
      projectsCount: 12,
      createdAt: new Date('2024-03-10')
    }
  ];
});
</script>