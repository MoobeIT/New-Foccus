<template>
  <nav class="global-nav" :class="{ scrolled: isScrolled, transparent: transparent }">
    <div class="nav-inner">
      <router-link to="/" class="brand">
        <div class="brand-icon">F</div>
        <span>Foccus Álbuns</span>
      </router-link>

      <div class="nav-menu" v-if="showMenu">
        <router-link to="/products">Catálogo</router-link>
        <router-link to="/studio" v-if="isAuthenticated">Studio</router-link>
      </div>

      <div class="nav-actions">
        <!-- Cart - Always visible when authenticated -->
        <router-link to="/cart" class="cart-btn" aria-label="Carrinho">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
        </router-link>

        <!-- User menu -->
        <template v-if="isAuthenticated">
          <router-link to="/studio/projects" class="nav-link">Projetos</router-link>
          <div class="user-menu" @click="toggleUserMenu">
            <div class="user-avatar">{{ userInitial }}</div>
            <div v-if="showUserMenu" class="user-dropdown">
              <router-link to="/studio" class="dropdown-item">🎨 Studio</router-link>
              <router-link to="/orders" class="dropdown-item">📦 Pedidos</router-link>
              <router-link to="/settings" class="dropdown-item">⚙️ Configurações</router-link>
              <div class="dropdown-divider"></div>
              <button @click="logout" class="dropdown-item logout">🚪 Sair</button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link">Entrar</router-link>
          <router-link to="/register" class="btn-cta">Começar</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

defineProps<{
  transparent?: boolean
  showMenu?: boolean
}>()

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const isScrolled = ref(false)
const showUserMenu = ref(false)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const cartCount = computed(() => cartStore.itemCount)
const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const logout = async () => {
  await authStore.logout()
  router.push('/')
}

const onScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  // Ensure cart is loaded
  if (!cartStore.cart) {
    cartStore.fetchCart()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.global-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #EBE7E0;
  transition: all 0.3s;
}

.global-nav.transparent:not(.scrolled) {
  background: transparent;
  border-bottom-color: transparent;
}

.global-nav.scrolled {
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #2D2A26;
  font-weight: 600;
  font-size: 1.1rem;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.2rem;
}

.nav-menu {
  display: flex;
  gap: 24px;
}

.nav-menu a {
  color: #6B6560;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: #D4775C;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F7F4EE;
  color: #6B6560;
  text-decoration: none;
  transition: all 0.2s;
}

.cart-btn:hover {
  background: #EBE7E0;
  color: #D4775C;
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: #D4775C;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid white;
}

.nav-link {
  color: #6B6560;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #F7F4EE;
  color: #D4775C;
}

.btn-cta {
  background: linear-gradient(135deg, #D4775C, #C96B50);
  color: white;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3);
}

.user-menu {
  position: relative;
  cursor: pointer;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  min-width: 180px;
  padding: 8px;
  z-index: 100;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 14px;
  color: #4A4744;
  text-decoration: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #F7F4EE;
}

.dropdown-item.logout {
  color: #DC2626;
}

.dropdown-divider {
  height: 1px;
  background: #EBE7E0;
  margin: 8px 0;
}

@media (max-width: 768px) {
  .nav-menu {
    display: none;
  }
  
  .nav-link {
    display: none;
  }
}
</style>
