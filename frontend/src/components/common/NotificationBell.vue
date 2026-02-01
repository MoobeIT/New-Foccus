<template>
  <div class="notification-bell" ref="bellRef">
    <button class="bell-button" @click="toggleDropdown" :class="{ 'has-unread': unreadCount > 0 }">
      🔔
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="notifications-dropdown">
        <div class="dropdown-header">
          <h4>Notificações</h4>
          <button v-if="unreadCount > 0" class="btn-mark-all" @click="markAllAsRead">
            Marcar todas como lidas
          </button>
        </div>

        <div v-if="loading" class="dropdown-loading">
          <div class="spinner"></div>
        </div>

        <div v-else-if="notifications.length === 0" class="dropdown-empty">
          <span class="empty-icon">📭</span>
          <p>Nenhuma notificação</p>
        </div>

        <div v-else class="notifications-list">
          <div 
            v-for="notification in notifications" 
            :key="notification.id"
            :class="['notification-item', { unread: !notification.read }]"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-icon">{{ getNotificationIcon(notification.type) }}</div>
            <div class="notification-content">
              <span class="notification-title">{{ notification.title }}</span>
              <span class="notification-message">{{ notification.message }}</span>
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
            </div>
            <div v-if="!notification.read" class="unread-dot"></div>
          </div>
        </div>

        <div class="dropdown-footer">
          <router-link to="/orders" class="btn-view-all" @click="isOpen = false">
            Ver todos os pedidos →
          </router-link>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { orderNotificationsService, type OrderNotification } from '@/services/orderNotifications'

const router = useRouter()
const bellRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const loading = ref(false)
const notifications = ref<OrderNotification[]>([])

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    loadNotifications()
  }
}

const loadNotifications = async () => {
  loading.value = true
  try {
    // Temporariamente desabilitado para evitar erros 500
    // notifications.value = await orderNotificationsService.fetchNotifications()
    console.log('📡 Notificações temporariamente desabilitadas')
    notifications.value = []
  } finally {
    loading.value = false
  }
}

const markAllAsRead = async () => {
  await orderNotificationsService.markAllAsRead()
  notifications.value = notifications.value.map(n => ({ ...n, read: true }))
}

const handleNotificationClick = async (notification: OrderNotification) => {
  if (!notification.read) {
    await orderNotificationsService.markAsRead(notification.id)
    notification.read = true
  }

  isOpen.value = false
  
  // Navegar para o pedido
  if (notification.orderId) {
    router.push(`/orders/${notification.orderId}`)
  }
}

const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    status_change: '📋',
    payment: '💳',
    production: '🏭',
    shipping: '🚚',
    delivery: '📦',
  }
  return icons[type] || '🔔'
}

const formatTime = (date: Date | string): string => {
  const now = new Date()
  const notifDate = new Date(date)
  const diffMs = now.getTime() - notifDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  
  return notifDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Fechar dropdown ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  if (bellRef.value && !bellRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Listener para atualizações de notificações
let unsubscribe: (() => void) | null = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  unsubscribe = orderNotificationsService.addListener((newNotifications) => {
    notifications.value = newNotifications
  })

  // Carregar notificações iniciais
  loadNotifications()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-button {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 0.2s;
}

.bell-button:hover {
  background: #f3f4f6;
}

.bell-button.has-unread {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notifications-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dropdown-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-mark-all {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-mark-all:hover {
  text-decoration: underline;
}

.dropdown-loading,
.dropdown-empty {
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 8px;
}

.dropdown-empty p {
  color: #6b7280;
  margin: 0;
}

.notifications-list {
  max-height: 320px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: #eff6ff;
}

.notification-item.unread:hover {
  background: #dbeafe;
}

.notification-icon {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.notification-message {
  display: block;
  font-size: 0.8125rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  display: block;
  font-size: 0.6875rem;
  color: #9ca3af;
  margin-top: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.btn-view-all {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-view-all:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .notifications-dropdown {
    width: calc(100vw - 32px);
    right: -100px;
  }
}
</style>
