import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';

interface ProductionJob {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  productType: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'preflight_review' | 'in_production' | 'completed' | 'rejected' | 'failed';
  preflightStatus?: 'pending' | 'approved' | 'rejected';
  preflightNotes?: string;
  renderFiles: {
    preview: string;
    production: string;
    thumbnail: string;
  };
  specifications: {
    pages: number;
    format: string;
    material: string;
    finishing: string;
  };
  timeline: {
    created: Date;
    preflightReview?: Date;
    approved?: Date;
    productionStarted?: Date;
    completed?: Date;
  };
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  rejectionReason?: string;
  rerenderCount: number;
  metadata: Record<string, any>;
}

interface ProductionStats {
  pending: number;
  inProduction: number;
  completedToday: number;
  approvalRate: number;
  averageProductionTime: number;
  queueLength: number;
  activeOperators: number;
}

interface QueueSettings {
  isPaused: boolean;
  maxConcurrentJobs: number;
  priorityWeights: {
    high: number;
    medium: number;
    low: number;
  };
  autoApprovalRules: {
    enabled: boolean;
    criteria: string[];
  };
}

export const useProductionStore = defineStore('production', () => {
  // Estado
  const jobs = ref<ProductionJob[]>([]);
  const stats = ref<ProductionStats>({
    pending: 0,
    inProduction: 0,
    completedToday: 0,
    approvalRate: 0,
    averageProductionTime: 0,
    queueLength: 0,
    activeOperators: 0,
  });
  
  const queueSettings = ref<QueueSettings>({
    isPaused: false,
    maxConcurrentJobs: 5,
    priorityWeights: {
      high: 3,
      medium: 2,
      low: 1,
    },
    autoApprovalRules: {
      enabled: false,
      criteria: [],
    },
  });
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Computed
  const jobsByStatus = computed(() => {
    return jobs.value.reduce((acc, job) => {
      if (!acc[job.status]) {
        acc[job.status] = [];
      }
      acc[job.status].push(job);
      return acc;
    }, {} as Record<string, ProductionJob[]>);
  });
  
  const jobsByPriority = computed(() => {
    return jobs.value.reduce((acc, job) => {
      if (!acc[job.priority]) {
        acc[job.priority] = [];
      }
      acc[job.priority].push(job);
      return acc;
    }, {} as Record<string, ProductionJob[]>);
  });
  
  const pendingJobs = computed(() => 
    jobs.value.filter(job => job.status === 'pending')
  );
  
  const preflightJobs = computed(() => 
    jobs.value.filter(job => job.status === 'preflight_review')
  );
  
  const inProductionJobs = computed(() => 
    jobs.value.filter(job => job.status === 'in_production')
  );
  
  const completedJobs = computed(() => 
    jobs.value.filter(job => job.status === 'completed')
  );
  
  const rejectedJobs = computed(() => 
    jobs.value.filter(job => job.status === 'rejected')
  );
  
  // Actions
  const loadJobs = async (filters?: {
    status?: string;
    priority?: string;
    search?: string;
    filters?: string[];
    page?: number;
    limit?: number;
  }): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await api.get('/admin/production/jobs', {
        params: filters,
      });
      
      jobs.value = response.data.jobs.map((job: any) => ({
        ...job,
        timeline: {
          ...job.timeline,
          created: new Date(job.timeline.created),
          preflightReview: job.timeline.preflightReview ? new Date(job.timeline.preflightReview) : undefined,
          approved: job.timeline.approved ? new Date(job.timeline.approved) : undefined,
          productionStarted: job.timeline.productionStarted ? new Date(job.timeline.productionStarted) : undefined,
          completed: job.timeline.completed ? new Date(job.timeline.completed) : undefined,
        },
        estimatedCompletion: job.estimatedCompletion ? new Date(job.estimatedCompletion) : undefined,
        actualCompletion: job.actualCompletion ? new Date(job.actualCompletion) : undefined,
      }));
    } catch (err) {
      error.value = 'Erro ao carregar jobs de produção';
      console.error('Erro ao carregar jobs:', err);
    } finally {
      loading.value = false;
    }
  };
  
  const loadStats = async (): Promise<void> => {
    try {
      const response = await api.get('/admin/production/stats');
      stats.value = response.data;
    } catch (err) {
      error.value = 'Erro ao carregar estatísticas de produção';
      console.error('Erro ao carregar stats:', err);
    }
  };
  
  const loadQueueSettings = async (): Promise<void> => {
    try {
      const response = await api.get('/admin/production/queue/settings');
      queueSettings.value = response.data;
    } catch (err) {
      error.value = 'Erro ao carregar configurações da fila';
      console.error('Erro ao carregar configurações:', err);
    }
  };
  
  const getJob = async (jobId: string): Promise<ProductionJob> => {
    try {
      const response = await api.get(`/admin/production/jobs/${jobId}`);
      
      return {
        ...response.data,
        timeline: {
          ...response.data.timeline,
          created: new Date(response.data.timeline.created),
          preflightReview: response.data.timeline.preflightReview ? new Date(response.data.timeline.preflightReview) : undefined,
          approved: response.data.timeline.approved ? new Date(response.data.timeline.approved) : undefined,
          productionStarted: response.data.timeline.productionStarted ? new Date(response.data.timeline.productionStarted) : undefined,
          completed: response.data.timeline.completed ? new Date(response.data.timeline.completed) : undefined,
        },
        estimatedCompletion: response.data.estimatedCompletion ? new Date(response.data.estimatedCompletion) : undefined,
        actualCompletion: response.data.actualCompletion ? new Date(response.data.actualCompletion) : undefined,
      };
    } catch (err) {
      throw new Error('Erro ao carregar detalhes do job');
    }
  };  
