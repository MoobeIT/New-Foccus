<template>
  <div class="clients-section">
    <!-- Header -->
    <div class="section-header">
      <div class="header-left">
        <h2>👥 Meus Clientes</h2>
        <p>{{ clients.length }} clientes cadastrados</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span>🔍</span>
          <input v-model="searchQuery" type="text" placeholder="Buscar por nome, email ou telefone..." @input="debouncedSearch" />
        </div>
        <select v-model="sortBy" class="sort-select" @change="loadClients">
          <option value="name">Nome A-Z</option>
          <option value="recent">Mais Recentes</option>
          <option value="projects">Mais Projetos</option>
          <option value="spent">Maior Valor</option>
        </select>
        <button class="btn-primary" @click="openNewClientModal">
          ➕ Novo Cliente
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span>⏳</span> Carregando clientes...
    </div>

    <!-- Stats Cards -->
    <div v-else class="stats-row">
      <div class="stat-card">
        <div class="stat-icon blue">👥</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.activeClients }}</span>
          <span class="stat-label">Com Projetos</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🆕</div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.newThisMonth }}</span>
          <span class="stat-label">Novos (30 dias)</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">💰</div>
        <div class="stat-content">
          <span class="stat-value">R$ {{ formatCurrency(stats.totalRevenue) }}</span>
          <span class="stat-label">Faturamento Total</span>
        </div>
      </div>
    </div>

    <!-- Clients Table -->
    <div class="table-container" v-if="!loading">
      <table class="clients-table">
        <thead>
          <tr>
            <th class="col-client">Cliente</th>
            <th class="col-contact">Contato</th>
            <th class="col-projects">Projetos</th>
            <th class="col-spent">Total Gasto</th>
            <th class="col-last">Último Projeto</th>
            <th class="col-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in paginatedClients" :key="client.id" @click="viewClient(client)">
            <td class="col-client">
              <div class="client-cell">
                <div class="avatar" :style="{ background: getAvatarColor(client.name) }">
                  {{ getInitials(client.name) }}
                </div>
                <div class="client-name">
                  <strong>{{ client.name }}</strong>
                  <span v-if="isNewClient(client)" class="new-badge">Novo</span>
                </div>
              </div>
            </td>
            <td class="col-contact">
              <div class="contact-info">
                <span class="email">{{ client.email }}</span>
                <span class="phone">{{ client.phone || '-' }}</span>
              </div>
            </td>
            <td class="col-projects">
              <span class="projects-count">{{ client.projectsCount }}</span>
            </td>
            <td class="col-spent">
              <span class="spent-value">R$ {{ formatCurrency(client.totalSpent) }}</span>
            </td>
            <td class="col-last">
              <span class="last-date">{{ formatDate(client.lastProjectAt) }}</span>
            </td>
            <td class="col-actions" @click.stop>
              <div class="action-buttons">
                <button @click="newProjectForClient(client)" class="action-btn" title="Novo Projeto">📁</button>
                <button @click="sendWhatsApp(client)" class="action-btn whatsapp" title="WhatsApp">💬</button>
                <button @click="editClient(client)" class="action-btn" title="Editar">✏️</button>
                <button @click="confirmDeleteClient(client)" class="action-btn danger" title="Excluir">🗑️</button>
              </div>
            </td>
          </tr>
          <tr v-if="clients.length === 0">
            <td colspan="6" class="empty-state">
              <div class="empty-content">
                <span>😕</span>
                <p>Nenhum cliente encontrado</p>
                <button class="btn-primary" @click="openNewClientModal">➕ Cadastrar Primeiro Cliente</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="currentPage = 1" :disabled="currentPage === 1" class="page-btn">⏮️</button>
      <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn">◀️</button>
      <span class="page-info">Página {{ currentPage }} de {{ totalPages }} ({{ clients.length }} clientes)</span>
      <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn">▶️</button>
      <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="page-btn">⏭️</button>
      <select v-model="itemsPerPage" class="per-page-select">
        <option :value="10">10 por página</option>
        <option :value="25">25 por página</option>
        <option :value="50">50 por página</option>
      </select>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingClient ? 'Editar Cliente' : 'Novo Cliente' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        <form @submit.prevent="saveClient" class="modal-body">
          <div class="form-group">
            <label>Nome Completo *</label>
            <input v-model="form.name" type="text" required placeholder="Ex: Maria Silva" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" required placeholder="email@exemplo.com" />
            </div>
            <div class="form-group">
              <label>Telefone / WhatsApp</label>
              <input v-model="form.phone" type="tel" placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div class="form-group">
            <label>Endereço</label>
            <input v-model="form.address" type="text" placeholder="Rua, número, bairro, cidade" />
          </div>
          <div class="form-group">
            <label>Observações</label>
            <textarea v-model="form.notes" rows="3" placeholder="Anotações sobre o cliente..."></textarea>
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : (editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Client Detail Drawer -->
    <div v-if="selectedClient" class="drawer-overlay" @click.self="selectedClient = null">
      <div class="drawer">
        <div class="drawer-header">
          <div class="drawer-avatar" :style="{ background: getAvatarColor(selectedClient.name) }">
            {{ getInitials(selectedClient.name) }}
          </div>
          <div class="drawer-title">
            <h3>{{ selectedClient.name }}</h3>
            <p>Cliente desde {{ formatDate(selectedClient.createdAt) }}</p>
          </div>
          <button class="close-btn" @click="selectedClient = null">✕</button>
        </div>
        <div class="drawer-body">
          <div class="drawer-section">
            <h4>📞 Contato</h4>
            <div class="info-row">
              <span class="label">Email:</span>
              <a :href="'mailto:' + selectedClient.email">{{ selectedClient.email }}</a>
            </div>
            <div class="info-row">
              <span class="label">Telefone:</span>
              <span>{{ selectedClient.phone || '-' }}</span>
            </div>
            <div v-if="selectedClient.address" class="info-row">
              <span class="label">Endereço:</span>
              <span>{{ selectedClient.address }}</span>
            </div>
          </div>
          <div class="drawer-section">
            <h4>📊 Resumo</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="value">{{ selectedClient.projectsCount }}</span>
                <span class="label">Projetos</span>
              </div>
              <div class="summary-item">
                <span class="value">R$ {{ formatCurrency(selectedClient.totalSpent) }}</span>
                <span class="label">Total Gasto</span>
              </div>
            </div>
          </div>
          <div v-if="selectedClient.notes" class="drawer-section">
            <h4>📝 Observações</h4>
            <p class="notes-text">{{ selectedClient.notes }}</p>
          </div>
          <div class="drawer-actions">
            <button @click="newProjectForClient(selectedClient)" class="btn-primary">📁 Novo Projeto</button>
            <button @click="sendWhatsApp(selectedClient)" class="btn-whatsapp">💬 WhatsApp</button>
            <button @click="editClient(selectedClient)" class="btn-secondary">✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { studioService, type Client, type ClientStats } from '@/services/studio'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const sortBy = ref('name')
const showModal = ref(false)
const editingClient = ref<Client | null>(null)
const selectedClient = ref<Client | null>(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const formError = ref('')

const clients = ref<Client[]>([])
const stats = ref<ClientStats>({ total: 0, activeClients: 0, newThisMonth: 0, totalRevenue: 0 })

const form = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: ''
})

