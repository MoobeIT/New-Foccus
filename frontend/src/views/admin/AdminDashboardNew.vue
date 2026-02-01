<template>
  <div class="admin-dashboard">
    <!-- Sidebar -->
    <AdminSidebar 
      :collapsed="sidebarCollapsed" 
      :active-section="activeSection"
      @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      @section-change="activeSection = $event"
    />

    <!-- Main Content -->
    <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- Header -->
      <AdminHeader 
        :title="currentTitle"
        :search-query="searchQuery"
        @search="searchQuery = $event"
        @refresh="refreshData"
      />

      <!-- Content Area -->
      <div class="content-wrapper">
        <component 
          :is="currentComponent" 
          :search-query="searchQuery"
          @refresh="refreshData"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AdminSidebar from '@/components/admin/layout/AdminSidebar.vue'
import AdminHeader from '@/components/admin/layout/AdminHeader.vue'
import DashboardOverview from '@/components/admin/sections/DashboardOverview.vue'
import OrdersManagement from '@/components/admin/sections/OrdersManagement.vue'
import ProductionQueue from '@/components/admin/sections/ProductionQueue.vue'
import ProductsCatalogManagement from '@/components/admin/ProductsCatalogManagement.vue'
import FormatsManagement from '@/components/admin/FormatsManagement.vue'
import PapersManagement from '@/components/admin/PapersManagement.vue'
import CoverTypesManagement from '@/components/admin/CoverTypesManagement.vue'
import ProductConfigurationManagement from '@/components/admin/ProductConfigurationManagement.vue'

// Estado
const activeSection = ref('dashboard')
const sidebarCollapsed = ref(false)
const searchQuery = ref('')

// Menu configuration
const menuConfig = {
  dashboard: { title: 'Dashboard', component: DashboardOverview },
  orders: { title: 'Pedidos', component: OrdersManagement },
  production: { title: 'Produção', component: ProductionQueue },
  products: { title: 'Produtos', component: ProductsCatalogManagement },
  formats: { title: 'Formatos', component: FormatsManagement },
  papers: { title: 'Papéis', component: PapersManagement },
  covers: { title: 'Tipos de Capa', component: CoverTypesManagement },
  'product-config': { title: 'Configuração de Produtos', component: ProductConfigurationManagement },
}

// Computed
const currentTitle = computed(() => {
  return menuConfig[activeSection.value]?.title || 'Dashboard'
})

const currentComponent = computed(() => {
  return menuConfig[activeSection.value]?.component || DashboardOverview
})

// Methods
const refreshData = () => {
  // Emit refresh event to current component
  console.log('Refreshing data...')
}
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background-color: var(--gray-50);
}

.main-content {
  flex: 1;
  margin-left: 280px;
  transition: margin-left var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.main-content.sidebar-collapsed {
  margin-left: 80px;
}

.content-wrapper {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 80px;
  }
  
  .main-content.sidebar-collapsed {
    margin-left: 0;
  }
}
</style>