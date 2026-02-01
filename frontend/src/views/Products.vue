<template>
  <div class="products-page">
    <!-- Nav -->
    <GlobalNav :show-menu="true" />

    <!-- Header -->
    <section class="header">
      <div class="container">
        <div class="header-content">
          <span class="tag">📖 Catálogo Profissional</span>
          <h1>Álbuns e Materiais Premium</h1>
          <p>Produtos de alta qualidade para fotógrafos que valorizam cada detalhe</p>
          
          <!-- Search -->
          <div class="search-box">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Buscar produtos..." 
              @input="handleSearch"
            />
          </div>
        </div>
        
        <!-- Stats -->
        <div class="header-stats">
          <div class="stat">
            <strong>{{ products.length }}</strong>
            <span>Produtos</span>
          </div>
          <div class="stat">
            <strong>5+</strong>
            <span>Formatos</span>
          </div>
          <div class="stat">
            <strong>10+</strong>
            <span>Acabamentos</span>
          </div>
          <div class="stat">
            <strong>100%</strong>
            <span>Qualidade</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Bar -->
    <section class="benefits-bar">
      <div class="container">
        <div class="benefits-grid">
          <div class="benefit">
            <span class="benefit-icon">🖨️</span>
            <div class="benefit-text">
              <strong>Impressão HP Indigo</strong>
              <span>Qualidade offset digital</span>
            </div>
          </div>
          <div class="benefit">
            <span class="benefit-icon">📄</span>
            <div class="benefit-text">
              <strong>Papel Fotográfico 800g</strong>
              <span>Alta gramatura premium</span>
            </div>
          </div>
          <div class="benefit">
            <span class="benefit-icon">📐</span>
            <div class="benefit-text">
              <strong>Layflat 180°</strong>
              <span>Abertura total</span>
            </div>
          </div>
          <div class="benefit">
            <span class="benefit-icon">🚚</span>
            <div class="benefit-text">
              <strong>Frete Grátis</strong>
              <span>Acima de R$ 300</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <section class="content">
      <div class="container">
        <div class="content-layout">
          <!-- Sidebar Filters -->
          <aside class="sidebar">
            <div class="filter-section">
              <h4>Categorias</h4>
              <div class="filter-options">
                <label class="filter-option" :class="{ active: !selectedCategory }">
                  <input type="radio" v-model="selectedCategory" value="" />
                  <span class="option-check"></span>
                  <span class="option-label">Todos os produtos</span>
                  <span class="option-count">{{ products.length }}</span>
                </label>
                <label 
                  v-for="cat in categories" 
                  :key="cat.id"
                  class="filter-option"
                  :class="{ active: selectedCategory === cat.id }"
                >
                  <input type="radio" v-model="selectedCategory" :value="cat.id" />
                  <span class="option-check"></span>
                  <span class="option-label">{{ cat.name }}</span>
                  <span class="option-count">{{ cat.count }}</span>
                </label>
              </div>
            </div>

            <div class="filter-section">
              <h4>Tipo de Produto</h4>
              <div class="filter-options">
                <label class="filter-option" :class="{ active: !selectedType }">
                  <input type="radio" v-model="selectedType" value="" />
                  <span class="option-check"></span>
                  <span class="option-label">Todos</span>
                </label>
                <label class="filter-option" :class="{ active: selectedType === 'photobook' }">
                  <input type="radio" v-model="selectedType" value="photobook" />
                  <span class="option-check"></span>
                  <span class="option-label">📖 Álbuns</span>
                </label>
                <label class="filter-option" :class="{ active: selectedType === 'case' }">
                  <input type="radio" v-model="selectedType" value="case" />
                  <span class="option-check"></span>
                  <span class="option-label">🎁 Estojos</span>
                </label>
              </div>
            </div>

            <div class="filter-section">
              <h4>Faixa de Preço</h4>
              <div class="filter-options">
                <label class="filter-option" :class="{ active: !priceRange }">
                  <input type="radio" v-model="priceRange" value="" />
                  <span class="option-check"></span>
                  <span class="option-label">Todos os preços</span>
                </label>
                <label class="filter-option" :class="{ active: priceRange === '0-200' }">
                  <input type="radio" v-model="priceRange" value="0-200" />
                  <span class="option-check"></span>
                  <span class="option-label">Até R$ 200</span>
                </label>
                <label class="filter-option" :class="{ active: priceRange === '200-400' }">
                  <input type="radio" v-model="priceRange" value="200-400" />
                  <span class="option-check"></span>
                  <span class="option-label">R$ 200 - R$ 400</span>
                </label>
                <label class="filter-option" :class="{ active: priceRange === '400+' }">
                  <input type="radio" v-model="priceRange" value="400+" />
                  <span class="option-check"></span>
                  <span class="option-label">Acima de R$ 400</span>
                </label>
              </div>
            </div>

            <!-- Help Box -->
            <div class="help-box">
              <div class="help-icon">💬</div>
              <h4>Precisa de ajuda?</h4>
              <p>Nossa equipe está pronta para ajudar você a escolher o produto ideal.</p>
              <a href="https://wa.me/5511999999999" target="_blank" class="help-btn">
                Falar no WhatsApp
              </a>
            </div>
          </aside>

          <!-- Products Grid -->
          <main class="main-content">
            <!-- Results Header -->
            <div class="results-header">
              <div class="results-info">
                <span class="results-count">{{ filteredProducts.length }} produtos encontrados</span>
                <span v-if="searchQuery" class="results-query">para "{{ searchQuery }}"</span>
              </div>
              <div class="results-sort">
                <label>Ordenar por:</label>
                <select v-model="sortBy">
                  <option value="featured">Destaques</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="loading">
              <div class="spinner"></div>
              <p>Carregando produtos...</p>
            </div>

            <!-- Products -->
            <template v-else-if="sortedProducts.length > 0">
              <div class="products-grid">
                <div 
                  v-for="p in sortedProducts" 
                  :key="p.id" 
                  class="product-card"
                  :class="{ featured: p.badge }"
                  @click="goToProduct(p)"
                >
                  <!-- Image -->
                  <div class="product-image" :style="getImageStyle(p)">
                    <span v-if="p.badge" class="product-badge">{{ p.badge }}</span>
                    <div class="product-overlay">
                      <span class="overlay-text">👁️ Ver detalhes</span>
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="product-info">
                    <div class="product-type">
                      {{ p.type === 'photobook' ? '📖 Álbum' : p.type === 'case' ? '🎁 Estojo' : '📦 Produto' }}
                    </div>
                    <h3 class="product-name">{{ p.name }}</h3>
                    <p class="product-desc">{{ p.shortDescription || p.description }}</p>
                    
                    <!-- Specs -->
                    <div class="product-specs">
                      <span v-if="p.basePagesIncluded" class="spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {{ p.basePagesIncluded }} páginas
                      </span>
                      <span class="spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        </svg>
                        Layflat
                      </span>
                      <span class="spec">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        7-10 dias
                      </span>
                    </div>

                    <!-- Footer -->
                    <div class="product-footer">
                      <div class="product-price">
                        <small>a partir de</small>
                        <strong>R$ {{ formatPrice(p.basePrice) }}</strong>
                      </div>
                      <button class="btn-customize">Personalizar</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Empty State -->
            <div v-else class="empty-state">
              <div class="empty-icon">🔍</div>
              <h3>Nenhum produto encontrado</h3>
              <p>Tente ajustar os filtros ou buscar por outro termo.</p>
              <button @click="clearFilters" class="btn-clear">Limpar filtros</button>
            </div>
          </main>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <div class="cta-text">
            <h2>Não encontrou o que procura?</h2>
            <p>Fazemos produtos personalizados sob medida para seu projeto.</p>
          </div>
          <div class="cta-actions">
            <a href="https://wa.me/5511999999999" target="_blank" class="btn-whatsapp">
              💬 Falar no WhatsApp
            </a>
            <a href="mailto:contato@foccusalbuns.com.br" class="btn-email">
              📧 Enviar E-mail
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <div class="brand">
              <div class="brand-icon">F</div>
              <span>Foccus Álbuns</span>
            </div>
            <p>Impressão profissional de álbuns fotográficos desde 2010.</p>
          </div>
          <div class="footer-links">
            <router-link to="/">Home</router-link>
            <router-link to="/products">Produtos</router-link>
            <router-link to="/projects">Meus Projetos</router-link>
          </div>
          <div class="footer-copy">
            <p>© 2025 Foccus Álbuns. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlobalNav from '@/components/common/GlobalNav.vue'

