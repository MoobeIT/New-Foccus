import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ProductType {
  id: string
  name: string
  type: string
  description: string | null
  basePrice: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export const useProductTypesStore = defineStore('productTypes', () => {
  const productTypes = ref<ProductType[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activeProductTypes = () => productTypes.value.filter(pt => pt.isActive)

  const fetchProductTypes = async () => {
    isLoading.value = true
    error.value = null
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/v1/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Erro ao carregar tipos de produto')
      const responseData = await response.json()
      // A API retorna: { success, data: [...] } ou array diretamente
      const data = responseData.data || responseData
      productTypes.value = Array.isArray(data) ? data : []
      console.log('✅ Produtos carregados:', productTypes.value.length, productTypes.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Erro ao buscar tipos de produto:', err)
    } finally {
      isLoading.value = false
    }
  }

  const addProductType = async (productType: Omit<ProductType, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        },
        body: JSON.stringify(productType)
      })
      if (!response.ok) throw new Error('Erro ao criar tipo de produto')
      const data = await response.json()
      productTypes.value.push(data.product)
      return data.product
    } catch (err) {
      console.error('Erro ao criar tipo de produto:', err)
      return null
    }
  }

  const updateProductType = async (id: string, data: Partial<ProductType>) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Erro ao atualizar tipo de produto')
      const index = productTypes.value.findIndex(pt => pt.id === id)
      if (index > -1) {
        productTypes.value[index] = { ...productTypes.value[index], ...data }
      }
      return true
    } catch (err) {
      console.error('Erro ao atualizar tipo de produto:', err)
      return false
    }
  }

  const deleteProductType = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        }
      })
      if (!response.ok) throw new Error('Erro ao excluir tipo de produto')
      const index = productTypes.value.findIndex(pt => pt.id === id)
      if (index > -1) {
        productTypes.value.splice(index, 1)
      }
      return true
    } catch (err) {
      console.error('Erro ao excluir tipo de produto:', err)
      return false
    }
  }

  const getProductTypeById = (id: string) => {
    return productTypes.value.find(pt => pt.id === id)
  }

  const getProductTypeBySlug = (slug: string) => {
    return productTypes.value.find(pt => pt.type === slug)
  }

  return {
    productTypes,
    isLoading,
    error,
    activeProductTypes,
    fetchProductTypes,
    addProductType,
    updateProductType,
    deleteProductType,
    getProductTypeById,
    getProductTypeBySlug
  }
})
