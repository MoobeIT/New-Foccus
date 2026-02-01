<template>
  <div class="product-detail-page">
    <GlobalNav :show-menu="true" />

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Carregando produto...</p>
    </div>

    <div v-else-if="!product" class="not-found">
      <div class="not-found-icon">📦</div>
      <h2>Produto não encontrado</h2>
      <p>O produto que você está procurando não existe ou foi removido.</p>
      <router-link to="/products" class="btn-back">← Ver todos os produtos</router-link>
    </div>

    <template v-else>
      <div class="breadcrumb">
        <div class="container">
          <router-link to="/">Home</router-link>
          <span class="sep">›</span>
          <router-link to="/products">Produtos</router-link>
          <span class="sep">›</span>
          <span class="current">{{ product.name }}</span>
        </div>
      </div>

      <main class="main-content">
        <div class="container">
          <div class="product-layout">
            <div class="gallery-section">
              <div class="main-media">
                <div class="main-image" :style="getMainImageStyle()">
                  <span v-if="product.badge" class="product-badge">{{ product.badge }}</span>
                </div>
                <button v-if="allMedia.length > 1" class="nav-btn prev" @click="prevMedia">‹</button>
                <button v-if="allMedia.length > 1" class="nav-btn next" @click="nextMedia">›</button>
                <div class="media-counter" v-if="allMedia.length > 1">{{ currentMediaIndex + 1 }}/{{ allMedia.length }}</div>
              </div>

              <div v-if="allMedia.length > 1" class="media-thumbs">
                <div v-for="(media, index) in allMedia" :key="index" :class="['media-thumb', { active: currentMediaIndex === index }]" @click="selectMedia(index)">
                  <img :src="media.thumbnail || media.url" :alt="`Imagem ${index + 1}`" />
                </div>
              </div>

              <div class="trust-badges">
                <div class="trust-badge"><span>🖨️</span><div><strong>Impressão HP Indigo</strong><small>Qualidade offset</small></div></div>
                <div class="trust-badge"><span>📐</span><div><strong>Layflat 180°</strong><small>Abertura total</small></div></div>
                <div class="trust-badge"><span>🛡️</span><div><strong>Garantia 10 Anos</strong><small>Materiais premium</small></div></div>
              </div>
            </div>

            <div class="config-section">
              <div class="product-header">
                <span class="category-tag">{{ getCategoryLabel(product.category) }}</span>
                <h1>{{ product.name }}</h1>
                <p class="description">{{ product.description }}</p>
                <div class="price-box">
                  <span class="price-label">A partir de</span>
                  <span class="price-value">R$ {{ formatPrice(lowestFormatPrice) }}</span>
                  <span class="price-installments">ou 12x de R$ {{ formatPrice(lowestFormatPrice / 12) }}</span>
                </div>
              </div>

              <div class="config-card">
                <h3>🎨 Configure seu Álbum</h3>
                
                <div :class="['config-step', { active: activeStep === 1, completed: isStepCompleted(1) }]">
                  <div class="step-header" @click="toggleStep(1)">
                    <span class="step-num">{{ isStepCompleted(1) ? '✓' : '1' }}</span>
                    <span class="step-title">Tamanho</span>
                    <span v-if="selectedFormat && activeStep !== 1" class="step-value">{{ selectedFormat.name }}</span>
                    <span class="step-arrow">{{ activeStep === 1 ? '▲' : '▼' }}</span>
                  </div>
                  <div v-show="activeStep === 1" class="step-content">
                    <div class="format-grid">
                      <button v-for="format in product.formats" :key="format.id" :class="['format-card', { active: selectedFormat?.id === format.id }]" @click="selectFormat(format); markStepCompleted(1); activeStep = 2">
                        <span class="format-name">{{ format.name }}</span>
                        <span class="format-dims">{{ format.width/10 }}×{{ format.height/10 }}cm</span>
                        <span class="format-price">R$ {{ formatPrice(format.basePrice) }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div :class="['config-step', { active: activeStep === 2, completed: isStepCompleted(2) }]">
                  <div class="step-header" @click="toggleStep(2)">
                    <span class="step-num">{{ isStepCompleted(2) ? '✓' : '2' }}</span>
                    <span class="step-title">Páginas</span>
                    <span v-if="activeStep !== 2" class="step-value">{{ selectedPages }} páginas</span>
                    <span class="step-arrow">{{ activeStep === 2 ? '▲' : '▼' }}</span>
                  </div>
                  <div v-show="activeStep === 2" class="step-content">
                    <div class="pages-control">
                      <button class="pages-btn" @click.stop="decreasePages" :disabled="selectedPages <= currentMinPages">−</button>
                      <div class="pages-display"><span class="pages-number">{{ selectedPages }}</span><span class="pages-label">páginas</span></div>
                      <button class="pages-btn" @click.stop="increasePages" :disabled="selectedPages >= currentMaxPages">+</button>
                    </div>
                    <div class="pages-info"><span>Mín: {{ currentMinPages }}</span><span>Máx: {{ currentMaxPages }}</span></div>
                    <div v-if="extraSpreads > 0" class="extra-info">+{{ extraSpreads }} lâmina(s) extra = <strong>R$ {{ formatPrice(extraPagesPrice) }}</strong></div>
                    <button class="btn-continue" @click="markStepCompleted(2); activeStep = product.papers?.length > 0 ? 3 : (product.coverTypes?.length > 0 ? 4 : 0)">Continuar →</button>
                  </div>
                </div>

                <div v-if="product.papers?.length > 0" :class="['config-step', { active: activeStep === 3, completed: isStepCompleted(3) }]">
                  <div class="step-header" @click="toggleStep(3)">
                    <span class="step-num">{{ isStepCompleted(3) ? '✓' : '3' }}</span>
                    <span class="step-title">Papel</span>
                    <span v-if="selectedPaper && activeStep !== 3" class="step-value">{{ selectedPaper.name }}</span>
                    <span class="step-arrow">{{ activeStep === 3 ? '▲' : '▼' }}</span>
                  </div>
                  <div v-show="activeStep === 3" class="step-content">
                    <div class="options-grid">
                      <button v-for="paper in product.papers" :key="paper.id" :class="['option-card', { active: selectedPaper?.id === paper.id }]" @click="selectedPaper = paper; markStepCompleted(3); activeStep = product.coverTypes?.length > 0 ? 4 : 0">
                        <span class="option-name">{{ paper.name }}</span>
                        <span v-if="paper.priceAdjustment > 0" class="option-price">+R$ {{ formatPrice(paper.priceAdjustment) }}</span>
                        <span v-else class="option-price included">Incluído</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="product.coverTypes?.length > 0" :class="['config-step', { active: activeStep === 4, completed: isStepCompleted(4) }]">
                  <div class="step-header" @click="toggleStep(4)">
                    <span class="step-num">{{ isStepCompleted(4) ? '✓' : (product.papers?.length > 0 ? '4' : '3') }}</span>
                    <span class="step-title">Capa</span>
                    <span v-if="selectedCover && activeStep !== 4" class="step-value">{{ selectedCover.name }}</span>
                    <span class="step-arrow">{{ activeStep === 4 ? '▲' : '▼' }}</span>
                  </div>
                  <div v-show="activeStep === 4" class="step-content">
                    <div class="options-grid">
                      <button v-for="cover in product.coverTypes" :key="cover.id" :class="['option-card', { active: selectedCover?.id === cover.id }]" @click="selectedCover = cover; markStepCompleted(4); activeStep = 0">
                        <span class="option-name">{{ cover.name }}</span>
                        <span v-if="(cover.price + cover.priceAdjustment) > 0" class="option-price">+R$ {{ formatPrice(cover.price + cover.priceAdjustment) }}</span>
                        <span v-else class="option-price included">Incluído</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="product.hasCase" class="case-option">
                  <label class="case-checkbox">
                    <input type="checkbox" v-model="includeCase" />
                    <span class="checkbox-box"></span>
                    <span class="case-text">🎁 Adicionar Estojo Premium</span>
                    <span class="case-price">+R$ {{ formatPrice(product.casePrice) }}</span>
                  </label>
                </div>
              </div>

              <div class="shipping-card">
                <h3>🚚 Calcular Frete</h3>
                <ShippingCalculator :product-id="product.id" :quantity="1" :subtotal="subtotalPrice" @shipping-calculated="onShippingCalculated" @option-selected="onShippingOptionSelected" />
                <div v-if="freeShippingMessage" class="shipping-alert" :class="{ success: finalShippingPrice === 0 }">{{ freeShippingMessage }}</div>
              </div>

              <div class="summary-card">
                <h3>💰 Resumo</h3>
                <div class="summary-items">
                  <div class="summary-item"><span>{{ selectedFormat?.name || 'Formato' }}</span><span>R$ {{ formatPrice(formatBasePrice) }}</span></div>
                  <div v-if="extraSpreads > 0" class="summary-item"><span>+{{ extraSpreads }} lâmina(s)</span><span>R$ {{ formatPrice(extraPagesPrice) }}</span></div>
                  <div v-if="paperAdjustment > 0" class="summary-item"><span>Papel {{ selectedPaper?.name }}</span><span>R$ {{ formatPrice(paperAdjustment) }}</span></div>
                  <div v-if="coverPrice > 0" class="summary-item"><span>Capa {{ selectedCover?.name }}</span><span>R$ {{ formatPrice(coverPrice) }}</span></div>
                  <div v-if="casePrice > 0" class="summary-item"><span>Estojo</span><span>R$ {{ formatPrice(casePrice) }}</span></div>
                  <div v-if="selectedShipping" class="summary-item"><span>Frete</span><span :class="{ free: finalShippingPrice === 0 }">{{ finalShippingPrice === 0 ? 'GRÁTIS' : 'R$ ' + formatPrice(finalShippingPrice) }}</span></div>
                </div>
                <div class="summary-total"><span>Total</span><span class="total-price">R$ {{ formatPrice(totalPrice) }}</span></div>
              </div>

              <div class="action-buttons">
                <button class="btn-primary" @click="startCustomization"><span class="btn-icon">🎨</span><span class="btn-text"><strong>Criar no Editor</strong><small>Monte seu álbum online</small></span></button>
                <button class="btn-secondary" @click="startUpload"><span class="btn-icon">📤</span><span class="btn-text"><strong>Enviar Arquivo</strong><small>PDF ou imagens prontas</small></span></button>
              </div>

              <div class="security-badges">
                <span>🔒 Pagamento Seguro</span>
                <span>📦 Embalagem Especial</span>
                <span>✅ Prova Digital</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
        <div class="upload-modal">
          <div class="modal-header"><h3>📤 Enviar Arquivo</h3><button class="close-btn" @click="showUploadModal = false">✕</button></div>
          <div class="modal-body">
            <div class="upload-dropzone" :class="{ 'drag-over': isDragging }" @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleFileDrop" @click="triggerFileInput">
              <input ref="fileInput" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" @change="handleFileSelect" style="display: none" />
              <span class="upload-icon">📁</span>
              <p>Arraste arquivos ou clique</p>
              <small>PDF, JPG, PNG • Máx 50MB</small>
            </div>
            <div v-if="uploadedFiles.length > 0" class="uploaded-files">
              <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                <span>{{ file.name.endsWith('.pdf') ? '📄' : '🖼️' }} {{ file.name }}</span>
                <button @click="removeFile(index)">✕</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showUploadModal = false">Cancelar</button>
            <button class="btn-submit" @click="submitUpload" :disabled="uploadedFiles.length === 0 || isUploading">{{ isUploading ? 'Enviando...' : 'Criar Projeto' }}</button>
          </div>
        </div>
      </div>

      <section class="extended-info">
        <div class="container">
          <div class="materials-grid">
            <div class="material-card"><span>📄</span><h4>Papel 800g</h4><p>Cores vibrantes</p></div>
            <div class="material-card"><span>📕</span><h4>Capa Dura</h4><p>Acabamento luxuoso</p></div>
            <div class="material-card"><span>📐</span><h4>Layflat</h4><p>Abertura 180°</p></div>
            <div class="material-card"><span>✨</span><h4>Artesanal</h4><p>Inspeção manual</p></div>
          </div>

          <div class="faq-section">
            <h2>❓ Perguntas Frequentes</h2>
            <div class="faq-list">
              <div v-for="(faq, index) in faqs" :key="index" class="faq-item" :class="{ open: openFaq === index }">
                <button class="faq-question" @click="openFaq = openFaq === index ? null : index"><span>{{ faq.question }}</span><span>{{ openFaq === index ? '−' : '+' }}</span></button>
                <div class="faq-answer" v-show="openFaq === index"><p>{{ faq.answer }}</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <footer class="footer"><div class="container"><p>© 2025 Foccus Álbuns</p></div></footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ShippingCalculator from '@/components/shipping/ShippingCalculator.vue'
import GlobalNav from '@/components/common/GlobalNav.vue'

interface ShippingOption { service: string; serviceName: string; price: number }
interface MediaItem { type: 'image' | 'video'; url: string; thumbnail?: string }

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const loading = ref(true)
const product = ref<any>(null)
const currentMediaIndex = ref(0)
const selectedFormat = ref<any>(null)
const selectedPaper = ref<any>(null)
const selectedCover = ref<any>(null)
const selectedPages = ref(20)
const includeCase = ref(false)
const selectedShipping = ref<ShippingOption | null>(null)
const showUploadModal = ref(false)
const uploadedFiles = ref<File[]>([])
const isDragging = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const activeStep = ref(1)
const openFaq = ref<number | null>(null)
const completedSteps = ref<Set<number>>(new Set())

const faqs = [
  { question: 'Qual o prazo de produção?', answer: 'De 5 a 7 dias úteis após aprovação.' },
  { question: 'Posso fazer alterações?', answer: 'Sim, até a aprovação final.' },
  { question: 'Como funciona a garantia?', answer: '10 anos contra defeitos.' },
  { question: 'Enviam para todo Brasil?', answer: 'Sim! Frete grátis acima de R$300.' }
]

const markStepCompleted = (step: number) => completedSteps.value.add(step)
const isStepCompleted = (step: number) => completedSteps.value.has(step)
const toggleStep = (step: number) => { activeStep.value = activeStep.value === step ? 0 : step }

const allMedia = computed<MediaItem[]>(() => {
  const media: MediaItem[] = []
  if (product.value?.imageUrl) media.push({ type: 'image', url: product.value.imageUrl })
  if (product.value?.galleryImages?.length) {
    product.value.galleryImages.forEach((img: string) => {
      if (img !== product.value?.imageUrl) media.push({ type: 'image', url: img })
    })
  }
  return media
})

const selectMedia = (index: number) => { currentMediaIndex.value = index }
const prevMedia = () => { currentMediaIndex.value = currentMediaIndex.value > 0 ? currentMediaIndex.value - 1 : allMedia.value.length - 1 }
const nextMedia = () => { currentMediaIndex.value = currentMediaIndex.value < allMedia.value.length - 1 ? currentMediaIndex.value + 1 : 0 }

const lowestFormatPrice = computed(() => product.value?.formats?.length ? Math.min(...product.value.formats.map((f: any) => f.basePrice || 0)) : product.value?.basePrice || 0)
const currentMinPages = computed(() => selectedFormat.value?.minPages || product.value?.minPages || 20)
const currentMaxPages = computed(() => selectedFormat.value?.maxPages || product.value?.maxPages || 100)
const currentPageIncrement = computed(() => selectedFormat.value?.pageIncrement || product.value?.pageIncrement || 2)
const extraPages = computed(() => Math.max(0, selectedPages.value - currentMinPages.value))
const extraSpreads = computed(() => extraPages.value / currentPageIncrement.value)
const extraPagesPrice = computed(() => extraSpreads.value * (selectedPaper.value?.priceAdjustment || 0))
const formatBasePrice = computed(() => selectedFormat.value?.basePrice || 0)
const paperAdjustment = computed(() => selectedPaper.value?.priceAdjustment || 0)
const coverPrice = computed(() => selectedCover.value ? (selectedCover.value.price || 0) + (selectedCover.value.priceAdjustment || 0) : 0)
const casePrice = computed(() => includeCase.value && product.value ? product.value.casePrice || 0 : 0)
const subtotalPrice = computed(() => formatBasePrice.value + extraPagesPrice.value + paperAdjustment.value + coverPrice.value + casePrice.value)

const freeShippingMessage = computed(() => {
  if (!selectedShipping.value) return ''
  const s = selectedShipping.value.service?.toUpperCase() || ''
  if (s.includes('SEDEX') && subtotalPrice.value >= 400) return '🎉 Frete SEDEX grátis!'
  if (s.includes('PAC') && subtotalPrice.value >= 300) return '🎉 Frete PAC grátis!'
  if (s.includes('PAC')) return `Falta R$ ${formatPrice(300 - subtotalPrice.value)} para frete grátis`
  return ''
})

const finalShippingPrice = computed(() => {
  if (!selectedShipping.value) return 0
  const s = selectedShipping.value.service?.toUpperCase() || ''
  if (s.includes('SEDEX') && subtotalPrice.value >= 400) return 0
  if (s.includes('PAC') && subtotalPrice.value >= 300) return 0
  return selectedShipping.value.price || 0
})

const totalPrice = computed(() => subtotalPrice.value + finalShippingPrice.value)
const formatPrice = (p: number) => p?.toFixed(2).replace('.', ',') || '0,00'
const getCategoryLabel = (c: string) => ({ casamento: '💒 Casamento', ensaio: '📸 Ensaio', newborn: '👶 Newborn' }[c] || '📦 Produto')

const getMainImageStyle = () => {
  const media = allMedia.value[currentMediaIndex.value]
  const img = media?.url || product.value?.imageUrl
  if (img) return { backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: 'linear-gradient(135deg, #D4775C, #E8956F)' }
}

const selectFormat = (f: any) => { selectedFormat.value = f; if (selectedPages.value < f.minPages) selectedPages.value = f.minPages }
const increasePages = () => { if (selectedPages.value + currentPageIncrement.value <= currentMaxPages.value) selectedPages.value += currentPageIncrement.value }
const decreasePages = () => { if (selectedPages.value - currentPageIncrement.value >= currentMinPages.value) selectedPages.value -= currentPageIncrement.value }

const saveProductConfig = () => {
  const cfg = { productId: product.value?.id, productName: product.value?.name, productSlug: product.value?.slug, formatId: selectedFormat.value?.id, formatName: selectedFormat.value?.name, width: selectedFormat.value?.width || 300, height: selectedFormat.value?.height || 300, paperId: selectedPaper.value?.id, paperName: selectedPaper.value?.name, coverId: selectedCover.value?.id, coverName: selectedCover.value?.name, pages: selectedPages.value, minPages: product.value?.minPages || 20, maxPages: product.value?.maxPages || 100, pageIncrement: product.value?.pageIncrement || 2, includeCase: includeCase.value }
  localStorage.setItem('editor-product-config', JSON.stringify(cfg))
  if (localStorage.getItem('editor-last-product-id') !== product.value?.id) { localStorage.removeItem('album-project'); localStorage.setItem('editor-last-product-id', product.value?.id || '') }
}

const startCustomization = () => { if (!isAuthenticated.value) { authStore.setRedirectAfterLogin('/editor'); saveProductConfig(); router.push('/login'); return }; saveProductConfig(); router.push('/editor') }
const startUpload = () => { if (!isAuthenticated.value) { saveProductConfig(); router.push('/login'); return }; showUploadModal.value = true }

const triggerFileInput = () => fileInput.value?.click()
const handleFileSelect = (e: Event) => { const input = e.target as HTMLInputElement; if (input.files) addFiles(Array.from(input.files)) }
const handleFileDrop = (e: DragEvent) => { isDragging.value = false; if (e.dataTransfer?.files) addFiles(Array.from(e.dataTransfer.files)) }
const addFiles = (files: File[]) => { uploadedFiles.value = [...uploadedFiles.value, ...files.filter(f => f.size <= 50 * 1024 * 1024)] }
const removeFile = (i: number) => uploadedFiles.value.splice(i, 1)

const submitUpload = async () => {
  if (!uploadedFiles.value.length) return
  isUploading.value = true
  try {
    const fd = new FormData(); uploadedFiles.value.forEach(f => fd.append('files', f))
    const token = localStorage.getItem('accessToken')
    const res = await fetch('/api/v1/projects/upload', { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: fd })
    if (res.ok) { const r = await res.json(); showUploadModal.value = false; router.push(`/studio/projects/${r.data?.id || r.id}`) }
  } catch { alert('Erro ao enviar.') } finally { isUploading.value = false }
}

const onShippingCalculated = () => {}
const onShippingOptionSelected = (o: ShippingOption) => selectedShipping.value = o

const loadProduct = async () => {
  loading.value = true
  try {
    const res = await fetch(`/api/v1/public/catalog/products/${route.params.slug}`)
    if (res.ok) {
      const r = await res.json(); product.value = r?.data || r
    } else {
      // Fallback para dados locais
      const { catalogService } = await import('@/services/catalog')
      product.value = await catalogService.getProductBySlug(route.params.slug as string)
    }
    if (product.value) {
      const df = product.value.formats?.find((f: any) => f.isDefault) || product.value.formats?.[0]
      selectedFormat.value = df; selectedPages.value = df?.minPages || product.value.minPages || 20
      selectedPaper.value = product.value.papers?.find((p: any) => p.isDefault) || product.value.papers?.[0]
      selectedCover.value = product.value.coverTypes?.find((c: any) => c.isDefault) || product.value.coverTypes?.[0]
    }
  } catch (e) {
    console.error('Erro ao carregar produto:', e)
    // Fallback para dados locais em caso de erro
    try {
      const { catalogService } = await import('@/services/catalog')
      product.value = await catalogService.getProductBySlug(route.params.slug as string)
      if (product.value) {
        const df = product.value.formats?.find((f: any) => f.isDefault) || product.value.formats?.[0]
        selectedFormat.value = df; selectedPages.value = df?.minPages || product.value.minPages || 20
        selectedPaper.value = product.value.papers?.find((p: any) => p.isDefault) || product.value.papers?.[0]
        selectedCover.value = product.value.coverTypes?.find((c: any) => c.isDefault) || product.value.coverTypes?.[0]
      }
    } catch (fallbackError) {
      console.error('Erro no fallback:', fallbackError)
    }
  } finally { loading.value = false }
}

onMounted(() => loadProduct())
watch(() => route.params.slug, () => loadProduct())
</script>

<style scoped>
.product-detail-page { background: #FDFBF7; min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.loading-container, .not-found { text-align: center; padding: 140px 24px; }
.spinner { width: 40px; height: 40px; border: 3px solid #EBE7E0; border-top-color: #D4775C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.not-found-icon { font-size: 4rem; margin-bottom: 16px; }
.not-found h2 { font-size: 1.5rem; color: #2D2A26; margin-bottom: 8px; }
.not-found p { color: #6B6560; margin-bottom: 24px; }
.btn-back { display: inline-block; background: #D4775C; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; }

.breadcrumb { padding: 80px 24px 12px; background: #fff; border-bottom: 1px solid #EBE7E0; }
.breadcrumb .container { display: flex; gap: 8px; font-size: 13px; }
.breadcrumb a { color: #6B6560; text-decoration: none; }
.breadcrumb a:hover { color: #D4775C; }
.breadcrumb .sep { color: #D4D0C8; }
.breadcrumb .current { color: #2D2A26; font-weight: 500; }

.main-content { padding: 32px 0 60px; }
.product-layout { display: grid; grid-template-columns: 1fr 420px; gap: 40px; align-items: start; }

.gallery-section { position: sticky; top: 100px; }
.main-media { position: relative; margin-bottom: 16px; }
.main-image { height: 450px; border-radius: 16px; position: relative; }
.product-badge { position: absolute; top: 16px; left: 16px; background: #D4775C; color: #fff; padding: 6px 14px; border-radius: 50px; font-size: 12px; font-weight: 600; }
.nav-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border: none; background: rgba(255,255,255,0.9); border-radius: 50%; font-size: 1.5rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.nav-btn:hover { background: #fff; }
.nav-btn.prev { left: 12px; }
.nav-btn.next { right: 12px; }
.media-counter { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; }

.media-thumbs { display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; }
.media-thumb { width: 70px; height: 70px; border-radius: 10px; overflow: hidden; cursor: pointer; border: 3px solid transparent; flex-shrink: 0; }
.media-thumb:hover { border-color: #E8956F; }
.media-thumb.active { border-color: #D4775C; }
.media-thumb img { width: 100%; height: 100%; object-fit: cover; }

.trust-badges { display: flex; gap: 12px; margin-bottom: 24px; }
.trust-badge { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #EBE7E0; border-radius: 10px; padding: 12px 14px; flex: 1; }
.trust-badge span:first-child { font-size: 1.5rem; }
.trust-badge strong { display: block; font-size: 12px; color: #2D2A26; }
.trust-badge small { font-size: 11px; color: #9A958E; }

.config-section { display: flex; flex-direction: column; gap: 16px; }
.product-header { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; padding: 24px; }
.category-tag { display: inline-block; background: #FEF3E2; color: #B8632E; padding: 5px 12px; border-radius: 50px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
.product-header h1 { font-size: 1.75rem; font-weight: 700; color: #2D2A26; margin: 0 0 12px 0; line-height: 1.2; }
.description { font-size: 14px; color: #6B6560; line-height: 1.6; margin: 0 0 16px 0; }
.price-box { background: #FEF8F6; border-radius: 12px; padding: 16px; }
.price-label { font-size: 13px; color: #9A958E; display: block; }
.price-value { font-size: 2rem; font-weight: 700; color: #D4775C; }
.price-installments { font-size: 13px; color: #6B6560; margin-top: 4px; display: block; }

.config-card { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; padding: 24px; }
.config-card h3 { font-size: 15px; font-weight: 600; color: #2D2A26; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #EBE7E0; }

.config-step { border: 1px solid #EBE7E0; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
.config-step.active { border-color: #D4775C; box-shadow: 0 4px 12px rgba(212, 119, 92, 0.15); }
.config-step.completed { border-color: #22c55e; background: #f0fdf4; }
.step-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; }
.step-header:hover { background: #f8f7f4; }
.config-step.active .step-header { background: #FEF8F6; }
.step-num { width: 28px; height: 28px; background: linear-gradient(135deg, #D4775C, #E8956F); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.config-step.completed .step-num { background: linear-gradient(135deg, #22c55e, #16a34a); }
.step-title { font-size: 14px; font-weight: 600; color: #2D2A26; }
.step-value { flex: 1; font-size: 13px; color: #6B6560; text-align: right; }
.step-arrow { font-size: 10px; color: #9A958E; }
.step-content { padding: 16px; border-top: 1px solid #EBE7E0; }

.format-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.format-card { padding: 14px; border: 2px solid #EBE7E0; background: #fff; border-radius: 10px; cursor: pointer; text-align: center; }
.format-card:hover { border-color: #D4775C; }
.format-card.active { border-color: #D4775C; background: #FEF8F6; }
.format-name { display: block; font-weight: 600; font-size: 14px; color: #2D2A26; }
.format-dims { display: block; font-size: 12px; color: #9A958E; margin: 4px 0; }
.format-price { display: block; font-size: 14px; font-weight: 700; color: #D4775C; }

.pages-control { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 16px; background: #f8f7f4; border-radius: 12px; }
.pages-btn { width: 44px; height: 44px; border: none; border-radius: 10px; font-size: 1.5rem; cursor: pointer; font-weight: 600; background: #D4775C; color: #fff; }
.pages-btn:hover:not(:disabled) { transform: scale(1.05); }
.pages-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pages-display { text-align: center; }
.pages-number { display: block; font-size: 2rem; font-weight: 700; color: #2D2A26; }
.pages-label { font-size: 12px; color: #9A958E; }
.pages-info { display: flex; justify-content: space-between; font-size: 12px; color: #9A958E; margin-top: 8px; }
.extra-info { text-align: center; font-size: 13px; color: #D4775C; margin-top: 8px; padding: 8px; background: #FEF8F6; border-radius: 8px; }
.btn-continue { width: 100%; margin-top: 16px; padding: 12px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

.options-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option-card { padding: 12px 16px; border: 2px solid #EBE7E0; background: #fff; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.option-card:hover { border-color: #D4775C; }
.option-card.active { border-color: #D4775C; background: #FEF8F6; }
.option-name { font-size: 13px; font-weight: 600; color: #2D2A26; }
.option-price { font-size: 11px; color: #D4775C; }
.option-price.included { color: #22c55e; }

.case-option { padding: 16px; border-top: 1px dashed #EBE7E0; }
.case-checkbox { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.case-checkbox input { display: none; }
.checkbox-box { width: 22px; height: 22px; border: 2px solid #D4D0C8; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.case-checkbox input:checked + .checkbox-box { background: #D4775C; border-color: #D4775C; }
.case-checkbox input:checked + .checkbox-box::after { content: '✓'; color: #fff; font-size: 14px; }
.case-text { flex: 1; font-size: 14px; color: #2D2A26; }
.case-price { font-size: 14px; font-weight: 600; color: #D4775C; }

.shipping-card, .summary-card { background: #fff; border: 1px solid #EBE7E0; border-radius: 16px; padding: 20px; }
.shipping-card h3, .summary-card h3 { font-size: 15px; font-weight: 600; color: #2D2A26; margin: 0 0 16px 0; }
.shipping-alert { padding: 10px 14px; border-radius: 8px; font-size: 13px; text-align: center; margin-top: 12px; background: #FEF3E2; color: #B8632E; }
.shipping-alert.success { background: #dcfce7; color: #166534; }

.summary-items { display: flex; flex-direction: column; gap: 8px; }
.summary-item { display: flex; justify-content: space-between; font-size: 13px; color: #6B6560; padding: 6px 0; }
.summary-item .free { color: #22c55e; font-weight: 600; }
.summary-total { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; margin-top: 8px; border-top: 2px solid #EBE7E0; }
.summary-total span:first-child { font-size: 15px; font-weight: 600; color: #2D2A26; }
.total-price { font-size: 1.75rem; font-weight: 700; color: #D4775C; }

.action-buttons { display: flex; flex-direction: column; gap: 12px; }
.btn-primary, .btn-secondary { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 14px; cursor: pointer; border: none; text-align: left; }
.btn-primary { background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(212, 119, 92, 0.3); }
.btn-secondary { background: #fff; border: 2px solid #D4775C; color: #D4775C; }
.btn-secondary:hover { background: #FEF8F6; }
.btn-icon { font-size: 1.75rem; }
.btn-text { display: flex; flex-direction: column; }
.btn-text strong { font-size: 15px; }
.btn-text small { font-size: 12px; opacity: 0.8; }

.security-badges { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; padding: 16px; background: #f8f7f4; border-radius: 12px; }
.security-badges span { font-size: 12px; color: #6B6560; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.upload-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #EBE7E0; }
.modal-header h3 { margin: 0; font-size: 1.1rem; color: #2D2A26; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9A958E; }
.modal-body { padding: 24px; }
.upload-dropzone { border: 2px dashed #D4D0C8; border-radius: 12px; padding: 40px 20px; text-align: center; cursor: pointer; }
.upload-dropzone:hover, .upload-dropzone.drag-over { border-color: #D4775C; background: #FEF8F6; }
.upload-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.uploaded-files { margin-top: 16px; }
.file-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f8f7f4; border-radius: 8px; margin-bottom: 8px; font-size: 14px; }
.file-item button { background: none; border: none; color: #DC2626; cursor: pointer; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #EBE7E0; }
.btn-cancel { padding: 12px 24px; background: #f8f7f4; color: #4A4744; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-submit { padding: 12px 24px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-submit:disabled { opacity: 0.6; }

.extended-info { padding: 60px 0; background: #fff; }
.materials-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 48px; }
.material-card { background: #FDFBF7; border: 1px solid #EBE7E0; border-radius: 12px; padding: 24px; text-align: center; }
.material-card span { font-size: 2rem; display: block; margin-bottom: 12px; }
.material-card h4 { font-size: 14px; font-weight: 600; color: #2D2A26; margin: 0 0 4px 0; }
.material-card p { font-size: 12px; color: #6B6560; margin: 0; }

.faq-section { max-width: 700px; margin: 0 auto; }
.faq-section h2 { font-size: 1.5rem; font-weight: 700; color: #2D2A26; text-align: center; margin-bottom: 24px; }
.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item { background: #FDFBF7; border: 1px solid #EBE7E0; border-radius: 10px; overflow: hidden; }
.faq-item.open { border-color: #D4775C; }
.faq-question { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #2D2A26; text-align: left; }
.faq-question:hover { background: #f8f7f4; }
.faq-answer { padding: 0 20px 16px; }
.faq-answer p { font-size: 13px; color: #6B6560; line-height: 1.6; margin: 0; }

.footer { padding: 32px 24px; background: #2D2A26; text-align: center; }
.footer p { color: #78716C; font-size: 14px; margin: 0; }

@media (max-width: 900px) { .product-layout { grid-template-columns: 1fr; } .gallery-section { position: static; } .materials-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .format-grid { grid-template-columns: 1fr; } .main-image { height: 280px; } .materials-grid { grid-template-columns: 1fr; } .trust-badges { flex-direction: column; } }
</style>
