<template>
  <div class="coupons-management">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>🎟️ Cupons de Desconto</h1>
        <p>Crie e gerencie cupons promocionais</p>
      </div>
      <button class="btn-primary" @click="openModal('create')">
        ✨ Novo Cupom
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total de Cupons</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.active }}</span>
        <span class="stat-label">Ativos</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.expired }}</span>
        <span class="stat-label">Expirados</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">R$ {{ formatPrice(stats.totalDiscount) }}</span>
        <span class="stat-label">Total em Descontos</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">⏳ Carregando cupons...</div>

    <!-- Lista de Cupons -->
    <div class="coupons-list">
      <div v-if="coupons.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">🎟️</div>
        <h3>Nenhum cupom cadastrado</h3>
        <p>Crie seu primeiro cupom de desconto</p>
      </div>

      <div v-for="coupon in coupons" :key="coupon.id" class="coupon-card">
        <div class="coupon-header">
          <div class="coupon-code">{{ coupon.code }}</div>
          <span :class="['status-badge', coupon.isActive ? 'active' : 'inactive']">
            {{ coupon.isActive ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <div class="coupon-value">
          <span class="discount">
            {{ coupon.type === 'percentage' ? coupon.value + '%' : 'R$ ' + formatPrice(coupon.value) }}
          </span>
          <span class="discount-type">{{ coupon.type === 'percentage' ? 'de desconto' : 'de desconto fixo' }}</span>
        </div>

        <div class="coupon-details">
          <div v-if="coupon.minPurchase > 0" class="detail">
            <span>Compra mínima:</span>
            <strong>R$ {{ formatPrice(coupon.minPurchase) }}</strong>
          </div>
          <div v-if="coupon.maxDiscount" class="detail">
            <span>Desconto máximo:</span>
            <strong>R$ {{ formatPrice(coupon.maxDiscount) }}</strong>
          </div>
          <div class="detail">
            <span>Usos:</span>
            <strong>{{ coupon.usedCount }}{{ coupon.maxUses ? ' / ' + coupon.maxUses : '' }}</strong>
          </div>
          <div v-if="coupon.validUntil" class="detail">
            <span>Válido até:</span>
            <strong>{{ formatDate(coupon.validUntil) }}</strong>
          </div>
        </div>

        <div class="coupon-actions">
          <button class="btn-action" @click="openModal('edit', coupon)">✏️ Editar</button>
          <button class="btn-action" @click="toggleActive(coupon)">
            {{ coupon.isActive ? '⏸️ Desativar' : '▶️ Ativar' }}
          </button>
          <button class="btn-action danger" @click="deleteCoupon(coupon)">🗑️ Excluir</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ modalMode === 'create' ? '✨ Novo Cupom' : '✏️ Editar Cupom' }}</h2>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="saveCoupon" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Código do Cupom *</label>
              <input 
                v-model="form.code" 
                type="text" 
                placeholder="DESCONTO10"
                required
                @input="form.code = form.code.toUpperCase()"
              />
              <small>Será convertido para maiúsculas</small>
            </div>
            <div class="form-group">
              <label>Tipo de Desconto *</label>
              <select v-model="form.type" required>
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Valor do Desconto *</label>
              <input 
                v-model.number="form.value" 
                type="number" 
                step="0.01" 
                min="0"
                :max="form.type === 'percentage' ? 100 : undefined"
                required
              />
              <small>{{ form.type === 'percentage' ? 'Porcentagem (ex: 10 = 10%)' : 'Valor em reais' }}</small>
            </div>
            <div class="form-group">
              <label>Compra Mínima (R$)</label>
              <input v-model.number="form.minPurchase" type="number" step="0.01" min="0" />
            </div>
          </div>

          <div class="form-row" v-if="form.type === 'percentage'">
            <div class="form-group">
              <label>Desconto Máximo (R$)</label>
              <input v-model.number="form.maxDiscount" type="number" step="0.01" min="0" />
              <small>Limite máximo do desconto em reais</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Limite de Usos Total</label>
              <input v-model.number="form.maxUses" type="number" min="1" />
              <small>Deixe vazio para ilimitado</small>
            </div>
            <div class="form-group">
              <label>Limite por Usuário</label>
              <input v-model.number="form.maxUsesPerUser" type="number" min="1" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Válido a partir de</label>
              <input v-model="form.validFrom" type="datetime-local" />
            </div>
            <div class="form-group">
              <label>Válido até</label>
              <input v-model="form.validUntil" type="datetime-local" />
            </div>
          </div>

          <div class="form-group">
            <label>Descrição (interno)</label>
            <input v-model="form.description" type="text" placeholder="Promoção de Natal 2025" />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="form.isActive" />
              <strong>Cupom Ativo</strong>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '⏳ Salvando...' : 'Salvar Cupom' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Notificação -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface Coupon {
  id: string
  code: string
  description?: string
  type: 'percentage' | 'fixed'
  value: number
  minPurchase: number
  maxDiscount?: number
  maxUses?: number
  maxUsesPerUser?: number
  usedCount: number
  validFrom?: string
  validUntil?: string
  isActive: boolean
}

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const notification = ref<{ type: string; message: string } | null>(null)

const coupons = ref<Coupon[]>([])
const stats = ref({ total: 0, active: 0, expired: 0, totalDiscount: 0 })

const form = reactive({
  code: '',
  description: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 10,
  minPurchase: 0,
  maxDiscount: null as number | null,
  maxUses: null as number | null,
  maxUsesPerUser: null as number | null,
  validFrom: '',
  validUntil: '',
  isActive: true,
})

