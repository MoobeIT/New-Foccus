<template>
  <div class="section-card">
    <div class="section-header">
      <div class="section-title">
        <h2>Gerenciamento de Usuários</h2>
        <p>Gerencie os usuários do sistema</p>
      </div>
      <div class="section-actions">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" v-model="searchQuery" placeholder="Buscar usuário..." />
        </div>
        <button class="btn-primary" @click="showCreateModal = true"><span>➕</span> Novo Usuário</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Carregando usuários...</div>

    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Email</th>
            <th>Função</th>
            <th>Status</th>
            <th>Cadastro</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>
              <div class="user-cell">
                <div class="user-avatar">{{ getInitials(user.name) }}</div>
                <span>{{ user.name }}</span>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td><span :class="['role-badge', user.role]">{{ roleLabels[user.role] }}</span></td>
            <td><span :class="['status-badge', user.isActive ? 'active' : 'inactive']">{{ user.isActive ? 'Ativo' : 'Inativo' }}</span></td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="actions-cell">
              <button class="action-btn" @click="editUser(user)" title="Editar">✏️</button>
              <button class="action-btn" @click="toggleStatus(user)" :title="user.isActive ? 'Desativar' : 'Ativar'">{{ user.isActive ? '🔒' : '🔓' }}</button>
              <button class="action-btn danger" @click="deleteUser(user)" title="Excluir">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingUser" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingUser ? 'Editar Usuário' : 'Novo Usuário' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveUser" class="modal-body">
          <div class="form-group">
            <label>Nome</label>
            <input type="text" v-model="formData.name" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" v-model="formData.email" required />
          </div>
          <div class="form-group" v-if="!editingUser">
            <label>Senha</label>
            <input type="password" v-model="formData.password" required />
          </div>
          <div class="form-group">
            <label>Função</label>
            <select v-model="formData.role">
              <option value="user">Usuário</option>
              <option value="photographer">Fotógrafo</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div class="form-group checkbox">
            <label><input type="checkbox" v-model="formData.isActive" /> Usuário ativo</label>
          </div>
        </form>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary" @click="saveUser">{{ editingUser ? 'Salvar' : 'Criar' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'

interface User { id: number; name: string; email: string; role: string; isActive: boolean; createdAt: string }

const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showCreateModal = ref(false)
const editingUser = ref<User | null>(null)
const formData = ref({ name: '', email: '', password: '', role: 'user', isActive: true })

const roleLabels: Record<string, string> = { user: 'Usuário', photographer: 'Fotógrafo', admin: 'Admin' }

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
})

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR')

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/v1/users')
    users.value = res.data || []
  } catch {
    users.value = [
      { id: 1, name: 'Administrador', email: 'admin@foccus.com', role: 'admin', isActive: true, createdAt: '2025-01-01' },
      { id: 2, name: 'João Silva', email: 'joao@email.com', role: 'photographer', isActive: true, createdAt: '2025-12-15' },
      { id: 3, name: 'Maria Santos', email: 'maria@email.com', role: 'user', isActive: true, createdAt: '2025-12-20' },
    ]
  } finally { loading.value = false }
}

const closeModal = () => { showCreateModal.value = false; editingUser.value = null; formData.value = { name: '', email: '', password: '', role: 'user', isActive: true } }

const editUser = (user: User) => {
  editingUser.value = user
  formData.value = { name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive }
}

const saveUser = async () => {
  try {
    if (editingUser.value) {
      await api.patch(`/api/v1/users/${editingUser.value.id}`, formData.value)
      Object.assign(editingUser.value, formData.value)
    } else {
      const res = await api.post('/api/v1/users', formData.value)
      users.value.push(res.data)
    }
    closeModal()
  } catch { alert('Erro ao salvar usuário') }
}

const toggleStatus = async (user: User) => {
  try {
    await api.patch(`/api/v1/users/${user.id}`, { isActive: !user.isActive })
    user.isActive = !user.isActive
  } catch { alert('Erro ao atualizar status') }
}

const deleteUser = async (user: User) => {
  if (!confirm(`Excluir usuário ${user.name}?`)) return
  try {
    await api.delete(`/api/v1/users/${user.id}`)
    users.value = users.value.filter(u => u.id !== user.id)
  } catch { alert('Erro ao excluir usuário') }
}

onMounted(fetchUsers)
</script>

<style scoped>
.section-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.section-title h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.section-title p { font-size: 0.85rem; color: #64748b; margin: 0; }
.section-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f1f5f9; border-radius: 8px; }
.search-box input { border: none; background: none; outline: none; font-size: 0.85rem; width: 180px; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #D4775C; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
.btn-secondary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f1f5f9; color: #1e293b; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; padding: 12px; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 12px; font-size: 0.85rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
.user-cell { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 36px; height: 36px; background: #D4775C; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; }
.role-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
.role-badge.admin { background: #ede9fe; color: #7c3aed; }
.role-badge.photographer { background: #dbeafe; color: #1d4ed8; }
.role-badge.user { background: #f1f5f9; color: #64748b; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
.status-badge.active { background: #dcfce7; color: #16a34a; }
.status-badge.inactive { background: #fee2e2; color: #dc2626; }
.actions-cell { display: flex; gap: 8px; }
.action-btn { width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.action-btn:hover { background: #e2e8f0; }
.action-btn.danger:hover { background: #fee2e2; }
.loading-state { text-align: center; padding: 48px; color: #64748b; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 100%; max-width: 450px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; font-size: 1.2rem; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 0.8rem; font-weight: 500; color: #64748b; margin-bottom: 6px; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; }
.form-group.checkbox label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.form-group.checkbox input { width: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid #e2e8f0; }
</style>
