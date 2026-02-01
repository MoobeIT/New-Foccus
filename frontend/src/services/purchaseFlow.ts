/**
 * Purchase Flow Service
 * Gerencia todo o fluxo de compra desde a seleção do produto até a entrega
 */

import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

export interface ProductSelection {
  productId: string
  productName: string
  formatId?: string
  formatName?: string
  paperId?: string
  paperName?: string
  coverTypeId?: string
  coverTypeName?: string
  pages: number
  includeCase: boolean
  casePrice?: number
  basePrice: number
  formatMultiplier: number
  paperAdjustment: number
  coverPrice: number
  extraPagesPrice: number
  totalPrice: number
  thumbnailUrl?: string
}

export interface ProjectData {
  id?: string
  name: string
  productSelection: ProductSelection
  pages: any[]
  photos: any[]
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'editing' | 'ready' | 'ordered'
}

export interface ShippingOption {
  service: string
  serviceName: string
  price: number
  deliveryTime: number
  formattedPrice: string
  formattedDelivery: string
}

class PurchaseFlowService {
  private currentProject: ProjectData | null = null

  /**
   * Step 1: Iniciar seleção de produto
   */
  startProductSelection(product: any): ProductSelection {
    const selection: ProductSelection = {
      productId: product.id,
      productName: product.name,
      pages: product.basePagesIncluded || 20,
      includeCase: false,
      basePrice: product.basePrice || 0,
      formatMultiplier: 1,
      paperAdjustment: 0,
      coverPrice: 0,
      extraPagesPrice: 0,
      totalPrice: product.basePrice || 0,
      thumbnailUrl: product.thumbnailUrl || product.imageUrl,
    }

    // Selecionar defaults
    if (product.formats?.length > 0) {
      const defaultFormat = product.formats.find((f: any) => f.isDefault) || product.formats[0]
      selection.formatId = defaultFormat.id
      selection.formatName = defaultFormat.name
      selection.formatMultiplier = defaultFormat.priceMultiplier || 1
    }

    if (product.papers?.length > 0) {
      const defaultPaper = product.papers.find((p: any) => p.isDefault) || product.papers[0]
      selection.paperId = defaultPaper.id
      selection.paperName = defaultPaper.name
      selection.paperAdjustment = defaultPaper.priceAdjustment || 0
    }

    if (product.coverTypes?.length > 0) {
      const defaultCover = product.coverTypes.find((c: any) => c.isDefault) || product.coverTypes[0]
      selection.coverTypeId = defaultCover.id
      selection.coverTypeName = defaultCover.name
      selection.coverPrice = (defaultCover.price || 0) + (defaultCover.priceAdjustment || 0)
    }

    this.recalculatePrice(selection, product)
    return selection
  }

  /**
   * Atualizar seleção de produto
   */
  updateProductSelection(
    selection: ProductSelection,
    product: any,
    updates: Partial<ProductSelection>
  ): ProductSelection {
    const updated = { ...selection, ...updates }
    this.recalculatePrice(updated, product)
    return updated
  }

  /**
   * Recalcular preço total
   */
  private recalculatePrice(selection: ProductSelection, product: any): void {
    const basePagesIncluded = product.basePagesIncluded || 20
    const extraPages = Math.max(0, selection.pages - basePagesIncluded)
    const pricePerExtraPage = product.pricePerExtraPage || 0
    const pageIncrement = product.pageIncrement || 2

    selection.extraPagesPrice = (extraPages / pageIncrement) * pricePerExtraPage

    const baseWithFormat = selection.basePrice * selection.formatMultiplier
    const casePrice = selection.includeCase ? (selection.casePrice || product.casePrice || 0) : 0

    selection.totalPrice = 
      baseWithFormat + 
      selection.extraPagesPrice + 
      selection.paperAdjustment + 
      selection.coverPrice + 
      casePrice
  }

  /**
   * Step 2: Criar projeto para edição
   */
  createProject(selection: ProductSelection): ProjectData {
    const project: ProjectData = {
      name: `${selection.productName} - ${new Date().toLocaleDateString('pt-BR')}`,
      productSelection: selection,
      pages: this.initializePages(selection.pages),
      photos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
    }

    this.currentProject = project
    this.saveProjectToStorage(project)
    return project
  }

  /**
   * Inicializar páginas do projeto
   */
  private initializePages(pageCount: number): any[] {
    const pages: any[] = []

    // Capa frontal
    pages.push({
      id: 'cover-front',
      type: 'cover-front',
      elements: [],
      background: '',
    })

    // Contracapa
    pages.push({
      id: 'cover-back',
      type: 'cover-back',
      elements: [],
      background: '',
    })

    // Páginas do miolo
    for (let i = 0; i < pageCount; i++) {
      pages.push({
        id: `page-${i + 1}`,
        type: 'content',
        pageNumber: i + 1,
        elements: [],
        background: '',
      })
    }

    return pages
  }