const formatPrice = (value: number) => {
  return (value || 0).toFixed(2).replace('.', ',')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}

const showNotification = (type: string, message: string) => {
  notification.value = { type, message }
  setTimeout(() => notification.value = null, 4000)
}

const loadCoupons = async () => {
  loading.value = true
  try {
    const token = authStore.token
    const headers = { 'Authorization': `Bearer ${token}` }

    const [couponsRes, statsRes] = await Promise.all([
      fetch('/api/v1/coupons', { headers }),
      fetch('/api/v1/coupons/stats', { headers }),
    ])

    if (couponsRes.ok) {
      const data = await couponsRes.json()
      coupons.value = data.data?.coupons || data.coupons || []
    }

    if (statsRes.ok) {
      const data = await statsRes.json()
      stats.value = data.data || data
    }
  } catch (error) {
    console.error('Erro ao carregar cupons:', error)
    showNotification('error', 'Erro ao carregar cupons')
  } finally {
    loading.value = false
  }
}

const openModal = (mode: 'create' | 'edit', coupon?: Coupon) => {
  modalMode.value = mode
  if (mode === 'edit' && coupon) {
    editingId.value = coupon.id
    form.code = coupon.code
    form.description = coupon.description || ''
    form.type = coupon.type
    form.value = coupon.value
    form.minPurchase = coupon.minPurchase
    form.maxDiscount = coupon.maxDiscount || null
    form.maxUses = coupon.maxUses || null
    form.maxUsesPerUser = coupon.maxUsesPerUser || null
    form.validFrom = coupon.validFrom ? coupon.validFrom.slice(0, 16) : ''
    form.validUntil = coupon.validUntil ? coupon.validUntil.slice(0, 16) : ''
    form.isActive = coupon.isActive
  } else {
    resetForm()
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  editingId.value = null
  form.code = ''
  form.description = ''
  form.type = 'percentage'
  form.value = 10
  form.minPurchase = 0
  form.maxDiscount = null
  form.maxUses = null
  form.maxUsesPerUser = null
  form.validFrom = ''
  form.validUntil = ''
  form.isActive = true
}

const saveCoupon = async () => {
  if (!form.code || form.value <= 0) {
    showNotification('error', 'Preencha os campos obrigatórios')
    return
  }

  saving.value = true
  try {
    const token = authStore.token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const payload = {
      code: form.code,
      description: form.description || undefined,
      type: form.type,
      value: form.value,
      minPurchase: form.minPurchase || 0,
      maxDiscount: form.maxDiscount || undefined,
      maxUses: form.maxUses || undefined,
      maxUsesPerUser: form.maxUsesPerUser || undefined,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      isActive: form.isActive,
    }

    const url = editingId.value 
      ? `/api/v1/coupons/${editingId.value}`
      : '/api/v1/coupons'
    
    const method = editingId.value ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      showNotification('success', `Cupom ${editingId.value ? 'atualizado' : 'criado'} com sucesso!`)
      closeModal()
      await loadCoupons()
    } else {
      const error = await res.json()
      showNotification('error', error.message || 'Erro ao salvar cupom')
    }
  } catch (error) {
    console.error('Erro ao salvar cupom:', error)
    showNotification('error', 'Erro ao salvar cupom')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (coupon: Coupon) => {
  try {
    const token = authStore.token
    const res = await fetch(`/api/v1/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    })

    if (res.ok) {
      showNotification('success', `Cupom ${coupon.isActive ? 'desativado' : 'ativado'}!`)
      await loadCoupons()
    }
  } catch (error) {
    showNotification('error', 'Erro ao alterar status')
  }
}

const deleteCoupon = async (coupon: Coupon) => {
  if (!confirm(`Excluir o cupom "${coupon.code}"?`)) return

  try {
    const token = authStore.token
    const res = await fetch(`/api/v1/coupons/${coupon.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (res.ok) {
      showNotification('success', 'Cupom excluído!')
      await loadCoupons()
    }
  } catch (error) {
    showNotification('error', 'Erro ao excluir cupom')
  }
}

onMounted(() => {
  loadCoupons()
})
</script>

<style scoped>
.coupons-management {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 { margin: 0 0 0.5rem 0; color: #111827; }
.header p { color: #6b7280; margin: 0; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.coupons-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.coupon-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.coupon-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.coupon-code {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  background: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  letter-spacing: 1px;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #fee2e2; color: #991b1b; }

.coupon-value {
  text-align: center;
  padding: 1rem 0;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 1rem;
}

.discount {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #059669;
}

.discount-type {
  color: #6b7280;
  font-size: 0.875rem;
}

.coupon-details {
  margin-bottom: 1rem;
}

.detail {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid #f9fafb;
}

.detail span { color: #6b7280; }

.coupon-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary, .btn-secondary, .btn-action {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; }

.btn-secondary { background: #f3f4f6; color: #374151; }

.btn-action {
  flex: 1;
  padding: 0.5rem;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.75rem;
}

.btn-action.danger:hover { background: #fee2e2; color: #dc2626; }

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon { font-size: 4rem; margin-bottom: 1rem; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 { margin: 0; }

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input, .form-group select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: #2563eb;
}

.form-group small {
  color: #9ca3af;
  font-size: 0.75rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 1.5rem;
}

.notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  z-index: 1001;
}

.notification.success { background: #10b981; color: white; }
.notification.error { background: #ef4444; color: white; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
</style>
