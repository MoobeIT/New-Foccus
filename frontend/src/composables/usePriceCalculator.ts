import { computed } from 'vue'
import { useFormatsStore } from '@/stores/formats'
import { usePapersStore } from '@/stores/papers'

export interface PriceConfig {
  formatId: number | string
  paperId: number | string
  pages: number
  coverType: 'mole' | 'dura' | 'premium'
  quantity: number
}

export interface PriceBreakdown {
  basePrice: number
  formatMultiplier: number
  paperCost: number
  coverCost: number
  subtotal: number
  discount: number
  discountPercent: number
  total: number
}

export function usePriceCalculator() {
  const formatsStore = useFormatsStore()
  const papersStore = usePapersStore()

  // Preços base por formato (pode ser configurável)
  const basePrices: Record<string, number> = {
    'quadrado': 15.00,
    'retangular': 20.00,
    'paisagem': 18.00,
    'personalizado': 25.00
  }

  // Multiplicadores de formato
  const formatMultipliers: Record<string, number> = {
    'quadrado': 1.0,
    'retangular': 1.3,
    'paisagem': 1.2,
    'personalizado': 1.5
  }

  // Preços de capa
  const coverPrices = {
    'mole': 5.00,
    'dura': 10.00,
    'premium': 15.00
  }

  // Descontos por quantidade
  const getQuantityDiscount = (quantity: number): number => {
    if (quantity >= 11) return 15
    if (quantity >= 6) return 10
    if (quantity >= 2) return 5
    return 0
  }

  const calculatePrice = (config: PriceConfig): PriceBreakdown => {
    // Buscar formato e papel
    const format = formatsStore.getFormatById(config.formatId)
    const paper = papersStore.getPaperById(config.paperId)

    if (!format || !paper) {
      return {
        basePrice: 0,
        formatMultiplier: 0,
        paperCost: 0,
        coverCost: 0,
        subtotal: 0,
        discount: 0,
        discountPercent: 0,
        total: 0
      }
    }

    // 1. Preço base
    const basePrice = basePrices[format.type] || 15.00

    // 2. Multiplicador de formato
    const multiplier = formatMultipliers[format.type] || 1.0
    const formatPrice = basePrice * multiplier

    // 3. Custo do papel (páginas internas)
    const paperCost = config.pages * paper.pricePerPage

    // 4. Custo da capa
    const coverTypePrice = coverPrices[config.coverType] || 5.00
    const coverPaperPrice = paper.pricePerCover
    const coverCost = coverTypePrice + coverPaperPrice

    // 5. Subtotal
    const subtotal = formatPrice + paperCost + coverCost

    // 6. Desconto por quantidade
    const discountPercent = getQuantityDiscount(config.quantity)
    const discount = (subtotal * discountPercent) / 100

    // 7. Total
    const total = (subtotal - discount) * config.quantity

    return {
      basePrice: formatPrice,
      formatMultiplier: multiplier,
      paperCost,
      coverCost,
      subtotal,
      discount,
      discountPercent,
      total
    }
  }

  return {
    calculatePrice,
    basePrices,
    formatMultipliers,
    coverPrices,
    getQuantityDiscount
  }
}
