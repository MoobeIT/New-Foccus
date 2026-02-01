import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PaperType {
  id: string
  name: string
  type: string
  weight: number
  thickness: number
  finish: string
  lamination: string
  pricePerPage: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export const usePapersStore = defineStore('papers', () => {
  const papers = ref<PaperType[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activePapers = () => papers.value.filter(p => p.isActive)

  const fetchPapers = async () => {
    isLoading.value = true
    error.value = null
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/v1/papers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        }
      })
      if (!response.ok) throw new Error('Erro ao carregar papéis')
      const data = await response.json()
      papers.value = data.papers || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Erro ao buscar papéis:', err)
    } finally {
      isLoading.value = false
    }
  }

  const addPaper = async (paper: Omit<PaperType, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/v1/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        },
        body: JSON.stringify(paper)
      })
      if (!response.ok) throw new Error('Erro ao criar papel')
      const data = await response.json()
      papers.value.push(data.paper)
      return data.paper
    } catch (err) {
      console.error('Erro ao criar papel:', err)
      return null
    }
  }

  const updatePaper = async (id: string, data: Partial<PaperType>) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/papers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Erro ao atualizar papel')
      const index = papers.value.findIndex(p => p.id === id)
      if (index > -1) {
        papers.value[index] = { ...papers.value[index], ...data }
      }
      return true
    } catch (err) {
      console.error('Erro ao atualizar papel:', err)
      return false
    }
  }

  const deletePaper = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/v1/papers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': 'default'
        }
      })
      if (!response.ok) throw new Error('Erro ao excluir papel')
      const index = papers.value.findIndex(p => p.id === id)
      if (index > -1) {
        papers.value.splice(index, 1)
      }
      return true
    } catch (err) {
      console.error('Erro ao excluir papel:', err)
      return false
    }
  }

  const getPaperById = (id: string) => {
    return papers.value.find(p => p.id === id)
  }

  return {
    papers,
    isLoading,
    error,
    activePapers,
    fetchPapers,
    addPaper,
    updatePaper,
    deletePaper,
    getPaperById
  }
})
