<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-content">
        <div class="brand-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#gradient)" />
            <path d="M8 12h16v8H8z" fill="white" opacity="0.9" />
            <path d="M10 14h12v4H10z" fill="white" opacity="0.7" />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                <stop stop-color="#3B82F6" />
                <stop offset="1" stop-color="#1D4ED8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div v-if="!collapsed" class="brand-text">
          <h1>FotoAdmin</h1>
          <span>Editor Profissional</span>
        </div>
      </div>
      <button 
        class="collapse-toggle" 
        @click="$emit('toggle-sidebar')"
        :title="collapsed ? 'Expandir menu' : 'Recolher menu'"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path :d="collapsed ? 'M6 4l4 4-4 4' : 'M10 4L6 8l4 4'" />
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Main Section -->
      <div class="nav-section">
        <h3 v-if="!collapsed" class="nav-section-title">Principal</h3>
        <ul class="nav-list">
          <li v-for="item in mainMenuItems" :key="item.id">
            <button
              class="nav-item"
              :class="{ active: activeSection === item.id }"
              @click="$emit('section-change', item.id)"
              :title="collapsed ? item.label : ''"
            >
              <span class="nav-icon" v-html="item.icon"></span>
              <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
              <span v-if="item.badge && !collapsed" class="nav-badge">{{ item.badge }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Catalog Section -->
      <div class="nav-section">
        <h3 v-if="!collapsed" class="nav-section-title">Catálogo</h3>
        <ul class="nav-list">
          <li v-for="item in catalogMenuItems" :key="item.id">
            <button
              class="nav-item"
              :class="{ active: activeSection === item.id }"
              @click="$emit('section-change', item.id)"
              :title="collapsed ? item.label : ''"
            >
              <span class="nav-icon" v-html="item.icon"></span>
              <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- System Section -->
      <div class="nav-section">
        <h3 v-if="!collapsed" class="nav-section-title">Sistema</h3>
        <ul class="nav-list">
          <li v-for="item in systemMenuItems" :key="item.id">
            <button
              class="nav-item"
              :class="{ active: activeSection === item.id }"
              @click="$emit('section-change', item.id)"
              :title="collapsed ? item.label : ''"
            >
              <span class="nav-icon" v-html="item.icon"></span>
              <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User Section -->
    <div class="sidebar-footer">
      <div v-if="!collapsed" class="user-profile">
        <div class="user-avatar">
          <span>{{ userInitials }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ userName }}</span>
          <span class="user-role">Administrador</span>
        </div>
      </div>
      
      <button class="logout-btn" @click="handleLogout" :title="collapsed ? 'Sair' : ''">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 11-2 0V4H5v12h10v-2a1 1 0 112 0v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3z"/>
          <path d="M13 10a1 1 0 01-1 1H6a1 1 0 110-2h6a1 1 0 011 1z"/>
          <path d="M10.293 7.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L11.586 11H6a1 1 0 110-2h5.586l-1.293-1.293a1 1 0 010-1.414z"/>
        </svg>
        <span v-if="!collapsed">Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface Props {
  collapsed: boolean
  activeSection: string
}

defineProps<Props>()
defineEmits<{
  'toggle-sidebar': []
  'section-change': [section: string]
}>()

const router = useRouter()
const authStore = useAuthStore()

// Menu items
const mainMenuItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>' 
  },
  { 
    id: 'orders', 
    label: 'Pedidos', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>',
    badge: '5' 
  },
  { 
    id: 'production', 
    label: 'Produção', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    badge: '3' 
  },
]

const catalogMenuItems = [
  { 
    id: 'products', 
    label: 'Produtos', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>' 
  },
  { 
    id: 'formats', 
    label: 'Formatos', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z"/></svg>' 
  },
  { 
    id: 'papers', 
    label: 'Papéis', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>' 
  },
  { 
    id: 'covers', 
    label: 'Tipos de Capa', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>' 
  },
  { 
    id: 'product-config', 
    label: 'Configurações', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>' 
  },
]

const systemMenuItems = [
  { 
    id: 'users', 
    label: 'Usuários', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>' 
  },
  { 
    id: 'settings', 
    label: 'Configurações', 
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>' 
  },
]

// Computed
const userName = computed(() => authStore.userName || 'Admin')
const userInitials = computed(() => {
  const name = authStore.userName || 'Admin'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// Methods
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 280px;
  background: linear-gradient(180deg, var(--gray-900) 0%, var(--gray-800) 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  z-index: var(--z-fixed);
  border-right: 1px solid var(--gray-700);
}

.sidebar.collapsed {
  width: 80px;
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-700);
  min-height: 80px;
}

.brand-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

.brand-icon {
  flex-shrink: 0;
}

.brand-text h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: white;
}

.brand-text span {
  font-size: var(--text-xs);
  color: var(--gray-300);
  display: block;
  margin-top: 2px;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: var(--radius-lg);
  color: var(--gray-300);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: var(--space-4) 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: var(--space-6);
}

.nav-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gray-400);
  margin: 0 0 var(--space-3) var(--space-6);
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--space-3) var(--space-6);
  background: none;
  border: none;
  color: var(--gray-300);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: var(--primary-600);
  color: white;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary-400);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  margin-right: var(--space-3);
  flex-shrink: 0;
}

.nav-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  flex: 1;
}

.nav-badge {
  background: var(--error-500);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

/* Footer */
.sidebar-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--gray-700);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary-600);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: white;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: var(--text-xs);
  color: var(--gray-400);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
  color: #fca5a5;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fecaca;
}

/* Collapsed state adjustments */
.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--space-3);
}

.sidebar.collapsed .nav-icon {
  margin-right: 0;
}

.sidebar.collapsed .user-profile {
  justify-content: center;
  padding: var(--space-3);
}

.sidebar.collapsed .logout-btn {
  justify-content: center;
  padding: var(--space-3);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar:not(.collapsed) {
    width: 80px;
  }
  
  .sidebar:not(.collapsed) .nav-item {
    justify-content: center;
    padding: var(--space-3);
  }
  
  .sidebar:not(.collapsed) .nav-icon {
    margin-right: 0;
  }
}
</style>