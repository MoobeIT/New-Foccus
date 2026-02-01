// Studio Service - API para área do fotógrafo
import { api } from './api'

export interface Project {
  id: string
  name: string
  status: string
  productId?: string
  productName?: string
  formatId?: string
  formatName?: string
  paperId?: string
  paperName?: string
  coverTypeId?: string
  coverTypeName?: string
  clientName?: string
  clientEmail?: string
  pageCount: number
  settings?: any
  thumbnail?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  total: number
  byStatus: Record<string, number>
  byProduct: Record<string, number>
  totalPages: number
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  notes?: string
  projectsCount: number
  totalSpent: number
  lastProjectAt?: string
  createdAt: string
  updatedAt: string
}

export interface ClientStats {
  total: number
  activeClients: number
  newThisMonth: number
  totalRevenue: number
}

export interface Approval {
  id: string
  projectId: string
  projectName?: string
  clientId?: string
  clientName: string
  clientEmail: string
  status: 'pending' | 'viewed' | 'approved' | 'revision' | 'rejected'
  token: string
  expiresAt?: string
  sentAt: string
  viewedAt?: string
  respondedAt?: string
  feedback?: string
  revisionNotes?: string
  createdAt: string
}

export interface ApprovalStats {
  total: number
  pending: number
  viewed: number
  approved: number
  revision: number
  rejected: number
}

export interface Order {
  id: string
  projectId?: string
  projectName?: string
  clientName?: string
  productType?: string
  total: number
  status: string
  trackingCode?: string
  createdAt: string
}

class StudioService {
  // ==================== PROJECTS ====================
  
