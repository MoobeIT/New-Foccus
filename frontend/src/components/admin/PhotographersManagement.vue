<template>
  <div class="photographers-management">
    <!-- Header -->
    <div class="section-header">
      <div class="section-title">
        <h2>📸 Gestão de Fotógrafos</h2>
        <p>Gerencie os fotógrafos cadastrados no sistema</p>
      </div>
      <div class="section-actions">
        <div class="search-box">
          <span>🔍</span>
          <input v-model="searchQuery" type="text" placeholder="Buscar fotógrafo..." />
        </div>
        <select v-model="statusFilter" class="filter-select">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="pending">Pendentes</option>
        </select>
        <button class="btn-primary" @click="openCreateModal">
          <span>➕</span> Novo Fotógrafo
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-icon">📸</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.active }}</span>
          <span class="stat-label">Ativos</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📁</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalProjects }}</span>
          <span class="stat-label">Projetos</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">💰</span>
        <div class="stat-info">
          <span class="stat-value">R$ {{ stats.totalRevenue }}</span>
          <span class="stat-label">Receita</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fotógrafo</th>
            <th>Contato</th>
            <th>Projetos</th>
            <th>Pedidos</th>
            <th>Receita</th>
            <th>Status</th>
            <th>Cadastro</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="photographer in filteredPhotographers" :key="photographer.id">
            <td>
              <div class="photographer-cell">
                <div class="avatar">{{ getInitials(photographer.name) }}</div>
                <div class="info">
                  <span class="name">{{ photographer.name }}</span>
                  <span class="studio">{{ photographer.studioName || '-' }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="contact-cell">
                <span>📧 {{ photographer.email }}</span>
                <span v-if="photographer.phone">📱 {{ photographer.phone }}</span>
              </div>
            </td>
            <td class="center">{{ photographer.projectsCount }}</td>
            <td class="center">{{ photographer.ordersCount }}</td>
            <td class="revenue">R$ {{ photographer.revenue.toFixed(2) }}</td>
            <td>
              <span :class="['status-badge', photographer.status]">
                {{ getStatusLabel(photographer.status) }}
              </span>
            </td>
            <td>{{ formatDate(photographer.createdAt) }}</td>
            <td class="actions-cell">
              <button class="action-btn" @click="viewPhotographer(photographer)" title="Ver detalhes">👁️</button>
              <button class="action-btn" @click="editPhotographer(photographer)" title="Editar">✏️</button>
              <button class="action-btn" @click="accessAsPhotographer(photographer)" title="Acessar como">🔑</button>
              <button 
                class="action-btn" 
                :class="photographer.status === 'active' ? 'warning' : 'success'"
                @click="toggleStatus(photographer)" 
                :title="photographer.status === 'active' ? 'Desativar' : 'Ativar'"
              >
                {{ photographer.status === 'active' ? '⏸️' : '▶️' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="filteredPhotographers.length === 0" class="empty-state">
      <span class="empty-icon">📸</span>
      <h3>Nenhum fotógrafo encontrado</h3>
      <p v-if="searchQuery || statusFilter">Tente ajustar os filtros</p>
      <p v-else>Cadastre o primeiro fotógrafo do sistema</p>
      <button class="btn-primary" @click="openCreateModal">➕ Cadastrar Fotógrafo</button>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingPhotographer ? '✏️ Editar Fotógrafo' : '➕ Novo Fotógrafo' }}</h2>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        <form @submit.prevent="savePhotographer">
          <div class="form-grid">
            <div class="form-group">
              <label>Nome Completo *</label>
              <input v-model="form.name" type="text" required />
            </div>
            <div class="form-group">
              <label>E-mail *</label>
              <input v-model="form.email" type="email" required />
            </div>
            <div class="form-group">
              <label>Telefone</label>
              <input v-model="form.phone" type="tel" placeholder="(11) 99999-9999" />
            </div>
            <div class="form-group">
              <label>WhatsApp</label>
              <input v-model="form.whatsapp" type="tel" placeholder="(11) 99999-9999" />
            </div>
            <div class="form-group full-width">
              <label>Nome do Estúdio</label>
              <input v-model="form.studioName" type="text" placeholder="Ex: Studio Foccus" />
            </div>
            <div class="form-group full-width" v-if="!editingPhotographer">
              <label>Senha Inicial *</label>
              <input v-model="form.password" type="password" required minlength="6" />
              <small>Mínimo 6 caracteres. O fotógrafo poderá alterar depois.</small>
            </div>
            <div class="form-group full-width">
              <label>Observações</label>
              <textarea v-model="form.notes" rows="3" placeholder="Anotações internas..."></textarea>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary">
              {{ editingPhotographer ? 'Salvar Alterações' : 'Cadastrar Fotógrafo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- View Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click.self="showDetailsModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>📸 Detalhes do Fotógrafo</h2>
          <button class="close-btn" @click="showDetailsModal = false">✕</button>
        </div>
        <div class="details-content" v-if="selectedPhotographer">
          <div class="details-header">
            <div class="avatar-lg">{{ getInitials(selectedPhotographer.name) }}</div>
            <div class="details-info">
              <h3>{{ selectedPhotographer.name }}</h3>
              <p>{{ selectedPhotographer.studioName || 'Sem nome de estúdio' }}</p>
              <span :class="['status-badge', selectedPhotographer.status]">
                {{ getStatusLabel(selectedPhotographer.status) }}
              </span>
            </div>
          </div>
          
          <div class="details-stats">
            <div class="detail-stat">
              <span class="label">Projetos</span>
              <span class="value">{{ selectedPhotographer.projectsCount }}</span>
            </div>
            <div class="detail-stat">
              <span class="label">Pedidos</span>
              <span class="value">{{ selectedPhotographer.ordersCount }}</span>
            </div>
            <div class="detail-stat">
              <span class="label">Clientes</span>
              <span class="value">{{ selectedPhotographer.clientsCount }}</span>
            </div>
            <div class="detail-stat">
              <span class="label">Receita Total</span>
              <span class="value">R$ {{ selectedPhotographer.revenue.toFixed(2) }}</span>
            </div>
          </div>

          <div class="details-section">
            <h4>Contato</h4>
            <p>📧 {{ selectedPhotographer.email }}</p>
            <p v-if="selectedPhotographer.phone">📱 {{ selectedPhotographer.phone }}</p>
            <p v-if="selectedPhotographer.whatsapp">💬 {{ selectedPhotographer.whatsapp }}</p>
          </div>

          <div class="details-section">
            <h4>Últimos Projetos</h4>
            <div class="mini-list">
              <div v-for="project in selectedPhotographer.recentProjects" :key="project.id" class="mini-item">
                <span>{{ project.name }}</span>
                <span class="mini-date">{{ formatDate(project.createdAt) }}</span>
              </div>
              <p v-if="!selectedPhotographer.recentProjects?.length" class="empty-text">Nenhum projeto ainda</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDetailsModal = false">Fechar</button>
          <button class="btn-primary" @click="editPhotographer(selectedPhotographer); showDetailsModal = false">
            ✏️ Editar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Photographer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  studioName?: string;
  status: 'active' | 'inactive' | 'pending';
  projectsCount: number;
  ordersCount: number;
  clientsCount: number;
  revenue: number;
  createdAt: Date;
  notes?: string;
  recentProjects?: Array<{ id: string; name: string; createdAt: Date }>;
}

const searchQuery = ref('');
const statusFilter = ref('');
const showModal = ref(false);
const showDetailsModal = ref(false);
const editingPhotographer = ref<Photographer | null>(null);
const selectedPhotographer = ref<Photographer | null>(null);

const form = ref({
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  studioName: '',
  password: '',
  notes: '',
  status: 'active' as const
});

// Mock data
const photographers = ref<Photographer[]>([
  {
    id: '1',
    name: 'Marina Rodrigues',
    email: 'marina@studiomr.com',
    phone: '(11) 99999-1111',
    whatsapp: '(11) 99999-1111',
    studioName: 'Studio MR Fotografia',
    status: 'active',
    projectsCount: 45,
    ordersCount: 38,
    clientsCount: 32,
    revenue: 18500.00,
    createdAt: new Date('2024-06-15'),
    recentProjects: [
      { id: '1', name: 'Casamento Ana & Pedro', createdAt: new Date() },
      { id: '2', name: 'Ensaio Família Silva', createdAt: new Date(Date.now() - 86400000) }
    ]
  },
  {
    id: '2',
    name: 'Carlos Eduardo',
    email: 'carlos@focusfoto.com',
    phone: '(21) 98888-2222',
    studioName: 'Focus Fotografia',
    status: 'active',
    projectsCount: 28,
    ordersCount: 24,
    clientsCount: 20,
    revenue: 12300.00,
    createdAt: new Date('2024-08-20'),
    recentProjects: []
  },
  {
    id: '3',
    name: 'Juliana Santos',
    email: 'ju@julianasantos.com',
    studioName: 'Juliana Santos Photography',
    status: 'pending',
    projectsCount: 0,
    ordersCount: 0,
    clientsCount: 0,
    revenue: 0,
    createdAt: new Date('2024-12-20'),
    recentProjects: []
  }
]);

const stats = computed(() => ({
  total: photographers.value.length,
  active: photographers.value.filter(p => p.status === 'active').length,
  totalProjects: photographers.value.reduce((sum, p) => sum + p.projectsCount, 0),
  totalRevenue: photographers.value.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)
}));

const filteredPhotographers = computed(() => {
  return photographers.value.filter(p => {
    const matchesSearch = !searchQuery.value || 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.studioName?.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = !statusFilter.value || p.status === statusFilter.value;
    
    return matchesSearch && matchesStatus;
  });
});

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente'
  };
  return labels[status] || status;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
};

