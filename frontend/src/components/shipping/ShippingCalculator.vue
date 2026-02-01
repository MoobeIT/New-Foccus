<template>
  <div class="shipping-calculator">
    <h4>Calcular Frete</h4>
    
    <div class="cep-input-group">
      <input
        v-model="cep"
        type="text"
        placeholder="Digite seu CEP"
        maxlength="9"
        @input="formatCep"
        @keyup.enter="calculateShipping"
        :disabled="loading"
      />
      <button 
        @click="calculateShipping" 
        :disabled="loading || !isValidCep"
        class="btn-calculate"
      >
        <span v-if="loading" class="spinner-small"></span>
        <span v-else>Calcular</span>
      </button>
    </div>

    <a 
      href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
      target="_blank" 
      class="cep-link"
    >
      Não sei meu CEP
    </a>

    <!-- Erro -->
    <div v-if="error" class="shipping-error">
      {{ error }}
    </div>

    <!-- Resultados -->
    <div v-if="shippingResult && !loading" class="shipping-results">
      <!-- Endereço -->
      <div v-if="shippingResult.address" class="address-info">
        <span class="address-icon">📍</span>
        <span>{{ shippingResult.address.city }} - {{ shippingResult.address.state }}</span>
      </div>

      <!-- Opções de frete -->
      <div class="shipping-options">
        <div 
          v-for="option in shippingResult.options" 
          :key="option.service"
          :class="['shipping-option', { selected: selectedOption?.service === option.service }]"
          @click="selectOption(option)"
        >
          <div class="option-info">
            <span class="option-name">{{ option.serviceName }}</span>
            <span class="option-delivery">{{ option.formattedDelivery }}</span>
          </div>
          <div class="option-price" :class="{ free: option.price === 0 }">
            {{ option.formattedPrice }}
          </div>
        </div>
      </div>

      <!-- Frete grátis info -->
      <div v-if="shippingResult.freeShippingThreshold && !shippingResult.freeShippingEligible" class="free-shipping-info">
        <span class="truck-icon">🚚</span>
        <span>Frete grátis para compras acima de R$ {{ formatPrice(shippingResult.freeShippingThreshold) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface ShippingOption {
  service: string
  serviceName: string
  price: number
  deliveryTime: number
  deliveryTimeMax?: number
  formattedPrice: string
  formattedDelivery: string
}

interface ShippingResult {
  success: boolean
  options: ShippingOption[]
  freeShippingThreshold?: number
  freeShippingEligible?: boolean
  address?: {
    cep: string
    city: string
    state: string
    neighborhood: string
  }
}

const props = defineProps<{
  productId?: string
  quantity?: number
  weight?: number
}>()

const emit = defineEmits<{
  (e: 'shipping-calculated', result: ShippingResult): void
  (e: 'option-selected', option: ShippingOption): void
}>()

const cep = ref('')
const loading = ref(false)
const error = ref('')
const shippingResult = ref<ShippingResult | null>(null)
const selectedOption = ref<ShippingOption | null>(null)

const isValidCep = computed(() => {
  const cleanCep = cep.value.replace(/\D/g, '')
  return cleanCep.length === 8
})

const formatCep = () => {
  let value = cep.value.replace(/\D/g, '')
  if (value.length > 5) {
    value = value.slice(0, 5) + '-' + value.slice(5, 8)
  }
  cep.value = value
}

const formatPrice = (price: number) => {
  return price.toFixed(2).replace('.', ',')
}

const calculateShipping = async () => {
  if (!isValidCep.value) return

  loading.value = true
  error.value = ''
  shippingResult.value = null
  selectedOption.value = null

  try {
    const cleanCep = cep.value.replace(/\D/g, '')
    
    const response = await fetch('/api/v1/public/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinationCep: cleanCep,
        productId: props.productId,
        quantity: props.quantity || 1,
        weight: props.weight,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Erro ao calcular frete')
    }

    const result: ShippingResult = await response.json()
    shippingResult.value = result
    
    // Selecionar opção mais barata por padrão
    if (result.options.length > 0) {
      const cheapest = result.options.reduce((min, opt) => 
        opt.price < min.price ? opt : min
      )
      selectOption(cheapest)
    }

    emit('shipping-calculated', result)
  } catch (err: any) {
    error.value = err.message || 'Não foi possível calcular o frete'
  } finally {
    loading.value = false
  }
}

const selectOption = (option: ShippingOption) => {
  selectedOption.value = option
  emit('option-selected', option)
}

// Recalcular quando quantidade mudar
watch(() => props.quantity, () => {
  if (shippingResult.value) {
    calculateShipping()
  }
})
</script>

<style scoped>
.shipping-calculator {
  background: #F7F4EE;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.shipping-calculator h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
  margin: 0 0 12px 0;
}

.cep-input-group {
  display: flex;
  gap: 8px;
}

.cep-input-group input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  font-size: 14px;
  color: #2D2A26;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.cep-input-group input:focus {
  border-color: #D4775C;
}

.cep-input-group input::placeholder {
  color: #9A958E;
}

.btn-calculate {
  padding: 12px 20px;
  background: #D4775C;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-calculate:hover:not(:disabled) {
  background: #C96B50;
}

.btn-calculate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cep-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #D4775C;
  text-decoration: none;
}

.cep-link:hover {
  text-decoration: underline;
}

.shipping-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: #FEE2E2;
  color: #DC2626;
  border-radius: 8px;
  font-size: 13px;
}

.shipping-results {
  margin-top: 16px;
}

.address-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 13px;
  color: #6B6560;
  border-bottom: 1px solid #EBE7E0;
  margin-bottom: 12px;
}

.address-icon {
  font-size: 14px;
}

.shipping-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shipping-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.shipping-option:hover {
  border-color: #D4775C;
}

.shipping-option.selected {
  border-color: #D4775C;
  background: #FEF3E2;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

.option-delivery {
  font-size: 12px;
  color: #6B6560;
}

.option-price {
  font-size: 14px;
  font-weight: 700;
  color: #2D2A26;
}

.option-price.free {
  color: #22c55e;
}

.free-shipping-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: #ECFDF5;
  border-radius: 8px;
  font-size: 12px;
  color: #059669;
}

.truck-icon {
  font-size: 14px;
}
</style>