interface Product {
  id: string
  name: string
  slug: string
  type: string
  category: string
  description: string
  shortDescription: string
  basePrice: number
  basePagesIncluded: number
  badge?: string
  imageUrl?: string
  thumbnailUrl?: string
}

interface Category {
  id: string
  name: string
  count: number
}

const router = useRouter()
const loading = ref(true)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const selectedCategory = ref('')
const selectedType = ref('')
const priceRange = ref('')
const searchQuery = ref('')
const sortBy = ref('featured')

// Computed
const filteredProducts = computed(() => {
  let result = products.value

  // Category filter
  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  // Type filter
  if (selectedType.value) {
    result = result.filter(p => p.type === selectedType.value)
  }

  // Price filter
  if (priceRange.value) {
    if (priceRange.value === '0-200') {
      result = result.filter(p => p.basePrice <= 200)
    } else if (priceRange.value === '200-400') {
      result = result.filter(p => p.basePrice > 200 && p.basePrice <= 400)
    } else if (priceRange.value === '400+') {
      result = result.filter(p => p.basePrice > 400)
    }
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.shortDescription?.toLowerCase().includes(query)
    )
  }

  return result
})

const sortedProducts = computed(() => {
  const sorted = [...filteredProducts.value]
  
  switch (sortBy.value) {
    case 'price-asc':
      return sorted.sort((a, b) => a.basePrice - b.basePrice)
    case 'price-desc':
      return sorted.sort((a, b) => b.basePrice - a.basePrice)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default:
      // Featured first
      return sorted.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0))
  }
})