  /**
   * Step 3: Atualizar projeto durante edição
   */
  updateProject(updates: Partial<ProjectData>): ProjectData | null {
    if (!this.currentProject) return null

    this.currentProject = {
      ...this.currentProject,
      ...updates,
      updatedAt: new Date(),
    }

    this.saveProjectToStorage(this.currentProject)
    return this.currentProject
  }

  /**
   * Adicionar páginas ao projeto
   */
  addPages(count: number = 2): ProjectData | null {
    if (!this.currentProject) return null

    const newPages = []
    const currentPageCount = this.currentProject.pages.filter(p => p.type === 'content').length

    for (let i = 0; i < count; i++) {
      newPages.push({
        id: `page-${currentPageCount + i + 1}`,
        type: 'content',
        pageNumber: currentPageCount + i + 1,
        elements: [],
        background: '',
      })
    }

    this.currentProject.pages.push(...newPages)
    this.currentProject.productSelection.pages += count
    
    // Recalcular preço com páginas extras
    // Nota: precisaria do produto original para recalcular corretamente
    this.currentProject.updatedAt = new Date()
    this.saveProjectToStorage(this.currentProject)

    return this.currentProject
  }

  /**
   * Remover páginas do projeto
   */
  removePages(count: number = 2): ProjectData | null {
    if (!this.currentProject) return null

    const contentPages = this.currentProject.pages.filter(p => p.type === 'content')
    if (contentPages.length <= count) return this.currentProject

    // Remover últimas páginas
    for (let i = 0; i < count; i++) {
      const lastContentIndex = this.currentProject.pages.findLastIndex(p => p.type === 'content')
      if (lastContentIndex > -1) {
        this.currentProject.pages.splice(lastContentIndex, 1)
      }
    }

    this.currentProject.productSelection.pages -= count
    this.currentProject.updatedAt = new Date()
    this.saveProjectToStorage(this.currentProject)

    return this.currentProject
  }

  /**
   * Step 4: Finalizar projeto e adicionar ao carrinho
   */
  async finishProjectAndAddToCart(): Promise<boolean> {
    if (!this.currentProject) return false

    const cartStore = useCartStore()
    const selection = this.currentProject.productSelection

    try {
      await cartStore.addItem({
        productId: selection.productId,
        productName: selection.productName,
        variantId: selection.formatId,
        variantName: [
          selection.formatName,
          selection.paperName,
          selection.coverTypeName,
        ].filter(Boolean).join(' • '),
        projectId: this.currentProject.id,
        quantity: 1,
        pages: selection.pages,
        unitPrice: selection.totalPrice,
        thumbnailUrl: selection.thumbnailUrl,
        customizations: {
          formatId: selection.formatId,
          paperId: selection.paperId,
          coverTypeId: selection.coverTypeId,
          includeCase: selection.includeCase,
          pages: selection.pages,
        },
      })

      this.currentProject.status = 'ready'
      this.saveProjectToStorage(this.currentProject)

      return true
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error)
      return false
    }
  }

  /**
   * Calcular preço com páginas extras
   */
  calculatePriceWithExtraPages(
    basePrice: number,
    basePagesIncluded: number,
    currentPages: number,
    pricePerExtraPage: number,
    pageIncrement: number = 2
  ): { extraPages: number; extraPagesPrice: number; total: number } {
    const extraPages = Math.max(0, currentPages - basePagesIncluded)
    const extraPagesPrice = (extraPages / pageIncrement) * pricePerExtraPage
    
    return {
      extraPages,
      extraPagesPrice,
      total: basePrice + extraPagesPrice,
    }
  }

  /**
   * Salvar projeto no localStorage
   */
  private saveProjectToStorage(project: ProjectData): void {
    try {
      const projects = this.getProjectsFromStorage()
      const existingIndex = projects.findIndex(p => p.id === project.id)
      
      if (existingIndex > -1) {
        projects[existingIndex] = project
      } else {
        project.id = `project-${Date.now()}`
        projects.push(project)
      }

      localStorage.setItem('projects', JSON.stringify(projects))
    } catch (error) {
      console.error('Erro ao salvar projeto:', error)
    }
  }

  /**
   * Carregar projetos do localStorage
   */
  getProjectsFromStorage(): ProjectData[] {
    try {
      const data = localStorage.getItem('projects')
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Carregar projeto específico
   */
  loadProject(projectId: string): ProjectData | null {
    const projects = this.getProjectsFromStorage()
    const project = projects.find(p => p.id === projectId)
    
    if (project) {
      this.currentProject = project
    }
    
    return project || null
  }

  /**
   * Obter projeto atual
   */
  getCurrentProject(): ProjectData | null {
    return this.currentProject
  }

  /**
   * Limpar projeto atual
   */
  clearCurrentProject(): void {
    this.currentProject = null
  }

  /**
   * Deletar projeto
   */
  deleteProject(projectId: string): void {
    const projects = this.getProjectsFromStorage()
    const filtered = projects.filter(p => p.id !== projectId)
    localStorage.setItem('projects', JSON.stringify(filtered))
    
    if (this.currentProject?.id === projectId) {
      this.currentProject = null
    }
  }
}

export const purchaseFlowService = new PurchaseFlowService()
export default purchaseFlowService
