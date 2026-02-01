import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AlbumFormat {
  id: string
  name: string
  productId: string
  width: number
  height: number
  orientation: string
  minPages: number
  maxPages: number
  pageIncrement: number
  bleed: number
  safeMargin: number
  gutterMargin: number
  priceMultiplier: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export const useFormatsStore = defineStore('formats', () => {
  const formats = ref<AlbumFormat[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activeFormats = () => formats.value.filter(f => f.isActive)
  
  const getFormatsByProduct = (productId: string) => {
    return formats.value.filter(f => f.productId === productId && f.isActive)
  }

  const fetchFormats = async () => {
    isLoading.value = true
    error.value = null
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/v1/formats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Erro ao carregar formatos')
      const responseData = await response.json()
      // A API retorna: { success, data: { data: [...], total, message } }
      const data = responseData.data?.data || responseData.data || responseData
      formats.value = Array.isArray(data) ? data : []
      console.log('✅ Formatos carregados:', formats.value.length)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Erro ao buscar formatos:', err)
    } finally {
      isLoading.value = false
    }
  }

  const addFormat = async (format: Omit<AlbumFormat, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const token = localStorage.getItem('accessToken')
      console.log('📤 Enviando formato:', format)
      const response = await fetch('/api/v1/formats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(format)
      })
      
      const responseData = await response.json()
      console.log('📥 Resposta:', response.status, responseData)
      
      if (!response.ok) {
        console.error('❌ Erro na resposta:', responseData)
        throw new Error(responseData.error?.message || responseData.message || 'Erro ao criar formato')
      }
      
      // A resposta vem em: { success, data: { data: format, message } }
      const newFormat = responseData.data?.data || responseData.data || responseData
      formats.value.push(newFormat)
      return newFormat
    } catch (err) {
      console.error('❌ Erro ao criar formato:', err)
      throw err
    }
  }

  const updateFormat = async (id: string, data: Partial<AlbumFormat>) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/formats/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Erro ao atualizar formato')
      const index = formats.value.findIndex(f => f.id === id)
      if (index > -1) {
        formats.value[index] = { ...formats.value[index], ...data }
      }
      return true
    } catch (err) {
      console.error('Erro ao atualizar formato:', err)
      return false
    }
  }

  const deleteFormat = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/formats/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })
      if (!response.ok) throw new Error('Erro ao excluir formato')
      const index = formats.value.findIndex(f => f.id === id)
      if (index > -1) {
        formats.value.splice(index, 1)
      }
      return true
    } catch (err) {
      console.error('Erro ao excluir formato:', err)
      return false
    }
  }

  const toggleFormatStatus = async (id: string) => {
    const format = formats.value.find(f => f.id === id)
    if (format) {
      return await updateFormat(id, { isActive: !format.isActive })
    }
    return false
  }

  const getFormatById = (id: string) => {
    return formats.value.find(f => f.id === id)
  }

  return {
    formats,
    isLoading,
    error,
    activeFormats,
    getFormatsByProduct,
    fetchFormats,
    addFormat,
    updateFormat,
    deleteFormat,
    toggleFormatStatus,
    getFormatById
  }
})
