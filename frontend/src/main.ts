import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Importar stores
import { useOfflineStore } from './stores/offline'
import { useAuthStore } from './stores/auth'
import { authGuards } from './composables/useAuthGuard'

// ============================================
// ROTAS DO SISTEMA
// ============================================

const routes = [
  // ----------------------------------------
  // ROTAS PÚBLICAS
  // ----------------------------------------
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
    beforeEnter: authGuards.requireGuest
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./views/Register.vue'),
    beforeEnter: authGuards.requireGuest
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('./views/Unauthorized.vue')
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('./views/Products.vue')
  },
  {
    path: '/produto/:slug',
    name: 'ProductDetailPt',
    component: () => import('./views/ProductDetail.vue')
  },
  {
    path: '/product/:slug',
    name: 'ProductDetail',
    component: () => import('./views/ProductDetail.vue')
  },

  // ----------------------------------------
  // APROVAÇÃO PÚBLICA (Cliente via link)
  // ----------------------------------------
  {
    path: '/approval/:token',
    name: 'PublicApproval',
    component: () => import('./views/ProjectApproval.vue'),
    beforeEnter: authGuards.publicApproval
  },

  // ----------------------------------------
  // ÁREA DO FOTÓGRAFO (STUDIO)
  // ----------------------------------------
  {
    path: '/studio',
    name: 'Studio',
    component: () => import('./views/studio/StudioDashboard.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/projects',
    name: 'StudioProjects',
    component: () => import('./views/studio/StudioProjects.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/projects/new',
    name: 'StudioNewProject',
    component: () => import('./views/Editor.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('./views/Editor.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/editor/:projectId',
    name: 'EditorProject',
    component: () => import('./views/Editor.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/projects/:projectId/edit',
    name: 'StudioEditProject',
    component: () => import('./views/Editor.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/clients',
    name: 'StudioClients',
    component: () => import('./views/studio/StudioClients.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/clients/new',
    name: 'StudioNewClient',
    component: () => import('./views/studio/StudioClients.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/orders',
    name: 'StudioOrders',
    component: () => import('./views/studio/StudioOrders.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/orders/:orderId',
    name: 'StudioOrderDetail',
    component: () => import('./views/studio/StudioOrders.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/settings',
    name: 'StudioSettings',
    component: () => import('./views/studio/StudioSettings.vue'),
    beforeEnter: authGuards.requirePhotographer
  },
  {
    path: '/studio/upload/:projectId',
    name: 'StudioUpload',
    component: () => import('./views/studio/StudioUpload.vue'),
    beforeEnter: authGuards.requirePhotographer
  },

  // ----------------------------------------
  // ÁREA DO ADMIN
  // ----------------------------------------
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/admin/AdminDashboard.vue'),
    beforeEnter: authGuards.requireAdmin
  },
  {
    path: '/admin/templates',
    name: 'AdminTemplates',
    component: () => import('./views/admin/AdminTemplates.vue'),
    beforeEnter: authGuards.requireAdmin
  },
  {
    path: '/admin/orders',
    name: 'AdminOrders',
    component: () => import('./views/admin/AdminOrders.vue'),
    beforeEnter: authGuards.requireAdmin
  },
  {
    path: '/admin/production',
    name: 'AdminProduction',
    component: () => import('./views/admin/AdminProduction.vue'),
    beforeEnter: authGuards.requireAdmin
  },
  // TODO: Adicionar mais rotas admin conforme necessário
  // /admin/products
  // /admin/formats
  // /admin/layouts
  // /admin/papers
  // /admin/pricing
  // /admin/photographers
  // /admin/reports
  // /admin/settings

  // ----------------------------------------
  // ROTAS LEGADAS (redirecionar para nova estrutura)
  // ----------------------------------------
  {
    path: '/dashboard',
    redirect: '/studio'
  },
  {
    path: '/projects',
    redirect: '/studio/projects'
  },
  {
    path: '/clients',
    redirect: '/studio/clients'
  },
  {
    path: '/editor',
    redirect: '/studio/projects/new'
  },
  {
    path: '/orders',
    redirect: '/studio/orders'
  },

  // ----------------------------------------
  // ROTAS DE TESTE (remover em produção)
  // ----------------------------------------
  {
    path: '/login-test',
    name: 'LoginTest',
    component: () => import('./views/LoginTest.vue')
  },
  {
    path: '/template-test',
    name: 'TemplateTest',
    component: () => import('./views/TemplateTest.vue')
  },
  {
    path: '/button-test',
    name: 'ButtonTest',
    component: () => import('./views/ButtonTest.vue')
  },
  {
    path: '/template-create-test',
    name: 'TemplateCreateTest',
    component: () => import('./views/TemplateCreateTest.vue')
  },
  {
    path: '/admin-direct',
    name: 'AdminDirect',
    component: () => import('./views/AdminDirect.vue')
  },

  // ----------------------------------------
  // ROTAS TEMPORÁRIAS (migrar depois)
  // ----------------------------------------
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('./views/Cart.vue')
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('./views/Checkout.vue'),
    beforeEnter: authGuards.requireAuth
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('./views/TemplateCreateTest.vue'),
    beforeEnter: authGuards.requireAuth
  },
  {
    path: '/projects/:projectId/approval',
    name: 'ProjectApprovalAlt',
    component: () => import('./views/ProjectApproval.vue'),
    beforeEnter: authGuards.requireAuth
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ============================================
// INICIALIZAÇÃO DO APP
// ============================================

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inicializar autenticação
const authStore = useAuthStore()
authStore.initialize()

// Inicializar PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// Inicializar store offline
const offlineStore = useOfflineStore()
offlineStore.initDB()

app.mount('#app')

console.log('🚀 Editor de Produtos Personalizados iniciado!')
console.log('📱 PWA habilitado')
console.log('🎨 Pronto para criar produtos incríveis!')
