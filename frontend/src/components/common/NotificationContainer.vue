<template>
  <div class="notification-container fixed top-4 right-4 z-50 space-y-2">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm"
        :class="getNotificationClasses(notification.type)"
      >
        <div class="flex items-start">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <component :is="getNotificationIcon(notification.type)" class="w-5 h-5" />
          </div>
          
          <!-- Content -->
          <div class="ml-3 flex-1">
            <p class="text-sm font-medium text-gray-900">
              {{ notification.title }}
            </p>
            <p class="text-sm text-gray-600 mt-1">
              {{ notification.message }}
            </p>
            
            <!-- Actions -->
            <div v-if="notification.actions && notification.actions.length > 0" class="mt-3 flex space-x-2">
              <button
                v-for="action in notification.actions"
                :key="action.label"
                @click="action.action(); removeNotification(notification.id)"
                class="text-xs px-3 py-1 rounded-md transition-colors"
                :class="getActionClasses(action.style || 'primary')"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
          
          <!-- Close Button -->
          <div class="ml-4 flex-shrink-0">
            <button
              @click="removeNotification(notification.id)"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNotificationStore } from '@/stores/notifications';

const notificationStore = useNotificationStore();

// Computed
const notifications = computed(() => notificationStore.notifications);

// Methods
const removeNotification = (id: string): void => {
  notificationStore.removeNotification(id);
};

const getNotificationClasses = (type: string): string => {
  const classes = {
    success: 'border-green-400',
    error: 'border-red-400',
    warning: 'border-yellow-400',
    info: 'border-blue-400'
  };
  return classes[type as keyof typeof classes] || classes.info;
};

const getActionClasses = (style: string): string => {
  const classes = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return classes[style as keyof typeof classes] || classes.primary;
};

const getNotificationIcon = (type: string) => {
  const icons = {
    success: {
      template: `
        <svg class="text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    },
    error: {
      template: `
        <svg class="text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    },
    warning: {
      template: `
        <svg class="text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      `
    },
    info: {
      template: `
        <svg class="text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    }
  };

  return icons[type as keyof typeof icons] || icons.info;
};
</script>

<style scoped>
/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Notification item styling */
.notification-item {
  min-width: 320px;
  max-width: 400px;
}

@media (max-width: 640px) {
  .notification-container {
    left: 1rem;
    right: 1rem;
  }
  
  .notification-item {
    min-width: auto;
    max-width: none;
  }
}
</style>