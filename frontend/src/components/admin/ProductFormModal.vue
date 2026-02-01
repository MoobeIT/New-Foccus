<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ mode === 'create' ? 'Novo Produto' : 'Editar Produto' }}</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['tab', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="form-content">
          <!-- Tab: Informações Básicas -->
          <div v-show="activeTab === 'basic'" class="tab-content">
            <div class="form-row">
              <div class="form-group">
                <label>Nome do Produto *</label>
                <input v-model="form.name" type="text" required placeholder="Ex: Álbum Casamento Premium" />
              </div>
              <div class="form-group">
                <label>Slug (URL)</label>
                <input v-model="form.slug" type="text" placeholder="album-casamento-premium" />
                <small>Gerado automaticamente se vazio</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Tipo *</label>
                <select v-model="form.type" required>
                  <option value="photobook">📖 Álbum Fotográfico</option>
                  <option value="calendar">📅 Calendário</option>
                  <option value="card">💌 Cartão</option>
                  <option value="poster">🖼️ Poster</option>
                  <option value="case">🎁 Estojo</option>
                </select>
              </div>
              <div class="form-group">
                <label>Categoria</label>
                <select v-model="form.category">
                  <option value="">Selecione...</option>
                  <option value="casamento">💒 Casamento</option>
                  <option value="ensaio">📸 Ensaio</option>
                  <option value="newborn">👶 Newborn</option>
                  <option value="15anos">🎀 15 Anos</option>
                  <option value="estojo">🎁 Estojo</option>
                  <option value="outros">📦 Outros</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Descrição Curta</label>
              <input v-model="form.shortDescription" type="text" maxlength="200" 
                placeholder="Capa dura, papel 230g, acabamento premium" />
              <small>{{ (form.shortDescription || '').length }}/200 caracteres</small>
            </div>

            <div class="form-group">
              <label>Descrição Completa</label>
              <textarea v-model="form.description" rows="4" 
                placeholder="Descrição detalhada do produto..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Badge</label>
                <select v-model="form.badge">
                  <option value="">Nenhum</option>
                  <option value="Mais Vendido">🔥 Mais Vendido</option>
                  <option value="Novo">✨ Novo</option>
                  <option value="Premium">⭐ Premium</option>
                  <option value="Promoção">🏷️ Promoção</option>
                </select>
              </div>
              <div class="form-group">
                <label>Ordem de Exibição</label>
                <input v-model.number="form.sortOrder" type="number" min="0" />
              </div>
            </div>
          </div>

          <!-- Tab: Preços e Páginas -->
          <div v-show="activeTab === 'pricing'" class="tab-content">
            <h3>💰 Precificação</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Preço Base (R$) *</label>
                <input v-model.number="form.basePrice" type="number" step="0.01" min="0" required />
                <small>Preço do álbum com páginas incluídas</small>
              </div>
              <div class="form-group">
                <label>Páginas Incluídas no Preço Base</label>
                <input v-model.number="form.basePagesIncluded" type="number" min="1" />
                <small>Ex: 20 páginas ou 10 lâminas</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Preço por Página Extra (R$)</label>
                <input v-model.number="form.pricePerExtraPage" type="number" step="0.01" min="0" />
                <small>Valor de cada página adicional</small>
              </div>
              <div class="form-group">
                <label>Preço por Lâmina Extra (R$)</label>
                <input v-model.number="form.pricePerExtraSpread" type="number" step="0.01" min="0" />
                <small>Valor de cada lâmina (2 páginas) adicional</small>
              </div>
            </div>

            <h3>📄 Configuração de Páginas</h3>
            <div class="form-row three-cols">
              <div class="form-group">
                <label>Mínimo de Páginas</label>
                <input v-model.number="form.minPages" type="number" min="1" />
              </div>
              <div class="form-group">
                <label>Máximo de Páginas</label>
                <input v-model.number="form.maxPages" type="number" min="1" />
              </div>
              <div class="form-group">
                <label>Incremento</label>
                <select v-model.number="form.pageIncrement">
                  <option :value="1">1 página</option>
                  <option :value="2">2 páginas (lâminas)</option>
                  <option :value="4">4 páginas</option>
                </select>
              </div>
            </div>

            <h3>🎁 Estojo (Opcional)</h3>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" v-model="form.hasCase" />
                  Produto tem opção de estojo
                </label>
              </div>
            </div>
            <div v-if="form.hasCase" class="form-row">
              <div class="form-group">
                <label>Preço do Estojo (R$)</label>
                <input v-model.number="form.casePrice" type="number" step="0.01" min="0" />
              </div>
              <div class="form-group">
                <label>Descrição do Estojo</label>
                <input v-model="form.caseDescription" type="text" placeholder="Estojo em madeira maciça..." />
              </div>
            </div>
          </div>

          <!-- Tab: Características -->
          <div v-show="activeTab === 'features'" class="tab-content">
            <h3>✨ Características do Produto</h3>
            <p class="help-text">Liste os diferenciais e características do produto</p>
            
            <div class="features-list">
              <div v-for="(feature, index) in form.features" :key="index" class="feature-item">
                <input v-model="form.features[index]" type="text" placeholder="Ex: Capa dura com acabamento premium" />
                <button type="button" class="btn-remove" @click="removeFeature(index)">✕</button>
              </div>
              <button type="button" class="btn-add" @click="addFeature">+ Adicionar Característica</button>
            </div>

            <h3>📋 Especificações Técnicas</h3>
            <p class="help-text">Adicione especificações com ícone, label e valor</p>
            
            <div class="specs-list">
              <div v-for="(spec, index) in form.specs" :key="index" class="spec-item">
                <select v-model="form.specs[index].icon" class="spec-icon">
                  <option value="📐">📐</option>
                  <option value="📄">📄</option>
                  <option value="🎨">🎨</option>
                  <option value="📚">📚</option>
                  <option value="✨">✨</option>
                  <option value="📦">📦</option>
                  <option value="🖼️">🖼️</option>
                  <option value="💎">💎</option>
                </select>
                <input v-model="form.specs[index].label" type="text" placeholder="Label (ex: Tamanhos)" class="spec-label" />
                <input v-model="form.specs[index].value" type="text" placeholder="Valor (ex: 20x20, 25x25 cm)" class="spec-value" />
                <button type="button" class="btn-remove" @click="removeSpec(index)">✕</button>
              </div>
              <button type="button" class="btn-add" @click="addSpec">+ Adicionar Especificação</button>
            </div>
          </div>

          <!-- Tab: Papéis e Capas -->
          <div v-show="activeTab === 'materials'" class="tab-content">
            <!-- FORMATOS -->
            <div class="materials-section">
              <div class="section-header-row">
                <h3>📐 Formatos do Produto</h3>
                <span class="selected-count">{{ productFormats.length }} formato(s)</span>
              </div>
              <p class="help-text">Os formatos são criados especificamente para cada produto. Gerencie os formatos na seção "Formatos" do menu.</p>
              
              <div v-if="productFormats.length === 0" class="empty-materials">
                <p>⚠️ Nenhum formato cadastrado para este produto. 
                  <router-link to="/admin" @click="$emit('close')">Cadastre formatos na seção Formatos</router-link>.
                </p>
              </div>
              <div v-else class="materials-table">
                <div class="table-header">
                  <span class="col-name">Formato</span>
                  <span class="col-size">Dimensões</span>
                  <span class="col-pages">Páginas</span>
                  <span class="col-price">Multiplicador</span>
                  <span class="col-status">Status</span>
                </div>
                <div 
                  v-for="format in productFormats" 
                  :key="format.id" 
                  class="table-row"
                  :class="{ selected: format.isActive }"
                >
                  <span class="col-name">
                    <strong>{{ format.name }}</strong>
                  </span>
                  <span class="col-size">{{ format.width }}×{{ format.height }}mm</span>
                  <span class="col-pages">{{ format.minPages }}-{{ format.maxPages }}</span>
                  <span class="col-price">
                    <strong>{{ format.priceMultiplier }}x</strong>
                  </span>
                  <span class="col-status">
                    <span :class="['status-badge', format.isActive ? 'active' : 'inactive']">
                      {{ format.isActive ? 'Ativo' : 'Inativo' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- PAPÉIS -->
            <div class="materials-section">
              <div class="section-header-row">
                <h3>📜 Papéis Disponíveis</h3>
                <span class="selected-count">{{ form.papers.length }} selecionado(s)</span>
              </div>
              <p class="help-text">Selecione os papéis disponíveis e defina o ajuste de preço por página extra</p>
              
              <div v-if="availablePapers.length === 0" class="empty-materials">
                <p>⚠️ Nenhum papel cadastrado. <a href="/admin" @click.prevent="$emit('close')">Cadastre papéis primeiro</a>.</p>
              </div>
              <div v-else class="materials-table">
                <div class="table-header">
                  <span class="col-check"></span>
                  <span class="col-name">Papel</span>
                  <span class="col-size">Tipo / Acabamento</span>
                  <span class="col-default">Padrão</span>
                  <span class="col-price">Ajuste (R$)</span>
                </div>
                <div 
                  v-for="paper in availablePapers" 
                  :key="paper.id" 
                  class="table-row"
                  :class="{ selected: isPaperSelected(paper.id) }"
                >
                  <span class="col-check">
                    <input 
                      type="checkbox" 
                      :checked="isPaperSelected(paper.id)"
                      @change="togglePaper(paper)"
                    />
                  </span>
                  <span class="col-name">
                    <strong>{{ paper.name }}</strong>
                    <small>{{ paper.weight }}g/m²</small>
                  </span>
                  <span class="col-size">{{ getTypeLabel(paper.type) }} / {{ getFinishLabel(paper.finish) }}</span>
                  <span class="col-default">
                    <input 
                      v-if="isPaperSelected(paper.id)"
                      type="radio" 
                      name="paper-default" 
                      :checked="isPaperDefault(paper.id)"
                      @change="setPaperDefault(paper.id)"
                    />
                  </span>
                  <span class="col-price">
                    <input 
                      v-if="isPaperSelected(paper.id)"
                      type="number" 
                      step="0.01"
                      :value="getPaperPriceAdjustment(paper.id)"
                      @input="setPaperPriceAdjustment(paper.id, $event)"
                      class="price-input"
                    />
                    <span v-else class="price-disabled">-</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- TIPOS DE CAPA -->
            <div class="materials-section">
              <div class="section-header-row">
                <h3>📕 Tipos de Capa</h3>
                <span class="selected-count">{{ form.coverTypes.length }} selecionado(s)</span>
              </div>
              <p class="help-text">Selecione os tipos de capa disponíveis e defina o ajuste de preço</p>
              
              <div v-if="availableCoverTypes.length === 0" class="empty-materials">
                <p>⚠️ Nenhum tipo de capa cadastrado. <a href="/admin" @click.prevent="$emit('close')">Cadastre tipos de capa primeiro</a>.</p>
              </div>
              <div v-else class="materials-table">
                <div class="table-header">
                  <span class="col-check"></span>
                  <span class="col-name">Tipo de Capa</span>
                  <span class="col-size">Categoria / Preço Base</span>
                  <span class="col-default">Padrão</span>
                  <span class="col-price">Ajuste (R$)</span>
                </div>
                <div 
                  v-for="cover in availableCoverTypes" 
                  :key="cover.id" 
                  class="table-row"
                  :class="{ selected: isCoverSelected(cover.id) }"
                >
                  <span class="col-check">
                    <input 
                      type="checkbox" 
                      :checked="isCoverSelected(cover.id)"
                      @change="toggleCover(cover)"
                    />
                  </span>
                  <span class="col-name">
                    <strong>{{ cover.name }}</strong>
                    <small v-if="cover.material">{{ cover.material }}</small>
                  </span>
                  <span class="col-size">{{ getCoverTypeLabel(cover.type) }} / R$ {{ (cover.price || 0).toFixed(2) }}</span>
                  <span class="col-default">
                    <input 
                      v-if="isCoverSelected(cover.id)"
                      type="radio" 
                      name="cover-default" 
                      :checked="isCoverDefault(cover.id)"
                      @change="setCoverDefault(cover.id)"
                    />
                  </span>
                  <span class="col-price">
                    <input 
                      v-if="isCoverSelected(cover.id)"
                      type="number" 
                      step="0.01"
                      :value="getCoverPriceAdjustment(cover.id)"
                      @input="setCoverPriceAdjustment(cover.id, $event)"
                      class="price-input"
                    />
                    <span v-else class="price-disabled">-</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Imagens -->
          <div v-show="activeTab === 'images'" class="tab-content">
            <h3>🖼️ Imagens do Produto</h3>
            
            <div class="form-group">
              <label>URL da Imagem Principal</label>
              <input v-model="form.imageUrl" type="url" placeholder="https://..." />
            </div>

            <div class="form-group">
              <label>URL da Thumbnail</label>
              <input v-model="form.thumbnailUrl" type="url" placeholder="https://..." />
            </div>

            <h3>🎞️ Galeria de Imagens</h3>
            <div class="gallery-list">
              <div v-for="(url, index) in form.galleryImages" :key="index" class="gallery-item">
                <input v-model="form.galleryImages[index]" type="url" placeholder="URL da imagem" />
                <button type="button" class="btn-remove" @click="removeGalleryImage(index)">✕</button>
              </div>
              <button type="button" class="btn-add" @click="addGalleryImage">+ Adicionar Imagem</button>
            </div>
          </div>

          <!-- Tab: SEO -->
          <div v-show="activeTab === 'seo'" class="tab-content">
            <h3>🔍 SEO e Marketing</h3>
            
            <div class="form-group">
              <label>Título SEO</label>
              <input v-model="form.seoTitle" type="text" maxlength="60" placeholder="Título otimizado para buscadores" />
              <small>{{ (form.seoTitle || '').length }}/60 caracteres</small>
            </div>

            <div class="form-group">
              <label>Descrição SEO</label>
              <textarea v-model="form.seoDescription" rows="3" maxlength="160" 
                placeholder="Descrição para mecanismos de busca"></textarea>
              <small>{{ (form.seoDescription || '').length }}/160 caracteres</small>
            </div>

            <div class="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input v-model="tagsInput" type="text" placeholder="casamento, álbum, premium" />
            </div>
          </div>

          <!-- Tab: Publicação -->
          <div v-show="activeTab === 'publish'" class="tab-content">
            <h3>🚀 Status de Publicação</h3>
            
            <div class="publish-status">
              <div class="status-card" :class="{ active: form.isActive }">
                <label>
                  <input type="checkbox" v-model="form.isActive" />
                  <div class="status-info">
                    <strong>{{ form.isActive ? '✅ Ativo' : '❌ Inativo' }}</strong>
                    <span>Produto disponível para uso interno</span>
                  </div>
                </label>
              </div>

              <div class="status-card" :class="{ active: form.isPublished }">
                <label>
                  <input type="checkbox" v-model="form.isPublished" />
                  <div class="status-info">
                    <strong>{{ form.isPublished ? '🌐 Publicado' : '📝 Rascunho' }}</strong>
                    <span>{{ form.isPublished ? 'Visível no site para clientes' : 'Não aparece no site' }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="form.isPublished" class="publish-warning">
              <p>⚠️ Ao publicar, este produto ficará visível imediatamente no site para todos os clientes.</p>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
        <button type="button" class="btn-primary" @click="handleSubmit" :disabled="loading">
          {{ loading ? 'Salvando...' : (mode === 'create' ? 'Criar Produto' : 'Salvar Alterações') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface ProductSpec {
  icon: string
  label: string
  value: string
}

interface ProductFormat {
  formatId: string
  priceMultiplier: number
  isDefault: boolean
}

interface ProductPaper {
  paperId: string
  priceAdjustment: number
  isDefault: boolean
}

interface ProductCoverType {
  coverTypeId: string
  priceAdjustment: number
  isDefault: boolean
}

interface Props {
  product?: any
  mode: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
})

const emit = defineEmits<{
  save: [product: any]
  close: []
}>()

const authStore = useAuthStore()
const loading = ref(false)
const activeTab = ref('basic')

const tabs = [
  { id: 'basic', label: 'Básico', icon: '📝' },
  { id: 'pricing', label: 'Preços', icon: '💰' },
  { id: 'features', label: 'Características', icon: '✨' },
  { id: 'materials', label: 'Materiais', icon: '📜' },
  { id: 'images', label: 'Imagens', icon: '🖼️' },
  { id: 'seo', label: 'SEO', icon: '🔍' },
  { id: 'publish', label: 'Publicar', icon: '🚀' },
]

const form = ref({
  name: '',
  slug: '',
  type: 'photobook',
  category: '',
  description: '',
  shortDescription: '',
  basePrice: 0,
  basePagesIncluded: 20,
  pricePerExtraPage: 0,
  pricePerExtraSpread: 0,
  minPages: 20,
  maxPages: 100,
  pageIncrement: 2,
  features: [] as string[],
  specs: [] as ProductSpec[],
  hasCase: false,
  casePrice: 0,
  caseDescription: '',
  imageUrl: '',
  thumbnailUrl: '',
  galleryImages: [] as string[],
  badge: '',
  tags: [] as string[],
  seoTitle: '',
  seoDescription: '',
  sortOrder: 0,
  isActive: true,
  isPublished: false,
  papers: [] as ProductPaper[],
  coverTypes: [] as ProductCoverType[],
})

const tagsInput = ref('')
const availablePapers = ref<any[]>([])
const availableCoverTypes = ref<any[]>([])
const productFormats = ref<any[]>([])

// Paper methods
const isPaperSelected = (paperId: string) => form.value.papers.some(p => p.paperId === paperId)
const isPaperDefault = (paperId: string) => form.value.papers.find(p => p.paperId === paperId)?.isDefault || false
const getPaperPriceAdjustment = (paperId: string) => form.value.papers.find(p => p.paperId === paperId)?.priceAdjustment || 0

const togglePaper = (paper: any) => {
  const index = form.value.papers.findIndex(p => p.paperId === paper.id)
  if (index >= 0) {
    form.value.papers.splice(index, 1)
  } else {
    form.value.papers.push({ paperId: paper.id, priceAdjustment: 0, isDefault: false })
  }
}

const setPaperDefault = (paperId: string) => {
  form.value.papers.forEach(p => p.isDefault = p.paperId === paperId)
}

const setPaperPriceAdjustment = (paperId: string, event: Event) => {
  const paper = form.value.papers.find(p => p.paperId === paperId)
  if (paper) {
    paper.priceAdjustment = parseFloat((event.target as HTMLInputElement).value) || 0
  }
}

// Cover methods
const isCoverSelected = (coverId: string) => form.value.coverTypes.some(c => c.coverTypeId === coverId)
const isCoverDefault = (coverId: string) => form.value.coverTypes.find(c => c.coverTypeId === coverId)?.isDefault || false
const getCoverPriceAdjustment = (coverId: string) => form.value.coverTypes.find(c => c.coverTypeId === coverId)?.priceAdjustment || 0

const toggleCover = (cover: any) => {
  const index = form.value.coverTypes.findIndex(c => c.coverTypeId === cover.id)
  if (index >= 0) {
    form.value.coverTypes.splice(index, 1)
  } else {
    form.value.coverTypes.push({ coverTypeId: cover.id, priceAdjustment: 0, isDefault: false })
  }
}

const setCoverDefault = (coverId: string) => {
  form.value.coverTypes.forEach(c => c.isDefault = c.coverTypeId === coverId)
}

const setCoverPriceAdjustment = (coverId: string, event: Event) => {
  const cover = form.value.coverTypes.find(c => c.coverTypeId === coverId)
  if (cover) {
    cover.priceAdjustment = parseFloat((event.target as HTMLInputElement).value) || 0
  }
}

// Label helpers
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    photo: 'Fotográfico',
    coated: 'Couchê',
    matte: 'Fosco',
    recycled: 'Reciclado'
  }
  return labels[type] || type
}

const getFinishLabel = (finish: string) => {
  const labels: Record<string, string> = {
    glossy: 'Brilhante',
    matte: 'Fosco',
    satin: 'Acetinado'
  }
  return labels[finish] || finish
}

const getCoverTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    soft: 'Flexível',
    hard: 'Dura',
    premium: 'Premium'
  }
  return labels[type] || type
}

// Feature methods
const addFeature = () => form.value.features.push('')
const removeFeature = (index: number) => form.value.features.splice(index, 1)

// Spec methods
const addSpec = () => form.value.specs.push({ icon: '📐', label: '', value: '' })
const removeSpec = (index: number) => form.value.specs.splice(index, 1)

// Gallery methods
const addGalleryImage = () => form.value.galleryImages.push('')
const removeGalleryImage = (index: number) => form.value.galleryImages.splice(index, 1)

// Load available materials (papers, cover types, and formats)
const loadMaterials = async () => {
  try {
    const token = authStore.token
    if (!token) {
      console.error('Token não encontrado')
      return
    }
    
    const headers = { 'Authorization': `Bearer ${token}` }
    
    console.log('Carregando materiais...')
    
    // Carregar papéis e capas (compartilhados entre produtos)
    const [papersRes, coversRes] = await Promise.all([
      fetch('/api/v1/papers', { headers }),
      fetch('/api/v1/cover-types', { headers }),
    ])
    
    console.log('Papers response:', papersRes.status)
    console.log('Covers response:', coversRes.status)
    
    if (papersRes.ok) {
      const responseData = await papersRes.json()
      console.log('Papéis carregados:', responseData)
      // API retorna: { success, data: { papers: [...] } } ou { papers: [...] }
      const data = responseData.data || responseData
      availablePapers.value = data.papers || data || []
      console.log('✅ Papéis disponíveis:', availablePapers.value.length)
    } else {
      console.error('Erro ao carregar papéis:', papersRes.status)
    }
    
    if (coversRes.ok) {
      const responseData = await coversRes.json()
      console.log('Capas carregadas:', responseData)
      // API retorna: { success, data: { coverTypes: [...] } } ou { coverTypes: [...] }
      const data = responseData.data || responseData
      availableCoverTypes.value = data.coverTypes || data || []
      console.log('✅ Tipos de capa disponíveis:', availableCoverTypes.value.length)
    } else {
      console.error('Erro ao carregar capas:', coversRes.status)
    }
    
    // Carregar formatos do produto (se estiver editando)
    if (props.mode === 'edit' && props.product?.id) {
      await loadProductFormats(props.product.id)
    }
  } catch (error) {
    console.error('Erro ao carregar materiais:', error)
  }
}

// Load formats for a specific product
const loadProductFormats = async (productId: string) => {
  try {
    const token = authStore.token
    if (!token) return
    
    const headers = { 'Authorization': `Bearer ${token}` }
    const formatsRes = await fetch(`/api/v1/formats/product/${productId}`, { headers })
    
    if (formatsRes.ok) {
      const responseData = await formatsRes.json()
      console.log('Formatos do produto carregados:', responseData)
      const data = responseData.data || responseData
      productFormats.value = data.data || data || []
      console.log('✅ Formatos do produto:', productFormats.value.length)
    } else {
      console.error('Erro ao carregar formatos do produto:', formatsRes.status)
    }
  } catch (error) {
    console.error('Erro ao carregar formatos do produto:', error)
  }
}

// Initialize form
const initializeForm = () => {
  if (props.product && props.mode === 'edit') {
    form.value = {
      name: props.product.name || '',
      slug: props.product.slug || '',
      type: props.product.type || 'photobook',
      category: props.product.category || '',
      description: props.product.description || '',
      shortDescription: props.product.shortDescription || '',
      basePrice: props.product.basePrice || 0,
      basePagesIncluded: props.product.basePagesIncluded || 20,
      pricePerExtraPage: props.product.pricePerExtraPage || 0,
      pricePerExtraSpread: props.product.pricePerExtraSpread || 0,
      minPages: props.product.minPages || 20,
      maxPages: props.product.maxPages || 100,
      pageIncrement: props.product.pageIncrement || 2,
      features: props.product.features || [],
      specs: props.product.specs || [],
      hasCase: props.product.hasCase || false,
      casePrice: props.product.casePrice || 0,
      caseDescription: props.product.caseDescription || '',
      imageUrl: props.product.imageUrl || '',
      thumbnailUrl: props.product.thumbnailUrl || '',
      galleryImages: props.product.galleryImages || [],
      badge: props.product.badge || '',
      tags: props.product.tags || [],
      seoTitle: props.product.seoTitle || '',
      seoDescription: props.product.seoDescription || '',
      sortOrder: props.product.sortOrder || 0,
      isActive: props.product.isActive !== false,
      isPublished: props.product.isPublished || false,
      formats: (props.product.formats || []).map((f: any) => ({
        formatId: f.formatId || f.id,
        priceMultiplier: f.priceMultiplier || 1,
        isDefault: f.isDefault || false,
      })),
      papers: (props.product.productPapers || props.product.papers || []).map((p: any) => ({
        paperId: p.paperId || p.paper?.id || p.id,
        priceAdjustment: p.priceAdjustment || 0,
        isDefault: p.isDefault || false,
      })),
      coverTypes: (props.product.productCoverTypes || props.product.coverTypes || []).map((c: any) => ({
        coverTypeId: c.coverTypeId || c.coverType?.id || c.id,
        priceAdjustment: c.priceAdjustment || 0,
        isDefault: c.isDefault || false,
      })),
    }
    tagsInput.value = (props.product.tags || []).join(', ')
  }
}

// Handle submit
const handleSubmit = async () => {
  if (!form.value.name || form.value.name.trim() === '') {
    alert('Preencha o campo obrigatório: Nome do Produto')
    return
  }

  const basePrice = Number(form.value.basePrice)
  if (isNaN(basePrice) || basePrice < 0) {
    alert('Preencha o campo obrigatório: Preço Base (deve ser um número maior ou igual a zero)')
    return
  }

  loading.value = true
  
  try {
    // Construir objeto apenas com campos aceitos pelo DTO
    const productData: Record<string, any> = {
      name: form.value.name.trim(),
      type: form.value.type || 'photobook',
      basePrice: basePrice,
      basePagesIncluded: Number(form.value.basePagesIncluded) || 20,
      pricePerExtraPage: Number(form.value.pricePerExtraPage) || 0,
      pricePerExtraSpread: Number(form.value.pricePerExtraSpread) || 0,
      minPages: Number(form.value.minPages) || 20,
      maxPages: Number(form.value.maxPages) || 100,
      pageIncrement: Number(form.value.pageIncrement) || 2,
      hasCase: Boolean(form.value.hasCase),
      casePrice: Number(form.value.casePrice) || 0,
      sortOrder: Number(form.value.sortOrder) || 0,
      active: Boolean(form.value.isActive),
      isPublished: Boolean(form.value.isPublished),
    }

    // Adicionar campos opcionais apenas se tiverem valor
    if (form.value.slug && form.value.slug.trim()) {
      productData.slug = form.value.slug.trim()
    }
    if (form.value.category) {
      productData.category = form.value.category
    }
    if (form.value.description && form.value.description.trim()) {
      productData.description = form.value.description.trim()
    }
    if (form.value.shortDescription && form.value.shortDescription.trim()) {
      productData.shortDescription = form.value.shortDescription.trim()
    }
    if (form.value.caseDescription && form.value.caseDescription.trim()) {
      productData.caseDescription = form.value.caseDescription.trim()
    }
    if (form.value.imageUrl && form.value.imageUrl.trim()) {
      productData.imageUrl = form.value.imageUrl.trim()
    }
    if (form.value.thumbnailUrl && form.value.thumbnailUrl.trim()) {
      productData.thumbnailUrl = form.value.thumbnailUrl.trim()
    }
    if (form.value.badge) {
      productData.badge = form.value.badge
    }
    if (form.value.seoTitle && form.value.seoTitle.trim()) {
      productData.seoTitle = form.value.seoTitle.trim()
    }
    if (form.value.seoDescription && form.value.seoDescription.trim()) {
      productData.seoDescription = form.value.seoDescription.trim()
    }

    // Arrays
    const features = form.value.features.filter(f => f && f.trim())
    if (features.length > 0) {
      productData.features = features
    }

    const specs = form.value.specs.filter(s => s.label && s.label.trim() && s.value && s.value.trim())
    if (specs.length > 0) {
      productData.specs = specs
    }

    const galleryImages = form.value.galleryImages.filter(url => url && url.trim())
    if (galleryImages.length > 0) {
      productData.galleryImages = galleryImages
    }

    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t)
    if (tags.length > 0) {
      productData.tags = tags
    }

    // Relações - Papéis e Capas (formatos são gerenciados separadamente)
    if (form.value.papers && form.value.papers.length > 0) {
      productData.papers = form.value.papers
    }

    if (form.value.coverTypes && form.value.coverTypes.length > 0) {
      productData.coverTypes = form.value.coverTypes
    }

    console.log('Enviando produto:', productData)
    emit('save', productData)
  } catch (error) {
    console.error('Erro ao salvar produto:', error)
    alert('Erro ao salvar produto')
  } finally {
    loading.value = false
  }
}

