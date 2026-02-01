<template>
  <div class="roles-management">
    <div class="section-header">
      <div>
        <h2>Gerenciamento de Papéis</h2>
        <p class="subtitle">Configure papéis e permissões de usuários</p>
      </div>
      <button class="btn-primary" @click="showCreateModal = true">
        ➕ Novo Papel
      </button>
    </div>

    <div class="roles-grid">
      <div v-for="role in roles" :key="role.id" class="role-card">
        <div class="role-header">
          <div class="role-icon">{{ role.icon }}</div>
          <div class="role-info">
            <h3>{{ role.name }}</h3>
            <p>{{ role.description }}</p>
          </div>
        </div>

        <div class="role-stats">
          <div class="stat">
            <strong>{{ role.userCount }}</strong>
            <span>usuários</span>
          </div>
          <div class="stat">
            <strong>{{ role.permissions.length }}</strong>
            <span>permissões</span>
          </div>
        </div>

        <div class="permissions-list">
          <h4>Permissões:</h4>
          <div class="permissions-tags">
            <span v-for="perm in role.permissions.slice(0, 5)" :key="perm" class="permission-tag">
              {{ perm }}
            </span>
            <span v-if="role.permissions.length > 5" class="more-tag">
              +{{ role.permissions.length - 5 }} mais
            </span>
          </div>
        </div>

        <div class="role-actions">
          <button class="btn-action" @click="editRole(role)">✏️ Editar</button>
          <button class="btn-action" @click="viewPermissions(role)">🔐 Permissões</button>
          <button v-if="!role.isSystem" class="btn-action danger" @click="deleteRole(role)">
            🗑️ Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Criar/Editar -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <h3>{{ editingRole ? 'Editar Papel' : 'Novo Papel' }}</h3>
        
        <div class="form-group">
          <label>Nome do Papel *</label>
          <input v-model="roleForm.name" type="text" placeholder="Ex: Editor" />
        </div>

        <div class="form-group">
          <label>Descrição</label>
          <textarea v-model="roleForm.description" rows="3" placeholder="Descrição do papel..."></textarea>
        </div>

        <div class="form-group">
          <label>Ícone</label>
          <input v-model="roleForm.icon" type="text" placeholder="Ex: 👤" />
        </div>

        <div class="form-actions">
          <button class="btn-secondary" @click="cancelForm">Cancelar</button>
          <button class="btn-primary" @click="saveRole">
            {{ editingRole ? 'Atualizar' : 'Criar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Role {
  id: string
  name: string
  description: string
  icon: string
  userCount: number
  permissions: string[]
  isSystem: boolean
}

const showCreateModal = ref(false)
const editingRole = ref<Role | null>(null)

const roleForm = ref({
  name: '',
  description: '',
  icon: '👤'
})

const roles = ref<Role[]>([
  {
    id: '1',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    icon: '👑',
    userCount: 2,
    permissions: ['all'],
    isSystem: true
  },
  {
    id: '2',
    name: 'Gerente',
    description: 'Gerencia produtos, pedidos e usuários',
    icon: '👔',
    userCount: 5,
    permissions: ['products.manage', 'orders.manage', 'users.view', 'reports.view'],
    isSystem: false
  },
  {
    id: '3',
    name: 'Editor',
    description: 'Edita produtos e templates',
    icon: '✏️',
    userCount: 12,
    permissions: ['products.edit', 'templates.edit', 'orders.view'],
    isSystem: false
  },
  {
    id: '4',
    name: 'Cliente',
    description: 'Acesso básico para clientes',
    icon: '👤',
    userCount: 150,
    permissions: ['projects.create', 'projects.edit', 'orders.create'],
    isSystem: true
  }
])

const editRole = (role: Role) => {
  editingRole.value = role
  roleForm.value = {
    name: role.name,
    description: role.description,
    icon: role.icon
  }
  showCreateModal.value = true
}

const viewPermissions = (role: Role) => {
  alert(`Permissões de ${role.name}:\n\n${role.permissions.join('\n')}`)
}

const deleteRole = (role: Role) => {
  if (confirm(`Excluir papel "${role.name}"?`)) {
    const index = roles.value.findIndex(r => r.id === role.id)
    if (index > -1) {
      roles.value.splice(index, 1)
    }
  }
}

const saveRole = () => {
  if (!roleForm.value.name) {
    alert('Preencha o nome do papel')
    return
  }

  if (editingRole.value) {
    const role = roles.value.find(r => r.id === editingRole.value!.id)
    if (role) {
      role.name = roleForm.value.name
      role.description = roleForm.value.description
      role.icon = roleForm.value.icon
    }
  } else {
    roles.value.push({
      id: Date.now().toString(),
      name: roleForm.value.name,
      description: roleForm.value.description,
      icon: roleForm.value.icon,
      userCount: 0,
      permissions: [],
      isSystem: false
    })
  }

  cancelForm()
}

const cancelForm = () => {
  showCreateModal.value = false
  editingRole.value = null
  roleForm.value = {
    name: '',
    description: '',
    icon: '👤'
  }
}
</script>

<style scoped>
.roles-management {
  padding: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.section-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.role-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.role-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.role-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.role-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.role-info {
  flex: 1;
}

.role-info h3 {
  margin: 0 0 0.25rem 0;
  color: #111827;
  font-size: 1.125rem;
}

.role-info p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.role-stats {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat strong {
  font-size: 1.5rem;
  color: #3b82f6;
}

.stat span {
  font-size: 0.75rem;
  color: #6b7280;
}

.permissions-list {
  margin-bottom: 1rem;
}

.permissions-list h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.permissions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.permission-tag {
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.more-tag {
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.role-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-action {
  flex: 1;
  padding: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f3f4f6;
}

.btn-action.danger {
  color: #dc2626;
}

.btn-action.danger:hover {
  background: #fee2e2;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  color: #111827;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}
</style>
