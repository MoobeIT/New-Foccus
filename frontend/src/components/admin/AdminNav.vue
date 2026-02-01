<template>
  <nav class="admin-nav">
    <router-link to="/admin" class="nav-link" :class="{ active: isActive('/admin') }">
      📊 Dashboard
    </router-link>
    <router-link to="/admin/orders" class="nav-link" :class="{ active: isActive('/admin/orders') }">
      📦 Pedidos
      <span v-if="pendingOrders > 0" class="badge">{{ pendingOrders }}</span>
    </router-link>
    <router-link to="/admin/templates" class="nav-link" :class="{ active: isActive('/admin/templates') }">
      ✨ Templates
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const pendingOrders = ref(5); // TODO: Get from store

const isActive = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin';
  }
  return route.path.startsWith(path);
};
</script>

<style scoped>
.admin-nav {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: #6b7280;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-link.active {
  background: #eff6ff;
  color: #3b82f6;
}

.badge {
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
}
</style>