  async getProjects(filters?: { status?: string; search?: string }): Promise<Project[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      const query = params.toString() ? `?${params.toString()}` : ''
      
      const response = await api.get<any>(`/api/v1/projects${query}`)
      // API retorna { success, data } ou diretamente o array
      const data = response.data?.data || response.data || []
      
      // Converter objeto com índices numéricos para array se necessário
      if (Array.isArray(data)) {
        return data
      } else if (typeof data === 'object' && data !== null) {
        // Objeto com índices numéricos ({"0": {...}, "1": {...}})
        return Object.values(data)
      }
      return []
    } catch (error) {
      console.error('Erro ao buscar projetos da API, usando localStorage:', error)
      // Fallback: buscar projetos do localStorage
      return this.getProjectsFromLocalStorage(filters)
    }
  }

  // Fallback para buscar projetos do localStorage quando backend não está disponível
  private getProjectsFromLocalStorage(filters?: { status?: string; search?: string }): Project[] {
    try {
      const stored = localStorage.getItem('projects')
      if (!stored) return []
      
      let projects: any[] = JSON.parse(stored)
      
      // Converter para o formato esperado
      projects = projects.map(p => ({
        id: p.id || `local-${Date.now()}`,
        name: p.name || 'Projeto sem nome',
        status: p.status || 'editing',
        productId: p.productSelection?.productId,
        productName: p.productSelection?.productName || 'Álbum',
        formatId: p.productSelection?.formatId,
        formatName: p.productSelection?.formatName,
        paperId: p.productSelection?.paperId,
        paperName: p.productSelection?.paperName,
        coverTypeId: p.productSelection?.coverTypeId,
        coverTypeName: p.productSelection?.coverTypeName,
        pageCount: p.productSelection?.pages || p.pages?.filter((pg: any) => pg.type === 'page')?.length || 20,
        thumbnail: p.thumbnailUrl || p.productSelection?.thumbnailUrl,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString()
      }))
      
      // Aplicar filtros
      if (filters?.status) {
        projects = projects.filter(p => p.status === filters.status)
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase()
        projects = projects.filter(p => p.name?.toLowerCase().includes(q))
      }
      
      return projects
    } catch (error) {
      console.error('Erro ao buscar projetos do localStorage:', error)
      return []
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const response = await api.get<any>(`/api/v1/projects/${id}`)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao buscar projeto:', error)
      return null
    }
  }

  async createProject(data: {
    name: string
    productId?: string
    formatId?: string
    paperId?: string
    coverTypeId?: string
    pageCount?: number
    settings?: any
  }): Promise<Project | null> {
    try {
      const response = await api.post<any>('/api/v1/projects', data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      throw error
    }
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    // Se é um projeto local, atualizar diretamente no localStorage
    if (id.startsWith('local-')) {
      return this.updateProjectInLocalStorage(id, data)
    }
    
    try {
      const response = await api.patch<any>(`/api/v1/projects/${id}`, data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao atualizar projeto na API, tentando localStorage:', error)
      // Fallback: atualizar no localStorage
      return this.updateProjectInLocalStorage(id, data)
    }
  }

  // Fallback para atualizar projeto no localStorage
  private updateProjectInLocalStorage(id: string, data: Partial<Project>): Project | null {
    try {
      const stored = localStorage.getItem('projects')
      if (!stored) return null
      
      const projects = JSON.parse(stored)
      const index = projects.findIndex((p: any) => p.id === id)
      
      if (index === -1) return null
      
      // Atualizar o projeto
      projects[index] = {
        ...projects[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      localStorage.setItem('projects', JSON.stringify(projects))
      
      // Retornar o projeto atualizado no formato esperado
      const updated = projects[index]
      return {
        id: updated.id,
        name: updated.name || 'Projeto sem nome',
        status: updated.status || 'editing',
        productId: updated.productSelection?.productId,
        productName: updated.productSelection?.productName || 'Álbum',
        formatId: updated.productSelection?.formatId,
        formatName: updated.productSelection?.formatName,
        paperId: updated.productSelection?.paperId,
        paperName: updated.productSelection?.paperName,
        coverTypeId: updated.productSelection?.coverTypeId,
        coverTypeName: updated.productSelection?.coverTypeName,
        pageCount: updated.productSelection?.pages || updated.pages?.filter((pg: any) => pg.type === 'page')?.length || 20,
        thumbnail: updated.thumbnailUrl || updated.productSelection?.thumbnailUrl,
        createdAt: updated.createdAt || new Date().toISOString(),
        updatedAt: updated.updatedAt || new Date().toISOString()
      }
    } catch (error) {
      console.error('Erro ao atualizar projeto no localStorage:', error)
      return null
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    // Se é um projeto local, deletar diretamente do localStorage
    if (id.startsWith('local-')) {
      return this.deleteProjectFromLocalStorage(id)
    }
    
    try {
      await api.delete(`/api/v1/projects/${id}`)
      return true
    } catch (error) {
      console.error('Erro ao deletar projeto da API, tentando localStorage:', error)
      // Fallback: deletar do localStorage
      return this.deleteProjectFromLocalStorage(id)
    }
  }

  // Fallback para deletar projeto do localStorage
  private deleteProjectFromLocalStorage(id: string): boolean {
    try {
      const stored = localStorage.getItem('projects')
      if (!stored) return false
      
      const projects = JSON.parse(stored)
      const filtered = projects.filter((p: any) => p.id !== id)
      localStorage.setItem('projects', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Erro ao deletar projeto do localStorage:', error)
      return false
    }
  }

  async duplicateProject(id: string, name?: string): Promise<Project | null> {
    try {
      const response = await api.post<any>(`/api/v1/projects/${id}/duplicate`, { name })
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao duplicar projeto:', error)
      throw error
    }
  }

  async changeProjectStatus(id: string, status: string): Promise<Project | null> {
    try {
      const response = await api.patch<any>(`/api/v1/projects/${id}/status`, { status })
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      throw error
    }
  }

  async getProjectStats(): Promise<ProjectStats> {
    try {
      const response = await api.get<any>('/api/v1/projects/stats')
      return response.data?.data || response.data || {
        total: 0,
        byStatus: {},
        byProduct: {},
        totalPages: 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return { total: 0, byStatus: {}, byProduct: {}, totalPages: 0 }
    }
  }

  // ==================== ORDERS ====================
  
  async getOrders(filters?: { status?: string }): Promise<Order[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      const query = params.toString() ? `?${params.toString()}` : ''
      
      const response = await api.get<any>(`/api/v1/orders${query}`)
      const data = response.data?.data || response.data || []
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
      return []
    }
  }

  // ==================== CLIENTS ====================
  
  async getClients(filters?: { search?: string; sortBy?: string }): Promise<Client[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      const query = params.toString() ? `?${params.toString()}` : ''
      
      const response = await api.get<any>(`/api/v1/studio/clients${query}`)
      const data = response.data?.data || response.data || []
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      return []
    }
  }

  async getClient(id: string): Promise<Client | null> {
    try {
      const response = await api.get<any>(`/api/v1/studio/clients/${id}`)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      return null
    }
  }

  async createClient(data: {
    name: string
    email: string
    phone?: string
    address?: string
    notes?: string
  }): Promise<Client | null> {
    try {
      const response = await api.post<any>('/api/v1/studio/clients', data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      throw error
    }
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | null> {
    try {
      const response = await api.patch<any>(`/api/v1/studio/clients/${id}`, data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      throw error
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/v1/studio/clients/${id}`)
      return true
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      return false
    }
  }

  async getClientStats(): Promise<ClientStats> {
    try {
      const response = await api.get<any>('/api/v1/studio/clients/stats')
      return response.data?.data || response.data || {
        total: 0,
        activeClients: 0,
        newThisMonth: 0,
        totalRevenue: 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de clientes:', error)
      return { total: 0, activeClients: 0, newThisMonth: 0, totalRevenue: 0 }
    }
  }

  // ==================== APPROVALS ====================
  
  async getApprovals(filters?: { status?: string; projectId?: string }): Promise<Approval[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.projectId) params.append('projectId', filters.projectId)
      const query = params.toString() ? `?${params.toString()}` : ''
      
      const response = await api.get<any>(`/api/v1/studio/approvals${query}`)
      const data = response.data?.data || response.data || []
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Erro ao buscar aprovações:', error)
      return []
    }
  }

  async getApproval(id: string): Promise<Approval | null> {
    try {
      const response = await api.get<any>(`/api/v1/studio/approvals/${id}`)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao buscar aprovação:', error)
      return null
    }
  }

  async createApproval(data: {
    projectId: string
    clientId?: string
    clientName: string
    clientEmail: string
    expiresAt?: string
  }): Promise<Approval | null> {
    try {
      const response = await api.post<any>('/api/v1/studio/approvals', data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao criar aprovação:', error)
      throw error
    }
  }

  async updateApproval(id: string, data: { status?: string; feedback?: string; revisionNotes?: string }): Promise<Approval | null> {
    try {
      const response = await api.patch<any>(`/api/v1/studio/approvals/${id}`, data)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao atualizar aprovação:', error)
      throw error
    }
  }

  async resendApprovalLink(id: string): Promise<Approval | null> {
    try {
      const response = await api.post<any>(`/api/v1/studio/approvals/${id}/resend`)
      return response.data?.data || response.data || null
    } catch (error) {
      console.error('Erro ao reenviar link:', error)
      throw error
    }
  }

  async deleteApproval(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/v1/studio/approvals/${id}`)
      return true
    } catch (error) {
      console.error('Erro ao deletar aprovação:', error)
      return false
    }
  }

  async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const response = await api.get<any>('/api/v1/studio/approvals/stats')
      return response.data?.data || response.data || {
        total: 0,
        pending: 0,
        viewed: 0,
        approved: 0,
        revision: 0,
        rejected: 0
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de aprovações:', error)
      return { total: 0, pending: 0, viewed: 0, approved: 0, revision: 0, rejected: 0 }
    }
  }

  getApprovalLink(token: string): string {
    return `${window.location.origin}/approval/${token}`
  }

  // ==================== DASHBOARD ====================
  
  async getDashboardStats() {
    try {
      const [stats, projects, orders, clientStats, approvalStats] = await Promise.all([
        this.getProjectStats(),
        this.getProjects(),
        this.getOrders(),
        this.getClientStats(),
        this.getApprovalStats()
      ])
      
      const byStatus = stats.byStatus || {}
      
      return {
        totalProjects: stats.total || 0,
        pendingApproval: approvalStats.pending || 0,
        inProduction: byStatus['production'] || byStatus['PRODUCTION'] || 0,
        totalClients: clientStats.total || 0,
        completedOrders: orders.filter(o => o.status === 'delivered' || o.status === 'DELIVERED').length,
        monthRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        pipeline: {
          draft: byStatus['draft'] || byStatus['DRAFT'] || 0,
          editing: byStatus['editing'] || byStatus['EDITING'] || 0,
          pending: approvalStats.pending || 0,
          approved: approvalStats.approved || 0,
          production: byStatus['production'] || byStatus['PRODUCTION'] || 0,
          completed: byStatus['completed'] || byStatus['COMPLETED'] || 0
        },
        recentProjects: projects.slice(0, 5),
        clientStats,
        approvalStats
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
      return {
        totalProjects: 0,
        pendingApproval: 0,
        inProduction: 0,
        totalClients: 0,
        completedOrders: 0,
        monthRevenue: 0,
        pipeline: { draft: 0, editing: 0, pending: 0, approved: 0, production: 0, completed: 0 },
        recentProjects: [],
        clientStats: { total: 0, activeClients: 0, newThisMonth: 0, totalRevenue: 0 },
        approvalStats: { total: 0, pending: 0, viewed: 0, approved: 0, revision: 0, rejected: 0 }
      }
    }
  }
}

export const studioService = new StudioService()