// Watch tags input
watch(tagsInput, (newVal) => {
  form.value.tags = newVal.split(',').map(t => t.trim()).filter(t => t)
})

onMounted(() => {
  initializeForm()
  loadMaterials()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
}

.close-btn:hover {
  color: #1f2937;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  overflow-x: auto;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.tab.active {
  background: #2563eb;
  color: white;
}

.form-content {
  padding: 24px;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tab-content h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 24px 0 12px;
}

.tab-content h3:first-child {
  margin-top: 0;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-row.three-cols {
  grid-template-columns: repeat(3, 1fr);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  color: #1f2937;
  background-color: #ffffff;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #9ca3af;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  color: #1f2937;
}

.form-group small {
  font-size: 0.75rem;
  color: #9ca3af;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

/* Features and Specs */
.features-list,
.specs-list,
.gallery-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.feature-item,
.gallery-item {
  display: flex;
  gap: 8px;
}

.feature-item input,
.gallery-item input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1f2937;
  background-color: #ffffff;
}

.feature-item input::placeholder,
.gallery-item input::placeholder {
  color: #9ca3af;
}

.spec-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.spec-icon {
  width: 60px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  color: #1f2937;
  background-color: #ffffff;
}

.spec-label {
  width: 150px;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1f2937;
  background-color: #ffffff;
}

.spec-label::placeholder {
  color: #9ca3af;
}

.spec-value {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1f2937;
  background-color: #ffffff;
}

.spec-value::placeholder {
  color: #9ca3af;
}

.btn-remove {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #fecaca;
}

.btn-add {
  background: #f3f4f6;
  color: #374151;
  border: 1px dashed #d1d5db;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

/* Materials */
.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.empty-materials {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.empty-materials p {
  margin: 0;
  color: #92400e;
  font-size: 0.875rem;
}

.empty-materials a {
  color: #d97706;
  text-decoration: underline;
}

.info-box {
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-box p {
  margin: 0;
  color: #1e40af;
  font-size: 0.875rem;
}

.formats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.format-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.format-info strong {
  display: block;
  font-size: 0.875rem;
  color: #1f2937;
}

.format-info span {
  font-size: 0.75rem;
  color: #6b7280;
}

.format-status {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
}

.format-status.active {
  background: #dcfce7;
  color: #166534;
}

.format-status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.material-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s;
}

.material-card:has(input:checked) {
  border-color: #2563eb;
  background: #eff6ff;
}

.material-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.material-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
}

.material-info {
  flex: 1;
}

.material-info strong {
  display: block;
  font-size: 0.875rem;
  color: #1f2937;
}

.material-info span {
  font-size: 0.75rem;
  color: #6b7280;
}

.material-options {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.material-options label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
}

.price-adjust {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-adjust label {
  font-size: 0.75rem;
  color: #6b7280;
}

.price-adjust input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #1f2937;
  background-color: #ffffff;
}

/* Materials Section */
.materials-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.materials-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header-row h3 {
  margin: 0;
}

.selected-count {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 10px;
  border-radius: 12px;
}

/* Materials Table */
.materials-table {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 80px 100px;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

/* Formats table without checkbox */
.materials-section:first-child .table-header,
.materials-section:first-child .table-row {
  grid-template-columns: 1fr 1fr 100px 100px 80px;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 80px 100px;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  transition: background 0.2s;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #f9fafb;
}

.table-row.selected {
  background: #eff6ff;
}

.col-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.col-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.col-name strong {
  font-size: 0.875rem;
  color: #1f2937;
}

.col-name small {
  font-size: 0.75rem;
  color: #9ca3af;
}

.col-size {
  font-size: 0.875rem;
  color: #6b7280;
}

.col-default {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-default input[type="radio"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.col-price {
  display: flex;
  align-items: center;
}

.price-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1f2937;
  background: #fff;
  text-align: right;
}

.price-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.price-disabled {
  color: #d1d5db;
  font-size: 0.875rem;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.col-status {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-pages {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Publish Status */
.publish-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.status-card.active {
  border-color: #22c55e;
  background: #f0fdf4;
}

.status-card label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.status-card input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.status-info strong {
  display: block;
  font-size: 1rem;
  color: #1f2937;
  margin-bottom: 4px;
}

.status-info span {
  font-size: 0.875rem;
  color: #6b7280;
}

.publish-warning {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
}

.publish-warning p {
  margin: 0;
  font-size: 0.875rem;
  color: #92400e;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    max-height: 100vh;
    border-radius: 0;
  }

  .form-row,
  .form-row.three-cols {
    grid-template-columns: 1fr;
  }

  .tabs {
    padding: 12px 16px;
  }

  .tab {
    padding: 6px 12px;
    font-size: 0.75rem;
  }

  .form-content {
    padding: 16px;
  }

  .spec-item {
    flex-wrap: wrap;
  }

  .spec-label,
  .spec-value {
    width: 100%;
  }

  .materials-grid {
    grid-template-columns: 1fr;
  }
}

/* Force black text on all inputs - override any global styles */
.modal-container input,
.modal-container select,
.modal-container textarea {
  color: #1f2937 !important;
  background-color: #ffffff !important;
  -webkit-text-fill-color: #1f2937 !important;
}

.modal-container input::placeholder,
.modal-container textarea::placeholder {
  color: #9ca3af !important;
  -webkit-text-fill-color: #9ca3af !important;
}

.modal-container input:focus,
.modal-container select:focus,
.modal-container textarea:focus {
  color: #1f2937 !important;
  -webkit-text-fill-color: #1f2937 !important;
}

/* Ensure select options are visible */
.modal-container select option {
  color: #1f2937 !important;
  background-color: #ffffff !important;
}
</style>