const approveJob = async (jobId: string): Promise<void> => {
    try {
      await api.post(`/admin/production/jobs/${jobId}/approve`);
      
      // Atualizar job local
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value[jobIndex].status = 'in_production';
        jobs.value[jobIndex].preflightStatus = 'approved';
        jobs.value[jobIndex].timeline.approved = new Date();
      }
    } catch (err) {
      throw new Error('Erro ao aprovar job');
    }
  };
  
  const rejectJob = async (jobId: string, reason?: string): Promise<void> => {
    try {
      await api.post(`/admin/production/jobs/${jobId}/reject`, {
        reason,
      });
      
      // Atualizar job local
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value[jobIndex].status = 'rejected';
        jobs.value[jobIndex].preflightStatus = 'rejected';
        jobs.value[jobIndex].rejectionReason = reason;
      }
    } catch (err) {
      throw new Error('Erro ao rejeitar job');
    }
  };
  
  const rerenderJob = async (jobId: string): Promise<void> => {
    try {
      await api.post(`/admin/production/jobs/${jobId}/rerender`);
      
      // Atualizar job local
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value[jobIndex].status = 'pending';
        jobs.value[jobIndex].rerenderCount += 1;
      }
    } catch (err) {
      throw new Error('Erro ao iniciar re-render');
    }
  };
  
  const updateJobPriority = async (jobId: string, priority: 'low' | 'medium' | 'high'): Promise<void> => {
    try {
      await api.put(`/admin/production/jobs/${jobId}/priority`, {
        priority,
      });
      
      // Atualizar job local
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value[jobIndex].priority = priority;
      }
    } catch (err) {
      throw new Error('Erro ao atualizar prioridade do job');
    }
  };
  
  const pauseQueue = async (): Promise<void> => {
    try {
      await api.post('/admin/production/queue/pause');
      queueSettings.value.isPaused = true;
    } catch (err) {
      throw new Error('Erro ao pausar fila de produção');
    }
  };
  
  const resumeQueue = async (): Promise<void> => {
    try {
      await api.post('/admin/production/queue/resume');
      queueSettings.value.isPaused = false;
    } catch (err) {
      throw new Error('Erro ao retomar fila de produção');
    }
  };
  
  const updateQueueSettings = async (settings: Partial<QueueSettings>): Promise<void> => {
    try {
      await api.put('/admin/production/queue/settings', settings);
      queueSettings.value = { ...queueSettings.value, ...settings };
    } catch (err) {
      throw new Error('Erro ao atualizar configurações da fila');
    }
  }; 
 const getProductionMetrics = async (timeRange: string = '24h'): Promise<any> => {
    try {
      const response = await api.get('/admin/production/metrics', {
        params: { timeRange },
      });
      return response.data;
    } catch (err) {
      throw new Error('Erro ao carregar métricas de produção');
    }
  };
  
  const getQueueHealth = async (): Promise<any> => {
    try {
      const response = await api.get('/admin/production/queue/health');
      return response.data;
    } catch (err) {
      throw new Error('Erro ao verificar saúde da fila');
    }
  };
  
  const exportProductionReport = async (filters: any): Promise<Blob> => {
    try {
      const response = await api.post('/admin/production/export', filters, {
        responseType: 'blob',
      });
      return response.data;
    } catch (err) {
      throw new Error('Erro ao exportar relatório de produção');
    }
  };
  
  const bulkUpdateJobs = async (jobIds: string[], updates: Partial<ProductionJob>): Promise<void> => {
    try {
      await api.put('/admin/production/jobs/bulk', {
        jobIds,
        updates,
      });
      
      // Atualizar jobs locais
      jobIds.forEach(jobId => {
        const jobIndex = jobs.value.findIndex(job => job.id === jobId);
        if (jobIndex !== -1) {
          jobs.value[jobIndex] = { ...jobs.value[jobIndex], ...updates };
        }
      });
    } catch (err) {
      throw new Error('Erro ao atualizar jobs em lote');
    }
  };
  
  const cancelJob = async (jobId: string, reason?: string): Promise<void> => {
    try {
      await api.post(`/admin/production/jobs/${jobId}/cancel`, {
        reason,
      });
      
      // Remover job da lista
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value.splice(jobIndex, 1);
      }
    } catch (err) {
      throw new Error('Erro ao cancelar job');
    }
  };
  
  const rescheduleJob = async (jobId: string, newDate: Date): Promise<void> => {
    try {
      await api.put(`/admin/production/jobs/${jobId}/reschedule`, {
        scheduledFor: newDate.toISOString(),
      });
      
      // Atualizar job local
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        jobs.value[jobIndex].estimatedCompletion = newDate;
      }
    } catch (err) {
      throw new Error('Erro ao reagendar job');
    }
  };
  
  // Utilitários
  const getJobStatusColor = (status: ProductionJob['status']): string => {
    switch (status) {
      case 'pending':
        return 'yellow';
      case 'preflight_review':
        return 'blue';
      case 'in_production':
        return 'purple';
      case 'completed':
        return 'green';
      case 'rejected':
        return 'red';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  const getJobStatusLabel = (status: ProductionJob['status']): string => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'preflight_review':
        return 'Pre-flight';
      case 'in_production':
        return 'Em Produção';
      case 'completed':
        return 'Concluído';
      case 'rejected':
        return 'Rejeitado';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };
  
  const getPriorityColor = (priority: ProductionJob['priority']): string => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  const getPriorityLabel = (priority: ProductionJob['priority']): string => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Normal';
    }
  };
  
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  const getEstimatedCompletionTime = (job: ProductionJob): Date | null => {
    if (job.estimatedCompletion) {
      return job.estimatedCompletion;
    }
    
    // Calcular baseado no tipo de produto e prioridade
    const baseTime = getBaseProductionTime(job.productType);
    const priorityMultiplier = getPriorityMultiplier(job.priority);
    const queuePosition = getQueuePosition(job);
    
    const estimatedMinutes = baseTime * priorityMultiplier + (queuePosition * 15);
    
    return new Date(Date.now() + estimatedMinutes * 60 * 1000);
  };
  
  const getBaseProductionTime = (productType: string): number => {
    switch (productType) {
      case 'photobook':
        return 120; // 2 horas
      case 'calendar':
        return 90;  // 1.5 horas
      case 'card':
        return 30;  // 30 minutos
      case 'poster':
        return 60;  // 1 hora
      default:
        return 90;
    }
  };
  
  const getPriorityMultiplier = (priority: ProductionJob['priority']): number => {
    switch (priority) {
      case 'high':
        return 0.5;  // 50% mais rápido
      case 'medium':
        return 1;    // Tempo normal
      case 'low':
        return 1.5;  // 50% mais lento
      default:
        return 1;
    }
  };
  
  const getQueuePosition = (job: ProductionJob): number => {
    const pendingJobs = jobs.value.filter(j => 
      j.status === 'pending' && 
      j.timeline.created <= job.timeline.created
    );
    
    return pendingJobs.length;
  };
  
  return {
    // Estado
    jobs,
    stats,
    queueSettings,
    loading,
    error,
    
    // Computed
    jobsByStatus,
    jobsByPriority,
    pendingJobs,
    preflightJobs,
    inProductionJobs,
    completedJobs,
    rejectedJobs,
    
    // Actions
    loadJobs,
    loadStats,
    loadQueueSettings,
    getJob,
    approveJob,
    rejectJob,
    rerenderJob,
    updateJobPriority,
    pauseQueue,
    resumeQueue,
    updateQueueSettings,
    getProductionMetrics,
    getQueueHealth,
    exportProductionReport,
    bulkUpdateJobs,
    cancelJob,
    rescheduleJob,
    
    // Utilitários
    getJobStatusColor,
    getJobStatusLabel,
    getPriorityColor,
    getPriorityLabel,
    formatDuration,
    getEstimatedCompletionTime,
  };
});