/**
 * Order Notifications Service
 * Gerencia notificações de pedidos e rastreamento
 */

import { api } from './api'

export interface OrderNotification {
  id: string
  orderId: string
  orderNumber: string
  type: 'status_change' | 'payment' | 'production' | 'shipping' | 'delivery'
  title: string
  message: string
  trackingCode?: string
  trackingUrl?: string
  read: boolean
  createdAt: Date
}

export interface TrackingInfo {
  trackingCode: string
  carrier: string
  carrierName: string
  status: string
  statusLabel: string
  estimatedDelivery?: Date
  events: TrackingEvent[]
  trackingUrl: string
}

export interface TrackingEvent {
  id: string
  status: string
  description: string
  location?: string
  timestamp: Date
}

class OrderNotificationsService {
  private notifications: OrderNotification[] = []
  private listeners: ((notifications: OrderNotification[]) => void)[] = []

  /**
   * Buscar notificações do usuário
   */
  async fetchNotifications(): Promise<OrderNotification[]> {
    try {
      const response = await api.get('/notifications')
      this.notifications = response.data
      this.notifyListeners()
      return this.notifications
    } catch (error: any) {
      // Se for erro 404 ou 500, significa que o endpoint não existe ainda
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        console.log('📡 Endpoint de notificações não implementado, usando dados locais')
        this.notifications = this.getLocalNotifications()
        this.notifyListeners()
        return this.notifications
      }
      
      console.error('Erro ao buscar notificações:', error)
      // Retornar do localStorage como fallback
      this.notifications = this.getLocalNotifications()
      this.notifyListeners()
      return this.notifications
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      
      const notification = this.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.read = true
        this.notifyListeners()
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  /**
   * Marcar todas como lidas
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.post('/notifications/read-all')
      
      this.notifications.forEach(n => n.read = true)
      this.notifyListeners()
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  /**
   * Buscar informações de rastreamento
   */
  async getTrackingInfo(orderId: string): Promise<TrackingInfo | null> {
    try {
      const response = await api.get(`/orders/${orderId}/tracking`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar rastreamento:', error)
      return null
    }
  }

  /**
   * Buscar rastreamento por código
   */
  async getTrackingByCode(trackingCode: string): Promise<TrackingInfo | null> {
    try {
      const response = await api.get(`/tracking/${trackingCode}`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar rastreamento:', error)
      return null
    }
  }

  /**
   * Gerar URL de rastreamento dos Correios
   */
  getCorreiosTrackingUrl(trackingCode: string): string {
    return `https://www.linkcorreios.com.br/?id=${trackingCode}`
  }

  /**
   * Obter label do status
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Aguardando pagamento',
      paid: 'Pagamento confirmado',
      production: 'Em produção',
      quality_check: 'Verificação de qualidade',
      ready_to_ship: 'Pronto para envio',
      shipped: 'Enviado',
      in_transit: 'Em trânsito',
      out_for_delivery: 'Saiu para entrega',
      delivered: 'Entregue',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  /**
   * Obter cor do status
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      paid: '#3b82f6',
      production: '#8b5cf6',
      quality_check: '#6366f1',
      ready_to_ship: '#10b981',
      shipped: '#06b6d4',
      in_transit: '#0ea5e9',
      out_for_delivery: '#22c55e',
      delivered: '#22c55e',
      completed: '#22c55e',
      cancelled: '#ef4444',
    }
    return colors[status] || '#6b7280'
  }

  /**
   * Criar notificação local (para testes/fallback)
   */
  createLocalNotification(notification: Omit<OrderNotification, 'id' | 'createdAt' | 'read'>): void {
    const newNotification: OrderNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date(),
    }

    this.notifications.unshift(newNotification)
    this.saveLocalNotifications()
    this.notifyListeners()

    // Mostrar notificação do browser se permitido
    this.showBrowserNotification(newNotification)
  }

  /**
   * Mostrar notificação do browser
   */
  private async showBrowserNotification(notification: OrderNotification): Promise<void> {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        tag: notification.id,
      })
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          tag: notification.id,
        })
      }
    }
  }

  /**
   * Solicitar permissão para notificações
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * Obter contagem de não lidas
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  /**
   * Adicionar listener para mudanças
   */
  addListener(callback: (notifications: OrderNotification[]) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Notificar listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]))
  }

  /**
   * Salvar notificações localmente
   */
  private saveLocalNotifications(): void {
    try {
      localStorage.setItem('orderNotifications', JSON.stringify(this.notifications))
    } catch (error) {
      console.error('Erro ao salvar notificações:', error)
    }
  }

  /**
   * Carregar notificações locais
   */
  private getLocalNotifications(): OrderNotification[] {
    try {
      const data = localStorage.getItem('orderNotifications')
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Simular atualização de status (para desenvolvimento)
   */
  simulateStatusUpdate(orderId: string, orderNumber: string, newStatus: string): void {
    const statusMessages: Record<string, { title: string; message: string }> = {
      paid: {
        title: 'Pagamento confirmado! 💳',
        message: `Seu pedido #${orderNumber} foi pago e está sendo processado.`,
      },
      production: {
        title: 'Produção iniciada! 🏭',
        message: `Seu pedido #${orderNumber} está sendo produzido com carinho.`,
      },
      ready_to_ship: {
        title: 'Pronto para envio! 📦',
        message: `Seu pedido #${orderNumber} está pronto e será enviado em breve.`,
      },
      shipped: {
        title: 'Pedido enviado! 🚚',
        message: `Seu pedido #${orderNumber} está a caminho! Acompanhe pelo código de rastreio.`,
      },
      out_for_delivery: {
        title: 'Saiu para entrega! 🏃',
        message: `Seu pedido #${orderNumber} está saindo para entrega hoje!`,
      },
      delivered: {
        title: 'Pedido entregue! 🎉',
        message: `Seu pedido #${orderNumber} foi entregue. Aproveite!`,
      },
    }

    const statusInfo = statusMessages[newStatus]
    if (statusInfo) {
      this.createLocalNotification({
        orderId,
        orderNumber,
        type: newStatus === 'shipped' ? 'shipping' : newStatus === 'delivered' ? 'delivery' : 'status_change',
        title: statusInfo.title,
        message: statusInfo.message,
        trackingCode: newStatus === 'shipped' ? 'BR' + Math.random().toString(36).substr(2, 9).toUpperCase() : undefined,
      })
    }
  }
}

export const orderNotificationsService = new OrderNotificationsService()
export default orderNotificationsService
