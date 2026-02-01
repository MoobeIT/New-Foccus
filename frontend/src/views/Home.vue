<template>
  <div class="home">
    <!-- Nav -->
    <nav class="nav" :class="{ scrolled: isScrolled }">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>

        <div class="nav-menu">
          <router-link to="/products">Produtos</router-link>
          <a href="#como-funciona" @click.prevent="scrollToSection('como-funciona')">Como Funciona</a>
          <a href="#recursos" @click.prevent="scrollToSection('recursos')">Recursos</a>
        </div>

        <div class="nav-search" :class="{ expanded: searchExpanded }">
          <button class="search-toggle" @click="toggleSearch" aria-label="Buscar produtos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <input v-if="searchExpanded" ref="searchInput" v-model="searchQuery" type="text" placeholder="Buscar produtos..." @keyup.enter="handleSearch" @blur="closeSearch" />
        </div>

        <div class="nav-actions">
          <NotificationBell v-if="isAuthenticated" />
          <router-link to="/cart" class="cart-btn" v-if="isAuthenticated" aria-label="Carrinho">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </router-link>
          <router-link v-if="!isAuthenticated" to="/login" class="link">Entrar</router-link>
          <router-link v-if="!isAuthenticated" to="/register" class="btn-cta">Começar Grátis</router-link>
          <template v-else>
            <router-link to="/projects" class="link">Meus Projetos</router-link>
            <router-link v-if="isAdmin" to="/admin" class="btn-admin">Admin</router-link>
            <button @click="logout" class="btn-logout">Sair</button>
          </template>
          <button class="mobile-menu-btn" @click="mobileMenuOpen = true" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <MobileMenu :is-open="mobileMenuOpen" @close="mobileMenuOpen = false" />

    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-content">
          <span class="pill">🏆 Referência em impressão fotográfica desde 2010</span>
          <h1>Impressão de <em>álbuns fotográficos</em> para profissionais</h1>
          <p>Transformamos suas fotos em álbuns premium com acabamento impecável. Qualidade de laboratório profissional, entrega em todo Brasil.</p>
          <div class="hero-btns">
            <router-link to="/products" class="btn-main">Ver Produtos →</router-link>
            <router-link to="/editor" class="btn-ghost" v-if="isAuthenticated">Criar Meu Álbum</router-link>
            <router-link to="/register" class="btn-ghost" v-else>Começar Agora</router-link>
          </div>
          <div class="trust-badges">
            <div class="badge"><span>🖨️</span> Impressão 300 DPI</div>
            <div class="badge"><span>📦</span> Embalagem Premium</div>
            <div class="badge"><span>⭐</span> +{{ stats.photographers.toLocaleString('pt-BR') }} fotógrafos</div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="album-showcase">
            <div class="album-main" @click="goToProduct(featuredProduct?.slug)">
              <div class="album-img">
                <div class="album-3d">
                  <div class="album-cover"></div>
                  <div class="album-spine"></div>
                  <div class="album-pages"></div>
                </div>
              </div>
              <div class="album-info">
                <span class="album-tag">Mais Vendido</span>
                <h3>{{ featuredProduct?.name || 'Álbum Casamento' }}</h3>
                <p>{{ featuredProduct?.shortDescription || 'Capa dura premium' }}</p>
                <div class="album-price">a partir de <strong>R$ {{ featuredProduct?.basePrice || '299' }}</strong></div>
              </div>
            </div>
            <div class="album-stack">
              <div v-for="product in sideProducts" :key="product.slug" class="album-mini" @click="goToProduct(product.slug)">
                <div class="mini-img" :style="{ background: product.gradient }"></div>
                <span>{{ product.shortName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Quality Highlights -->
      <div class="quality-bar">
        <div class="quality-item">
          <span class="quality-icon">📄</span>
          <div class="quality-text">
            <strong>Papel Fotográfico Premium</strong>
            <span>800g/m² fosco ou brilho</span>
          </div>
        </div>
        <div class="quality-item">
          <span class="quality-icon">🎨</span>
          <div class="quality-text">
            <strong>Cores Calibradas</strong>
            <span>Perfil ICC profissional</span>
          </div>
        </div>
        <div class="quality-item">
          <span class="quality-icon">📐</span>
          <div class="quality-text">
            <strong>Layflat 180°</strong>
            <span>Abertura total sem vinco</span>
          </div>
        </div>
        <div class="quality-item">
          <span class="quality-icon">✨</span>
          <div class="quality-text">
            <strong>Acabamento Artesanal</strong>
            <span>Inspeção manual</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Products -->
    <section id="produtos" class="products-section">
      <div class="container">
        <div class="section-header">
          <div class="header-left">
            <span class="tag">Nossos Produtos</span>
            <h2>Álbuns e materiais para fotógrafos</h2>
            <p class="section-subtitle">Impressão profissional com os melhores materiais do mercado</p>
          </div>
          <router-link to="/products" class="view-all">Ver catálogo completo →</router-link>
        </div>
        <div v-if="loadingProducts" class="products-grid">
          <ProductCardSkeleton v-for="i in 4" :key="i" />
        </div>
        <div v-else class="products-grid">
          <router-link v-for="product in displayProducts" :key="product.id" :to="`/produto/${product.slug || product.id}`" class="product-card" :class="{ featured: product.featured }">
            <div class="product-image" :style="{ background: product.gradient }">
              <span v-if="product.badge" class="product-badge">{{ product.badge }}</span>
              <div class="product-preview"><span>👁️ Ver detalhes</span></div>
            </div>
            <div class="product-info">
              <span class="product-category">{{ product.category }}</span>
              <h3>{{ product.name }}</h3>
              <p>{{ product.description }}</p>
              <div class="product-specs">
                <span>📄 Papel 800g</span>
                <span>📐 Layflat</span>
              </div>
              <div class="product-footer">
                <div class="product-price"><small>a partir de</small><strong>R$ {{ product.basePrice || product.price }}</strong></div>
                <button class="btn-add" @click.prevent="quickAdd(product)">Personalizar</button>
              </div>
            </div>
          </router-link>
        </div>
        <div class="shipping-calculator-mini">
          <div class="calc-icon">🚚</div>
          <div class="calc-content"><h4>Calcule o frete</h4><p>Frete grátis acima de R$ 300</p></div>
          <div class="calc-form">
            <input v-model="cepInput" type="text" placeholder="CEP" maxlength="9" @input="formatCep" />
            <button @click="calculateShipping" :disabled="loadingShipping">{{ loadingShipping ? '...' : 'Calcular' }}</button>
          </div>
          <div v-if="shippingResult" class="calc-result">
            <div class="result-item" v-for="opt in shippingResult" :key="opt.service">
              <span class="result-service">{{ opt.serviceName }}</span>
              <span class="result-price">{{ opt.formattedPrice }}</span>
              <span class="result-time">{{ opt.formattedDelivery }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section id="como-funciona" class="how-section">
      <div class="container">
        <div class="section-header center">
          <span class="tag">Como Funciona</span>
          <h2>Do projeto à entrega em 4 passos simples</h2>
          <p class="section-subtitle">Processo otimizado para fotógrafos profissionais</p>
        </div>
        <div class="steps-row">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-icon">📤</div>
            <h4>Envie suas fotos</h4>
            <p>Upload rápido e seguro. Suporte a RAW, JPEG e TIFF em alta resolução.</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-icon">🎨</div>
            <h4>Monte o álbum</h4>
            <p>Editor profissional com layouts automáticos ou personalize do zero.</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-icon">✅</div>
            <h4>Aprovação online</h4>
            <p>Seu cliente aprova pelo celular. Sem reuniões, sem impressões de prova.</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-icon">📦</div>
            <h4>Receba em casa</h4>
            <p>Produção em 7 dias úteis. Embalagem premium com rastreamento.</p>
          </div>
        </div>
        <div class="steps-cta">
          <router-link to="/editor" class="btn-main" v-if="isAuthenticated">Começar Meu Projeto</router-link>
          <router-link to="/register" class="btn-main" v-else>Criar Conta Grátis</router-link>
          <p class="steps-note">✓ Sem mensalidade • ✓ Pague apenas o que produzir</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="recursos" class="features-section">
      <div class="container">
        <div class="features-grid">
          <div class="features-text">
            <span class="tag">Por que escolher a Foccus?</span>
            <h2>Qualidade de impressão que faz diferença</h2>
            <p>Investimos em equipamentos de última geração e materiais premium para entregar álbuns que impressionam.</p>
            <ul class="features-list">
              <li><span>✓</span> Impressão HP Indigo 12000 - qualidade offset digital</li>
              <li><span>✓</span> Papéis Canson e Hahnemühle disponíveis</li>
              <li><span>✓</span> Encadernação layflat 180° sem vinco central</li>
              <li><span>✓</span> Capas em couro legítimo, linho ou tecido</li>
              <li><span>✓</span> Acabamento com verniz UV ou laminação fosca</li>
              <li><span>✓</span> Controle de qualidade em cada página</li>
            </ul>
            <router-link to="/products" class="btn-outline">Ver Materiais Disponíveis</router-link>
          </div>
          <div class="features-visual">
            <div class="feature-card">
              <div class="feature-icon">🖨️</div>
              <h4>Impressão Profissional</h4>
              <p>300 DPI com cores calibradas ICC</p>
            </div>
            <div class="feature-card highlight">
              <div class="feature-icon">🎨</div>
              <h4>Editor com IA</h4>
              <p>Layouts automáticos inteligentes</p>
              <span class="new-badge">Novo</span>
            </div>
            <div class="feature-card">
              <div class="feature-icon">📱</div>
              <h4>Aprovação Mobile</h4>
              <p>Cliente aprova pelo celular</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🚚</div>
              <h4>Entrega Segura</h4>
              <p>Embalagem reforçada + rastreio</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Materials Section -->
    <section class="materials-section">
      <div class="container">
        <div class="section-header center">
          <span class="tag">Materiais Premium</span>
          <h2>Trabalhamos apenas com os melhores materiais</h2>
        </div>
        <div class="materials-grid">
          <div class="material-card">
            <div class="material-icon">📄</div>
            <h4>Papéis Fotográficos</h4>
            <ul>
              <li>Fosco 800g/m²</li>
              <li>Brilho 800g/m²</li>
              <li>Fine Art 310g/m²</li>
              <li>Metálico 260g/m²</li>
            </ul>
          </div>
          <div class="material-card">
            <div class="material-icon">📚</div>
            <h4>Capas</h4>
            <ul>
              <li>Couro Legítimo</li>
              <li>Couro Sintético</li>
              <li>Linho Natural</li>
              <li>Tecido Premium</li>
            </ul>
          </div>
          <div class="material-card">
            <div class="material-icon">✨</div>
            <h4>Acabamentos</h4>
            <ul>
              <li>Verniz UV Localizado</li>
              <li>Laminação Fosca</li>
              <li>Hot Stamping</li>
              <li>Baixo Relevo</li>
            </ul>
          </div>
          <div class="material-card">
            <div class="material-icon">🎁</div>
            <h4>Embalagens</h4>
            <ul>
              <li>Caixa Cartonada</li>
              <li>Estojo Madeira</li>
              <li>Estojo Acrílico</li>
              <li>Bag Personalizada</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="testimonials-section">
      <div class="container">
        <div class="section-header center"><span class="tag">Depoimentos</span><h2>+{{ stats.photographers.toLocaleString('pt-BR') }} fotógrafos confiam na Foccus</h2></div>
        <div class="testimonials-grid desktop-only">
          <div v-for="(t, i) in testimonials" :key="i" class="testimonial" :class="{ featured: t.featured }">
            <div class="stars">★★★★★</div>
            <p>"{{ t.text }}"</p>
            <div class="author"><div class="avatar" :style="{ background: t.avatarColor }">{{ t.initials }}</div><div><strong>{{ t.name }}</strong><span>{{ t.role }}</span></div></div>
          </div>
        </div>
        <div class="mobile-only"><TestimonialCarousel :testimonials="testimonials" /></div>
      </div>
    </section>

    <!-- Support -->
    <section class="support-section">
      <div class="container">
        <div class="section-header center"><span class="tag">Suporte</span><h2>Estamos aqui para ajudar</h2></div>
        <div class="support-grid">
          <a href="https://wa.me/5511999999999" target="_blank" class="support-card whatsapp"><div class="support-icon">💬</div><h4>WhatsApp</h4><p>Atendimento rápido</p><span class="support-status online">● Online</span></a>
          <div class="support-card chat" @click="openChat"><div class="support-icon">🎧</div><h4>Chat</h4><p>Suporte técnico</p><span class="support-hours">Seg-Sex: 9h-18h</span></div>
          <a href="mailto:suporte@foccusalbuns.com.br" class="support-card email"><div class="support-icon">📧</div><h4>E-mail</h4><p>Dúvidas detalhadas</p></a>
          <router-link to="/help" class="support-card help"><div class="support-icon">📚</div><h4>Central de Ajuda</h4><p>+50 artigos</p></router-link>
        </div>
        <div class="faq-quick">
          <h3>Perguntas Frequentes</h3>
          <div class="faq-grid">
            <div v-for="(faq, i) in faqs" :key="i" class="faq-item" :class="{ open: faq.open }" @click="toggleFaq(i)">
              <div class="faq-question"><span>{{ faq.question }}</span><span class="faq-toggle">{{ faq.open ? '−' : '+' }}</span></div>
              <div v-show="faq.open" class="faq-answer">{{ faq.answer }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Pronto para criar álbuns que encantam?</h2>
          <p>Junte-se a milhares de fotógrafos</p>
          <div class="cta-buttons">
            <router-link to="/register" class="btn-white">Criar Conta Grátis</router-link>
            <router-link to="/products" class="btn-ghost-white">Ver Produtos</router-link>
          </div>
          <div class="cta-trust"><span>✓ Grátis para começar</span><span>✓ Sem cartão</span><span>✓ Suporte WhatsApp</span></div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <router-link to="/" class="brand"><div class="brand-icon">F</div><span>Foccus Álbuns</span></router-link>
            <p>Plataforma completa para fotógrafos.</p>
            <div class="social-links"><a href="#">📷</a><a href="#">💬</a><a href="#">▶️</a></div>
          </div>
          <div class="footer-col"><h4>Produtos</h4><router-link to="/produto/album-casamento">Álbum Casamento</router-link><router-link to="/produto/album-ensaio">Álbum Ensaio</router-link><router-link to="/products">Ver Todos</router-link></div>
          <div class="footer-col"><h4>Recursos</h4><router-link to="/editor">Editor</router-link><a href="#">Templates</a><a href="#">Blog</a></div>
          <div class="footer-col"><h4>Suporte</h4><a href="#">Central de Ajuda</a><a href="#">WhatsApp</a><router-link to="/orders">Meus Pedidos</router-link></div>
        </div>
        <div class="footer-bottom"><span>© 2025 Foccus Álbuns</span><div class="footer-links"><a href="#">Privacidade</a><a href="#">Termos</a></div></div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useProductsStore } from '@/stores/products'
import NotificationBell from '@/components/common/NotificationBell.vue'
import MobileMenu from '@/components/common/MobileMenu.vue'
import ProductCardSkeleton from '@/components/common/ProductCardSkeleton.vue'
import TestimonialCarousel from '@/components/common/TestimonialCarousel.vue'
import { api } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const productsStore = useProductsStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const cartCount = computed(() => cartStore.itemCount)
const isScrolled = ref(false)
const mobileMenuOpen = ref(false)
const searchExpanded = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const loadingProducts = ref(true)
const apiProducts = ref<any[]>([])
const cepInput = ref('')
const loadingShipping = ref(false)
const shippingResult = ref<any[] | null>(null)
const stats = ref({ photographers: 2847, rating: '4.9' })

const fallbackProducts = [
  { id: 1, slug: 'album-casamento', name: 'Álbum Casamento', shortName: 'Casamento', category: '📖 Álbum Premium', description: 'Capa dura, papel fotográfico 800g', shortDescription: 'Capa dura premium', basePrice: 299, price: '299', gradient: 'linear-gradient(135deg, #D4775C 0%, #E8956F 100%)', badge: 'Mais Vendido', featured: true },
  { id: 2, slug: 'album-ensaio', name: 'Álbum Ensaio', shortName: 'Ensaio', category: '📖 Álbum', description: 'Formato quadrado, ideal para books', shortDescription: 'Formato quadrado', basePrice: 199, price: '199', gradient: 'linear-gradient(135deg, #7C9A92 0%, #9BB5AE 100%)', badge: null, featured: false },
  { id: 3, slug: 'album-newborn', name: 'Álbum Newborn', shortName: 'Newborn', category: '📖 Álbum', description: 'Design delicado para recém-nascidos', shortDescription: 'Design delicado', basePrice: 149, price: '149', gradient: 'linear-gradient(135deg, #B8A398 0%, #D4C4B5 100%)', badge: null, featured: false },
  { id: 4, slug: 'estojo-madeira', name: 'Estojo Madeira Luxo', shortName: 'Estojo', category: '🎁 Estojo', description: 'Madeira maciça com interior aveludado', shortDescription: 'Madeira maciça', basePrice: 189, price: '189', gradient: 'linear-gradient(135deg, #8B7355 0%, #A68B5B 100%)', badge: 'Premium', featured: false }
]

const displayProducts = computed(() => apiProducts.value.length > 0 ? apiProducts.value.slice(0, 4).map((p, i) => ({ ...p, gradient: fallbackProducts[i]?.gradient, category: p.category?.name || fallbackProducts[i]?.category, badge: i === 0 ? 'Mais Vendido' : p.badge, featured: i === 0 })) : fallbackProducts)
const featuredProduct = computed(() => displayProducts.value[0])
const sideProducts = computed(() => displayProducts.value.slice(1, 3))

const faqs = ref([
  { question: 'Qual o prazo de produção?', answer: '7 a 10 dias úteis após aprovação.', open: false },
  { question: 'Posso fazer alterações após enviar?', answer: 'Sim, até 24h após o envio.', open: false },
  { question: 'Quais formas de pagamento?', answer: 'Cartão (até 12x), PIX, boleto.', open: false },
  { question: 'Como funciona a aprovação online?', answer: 'Você gera um link único para o cliente aprovar.', open: false }
])

const testimonials = ref([
  { text: 'A qualidade dos álbuns é impressionante!', name: 'Marina Rodrigues', role: 'Fotógrafa • SP', initials: 'MR', avatarColor: 'linear-gradient(135deg, #D4775C, #E8956F)', featured: false },
  { text: 'O editor é muito intuitivo. Economizo horas!', name: 'Carlos Santos', role: 'Fotógrafo • RJ', initials: 'CS', avatarColor: 'linear-gradient(135deg, #7C9A92, #9BB5AE)', featured: true },
  { text: 'A aprovação online mudou meu fluxo de trabalho!', name: 'Ana Ferreira', role: 'Fotógrafa • MG', initials: 'AF', avatarColor: 'linear-gradient(135deg, #B8A398, #D4C4B5)', featured: false }
])

const onScroll = () => { isScrolled.value = window.scrollY > 20 }
const scrollToSection = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }
const toggleSearch = () => { searchExpanded.value = !searchExpanded.value; if (searchExpanded.value) nextTick(() => searchInput.value?.focus()) }
const closeSearch = () => { setTimeout(() => { if (!searchQuery.value) searchExpanded.value = false }, 200) }
const handleSearch = () => { if (searchQuery.value.trim()) { router.push({ path: '/products', query: { search: searchQuery.value } }); searchExpanded.value = false; searchQuery.value = '' } }
const formatCep = () => { let v = cepInput.value.replace(/\D/g, ''); if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8); cepInput.value = v }
const calculateShipping = async () => {
  const cep = cepInput.value.replace(/\D/g, '')
  if (cep.length !== 8) { alert('CEP inválido'); return }
  loadingShipping.value = true
  try {
    const res = await api.post('/api/v1/shipping/calculate', { cep, weight: 1.5, dimensions: { length: 35, width: 35, height: 5 } })
    shippingResult.value = res.data.options
  } catch { shippingResult.value = [{ service: 'pac', serviceName: 'PAC', formattedPrice: 'R$ 25,90', formattedDelivery: '8-12 dias' }, { service: 'sedex', serviceName: 'SEDEX', formattedPrice: 'R$ 45,90', formattedDelivery: '3-5 dias' }] }
  finally { loadingShipping.value = false }
}
const goToProduct = (slug?: string) => { if (slug) router.push(`/produto/${slug}`) }
const quickAdd = (product: any) => { router.push(`/produto/${product.slug || product.id}`) }
const toggleFaq = (i: number) => { faqs.value[i].open = !faqs.value[i].open }
const openChat = () => { alert('Chat em breve! Use nosso WhatsApp.') }
const logout = () => { authStore.logout(); router.push('/') }
const fetchProducts = async () => { 
  loadingProducts.value = true
  try { 
    // Usar endpoint público que não requer autenticação
    const res = await api.get('/api/v1/public/catalog/products')
    // API retorna { success, data, ... } onde data contém os produtos
    const responseData = res.data?.data || res.data
    const productsList = Array.isArray(responseData) ? responseData : Object.values(responseData || {})
    if (productsList.length > 0) {
      apiProducts.value = productsList
      console.log('✅ Produtos carregados na home:', productsList.length)
    }
  } catch (err) {
    console.error('Erro ao buscar produtos:', err)
  } finally { 
    loadingProducts.value = false 
  } 
}
const fetchStats = async () => { try { const res = await api.get('/api/v1/public/stats'); if (res.data) stats.value = { ...stats.value, ...res.data } } catch {} }

onMounted(() => { window.addEventListener('scroll', onScroll); fetchProducts(); fetchStats() })
onUnmounted(() => { window.removeEventListener('scroll', onScroll) })
</script>

<style scoped>
.home { background: #FDFBF7; color: #2D2A26; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
.container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }
.desktop-only { display: block; }
.mobile-only { display: none; }
@media (max-width: 768px) { .desktop-only { display: none; } .mobile-only { display: block; } }

/* Nav */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 12px 24px; transition: all 0.3s; }
.nav.scrolled { background: rgba(253, 251, 247, 0.95); backdrop-filter: blur(12px); box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05); }
.nav-inner { max-width: 1140px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #2D2A26; }
.brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 16px; }
.brand span { font-weight: 600; font-size: 16px; }
.nav-menu { display: flex; gap: 28px; }
.nav-menu a { color: #6B6560; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-menu a:hover { color: #2D2A26; }
.nav-search { display: flex; align-items: center; gap: 8px; }
.nav-search.expanded { background: #F7F4EE; border-radius: 8px; padding: 4px 8px; }
.search-toggle { background: none; border: none; cursor: pointer; padding: 8px; color: #6B6560; display: flex; }
.nav-search input { border: none; background: none; font-size: 14px; width: 180px; outline: none; color: #2D2A26; }
.nav-actions { display: flex; align-items: center; gap: 12px; }
.link { color: #6B6560; text-decoration: none; font-size: 14px; font-weight: 500; }
.cart-btn { position: relative; text-decoration: none; color: #6B6560; padding: 8px; display: flex; }
.cart-badge { position: absolute; top: 0; right: 0; min-width: 16px; height: 16px; background: #D4775C; color: #fff; font-size: 10px; font-weight: 600; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.btn-cta { background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; transition: all 0.2s; }
.btn-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3); }
.btn-admin { background: #3B82F6; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 6px; }
.btn-logout { background: none; border: 1px solid #E5E0D8; color: #6B6560; font-size: 13px; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.mobile-menu-btn { display: none; background: none; border: none; padding: 8px; cursor: pointer; color: #2D2A26; }
@media (max-width: 1024px) { .nav-menu, .nav-search, .nav-actions .link, .nav-actions .btn-admin, .nav-actions .btn-logout, .nav-actions .btn-cta { display: none; } .mobile-menu-btn { display: flex; } }

/* Hero */
.hero { padding: 100px 24px 40px; background: linear-gradient(180deg, #FDFBF7 0%, #F7F4EE 100%); }
.hero-inner { max-width: 1140px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.hero-content { max-width: 560px; }
.pill { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #FEF3E2, #FDE8D0); color: #B8632E; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
.hero h1 { font-size: clamp(32px, 4vw, 44px); font-weight: 700; line-height: 1.15; color: #2D2A26; margin-bottom: 16px; }
.hero h1 em { font-style: normal; color: #D4775C; }
.hero-content > p { font-size: 17px; color: #6B6560; line-height: 1.7; margin-bottom: 28px; }
.hero-btns { display: flex; gap: 12px; margin-bottom: 32px; }
.btn-main { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; transition: all 0.2s; border: none; cursor: pointer; }
.btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212, 119, 92, 0.35); }
.btn-ghost { color: #6B6560; text-decoration: none; font-size: 15px; font-weight: 500; padding: 14px 24px; border: 1px solid #E5E0D8; border-radius: 10px; background: #fff; }
.trust-badges { display: flex; gap: 20px; flex-wrap: wrap; }
.badge { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6B6560; }
.hero-visual { position: relative; }
.album-showcase { display: flex; gap: 16px; }
.album-main { flex: 1; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(45, 42, 38, 0.12); cursor: pointer; transition: all 0.3s; }
.album-main:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(45, 42, 38, 0.18); }
.album-img { height: 200px; background: linear-gradient(135deg, #D4775C, #E8956F); position: relative; overflow: hidden; }
.album-3d { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) perspective(800px) rotateY(-15deg); }
.album-cover { width: 120px; height: 150px; background: linear-gradient(135deg, #8B4513, #A0522D); border-radius: 2px 8px 8px 2px; box-shadow: -5px 5px 20px rgba(0,0,0,0.3); position: relative; }
.album-cover::before { content: ''; position: absolute; inset: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 2px; }
.album-spine { position: absolute; left: -8px; top: 0; width: 8px; height: 150px; background: linear-gradient(90deg, #654321, #8B4513); border-radius: 2px 0 0 2px; }
.album-pages { position: absolute; right: -3px; top: 5px; width: 3px; height: 140px; background: repeating-linear-gradient(180deg, #fff 0px, #fff 2px, #f0f0f0 2px, #f0f0f0 3px); border-radius: 0 1px 1px 0; }
.album-info { padding: 20px; }
.album-tag { display: inline-block; background: #D4775C; color: #fff; padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 600; margin-bottom: 10px; }
.album-info h3 { font-size: 18px; font-weight: 600; color: #2D2A26; margin-bottom: 4px; }
.album-info p { font-size: 14px; color: #6B6560; margin-bottom: 12px; }
.album-price { font-size: 14px; color: #6B6560; }
.album-price strong { font-size: 24px; font-weight: 700; color: #D4775C; }
.album-stack { display: flex; flex-direction: column; gap: 12px; width: 120px; }
.album-mini { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(45, 42, 38, 0.1); cursor: pointer; transition: all 0.3s; }
.album-mini:hover { transform: translateY(-4px); }
.mini-img { height: 80px; }
.album-mini span { display: block; padding: 10px; font-size: 13px; font-weight: 500; color: #2D2A26; text-align: center; }

/* Quality Bar */
.quality-bar { max-width: 1140px; margin: 40px auto 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding: 0 24px; }
.quality-item { display: flex; align-items: center; gap: 12px; background: #fff; padding: 16px 20px; border-radius: 12px; box-shadow: 0 4px 16px rgba(45, 42, 38, 0.06); }
.quality-icon { font-size: 28px; }
.quality-text { display: flex; flex-direction: column; }
.quality-text strong { font-size: 14px; font-weight: 600; color: #2D2A26; }
.quality-text span { font-size: 12px; color: #9A958E; }

/* Products */
.products-section { padding: 60px 24px 80px; background: #fff; }
.section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
.section-header.center { flex-direction: column; align-items: center; text-align: center; }
.header-left { display: flex; flex-direction: column; gap: 8px; }
.tag { display: inline-block; background: #FEF3E2; color: #B8632E; padding: 6px 14px; border-radius: 50px; font-size: 12px; font-weight: 600; width: fit-content; }
.section-header h2 { font-size: clamp(26px, 3.5vw, 34px); font-weight: 700; color: #2D2A26; }
.view-all { color: #D4775C; text-decoration: none; font-size: 14px; font-weight: 600; }
.section-subtitle { font-size: 16px; color: #6B6560; margin-top: 8px; }
.products-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 48px; }
.product-card { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; overflow: hidden; text-decoration: none; transition: all 0.3s; }
.product-card:hover { box-shadow: 0 16px 40px rgba(45, 42, 38, 0.12); border-color: transparent; }
.product-card.featured { border-color: #D4775C; }
.product-image { height: 160px; position: relative; display: flex; align-items: center; justify-content: center; }
.product-badge { position: absolute; top: 12px; left: 12px; background: #D4775C; color: #fff; padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 600; z-index: 1; }
.product-preview { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; color: #fff; font-size: 13px; background: rgba(0,0,0,0.3); }
.product-card:hover .product-preview { opacity: 1; }
.product-info { padding: 20px; }
.product-category { font-size: 12px; color: #9A958E; margin-bottom: 6px; display: block; }
.product-info h3 { font-size: 16px; font-weight: 600; color: #2D2A26; margin-bottom: 6px; }
.product-info p { font-size: 13px; color: #6B6560; line-height: 1.5; margin-bottom: 12px; min-height: 40px; }
.product-specs { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.product-specs span { font-size: 11px; color: #6B6560; background: #F7F4EE; padding: 4px 8px; border-radius: 4px; }
.product-footer { display: flex; justify-content: space-between; align-items: center; }
.product-price small { display: block; font-size: 11px; color: #9A958E; }
.product-price strong { font-size: 20px; font-weight: 700; color: #D4775C; }
.btn-add { background: #F7F4EE; border: none; color: #2D2A26; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.btn-add:hover { background: #D4775C; color: #fff; }

/* Shipping */
.shipping-calculator-mini { background: linear-gradient(135deg, #F7F4EE, #EBE7E0); border-radius: 16px; padding: 24px 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.calc-icon { font-size: 40px; }
.calc-content { flex: 1; min-width: 200px; }
.calc-content h4 { font-size: 16px; font-weight: 600; color: #2D2A26; margin-bottom: 4px; }
.calc-content p { font-size: 14px; color: #6B6560; }
.calc-form { display: flex; gap: 8px; }
.calc-form input { padding: 12px 16px; border: 1px solid #E5E0D8; border-radius: 8px; font-size: 14px; width: 140px; background: #fff; color: #2D2A26; }
.calc-form button { padding: 12px 20px; background: #D4775C; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.calc-result { width: 100%; display: flex; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E0D8; }
.result-item { background: #fff; padding: 12px 16px; border-radius: 8px; display: flex; gap: 12px; align-items: center; }
.result-service { font-weight: 600; color: #2D2A26; }
.result-price { color: #D4775C; font-weight: 600; }
.result-time { font-size: 13px; color: #6B6560; }

/* How */
.how-section { padding: 80px 24px; background: #FDFBF7; }
.steps-row { display: flex; align-items: flex-start; justify-content: center; gap: 16px; margin-bottom: 40px; }
.step { text-align: center; max-width: 200px; position: relative; }
.step-number { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 28px; height: 28px; background: #D4775C; color: #fff; border-radius: 50%; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; z-index: 1; }
.step-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #FEF3E2, #FDE8D0); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; }
.step h4 { font-size: 16px; font-weight: 600; color: #2D2A26; margin-bottom: 8px; }
.step p { font-size: 14px; color: #6B6560; line-height: 1.5; }
.step-arrow { font-size: 24px; color: #D4D0C8; margin-top: 20px; }
.steps-cta { text-align: center; }
.steps-note { font-size: 14px; color: #6B6560; margin-top: 16px; }

/* Features */
.features-section { padding: 80px 24px; background: #F7F4EE; }
.features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.features-text h2 { font-size: clamp(26px, 3.5vw, 34px); font-weight: 700; color: #2D2A26; margin: 12px 0 16px; }
.features-text > p { font-size: 16px; color: #6B6560; line-height: 1.6; margin-bottom: 24px; }
.features-list { list-style: none; padding: 0; margin: 0 0 32px; }
.features-list li { display: flex; align-items: center; gap: 12px; padding: 10px 0; font-size: 15px; color: #4A4744; }
.features-list li span { color: #10B981; font-weight: 600; }
.btn-outline { display: inline-block; padding: 14px 28px; border: 2px solid #D4775C; color: #D4775C; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; transition: all 0.2s; }
.btn-outline:hover { background: #D4775C; color: #fff; }
.features-visual { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.feature-card { background: #fff; border: 1px solid #EBE7E0; border-radius: 14px; padding: 24px; transition: all 0.3s; position: relative; }
.feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(45, 42, 38, 0.1); }
.feature-card.highlight { background: linear-gradient(135deg, #FFF9F6, #fff); border-color: #D4775C; }
.feature-icon { font-size: 32px; margin-bottom: 12px; }
.feature-card h4 { font-size: 15px; font-weight: 600; color: #2D2A26; margin-bottom: 6px; }
.feature-card p { font-size: 13px; color: #6B6560; line-height: 1.5; }
.new-badge { position: absolute; top: 12px; right: 12px; background: #10B981; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }

/* Materials */
.materials-section { padding: 80px 24px; background: #fff; }
.materials-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 48px; }
.material-card { background: #FDFBF7; border: 1px solid #EBE7E0; border-radius: 16px; padding: 28px; text-align: center; transition: all 0.3s; }
.material-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(45, 42, 38, 0.1); border-color: #D4775C; }
.material-icon { font-size: 40px; margin-bottom: 16px; }
.material-card h4 { font-size: 18px; font-weight: 600; color: #2D2A26; margin-bottom: 16px; }
.material-card ul { list-style: none; padding: 0; margin: 0; }
.material-card li { font-size: 14px; color: #6B6560; padding: 8px 0; border-bottom: 1px solid #EBE7E0; }
.material-card li:last-child { border-bottom: none; }

/* Testimonials */
.testimonials-section { padding: 80px 24px; background: #FDFBF7; }
.testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
.testimonial { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; padding: 28px; transition: all 0.3s; }
.testimonial:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(45, 42, 38, 0.08); }
.testimonial.featured { border-color: #D4775C; background: linear-gradient(180deg, #FFF9F6 0%, #fff 100%); }
.stars { color: #F59E0B; font-size: 16px; letter-spacing: 2px; margin-bottom: 16px; }
.testimonial > p { font-size: 15px; color: #4A4744; line-height: 1.7; margin-bottom: 20px; font-style: italic; }
.author { display: flex; align-items: center; gap: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 14px; }
.author strong { display: block; font-size: 14px; color: #2D2A26; }
.author span { font-size: 13px; color: #9A958E; }

/* Support */
.support-section { padding: 80px 24px; background: #fff; }
.support-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 48px 0; }
.support-card { background: #FDFBF7; border: 1px solid #EBE7E0; border-radius: 16px; padding: 28px; text-decoration: none; color: inherit; transition: all 0.3s; cursor: pointer; display: flex; flex-direction: column; }
.support-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(45, 42, 38, 0.1); }
.support-card.whatsapp:hover { border-color: #25D366; background: linear-gradient(180deg, #F0FDF4 0%, #fff 100%); }
.support-card.chat:hover { border-color: #3B82F6; background: linear-gradient(180deg, #EFF6FF 0%, #fff 100%); }
.support-card.email:hover { border-color: #D4775C; background: linear-gradient(180deg, #FFF9F6 0%, #fff 100%); }
.support-card.help:hover { border-color: #8B5CF6; background: linear-gradient(180deg, #F5F3FF 0%, #fff 100%); }
.support-icon { font-size: 40px; margin-bottom: 16px; }
.support-card h4 { font-size: 18px; font-weight: 600; color: #2D2A26; margin-bottom: 8px; }
.support-card p { font-size: 14px; color: #6B6560; line-height: 1.5; margin-bottom: 12px; flex: 1; }
.support-status, .support-hours { font-size: 13px; color: #9A958E; margin-bottom: 16px; }
.support-status.online { color: #10B981; }

/* FAQ */
.faq-quick { background: #F7F4EE; border-radius: 20px; padding: 40px; margin-bottom: 40px; }
.faq-quick h3 { font-size: 22px; font-weight: 600; color: #2D2A26; margin-bottom: 24px; text-align: center; }
.faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.faq-item { background: #fff; border: 1px solid #EBE7E0; border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.faq-item:hover, .faq-item.open { border-color: #D4775C; }
.faq-question { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; font-size: 15px; font-weight: 500; color: #2D2A26; }
.faq-toggle { font-size: 20px; color: #D4775C; font-weight: 600; }
.faq-answer { padding: 0 20px 18px; font-size: 14px; color: #6B6560; line-height: 1.6; border-top: 1px solid #EBE7E0; padding-top: 16px; }

/* CTA */
.cta-section { padding: 100px 24px; background: linear-gradient(135deg, #D4775C, #C96B50); }
.cta-content { text-align: center; max-width: 600px; margin: 0 auto; }
.cta-content h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 700; color: #fff; margin-bottom: 12px; }
.cta-content > p { font-size: 18px; color: rgba(255, 255, 255, 0.9); margin-bottom: 32px; }
.cta-buttons { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; }
.btn-white { background: #fff; color: #C96B50; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 32px; border-radius: 10px; transition: all 0.2s; }
.btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
.btn-ghost-white { color: #fff; text-decoration: none; font-size: 16px; font-weight: 500; padding: 16px 32px; border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 10px; }
.cta-trust { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.cta-trust span { font-size: 14px; color: rgba(255, 255, 255, 0.85); }

/* Footer */
.footer { padding: 60px 24px 24px; background: #2D2A26; color: #A8A29E; }
.footer .brand { color: #fff; }
.footer-grid { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); gap: 48px; padding-bottom: 40px; border-bottom: 1px solid #3D3A36; }
.footer-brand p { font-size: 14px; line-height: 1.6; margin-top: 16px; max-width: 280px; color: #78716C; }
.social-links { display: flex; gap: 12px; margin-top: 20px; }
.social-links a { font-size: 20px; text-decoration: none; }
.footer-col h4 { font-size: 13px; font-weight: 600; color: #78716C; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
.footer-col a { display: block; color: #A8A29E; text-decoration: none; font-size: 14px; padding: 6px 0; transition: color 0.2s; }
.footer-col a:hover { color: #fff; }
.footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; font-size: 13px; color: #57534E; }
.footer-links { display: flex; gap: 24px; }
.footer-links a { color: #78716C; text-decoration: none; }

/* Responsive */
@media (max-width: 1024px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hero-content { max-width: 100%; }
  .hero-btns, .trust-badges { justify-content: center; }
  .hero-visual { max-width: 400px; margin: 0 auto; }
  .products-grid { grid-template-columns: repeat(2, 1fr); }
  .features-grid { grid-template-columns: 1fr; gap: 40px; }
  .features-text { text-align: center; }
  .testimonials-grid { grid-template-columns: 1fr; max-width: 480px; margin: 48px auto 0; }
  .support-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: 1fr; gap: 32px; }
  .steps-row { flex-wrap: wrap; }
  .step-arrow { display: none; }
  .faq-grid { grid-template-columns: 1fr; }
  .quality-bar { grid-template-columns: repeat(2, 1fr); }
  .materials-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .products-grid { grid-template-columns: 1fr; }
  .hero-visual { display: none; }
  .shipping-calculator-mini { flex-direction: column; text-align: center; }
  .calc-form { width: 100%; flex-direction: column; }
  .calc-form input { width: 100%; }
  .calc-result { flex-direction: column; }
  .features-visual { grid-template-columns: 1fr; }
  .support-grid { grid-template-columns: 1fr; }
  .cta-buttons { flex-direction: column; }
  .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
  .quality-bar { grid-template-columns: 1fr; }
  .materials-grid { grid-template-columns: 1fr; }
  .step { max-width: 100%; width: 100%; }
}
</style>
