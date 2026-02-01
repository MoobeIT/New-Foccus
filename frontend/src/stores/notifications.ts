import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  createdAt: Date;
}

interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export const useNotificationStore = defineStore('notifications', () => {
  // Estado
  const notifications = ref<Notification[]>([]);
  const maxNotifications = ref(5);

  // Computed
  const hasNotifications = computed(() => notifications.value.length > 0);
  const unreadCount = computed(() => notifications.value.length);

  // Actions
  const addNotification = (message: string, options: NotificationOptions = {}): string => {
    const id = generateId();
    const notification: Notification = {
      id,
      type: options.type || 'info',
      title: options.title || getDefaultTitle(options.type || 'info'),
      message,
      duration: options.duration || (options.persistent ? 0 : getDefaultDuration(options.type || 'info')),
      persistent: options.persistent || false,
      actions: options.actions || [],
      createdAt: new Date(),
    };

    notifications.value.unshift(notification);

    // Limitar número de notificações
    if (notifications.value.length > maxNotifications.value) {
      notifications.value = notifications.value.slice(0, maxNotifications.value);
    }

    // Auto-remover se não for persistente
    if (!notification.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  };

  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const clearAll = (): void => {
    notifications.value = [];
  };

  const clearByType = (type: Notification['type']): void => {
    notifications.value = notifications.value.filter(n => n.type !== type);
  };

  // Métodos de conveniência
  const success = (message: string, options: Omit<NotificationOptions, 'type'> = {}): string => {
    return addNotification(message, { ...options, type: 'success' });
  };

  const error = (message: string, options: Omit<NotificationOptions, 'type'> = {}): string => {
    return addNotification(message, { ...options, type: 'error', persistent: true });
  };

  const warning = (message: string, options: Omit<NotificationOptions, 'type'> = {}): string => {
    return addNotification(message, { ...options, type: 'warning' });
  };

  const info = (message: string, options: Omit<NotificationOptions, 'type'> = {}): string => {
    return addNotification(message, { ...options, type: 'info' });
  };

  // Notificações específicas do sistema
  const notifyUploadSuccess = (filename: string): string => {
    return success(`Arquivo "${filename}" enviado com sucesso!`);
  };

  const notifyUploadError = (filename: string, errorMessage: string): string => {
    return error(`Erro ao enviar "${filename}": ${errorMessage}`);
  };

  const notifyProjectSaved = (projectName: string): string => {
    return success(`Projeto "${projectName}" salvo com sucesso!`);
  };

  const notifyProjectError = (projectName: string, errorMessage: string): string => {
    return error(`Erro ao salvar projeto "${projectName}": ${errorMessage}`);
  };

  const notifyOfflineMode = (): string => {
    return warning('Você está offline. As alterações serão sincronizadas quando a conexão for restabelecida.', {
      persistent: true,
    });
  };

  const notifyOnlineMode = (): string => {
    return success('Conexão restabelecida! Sincronizando dados...');
  };

  const notifyPWAUpdate = (): string => {
    return info('Nova versão disponível!', {
      persistent: true,
      actions: [
        {
          label: 'Atualizar',
          action: () => window.location.reload(),
          style: 'primary',
        },
        {
          label: 'Depois',
          action: () => {},
          style: 'secondary',
        },
      ],
    });
  };

  const notifyPWAInstallable = (): string => {
    return info('Instale o app para uma melhor experiência!', {
      duration: 10000,
      actions: [
        {
          label: 'Instalar',
          action: () => {
            // Será implementado no componente PWA
            window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
          },
          style: 'primary',
        },
      ],
    });
  };

  // Utilitários
  const generateId = (): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getDefaultTitle = (type: Notification['type']): string => {
    const titles = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Atenção',
      info: 'Informação',
    };
    return titles[type];
  };

  const getDefaultDuration = (type: Notification['type']): number => {
    const durations = {
      success: 4000,
      error: 0, // Persistente por padrão
      warning: 6000,
      info: 5000,
    };
    return durations[type];
  };

  return {
    // Estado
    notifications,
    maxNotifications,

    // Computed
    hasNotifications,
    unreadCount,

    // Actions
    addNotification,
    removeNotification,
    clearAll,
    clearByType,

    // Métodos de conveniência
    success,
    error,
    warning,
    info,

    // Notificações específicas
    notifyUploadSuccess,
    notifyUploadError,
    notifyProjectSaved,
    notifyProjectError,
    notifyOfflineMode,
    notifyOnlineMode,
    notifyPWAUpdate,
    notifyPWAInstallable,
  };
});