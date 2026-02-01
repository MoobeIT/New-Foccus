<template>
  <div class="order-tracking">
    <div class="tracking-header">
      <h3>Rastreamento do Pedido</h3>
      <span class="order-number">#{{ orderNumber }}</span>
    </div>

    <!-- Status atual -->
    <div class="current-status" :style="{ borderColor: statusColor }">
      <div class="status-icon" :style="{ background: statusColor }">
        {{ statusIcon }}
      </div>
      <div class="status-info">
        <span class="status-label">{{ statusLabel }}</span>
        <span v-if="estimatedDelivery" class="estimated-delivery">
          Previsão: {{ formatDate(estimatedDelivery) }}
        </span>
      </div>
    </div>

    <!-- Código de rastreio -->
    <div v-if="trackingCode" class="tracking-code-section">
      <div class="tracking-code-header">
        <span class="label">Código de Rastreio</span>
        <span class="carrier">{{ carrierName }}</span>
      </div>
      <div class="tracking-code-value">
        <code>{{ trackingCode }}</code>
        <button class="btn-copy" @click="copyTrackingCode" title="Copiar código">
          {{ copied ? '✓' : '📋' }}
        </button>
      </div>
      <a :href="trackingUrl" target="_blank" class="btn-track-external">
        🔗 Rastrear no site da transportadora
      </a>
    </div>

    <!-- Timeline de eventos -->
    <div class="tracking-timeline">
      <div 
        v-for="(event, index) in events" 
        :key="event.id"
        :class="['timeline-event', { 'is-current': index === 0 }]"
      >
        <div class="event-dot" :style="{ background: index === 0 ? statusColor : '#e5e7eb' }"></div>
        <div class="event-line" v-if="index < events.length - 1"></div>
        <div class="event-content">
          <span class="event-description">{{ event.description }}</span>
          <div class="event-meta">
            <span v-if="event.location" class="event-location">📍 {{ event.location }}</span>
            <span class="event-time">{{ formatDateTime(event.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div class="tracking-actions">
      <button v-if="canRefresh" class="btn-refresh" @click="refreshTracking" :disabled="loading">
        {{ loading ? 'Atualizando...' : '🔄 Atualizar' }}
      </button>
      <button v-if="showNotifyButton" class="btn-notify" @click="enableNotifications">
        🔔 Receber notificações
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { orderNotificationsService } from '@/services/orderNotifications'

interface TrackingEvent {
  id: string
  status: string
  description: string
  location?: string
  timestamp: Date
}

const props = defineProps<{
  orderId: string
  orderNumber: string
  status: string
  trackingCode?: string
  carrier?: string
  estimatedDelivery?: Date
  events?: TrackingEvent[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const loading = ref(false)
const copied = ref(false)
const notificationsEnabled = ref(false)

const statusLabel = computed(() => orderNotificationsService.getStatusLabel(props.status))
const statusColor = computed(() => orderNotificationsService.getStatusColor(props.status))

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    pending: '⏳',
    paid: '💳',
    production: '🏭',
    quality_check: '🔍',
    ready_to_ship: '📦',
    shipped: '🚚',
    in_transit: '🚛',
    out_for_delivery: '🏃',
    delivered: '✅',
    completed: '🎉',
    cancelled: '❌',
  }
  return icons[props.status] || '📋'
})

const carrierName = computed(() => {
  const carriers: Record<string, string> = {
    correios: 'Correios',
    jadlog: 'Jadlog',
    sedex: 'Correios SEDEX',
    pac: 'Correios PAC',
  }
  return carriers[props.carrier?.toLowerCase() || ''] || props.carrier || 'Transportadora'
})

const trackingUrl = computed(() => {
  if (!props.trackingCode) return ''
  
  if (props.carrier?.toLowerCase().includes('correios') || 
      props.carrier?.toLowerCase() === 'sedex' || 
      props.carrier?.toLowerCase() === 'pac') {
    return orderNotificationsService.getCorreiosTrackingUrl(props.trackingCode)
  }
  
  return `https://www.google.com/search?q=${props.trackingCode}+rastreamento`
})

const canRefresh = computed(() => {
  return props.trackingCode && !['delivered', 'completed', 'cancelled'].includes(props.status)
})

const showNotifyButton = computed(() => {
  return !notificationsEnabled.value && 'Notification' in window
})

const events = computed(() => {
  return props.events || []
})

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

const formatDateTime = (date: Date | string) => {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const copyTrackingCode = async () => {
  if (!props.trackingCode) return
  
  try {
    await navigator.clipboard.writeText(props.trackingCode)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (error) {
    console.error('Erro ao copiar:', error)
  }
}

const refreshTracking = async () => {
  loading.value = true
  emit('refresh')
  
  // Simular delay
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const enableNotifications = async () => {
  const granted = await orderNotificationsService.requestNotificationPermission()
  notificationsEnabled.value = granted
  
  if (granted) {
    // Mostrar confirmação
    alert('Notificações ativadas! Você receberá atualizações sobre seu pedido.')
  }
}

onMounted(async () => {
  if ('Notification' in window && Notification.permission === 'granted') {
    notificationsEnabled.value = true
  }
})
</script>

<style scoped>
.order-tracking {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tracking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tracking-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.order-number {
  font-size: 0.875rem;
  color: #6b7280;
  font-family: monospace;
}

.current-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  border-left: 4px solid;
  margin-bottom: 20px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
}

.status-info {
  flex: 1;
}

.status-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.estimated-delivery {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 4px;
}

.tracking-code-section {
  background: #f3f4f6;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.tracking-code-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tracking-code-header .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.tracking-code-header .carrier {
  font-size: 0.75rem;
  color: #9ca3af;
}

.tracking-code-value {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tracking-code-value code {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0.05em;
}

.btn-copy {
  padding: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-copy:hover {
  background: #f9fafb;
}

.btn-track-external {
  display: inline-block;
  font-size: 0.875rem;
  color: #3b82f6;
  text-decoration: none;
}

.btn-track-external:hover {
  text-decoration: underline;
}

.tracking-timeline {
  margin-bottom: 20px;
}

.timeline-event {
  display: flex;
  gap: 12px;
  position: relative;
  padding-bottom: 20px;
}

.timeline-event:last-child {
  padding-bottom: 0;
}

.event-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.event-line {
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.event-content {
  flex: 1;
}

.event-description {
  display: block;
  font-size: 0.9375rem;
  color: #1f2937;
  font-weight: 500;
}

.is-current .event-description {
  font-weight: 600;
}

.event-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.event-location,
.event-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.tracking-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh,
.btn-notify {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled),
.btn-notify:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-notify {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.btn-notify:hover {
  background: #fde68a;
}
</style>
