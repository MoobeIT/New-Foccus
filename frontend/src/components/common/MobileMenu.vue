<template>
  <Teleport to="body">
    <Transition name="menu">
      <div v-if="isOpen" class="mobile-menu-overlay" @click="close">
        <nav class="mobile-menu" @click.stop>
          <div class="menu-header">
            <router-link to="/" class="brand" @click="close">
              <div class="brand-icon">F</div>
              <span>Foccus Álbuns</span>
            </router-link>
            <button class="close-btn" @click="close" aria-label="Fechar menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="menu-content">
            <div class="menu-section">
              <router-link to="/products" @click="close">Produtos</router-link>
              <a href="#como-funciona" @click="scrollTo('como-funciona')">Como Funciona</a>
              <a href="#recursos" @click="scrollTo('recursos')">Recursos</a>
            </div>

            <div class="menu-divider"></div>

            <div class="menu-section" v-if="!isAuthenticated">
              <router-link to="/login" class="menu-link" @click="close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                Entrar
              </router-link>
              <router-link to="/register" class="menu-cta" @click="close">
                Criar Conta Grátis
              </router-link>
            </div>

            <div class="menu-section" v-else>
              <router-link to="/projects" class="menu-link" @click="close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Meus Projetos
              </router-link>
              <router-link to="/orders" class="menu-link" @click="close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>
                </svg>
                Meus Pedidos
              </router-link>
              <router-link to="/cart" class="menu-link" @click="close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Carrinho
                <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
              </router-link>
              <router-link v-if="isAdmin" to="/admin" class="menu-link admin" @click="close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Painel Admin
              </router-link>
              <button class="menu-logout" @click="handleLogout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Sair
              </button>
            </div>
          </div>

          <div class="menu-footer">
            <div class="social-links">
              <a href="#" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" aria-label="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
            <p>© 2025 Foccus Álbuns</p>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const cartCount = computed(() => cartStore.itemCount)

const close = () => emit('close')

const scrollTo = (id: string) => {
  close()
  setTimeout(() => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, 300)
}

const handleLogout = () => {
  authStore.logout()
  close()
  router.push('/')
}
</script>

<style scoped>
.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.mobile-menu {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  max-width: 320px;
  height: 100%;
  background: #FDFBF7;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #EBE7E0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #2D2A26;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}

.brand span {
  font-weight: 600;
  font-size: 16px;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #F7F4EE;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B6560;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #EBE7E0;
  color: #2D2A26;
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-section a,
.menu-section button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  text-decoration: none;
  color: #4A4744;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.menu-section a:hover,
.menu-section button:hover {
  background: #F7F4EE;
  color: #2D2A26;
}

.menu-link {
  position: relative;
}

.menu-link.admin {
  color: #3B82F6;
}

.cart-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  background: #D4775C;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-cta {
  background: linear-gradient(135deg, #D4775C, #C96B50) !important;
  color: #fff !important;
  font-weight: 600 !important;
  margin-top: 8px;
}

.menu-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3);
}

.menu-logout {
  color: #DC2626 !important;
}

.menu-divider {
  height: 1px;
  background: #EBE7E0;
  margin: 16px 0;
}

.menu-footer {
  padding: 20px;
  border-top: 1px solid #EBE7E0;
  text-align: center;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.social-links a {
  width: 40px;
  height: 40px;
  background: #F7F4EE;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B6560;
  transition: all 0.2s;
}

.social-links a:hover {
  background: #D4775C;
  color: #fff;
}

.menu-footer p {
  font-size: 13px;
  color: #9A958E;
}

/* Transitions */
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.3s ease;
}

.menu-enter-active .mobile-menu,
.menu-leave-active .mobile-menu {
  transition: transform 0.3s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}

.menu-enter-from .mobile-menu,
.menu-leave-to .mobile-menu {
  transform: translateX(100%);
}
</style>
