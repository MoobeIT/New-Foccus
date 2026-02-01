<template>
  <div class="price-simulator">
    <div class="simulator-header">
      <h2>Simulador de Preços Avançado</h2>
      <p class="subtitle">Configure todas as variáveis do produto para calcular o preço final</p>
    </div>

    <div class="simulator-form">
      <!-- Tipo de Produto -->
      <div class="form-section">
        <h3>📦 Tipo de Produto</h3>
        <div class="form-row">
          <div class="form-group full">
            <label>Produto *</label>
            <select v-model="config.productType" @change="onProductTypeChange">
              <option value="">Selecione...</option>
              <option value="photobook">Fotolivro</option>
              <option value="calendar">Calendário</option>
              <option value="album">Álbum</option>
              <option value="magazine">Revista</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Formato -->
      <div class="form-section">
        <h3>📐 Formato e Dimensões</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Formato *</label>
            <select v-model="config.format">
              <option value="">Selecione...</option>
              <option value="square-20x20">Quadrado 20x20cm</option>
              <option value="square-30x30">Quadrado 30x30cm</option>
              <option value="a4">A4 (21x29.7cm)</option>
              <option value="a5">A5 (14.8x21cm)</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div v-if="config.format === 'custom'" class="form-group">
            <label>Largura (cm)</label>
            <input v-model.number="config.customWidth" type="number" min="10" max="50" step="0.1" />
          </div>
          <div v-if="config.format === 'custom'" class="form-group">
            <label>Altura (cm)</label>
            <input v-model.number="config.customHeight" type="number" min="10" max="50" step="0.1" />
          </div>
        </div>
      </div>

      <!-- Páginas -->
      <div class="form-section">
        <h3>📄 Páginas</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Quantidade de Páginas *</label>
            <input v-model.number="config.pages" type="number" min="20" max="200" step="2" />
            <small>Mínimo: 20 | Máximo: 200 (múltiplos de 2)</small>
          </div>
        </div>
      </div>

      <!-- Papel e Acabamento -->
      <div class="form-section">
        <h3>📋 Papel e Acabamento</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo de Papel Interno *</label>
            <select v-model="config.paperType">
              <option value="">Selecione...</option>
              <option value="couche-115">Couchê 115g</option>
              <option value="couche-150">Couchê 150g</option>
              <option value="couche-170">Couchê 170g</option>
              <option value="offset-90">Offset 90g</option>
              <option value="offset-120">Offset 120g</option>
            </select>
          </div>
          <div class="form-group">
            <label>Gramatura Interna</label>
            <input v-model.number="config.paperWeight" type="number" min="90" max="300" readonly />
            <small>g/m²</small>
          </div>
        </div>
      </div>

      <!-- Capa -->
      <div class="form-section">
        <h3>📕 Capa</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo de Capa *</label>
            <select v-model="config.coverType">
              <option value="">Selecione...</option>
              <option value="soft">Capa Flexível</option>
              <option value="hard">Capa Dura</option>
              <option value="hard-premium">Capa Dura Premium</option>
            </select>
          </div>
          <div class="form-group">
            <label>Acabamento da Capa *</label>
            <select v-model="config.coverFinish">
              <option value="">Selecione...</option>
              <option value="matte">Fosco</option>
              <option value="glossy">Brilho</option>
              <option value="laminated">Laminado</option>
              <option value="uv">Verniz UV</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Encadernação -->
      <div class="form-section">
        <h3>📚 Encadernação</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo de Encadernação *</label>
            <select v-model="config.bindingType">
              <option value="">Selecione...</option>
              <option value="glued">Colado (Hot Melt)</option>
              <option value="sewn">Costurado</option>
              <option value="spiral">Espiral</option>
              <option value="wire-o">Wire-O</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Quantidade -->
      <div class="form-section">
        <h3>🔢 Quantidade e Desconto</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Quantidade de Unidades *</label>
            <input v-model.number="config.quantity" type="number" min="1" max="10000" />
          </div>
          <div class="form-group">
            <label>Desconto por Volume</label>
            <input :value="volumeDiscount + '%'" type="text" readonly />
          </div>
        </div>
      </div>

      <button @click="calculatePrice" class="btn-calculate" :disabled="!isFormValid">
        💰 Calcular Preço
      </button>
    </div>

    <!-- Resultado -->
    <div v-if="result" class="result-panel">
      <h3>💵 Resultado do Cálculo</h3>
      
      <div class="breakdown">
        <h4>Detalhamento de Custos:</h4>
        
        <div class="breakdown-item">
          <span>📐 Área Total ({{ result.dimensions.width }}x{{ result.dimensions.height }}cm):</span>
          <strong>{{ result.dimensions.area.toFixed(2) }} cm²</strong>
        </div>

        <div class="breakdown-item">
          <span>📄 Custo do Papel ({{ config.pages }} páginas):</span>
          <strong>R$ {{ result.costs.paper.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>📕 Custo da Capa ({{ config.coverType }}):</span>
          <strong>R$ {{ result.costs.cover.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>🖨️ Custo de Impressão:</span>
          <strong>R$ {{ result.costs.printing.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>📚 Custo de Encadernação:</span>
          <strong>R$ {{ result.costs.binding.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>✨ Custo de Acabamento:</span>
          <strong>R$ {{ result.costs.finishing.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item subtotal">
          <span>Subtotal (Custo de Produção):</span>
          <strong>R$ {{ result.costs.subtotal.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>📊 Margem de Lucro ({{ result.profitMargin }}%):</span>
          <strong>R$ {{ result.costs.profit.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item">
          <span>💼 Preço Unitário Base:</span>
          <strong>R$ {{ result.unitPrice.toFixed(2) }}</strong>
        </div>

        <div v-if="volumeDiscount > 0" class="breakdown-item discount">
          <span>🎁 Desconto por Volume ({{ volumeDiscount }}%):</span>
          <strong>- R$ {{ result.costs.discount.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item unit-final">
          <span>💰 Preço Unitário Final:</span>
          <strong>R$ {{ result.finalUnitPrice.toFixed(2) }}</strong>
        </div>

        <div class="breakdown-item total">
          <span>🛒 Total ({{ config.quantity }} unidades):</span>
          <strong>R$ {{ result.totalPrice.toFixed(2) }}</strong>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary" @click="saveConfiguration">
          💾 Salvar Configuração
        </button>
        <button class="btn-primary" @click="exportQuote">
          📄 Exportar Orçamento
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface PricingConfig {
  productType: string
  format: string
  customWidth: number
  customHeight: number
  pages: number
  paperType: string
  paperWeight: number
  coverType: string
  coverFinish: string
  bindingType: string
  quantity: number
}

interface PricingResult {
  dimensions: {
    width: number
    height: number
    area: number
  }
  costs: {
    paper: number
    cover: number
    printing: number
    binding: number
    finishing: number
    subtotal: number
    profit: number
    discount: number
  }
  profitMargin: number
  unitPrice: number
  finalUnitPrice: number
  totalPrice: number
}

const config = ref<PricingConfig>({
  productType: '',
  format: '',
  customWidth: 20,
  customHeight: 20,
  pages: 20,
  paperType: '',
  paperWeight: 0,
  coverType: '',
  coverFinish: '',
  bindingType: '',
  quantity: 1
})

const result = ref<PricingResult | null>(null)

// Tabelas de preços base
const paperPrices: Record<string, number> = {
  'couche-115': 0.015,
  'couche-150': 0.020,
  'couche-170': 0.025,
  'offset-90': 0.010,
  'offset-120': 0.013
}

const coverPrices: Record<string, number> = {
  'soft': 5.00,
  'hard': 15.00,
  'hard-premium': 25.00
}

const finishPrices: Record<string, number> = {
  'matte': 2.00,
  'glossy': 2.50,
  'laminated': 4.00,
  'uv': 6.00
}

const bindingPrices: Record<string, number> = {
  'glued': 3.00,
  'sewn': 8.00,
  'spiral': 4.00,
  'wire-o': 5.00
}

// Computed
const isFormValid = computed(() => {
  return config.value.productType &&
         config.value.format &&
         config.value.pages >= 20 &&
         config.value.paperType &&
         config.value.coverType &&
         config.value.coverFinish &&
         config.value.bindingType &&
         config.value.quantity >= 1
})

const volumeDiscount = computed(() => {
  const qty = config.value.quantity
  if (qty >= 1000) return 25
  if (qty >= 500) return 20
  if (qty >= 100) return 15
  if (qty >= 50) return 10
  if (qty >= 10) return 5
  return 0
})

// Watchers
watch(() => config.value.paperType, (newType) => {
  const weights: Record<string, number> = {
    'couche-115': 115,
    'couche-150': 150,
    'couche-170': 170,
    'offset-90': 90,
    'offset-120': 120
  }
  config.value.paperWeight = weights[newType] || 0
})

// Methods
const onProductTypeChange = () => {
  // Reset dependent fields
  config.value.format = ''
  config.value.pages = 20
}

const getDimensions = () => {
  const formats: Record<string, { width: number; height: number }> = {
    'square-20x20': { width: 20, height: 20 },
    'square-30x30': { width: 30, height: 30 },
    'a4': { width: 21, height: 29.7 },
    'a5': { width: 14.8, height: 21 }
  }

  if (config.value.format === 'custom') {
    return {
      width: config.value.customWidth,
      height: config.value.customHeight
    }
  }

  return formats[config.value.format] || { width: 20, height: 20 }
}

const calculatePrice = () => {
  const dims = getDimensions()
  const area = dims.width * dims.height

  // 1. Custo do Papel
  const paperPricePerPage = paperPrices[config.value.paperType] || 0.015
  const paperCost = paperPricePerPage * area * config.value.pages

  // 2. Custo da Capa
  const coverBaseCost = coverPrices[config.value.coverType] || 5
  const coverCost = coverBaseCost * (area / 400) // Normalizado para 20x20cm

  // 3. Custo de Impressão (por página)
  const printingCostPerPage = 0.30
  const printingCost = printingCostPerPage * config.value.pages

  // 4. Custo de Encadernação
  const bindingCost = bindingPrices[config.value.bindingType] || 3

  // 5. Custo de Acabamento
  const finishingCost = finishPrices[config.value.coverFinish] || 2

  // Subtotal
  const subtotal = paperCost + coverCost + printingCost + bindingCost + finishingCost

  // Margem de lucro (40%)
  const profitMargin = 40
  const profit = subtotal * (profitMargin / 100)

  // Preço unitário base
  const unitPrice = subtotal + profit

  // Desconto por volume
  const discountAmount = unitPrice * (volumeDiscount.value / 100)
  const finalUnitPrice = unitPrice - discountAmount

  // Total
  const totalPrice = finalUnitPrice * config.value.quantity

  result.value = {
    dimensions: {
      width: dims.width,
      height: dims.height,
      area
    },
    costs: {
      paper: paperCost,
      cover: coverCost,
      printing: printingCost,
      binding: bindingCost,
      finishing: finishingCost,
      subtotal,
      profit,
      discount: discountAmount * config.value.quantity
    },
    profitMargin,
    unitPrice,
    finalUnitPrice,
    totalPrice
  }
}

const saveConfiguration = () => {
  const configData = {
    ...config.value,
    result: result.value,
    timestamp: new Date().toISOString()
  }
  
  localStorage.setItem('lastPricingConfig', JSON.stringify(configData))
  alert('✅ Configuração salva com sucesso!')
}

const exportQuote = () => {
  if (!result.value) return

  const quote = `
ORÇAMENTO - ${config.value.productType.toUpperCase()}
Data: ${new Date().toLocaleDateString('pt-BR')}

ESPECIFICAÇÕES:
- Formato: ${config.value.format}
- Dimensões: ${result.value.dimensions.width}x${result.value.dimensions.height}cm
- Páginas: ${config.value.pages}
- Papel: ${config.value.paperType}
- Capa: ${config.value.coverType}
- Acabamento: ${config.value.coverFinish}
- Encadernação: ${config.value.bindingType}

CUSTOS:
- Papel: R$ ${result.value.costs.paper.toFixed(2)}
- Capa: R$ ${result.value.costs.cover.toFixed(2)}
- Impressão: R$ ${result.value.costs.printing.toFixed(2)}
- Encadernação: R$ ${result.value.costs.binding.toFixed(2)}
- Acabamento: R$ ${result.value.costs.finishing.toFixed(2)}

PREÇO:
- Unitário: R$ ${result.value.finalUnitPrice.toFixed(2)}
- Quantidade: ${config.value.quantity}
- Total: R$ ${result.value.totalPrice.toFixed(2)}
  `.trim()

  const blob = new Blob([quote], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orcamento-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.price-simulator {
  padding: 0;
}

.simulator-header {
  margin-bottom: 2rem;
}

.simulator-header h2 {
  margin: 0 0 0.5rem 0;
  color: #111827;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.simulator-form {
  margin-bottom: 2rem;
}

.form-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: #3b82f6;
}

.form-group small {
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.btn-calculate {
  width: 100%;
  padding: 1rem 2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-calculate:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-calculate:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.result-panel {
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.result-panel h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.breakdown {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.breakdown h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-item span {
  font-size: 0.875rem;
}

.breakdown-item strong {
  color: #111827;
  font-size: 1rem;
}

.breakdown-item.subtotal {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.breakdown-item.discount {
  color: #059669;
}

.breakdown-item.discount strong {
  color: #059669;
}

.breakdown-item.unit-final {
  background: #eff6ff;
  padding: 1rem;
  margin: 0.5rem -0.5rem;
  border-radius: 6px;
  font-weight: 600;
  color: #1e40af;
}

.breakdown-item.unit-final strong {
  color: #1e40af;
  font-size: 1.125rem;
}

.breakdown-item.total {
  background: #10b981;
  color: white;
  padding: 1rem;
  margin: 0.5rem -0.5rem 0;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 700;
  border: none;
}

.breakdown-item.total strong {
  color: white;
  font-size: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>