// Methods
const formatPrice = (price: number) => {
  return price?.toFixed(2).replace('.', ',') || '0,00'
}

const getImageStyle = (product: Product) => {
  if (product.imageUrl || product.thumbnailUrl) {
    return {
      backgroundImage: `url(${product.thumbnailUrl || product.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  const gradients: Record<string, string> = {
    casamento: 'linear-gradient(135deg, #D4775C, #E8956F)',
    ensaio: 'linear-gradient(135deg, #7C9A92, #9BB5AE)',
    newborn: 'linear-gradient(135deg, #B8A398, #D4C4B5)',
    '15anos': 'linear-gradient(135deg, #9B59B6, #8E44AD)',
    estojo: 'linear-gradient(135deg, #8B7355, #A68B5B)',
  }
  return { background: gradients[product.category] || 'linear-gradient(135deg, #6B6560, #9A958E)' }
}

const goToProduct = (product: Product) => {
  router.push(`/produto/${product.slug || product.id}`)
}

const handleSearch = () => {
  // Debounce handled by Vue reactivity
}

const clearFilters = () => {
  selectedCategory.value = ''
  selectedType.value = ''
  priceRange.value = ''
  searchQuery.value = ''
}

const loadProducts = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/v1/public/catalog/products')
    if (response.ok) {
      const result = await response.json()
      const responseData = result?.data || result
      products.value = Array.isArray(responseData) ? responseData : Object.values(responseData || {})
    } else {
      // Fallback para dados locais
      const { catalogService } = await import('@/services/catalog')
      products.value = await catalogService.getProducts()
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
    // Fallback para dados locais em caso de erro
    try {
      const { catalogService } = await import('@/services/catalog')
      products.value = await catalogService.getProducts()
    } catch (fallbackError) {
      console.error('Erro no fallback:', fallbackError)
    }
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const response = await fetch('/api/v1/public/catalog/categories')
    if (response.ok) {
      const result = await response.json()
      const responseData = result?.data || result
      categories.value = Array.isArray(responseData) ? responseData : Object.values(responseData || {})
    } else {
      // Fallback para categorias locais
      categories.value = [
        { id: 'casamento', name: '💒 Casamento', count: 1 },
        { id: 'ensaio', name: '📸 Ensaio', count: 1 },
        { id: 'familia', name: '👨‍👩‍👧‍👦 Família', count: 1 },
      ]
    }
  } catch (error) {
    console.error('Erro ao carregar categorias:', error)
    // Fallback para categorias locais
    categories.value = [
      { id: 'casamento', name: '💒 Casamento', count: 1 },
      { id: 'ensaio', name: '📸 Ensaio', count: 1 },
      { id: 'familia', name: '👨‍👩‍👧‍👦 Família', count: 1 },
    ]
  }
}

onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<style scoped>
.products-page { background: #FDFBF7; min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

/* Header */
.header { padding: 100px 24px 48px; background: linear-gradient(180deg, #F7F4EE 0%, #FDFBF7 100%); }
.header-content { text-align: center; max-width: 600px; margin: 0 auto; }
.tag { display: inline-block; background: linear-gradient(135deg, #FEF3E2, #FDE8D0); color: #B8632E; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
.header h1 { font-size: clamp(32px, 4vw, 42px); font-weight: 700; color: #2D2A26; margin-bottom: 12px; }
.header p { font-size: 18px; color: #6B6560; margin-bottom: 32px; }

/* Search */
.search-box { position: relative; max-width: 480px; margin: 0 auto; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9A958E; }
.search-box input { width: 100%; padding: 16px 20px 16px 48px; border: 2px solid #EBE7E0; border-radius: 12px; font-size: 16px; background: #fff; color: #2D2A26; transition: all 0.2s; }
.search-box input:focus { outline: none; border-color: #D4775C; box-shadow: 0 0 0 4px rgba(212, 119, 92, 0.1); }
.search-box input::placeholder { color: #9A958E; }

/* Header Stats */
.header-stats { display: flex; justify-content: center; gap: 48px; margin-top: 40px; padding-top: 32px; border-top: 1px solid #EBE7E0; }
.stat { text-align: center; }
.stat strong { display: block; font-size: 28px; font-weight: 700; color: #D4775C; }
.stat span { font-size: 14px; color: #6B6560; }

/* Benefits Bar */
.benefits-bar { background: #fff; border-bottom: 1px solid #EBE7E0; padding: 20px 24px; }
.benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.benefit { display: flex; align-items: center; gap: 12px; }
.benefit-icon { font-size: 28px; }
.benefit-text { display: flex; flex-direction: column; }
.benefit-text strong { font-size: 14px; font-weight: 600; color: #2D2A26; }
.benefit-text span { font-size: 12px; color: #9A958E; }

/* Content Layout */
.content { padding: 40px 24px 80px; }
.content-layout { display: grid; grid-template-columns: 260px 1fr; gap: 40px; }

/* Sidebar */
.sidebar { position: sticky; top: 100px; height: fit-content; }
.filter-section { background: #fff; border: 1px solid #EBE7E0; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.filter-section h4 { font-size: 14px; font-weight: 600; color: #2D2A26; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #EBE7E0; }
.filter-options { display: flex; flex-direction: column; gap: 8px; }
.filter-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.filter-option:hover { background: #F7F4EE; }
.filter-option.active { background: #FEF3E2; }
.filter-option input { display: none; }
.option-check { width: 18px; height: 18px; border: 2px solid #D4D0C8; border-radius: 50%; position: relative; flex-shrink: 0; }
.filter-option.active .option-check { border-color: #D4775C; background: #D4775C; }
.filter-option.active .option-check::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background: #fff; border-radius: 50%; }
.option-label { flex: 1; font-size: 14px; color: #4A4744; }
.option-count { font-size: 12px; color: #9A958E; background: #F7F4EE; padding: 2px 8px; border-radius: 10px; }

/* Help Box */
.help-box { background: linear-gradient(135deg, #FEF3E2, #FDE8D0); border-radius: 12px; padding: 24px; text-align: center; }
.help-icon { font-size: 32px; margin-bottom: 12px; }
.help-box h4 { font-size: 16px; font-weight: 600; color: #2D2A26; margin-bottom: 8px; }
.help-box p { font-size: 13px; color: #6B6560; margin-bottom: 16px; line-height: 1.5; }
.help-btn { display: block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.help-btn:hover { background: #1DA851; transform: translateY(-2px); }

/* Main Content */
.main-content { min-width: 0; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #EBE7E0; }
.results-info { display: flex; align-items: center; gap: 8px; }
.results-count { font-size: 15px; font-weight: 600; color: #2D2A26; }
.results-query { font-size: 14px; color: #6B6560; }
.results-sort { display: flex; align-items: center; gap: 8px; }
.results-sort label { font-size: 14px; color: #6B6560; }
.results-sort select { padding: 8px 12px; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 14px; color: #2D2A26; background: #fff; cursor: pointer; }

/* Products Grid */
.products-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.product-card { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s; }
.product-card:hover { transform: translateY(-8px); box-shadow: 0 20px 50px rgba(45, 42, 38, 0.12); border-color: transparent; }
.product-card.featured { border-color: #D4775C; }

/* Product Image */
.product-image { height: 200px; position: relative; overflow: hidden; }
.product-badge { position: absolute; top: 12px; left: 12px; background: #D4775C; color: #fff; padding: 6px 12px; border-radius: 50px; font-size: 11px; font-weight: 600; z-index: 2; }
.product-overlay { position: absolute; inset: 0; background: rgba(45, 42, 38, 0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.product-card:hover .product-overlay { opacity: 1; }
.overlay-text { color: #fff; font-size: 14px; font-weight: 500; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 8px; backdrop-filter: blur(4px); }

/* Product Info */
.product-info { padding: 20px; }
.product-type { font-size: 12px; color: #9A958E; margin-bottom: 8px; }
.product-name { font-size: 18px; font-weight: 600; color: #2D2A26; margin-bottom: 8px; line-height: 1.3; }
.product-desc { font-size: 14px; color: #6B6560; line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 42px; }

/* Product Specs */
.product-specs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.spec { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #6B6560; background: #F7F4EE; padding: 4px 10px; border-radius: 6px; }
.spec svg { color: #9A958E; }

/* Product Footer */
.product-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #EBE7E0; }
.product-price small { display: block; font-size: 11px; color: #9A958E; }
.product-price strong { font-size: 22px; font-weight: 700; color: #D4775C; }
.btn-customize { background: #F7F4EE; border: none; color: #2D2A26; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-customize:hover { background: #D4775C; color: #fff; }

/* Loading */
.loading { text-align: center; padding: 80px 0; }
.spinner { width: 48px; height: 48px; border: 3px solid #EBE7E0; border-top-color: #D4775C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading p { color: #6B6560; font-size: 15px; }

/* Empty State */
.empty-state { text-align: center; padding: 80px 40px; background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; }
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.empty-state h3 { font-size: 20px; font-weight: 600; color: #2D2A26; margin-bottom: 8px; }
.empty-state p { font-size: 15px; color: #6B6560; margin-bottom: 24px; }
.btn-clear { background: #D4775C; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* CTA Section */
.cta-section { background: linear-gradient(135deg, #2D2A26, #4A4744); padding: 60px 24px; }
.cta-content { display: flex; justify-content: space-between; align-items: center; gap: 40px; }
.cta-text h2 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.cta-text p { font-size: 16px; color: rgba(255,255,255,0.7); }
.cta-actions { display: flex; gap: 16px; }
.btn-whatsapp { display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; transition: all 0.2s; }
.btn-whatsapp:hover { background: #1DA851; transform: translateY(-2px); }
.btn-email { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; border: 2px solid rgba(255,255,255,0.3); transition: all 0.2s; }
.btn-email:hover { border-color: #fff; background: rgba(255,255,255,0.1); }

/* Footer */
.footer { padding: 48px 24px 24px; background: #2D2A26; }
.footer-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
.footer-brand { display: flex; flex-direction: column; gap: 12px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; }
.brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 16px; }
.brand span { font-weight: 600; font-size: 16px; }
.footer-brand p { font-size: 14px; color: #78716C; max-width: 280px; }
.footer-links { display: flex; gap: 24px; }
.footer-links a { color: #A8A29E; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.footer-links a:hover { color: #fff; }
.footer-copy p { font-size: 13px; color: #57534E; }

/* Responsive */
@media (max-width: 1024px) {
  .content-layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .products-grid { grid-template-columns: repeat(2, 1fr); }
  .header-stats { gap: 24px; }
  .benefits-grid { grid-template-columns: repeat(2, 1fr); }
  .cta-content { flex-direction: column; text-align: center; }
}

@media (max-width: 640px) {
  .products-grid { grid-template-columns: 1fr; }
  .header-stats { flex-wrap: wrap; gap: 16px; }
  .stat { flex: 1 1 40%; }
  .benefits-grid { grid-template-columns: 1fr; }
  .cta-actions { flex-direction: column; width: 100%; }
  .btn-whatsapp, .btn-email { justify-content: center; }
  .footer-content { flex-direction: column; text-align: center; }
  .footer-links { flex-wrap: wrap; justify-content: center; }
}
</style>
