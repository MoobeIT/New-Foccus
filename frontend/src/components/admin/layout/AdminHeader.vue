<template>
  <header class="admin-header">
    <div class="header-left">
      <div class="page-info">
        <h1 class="page-title">{{ title }}</h1>
        <nav class="breadcrumb">
          <span class="breadcrumb-item">Admin</span>
          <svg class="breadcrumb-separator" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06L7.28 12.78a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
          </svg>
          <span class="breadcrumb-item current">{{ title }}</span>
        </nav>
      </div>
    </div>

    <div class="header-right">
      <!-- Search -->
      <div class="search-container">
        <div class="search-box">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
          </svg>
          <input 
            type="text" 
            placeholder="Buscar..." 
            :value="searchQuery"
            @input="$emit('search', $event.target.value)"
            class="search-input"
          />
          <kbd v-if="!searchQuery" class="search-shortcut">⌘K</kbd>
        </div>
      </div>

      <!-- Actions -->
      <div class="header-actions">
        <!-- Notifications -->
        <button class="action-btn notification-btn" title="Notificações">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
          <span class="notification-dot"></span>
        </button>

        <!-- Refresh -->
        <button class="action-btn" @click="$emit('refresh')" title="Atualizar dados">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Settings -->
        <button class="action-btn" title="Configurações rápidas">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Help -->
        <button class="action-btn" title="Ajuda">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- User Menu -->
      <div class="user-menu" @click="toggleUserMenu" ref="userMenuRef">
        <button class="user-menu-trigger">
          <div class="user-avatar">
            <span>{{ userInitials }}</span>
          </div>
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role">Administrador</span>
          </div>
          <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"/>
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="dropdown-header">
            <div class="user-avatar-large">
              <span>{{ userInitials }}</span>
            </div>
            <div>
              <div class="dropdown-user-name">{{ userName }}</div>
              <div class="dropdown-user-email">admin@fotolivros.com</div>
            </div>
          </div>
          
          <div class="dropdown-divider"></div>
          
          <nav class="dropdown-nav">
            <a href="#" class="dropdown-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 00-11.215 0c-.22.578.254 1.139.872 1.139h9.47z"/>
              </svg>
              Meu Perfil
            </a>
            <a href="#" class="dropdown-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V3a2 2 0 012-2h2zM6 10v3a2 2 0 002 2h2a2 2 0 002-2v-3a2 2 0 00-2-2H8a2 2 0 00-2 2z"/>
              </svg>
              Preferências
            </a>
            <a href="#" class="dropdown-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V3a2 2 0 012-2h2z"/>
              </svg>
              Tema
            </a>
          </nav>
          
          <div class="dropdown-divider"></div>
          
          <button class="dropdown-item logout-item" @click="handleLogout">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 3a1 1 0 011-1h8a1 1 0 011 1v3a1 1 0 11-2 0V4H5v8h6v-2a1 1 0 112 0v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3z"/>
              <path d="M10 8a.5.5 0 01-.5.5H6a.5.5 0 010-1h3.5A.5.5 0 0110 8z"/>
            </svg>
            Sair
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface Props {
  title: string
  searchQuery: string
}

defineProps<Props>()
defineEmits<{
  search: [query: string]
  refresh: []
}>()

const router = useRouter()
const authStore = useAuthStore()

const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement>()

// Computed
const userName = computed(() => authStore.userName || 'Admin')
const userInitials = computed(() => {
  const name = authStore.userName || 'Admin'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  height: 80px;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

/* Left Section */
.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.page-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.breadcrumb-item {
  color: var(--gray-500);
}

.breadcrumb-item.current {
  color: var(--primary-600);
  font-weight: var(--font-medium);
}

.breadcrumb-separator {
  color: var(--gray-300);
  width: 16px;
  height: 16px;
}

/* Right Section */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

/* Search */
.search-container {
  position: relative;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 320px;
  padding: var(--space-3) var(--space-4);
  padding-left: var(--space-10);
  padding-right: var(--space-12);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-xl);
  font-size: var(--text-sm);
  background: var(--gray-50);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-500);
  background: white;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--gray-400);
  pointer-events: none;
}

.search-shortcut {
  position: absolute;
  right: var(--space-3);
  font-size: var(--text-xs);
  color: var(--gray-400);
  background: var(--gray-200);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
}

/* Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--gray-100);
  color: var(--gray-600);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.action-btn:hover {
  background: var(--gray-200);
  color: var(--gray-700);
}

.notification-btn .notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--error-500);
  border: 2px solid white;
  border-radius: 50%;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.user-menu-trigger:hover {
  background: var(--gray-100);
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary-600);
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-900);
  line-height: 1.2;
}

.user-role {
  font-size: var(--text-xs);
  color: var(--gray-500);
  line-height: 1.2;
}

.chevron {
  color: var(--gray-400);
  transition: transform var(--transition-fast);
}

.user-menu-trigger:hover .chevron {
  color: var(--gray-600);
}

/* Dropdown */
.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-2);
  width: 280px;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-dropdown);
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--gray-50);
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  background: var(--primary-600);
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
}

.dropdown-user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.dropdown-user-email {
  font-size: var(--text-xs);
  color: var(--gray-500);
}

.dropdown-divider {
  height: 1px;
  background: var(--gray-200);
}

.dropdown-nav {
  padding: var(--space-2);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--gray-700);
  text-decoration: none;
  border: none;
  background: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.logout-item {
  color: var(--error-600);
}

.logout-item:hover {
  background: var(--error-50);
  color: var(--error-700);
}

/* Responsive */
@media (max-width: 768px) {
  .admin-header {
    padding: 0 var(--space-4);
  }
  
  .search-input {
    width: 200px;
  }
  
  .user-info {
    display: none;
  }
  
  .page-title {
    font-size: var(--text-xl);
  }
  
  .breadcrumb {
    display: none;
  }
}

@media (max-width: 640px) {
  .search-container {
    display: none;
  }
  
  .header-actions {
    gap: var(--space-1);
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
  }
}
</style>