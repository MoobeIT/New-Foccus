<template>
  <div class="pricing-section">
    <div class="section-header">
      <div class="header-left">
        <h2>💰 Tabela de Preços</h2>
        <p>Configure seus preços e margens de lucro</p>
      </div>
      <button class="btn-primary" @click="showModal = true">
        ➕ Novo Produto
      </button>
    </div>

    <!-- Pricing Cards -->
    <div class="pricing-grid">
      <div v-for="product in products" :key="product.id" class="pricing-card">
        <div class="card-header">
          <h3>{{ product.name }}</h3>
          <span :class="['badge', product.active ? 'active' : 'inactive']">
            {{ product.active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>
        
        <div class="price-display">
          <span class="currency">R$</span>
          <span class="amount">{{ formatPrice(product.basePrice) }}</span>
          <span class="period">base</span>
        </div>

        <div class="price-details">
          <div class="detail-row">
            <span>Custo de produção</span>
            <span>R$ {{ formatPrice(product.cost) }}</span>
          </div>
          <div class="detail-row">
            <span>Sua margem</span>
            <span class="margin">{{ calculateMargin(product) }}%</span>
          </div>
          <div class="detail-row">
            <span>Lucro por unidade</span>
            <span class="profit">R$ {{ formatPrice(product.basePrice - product.cost) }}</span>
          </div>
        </div>

        <div class="extras">
          <h4>Adicionais</h4>
          <div v-for="extra in product.extras" :key="extra.name" class="extra-row">
            <span>{{ extra.name }}</span>
            <span>+R$ {{ formatPrice(extra.price) }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button @click="editProduct(product)">✏️ Editar</button>
          <button @click="toggleActive(product)">
            {{ product.active ? '⏸️ Desativar' : '▶️ Ativar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Margin Calculator -->
    <div class="calculator-section">
      <h3>🧮 Calculadora de Margem</h3>
      <div class="calculator">
        <div class="calc-input">
          <label>Custo de Produção</label>
          <input v-model.number="calcCost" type="number" />
        </div>
        <div class="calc-input">
          <label>Margem Desejada (%)</label>
          <input v-model.number="calcMargin" type="number" />
        </div>
        <div class="calc-result">
          <label>Preço Sugerido</label>
          <span class="result-value">R$ {{ formatPrice(suggestedPrice) }}</span>
        </div>
        <div class="calc-result">
          <label>Lucro por Unidade</label>
          <span class="result-value profit">R$ {{ formatPrice(suggestedPrice - calcCost) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showModal = ref(false)
const calcCost = ref(150)
const calcMargin = ref(40)

const products = ref([
  { 
    id: '1', 
    name: 'Álbum 20x20cm', 
    basePrice: 450, 
    cost: 180, 
    active: true,
    extras: [
      { name: 'Página extra', price: 15 },
      { name: 'Capa em couro', price: 80 },
      { name: 'Estojo de madeira', price: 120 }
    ]
  },
  { 
    id: '2', 
    name: 'Álbum 30x30cm', 
    basePrice: 750, 
    cost: 280, 
    active: true,
    extras: [
      { name: 'Página extra', price: 25 },
      { name: 'Capa em couro', price: 120 },
      { name: 'Estojo de madeira', price: 180 }
    ]
  },
  { 
    id: '3', 
    name: 'Álbum 30x20cm', 
    basePrice: 550, 
    cost: 220, 
    active: true,
    extras: [
      { name: 'Página extra', price: 18 },
      { name: 'Capa em couro', price: 100 },
      { name: 'Estojo de madeira', price: 150 }
    ]
  },
  { 
    id: '4', 
    name: 'Mini Álbum 15x15cm', 
    basePrice: 280, 
    cost: 90, 
    active: false,
    extras: [
      { name: 'Página extra', price: 8 },
      { name: 'Caixa personalizada', price: 45 }
    ]
  },
])

const suggestedPrice = computed(() => {
  return calcCost.value / (1 - calcMargin.value / 100)
})

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',')
const calculateMargin = (product: any) => {
  return Math.round(((product.basePrice - product.cost) / product.basePrice) * 100)
}

const editProduct = (product: any) => alert(`Editar ${product.name}`)
const toggleActive = (product: any) => {
  product.active = !product.active
}
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.btn-primary { padding: 10px 20px; background: linear-gradient(135deg, #D4775C, #E8956F); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

.pricing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 32px; }
.pricing-card { background: white; border-radius: 16px; padding: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header h3 { margin: 0; font-size: 1.1rem; }
.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
.badge.active { background: #dcfce7; color: #16a34a; }
.badge.inactive { background: #fee2e2; color: #dc2626; }

.price-display { text-align: center; padding: 20px 0; border-bottom: 1px solid #f1f5f9; margin-bottom: 16px; }
.price-display .currency { font-size: 1.2rem; color: #64748b; vertical-align: top; }
.price-display .amount { font-size: 3rem; font-weight: 700; color: #1e293b; }
.price-display .period { font-size: 0.9rem; color: #94a3b8; }

.price-details { margin-bottom: 16px; }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem; }
.detail-row .margin { color: #3b82f6; font-weight: 600; }
.detail-row .profit { color: #10b981; font-weight: 600; }

.extras { padding: 16px 0; border-top: 1px solid #f1f5f9; }
.extras h4 { margin: 0 0 12px 0; font-size: 0.9rem; color: #64748b; }
.extra-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; }

.card-actions { display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.card-actions button { flex: 1; padding: 10px; background: #f8fafc; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.card-actions button:hover { background: #e2e8f0; }

.calculator-section { background: white; border-radius: 16px; padding: 24px; }
.calculator-section h3 { margin: 0 0 20px 0; }
.calculator { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.calc-input, .calc-result { display: flex; flex-direction: column; gap: 8px; }
.calc-input label, .calc-result label { font-size: 0.85rem; color: #64748b; }
.calc-input input { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; }
.result-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.result-value.profit { color: #10b981; }
</style>