const openCreateModal = () => {
  editingPhotographer.value = null;
  form.value = {
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    studioName: '',
    password: '',
    notes: '',
    status: 'active'
  };
  showModal.value = true;
};

const editPhotographer = (photographer: Photographer) => {
  editingPhotographer.value = photographer;
  form.value = {
    name: photographer.name,
    email: photographer.email,
    phone: photographer.phone || '',
    whatsapp: photographer.whatsapp || '',
    studioName: photographer.studioName || '',
    password: '',
    notes: photographer.notes || '',
    status: photographer.status
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingPhotographer.value = null;
};

const savePhotographer = () => {
  if (editingPhotographer.value) {
    // Update
    const index = photographers.value.findIndex(p => p.id === editingPhotographer.value!.id);
    if (index !== -1) {
      photographers.value[index] = {
        ...photographers.value[index],
        ...form.value
      };
    }
  } else {
    // Create
    photographers.value.push({
      id: Date.now().toString(),
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      whatsapp: form.value.whatsapp,
      studioName: form.value.studioName,
      status: form.value.status,
      notes: form.value.notes,
      projectsCount: 0,
      ordersCount: 0,
      clientsCount: 0,
      revenue: 0,
      createdAt: new Date(),
      recentProjects: []
    });
  }
  closeModal();
};

const viewPhotographer = (photographer: Photographer) => {
  selectedPhotographer.value = photographer;
  showDetailsModal.value = true;
};

const toggleStatus = (photographer: Photographer) => {
  photographer.status = photographer.status === 'active' ? 'inactive' : 'active';
};

const accessAsPhotographer = (photographer: Photographer) => {
  // TODO: Implementar "login como" para debug/suporte
  alert(`Acessando como: ${photographer.name}\n\nEsta funcionalidade permite ao admin visualizar o sistema como se fosse o fotógrafo.`);
};
</script>

<style scoped>
.photographers-management {
  background: white;
  border-radius: 16px;
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.section-title h2 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.section-title p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.section-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.9rem;
  width: 180px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 10px 16px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px;
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.85rem;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.data-table td.center {
  text-align: center;
}

.photographer-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.photographer-cell .info {
  display: flex;
  flex-direction: column;
}

.photographer-cell .name {
  font-weight: 500;
  color: #1e293b;
}

.photographer-cell .studio {
  font-size: 0.8rem;
  color: #64748b;
}

.contact-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
  color: #64748b;
}

.revenue {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: #e2e8f0;
}

.action-btn.warning:hover {
  background: #fef3c7;
}

.action-btn.success:hover {
  background: #dcfce7;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
}

.empty-state p {
  color: #64748b;
  margin-bottom: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal.modal-lg {
  max-width: 720px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group small {
  font-size: 0.8rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

/* Details Modal */
.details-content {
  padding: 24px;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.avatar-lg {
  width: 64px;
  height: 64px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.5rem;
}

.details-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
}

.details-info p {
  margin: 0 0 8px 0;
  color: #64748b;
}

.details-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.detail-stat {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.detail-stat .label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 4px;
}

.detail-stat .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.details-section {
  margin-bottom: 20px;
}

.details-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.details-section p {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
}

.mini-list {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}

.mini-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.mini-item:last-child {
  border-bottom: none;
}

.mini-date {
  font-size: 0.8rem;
  color: #64748b;
}

.empty-text {
  color: #94a3b8;
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}
</style>
