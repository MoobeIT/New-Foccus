import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface LayoutElement {
  id: string
  type: 'image' | 'text' | 'shape'
  x: number
  y: number
  width: number
  height: number
  locked?: boolean
  required?: boolean
}

export interface Layout {
  id: number | string
  name: string
  formatId: number | string
  pageType: 'cover' | 'page' | 'back'
  thumbnail?: string
  elements: LayoutElement[]
  active: boolean
}

export const useLayoutsStore = defineStore('layouts', () => {
  const layouts = ref<Layout[]>([
    {
      id: 1,
      name: 'Capa Simples',
      formatId: 1,
      pageType: 'cover',
      elements: [
        { id: 'img1', type: 'image', x: 50, y: 50, width: 700, height: 500, required: true },
        { id: 'txt1', type: 'text', x: 100, y: 600, width: 600, height: 100, required: false }
      ],
      active: true
    },
    {
      id: 2,
      name: 'Página 1 Foto',
      formatId: 1,
      pageType: 'page',
      elements: [
        { id: 'img1', type: 'image', x: 100, y: 100, width: 600, height: 400, required: true }
      ],
      active: true
    },
    {
      id: 3,
      name: 'Página 2 Fotos',
      formatId: 1,
      pageType: 'page',
      elements: [
        { id: 'img1', type: 'image', x: 50, y: 100, width: 350, height: 400, required: true },
        { id: 'img2', type: 'image', x: 450, y: 100, width: 350, height: 400, required: true }
      ],
      active: true
    }
  ])

  const getLayoutsByFormat = (formatId: number | string) => {
    return layouts.value.filter(l => l.formatId === formatId && l.active)
  }

  const getLayoutsByType = (pageType: string) => {
    return layouts.value.filter(l => l.pageType === pageType && l.active)
  }

  const addLayout = (layout: Omit<Layout, 'id'>) => {
    const newLayout: Layout = {
      id: Date.now(),
      ...layout
    }
    layouts.value.push(newLayout)
    return newLayout
  }

  const updateLayout = (id: number | string, data: Partial<Layout>) => {
    const index = layouts.value.findIndex(l => l.id === id)
    if (index > -1) {
      layouts.value[index] = { ...layouts.value[index], ...data }
      return true
    }
    return false
  }

  const deleteLayout = (id: number | string) => {
    const index = layouts.value.findIndex(l => l.id === id)
    if (index > -1) {
      layouts.value.splice(index, 1)
      return true
    }
    return false
  }

  const getLayoutById = (id: number | string) => {
    return layouts.value.find(l => l.id === id)
  }

  return {
    layouts,
    getLayoutsByFormat,
    getLayoutsByType,
    addLayout,
    updateLayout,
    deleteLayout,
    getLayoutById
  }
})
