import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([]);
  const defaultDuration = 5000; // 5 seconds

  const add = (notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? defaultDuration,
    };

    notifications.value.push(newNotification);

    // Auto-remove after duration (unless persistent)
    if (!notification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        remove(id);
      }, newNotification.duration);
    }

    return id;
  };

  const remove = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  const clear = () => {
    notifications.value = [];
  };

  // Convenience methods
  const success = (title: string, message?: string, duration?: number) => {
    return add({ type: 'success', title, message, duration });
  };

  const error = (title: string, message?: string, duration?: number) => {
    return add({ type: 'error', title, message, duration: duration ?? 8000 });
  };

  const warning = (title: string, message?: string, duration?: number) => {
    return add({ type: 'warning', title, message, duration });
  };

  const info = (title: string, message?: string, duration?: number) => {
    return add({ type: 'info', title, message, duration });
  };

  return {
    notifications,
    add,
    remove,
    clear,
    success,
    error,
    warning,
    info,
  };
});