// Debounce search
let searchTimeout: any = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadClients(), 300)
}

// Load data
const loadClients = async () => {
  loading.value = true
  try {
    const [clientsData, statsData] = await Promise.all([
      studioService.getClients({ search: searchQuery.value, sortBy: sortBy.value }),
      studioService.getClientStats()
    ])
    clients.value = clientsData
    stats.value = statsData
  } catch (error) {
    console.error('Erro ao carregar clientes:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadClients)

// Computed
const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return clients.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => Math.ceil(clients.value.length / itemsPerPage.value))

// Reset page when search changes
watch(searchQuery, () => { currentPage.value = 1 })
watch(sortBy, () => { currentPage.value = 1 })

// Methods
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR')
const formatDate = (date: string | null | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

const getAvatarColor = (name: string) => {
  const colors = ['#D4775C', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4']
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

const isNewClient = (client: Client) => {
  const weekAgo = Date.now() - 604800000
  return new Date(client.createdAt).getTime() > weekAgo
}

const openNewClientModal = () => {
  editingClient.value = null
  form.name = ''
  form.email = ''
  form.phone = ''
  form.address = ''
  form.notes = ''
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingClient.value = null
  formError.value = ''
}

const viewClient = (client: Client) => {
  selectedClient.value = client
}

const editClient = (client: Client) => {
  editingClient.value = client
  form.name = client.name
  form.email = client.email
  form.phone = client.phone || ''
  form.address = client.address || ''
  form.notes = client.notes || ''
  formError.value = ''
  showModal.value = true
  selectedClient.value = null
}

const confirmDeleteClient = async (client: Client) => {
  if (confirm(`Tem certeza que deseja excluir ${client.name}?`)) {
    const success = await studioService.deleteClient(client.id)
    if (success) {
      await loadClients()
    } else {
      alert('Erro ao excluir cliente')
    }
  }
}

const newProjectForClient = (client: Client) => {
  router.push({ path: '/studio', query: { section: 'projects', newProject: 'true', clientName: client.name, clientEmail: client.email } })
}

const sendWhatsApp = (client: Client) => {
  if (!client.phone) {
    alert('Cliente não possui telefone cadastrado')
    return
  }
  const phone = client.phone.replace(/\D/g, '')
  const message = encodeURIComponent(`Olá ${client.name.split(' ')[0]}! `)
  window.open(`https://wa.me/55${phone}?text=${message}`, '_blank')
}

const saveClient = async () => {
  saving.value = true
  formError.value = ''
  
  try {
    if (editingClient.value) {
      await studioService.updateClient(editingClient.value.id, {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined
      })
    } else {
      await studioService.createClient({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined
      })
    }
    closeModal()
    await loadClients()
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Erro ao salvar cliente'
    formError.value = message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.clients-section { }
.loading-state { text-align: center; padding: 60px 20px; color: #64748b; font-size: 1.1rem; }

/* Header */
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; gap: 8px; background: white; padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; min-width: 280px; }
.search-box input { border: none; outline: none; font-size: 0.9rem; flex: 1; background: transparent; }
.sort-select { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; font-size: 0.9rem; cursor: pointer; }
.btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #D4775C, #E8956F); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* Stats Row */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 14px; }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.stat-icon.blue { background: #dbeafe; }
.stat-icon.green { background: #dcfce7; }
.stat-icon.orange { background: #fef3c7; }
.stat-icon.purple { background: #ede9fe; }
.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 1.4rem; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 0.8rem; color: #64748b; }

/* Table */
.table-container { background: white; border-radius: 12px; overflow: hidden; }
.clients-table { width: 100%; border-collapse: collapse; }
.clients-table th { text-align: left; padding: 14px 16px; background: #f8fafc; font-weight: 600; font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
.clients-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.clients-table tbody tr { cursor: pointer; transition: background 0.15s; }
.clients-table tbody tr:hover { background: #f8fafc; }
.col-client { width: 25%; }
.col-contact { width: 22%; }
.col-projects { width: 10%; text-align: center; }
.col-spent { width: 15%; }
.col-last { width: 13%; }
.col-actions { width: 15%; }

.client-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.85rem; flex-shrink: 0; }
.client-name { display: flex; align-items: center; gap: 8px; }
.client-name strong { color: #1e293b; }
.new-badge { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.contact-info { display: flex; flex-direction: column; gap: 2px; }
.contact-info .email { color: #1e293b; font-size: 0.9rem; }
.contact-info .phone { color: #64748b; font-size: 0.8rem; }
.projects-count { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; background: #f1f5f9; border-radius: 6px; font-weight: 600; font-size: 0.9rem; }
.spent-value { font-weight: 600; color: #1e293b; }
.last-date { color: #64748b; font-size: 0.85rem; }
.action-buttons { display: flex; gap: 6px; }
.action-btn { width: 32px; height: 32px; border: none; border-radius: 6px; background: #f1f5f9; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
.action-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
.action-btn.whatsapp:hover { background: #dcfce7; }
.action-btn.danger:hover { background: #fee2e2; }
.empty-state { text-align: center; padding: 60px 20px !important; }
.empty-content span { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-content p { color: #64748b; margin: 0 0 20px 0; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: white; border-top: 1px solid #f1f5f9; margin-top: -1px; border-radius: 0 0 12px 12px; }
.page-btn { width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { background: #f1f5f9; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { color: #64748b; font-size: 0.9rem; }
.per-page-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; font-size: 0.85rem; margin-left: 12px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; line-height: 1; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; color: #374151; }
.form-group input, .form-group textarea { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; transition: border-color 0.15s; box-sizing: border-box; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: #D4775C; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-error { color: #dc2626; font-size: 0.85rem; margin-bottom: 12px; padding: 10px; background: #fef2f2; border-radius: 8px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.btn-secondary { padding: 10px 20px; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; font-weight: 500; }

/* Drawer */
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 1000; }
.drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 400px; max-width: 100%; background: white; box-shadow: -4px 0 20px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.drawer-header { display: flex; align-items: center; gap: 16px; padding: 24px; border-bottom: 1px solid #e2e8f0; }
.drawer-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.2rem; }
.drawer-title { flex: 1; }
.drawer-title h3 { margin: 0 0 4px 0; }
.drawer-title p { margin: 0; color: #64748b; font-size: 0.85rem; }
.drawer-body { flex: 1; padding: 24px; overflow-y: auto; }
.drawer-section { margin-bottom: 24px; }
.drawer-section h4 { margin: 0 0 12px 0; font-size: 0.9rem; color: #64748b; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.info-row .label { color: #64748b; }
.info-row a { color: #D4775C; text-decoration: none; }
.notes-text { color: #475569; font-size: 0.9rem; line-height: 1.5; }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.summary-item { background: #f8fafc; padding: 16px; border-radius: 10px; text-align: center; }
.summary-item .value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.summary-item .label { font-size: 0.8rem; color: #64748b; }
.drawer-actions { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.btn-whatsapp { padding: 12px 20px; background: #25D366; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

/* Responsive */
@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .col-last { display: none; } .clients-table th:nth-child(5), .clients-table td:nth-child(5) { display: none; } }
@media (max-width: 768px) { .stats-row { grid-template-columns: 1fr 1fr; } .header-actions { width: 100%; } .search-box { flex: 1; min-width: auto; } .col-contact { display: none; } .clients-table th:nth-child(2), .clients-table td:nth-child(2) { display: none; } .drawer { width: 100%; } }
</style>
