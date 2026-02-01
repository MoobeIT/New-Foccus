<template>
  <div class="production-management">
    <!-- Header -->
    <div class="management-header">
      <div class="header-content">
        <h1>Gestão de Produção</h1>
        <p>Monitore e gerencie jobs de produção e pre-flight</p>
      </div>
      
      <div class="header-actions">
        <SearchInput
          v-model="searchQuery"
          placeholder="Buscar jobs..."
          @search="handleSearch"
        />
        
        <FilterDropdown
          v-model="activeFilters"
          :options="filterOptions"
          @change="handleFilterChange"
        />
        
        <button 
          class="btn-primary"
          @click="refreshJobs"
        >
          <RefreshIcon class="w-5 h-5" />
          Atualizar
        </button>
      </div>
    </div>
    
    <!-- Production Stats -->
    <div class="production-stats">
      <StatsCard
        title="Jobs Pendentes"
        :value="stats.pending"
        icon="⏳"
        color="yellow"
      />
      <StatsCard
        title="Em Produção"
        :value="stats.inProduction"
        icon="🏭"
        color="blue"
      />
      <StatsCard
        title="Concluídos Hoje"
        :value="stats.completedToday"
        icon="✅"
        color="green"
      />
      <StatsCard
        title="Taxa de Aprovação"
        :value="`${stats.approvalRate}%`"
        icon="📊"
        color="purple"
      />
    </div>
    
    <!-- Jobs Queue -->
    <div class="jobs-section">
      <div class="section-header">
        <h2>Fila de Produção</h2>
        <div class="queue-controls">
          <button 
            class="btn-secondary"
            @click="pauseQueue"
            :disabled="queuePaused"
          >
            {{ queuePaused ? 'Fila Pausada' : 'Pausar Fila' }}
          </button>
          <button 
            class="btn-secondary"
            @click="resumeQueue"
            :disabled="!queuePaused"
          >
            Retomar Fila
          </button>
        </div>
      </div>
      
      <ProductionJobsList
        :jobs="filteredJobs"
        @approve="handleApprove"
        @reject="handleReject"
        @rerender="handleRerender"
        @view-details="openJobDetails"
        @priority-change="handlePriorityChange"
      />
    </div>
    
    <!-- Job Details Modal -->
    <JobDetailsModal
      v-if="showJobDetails"
      :job="selectedJob"
      @close="closeJobDetails"
      @approve="handleApprove"
      @reject="handleReject"
      @rerender="handleRerender"
    />
    
    <!-- Pre-flight Review Modal -->
    <PreflightReviewModal
      v-if="showPreflightReview"
      :job="selectedJob"
      @approve="handlePreflightApprove"
      @reject="handlePreflightReject"
      @close="closePreflightReview"
    />
  </div>
</template><script se
tup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProductionStore } from '@/stores/production';
import { useNotificationStore } from '@/stores/notifications';

// Components
import SearchInput from '@/components/common/SearchInput.vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';
import StatsCard from '@/components/admin/StatsCard.vue';
import ProductionJobsList from '@/components/admin/ProductionJobsList.vue';
import JobDetailsModal from '@/components/admin/JobDetailsModal.vue';
import PreflightReviewModal from '@/components/admin/PreflightReviewModal.vue';

// Emits
const emit = defineEmits<{
  'job-approved': [job: any];
  'job-rejected': [job: any];
  'job-rerendered': [job: any];
}>();

// Stores
const productionStore = useProductionStore();
const notificationStore = useNotificationStore();

// Estado
const searchQuery = ref('');
const activeFilters = ref<string[]>([]);
const queuePaused = ref(false);

// Modals
const showJobDetails = ref(false);
const showPreflightReview = ref(false);
const selectedJob = ref<any>(null);

// Computed
const jobs = computed(() => productionStore.jobs);
const stats = computed(() => productionStore.stats);

const filteredJobs = computed(() => {
  let filtered = jobs.value;
  
  // Aplicar busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(job => 
      job.orderId.toLowerCase().includes(query) ||
      job.customerName?.toLowerCase().includes(query) ||
      job.productName?.toLowerCase().includes(query)
    );
  }
  
  // Aplicar filtros
  if (activeFilters.value.length > 0) {
    filtered = filtered.filter(job => {
      return activeFilters.value.every(filter => {
        switch (filter) {
          case 'pending':
            return job.status === 'pending';
          case 'in_production':
            return job.status === 'in_production';
          case 'preflight_review':
            return job.status === 'preflight_review';
          case 'completed':
            return job.status === 'completed';
          case 'rejected':
            return job.status === 'rejected';
          case 'high_priority':
            return job.priority === 'high';
          default:
            return true;
        }
      });
    });
  }
  
  return filtered.sort((a, b) => {
    // Ordenar por prioridade e data
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
});

const filterOptions = computed(() => [
  { value: 'pending', label: 'Pendentes', count: jobs.value.filter(j => j.status === 'pending').length },
  { value: 'in_production', label: 'Em Produção', count: jobs.value.filter(j => j.status === 'in_production').length },
  { value: 'preflight_review', label: 'Pre-flight', count: jobs.value.filter(j => j.status === 'preflight_review').length },
  { value: 'completed', label: 'Concluídos', count: jobs.value.filter(j => j.status === 'completed').length },
  { value: 'rejected', label: 'Rejeitados', count: jobs.value.filter(j => j.status === 'rejected').length },
  { value: 'high_priority', label: 'Alta Prioridade', count: jobs.value.filter(j => j.priority === 'high').length },
]);// Métodos

const loadJobs = async (): Promise<void> => {
  try {
    await productionStore.loadJobs({
      search: searchQuery.value,
      filters: activeFilters.value,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao carregar jobs',
      message: 'Não foi possível carregar a lista de jobs de produção',
    });
  }
};

const refreshJobs = async (): Promise<void> => {
  await loadJobs();
  await productionStore.loadStats();
};

const handleSearch = (): void => {
  loadJobs();
};

const handleFilterChange = (): void => {
  loadJobs();
};

const pauseQueue = async (): Promise<void> => {
  try {
    await productionStore.pauseQueue();
    queuePaused.value = true;
    
    notificationStore.addNotification({
      type: 'info',
      title: 'Fila pausada',
      message: 'A fila de produção foi pausada',
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao pausar fila',
      message: 'Não foi possível pausar a fila de produção',
    });
  }
};

const resumeQueue = async (): Promise<void> => {
  try {
    await productionStore.resumeQueue();
    queuePaused.value = false;
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Fila retomada',
      message: 'A fila de produção foi retomada',
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao retomar fila',
      message: 'Não foi possível retomar a fila de produção',
    });
  }
};

const openJobDetails = (job: any): void => {
  selectedJob.value = job;
  showJobDetails.value = true;
};

const closeJobDetails = (): void => {
  showJobDetails.value = false;
  selectedJob.value = null;
};

const handleApprove = async (job: any): Promise<void> => {
  try {
    await productionStore.approveJob(job.id);
    emit('job-approved', job);
    await refreshJobs();
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Job aprovado',
      message: `Job ${job.orderId} foi aprovado para produção`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao aprovar job',
      message: 'Não foi possível aprovar o job',
    });
  }
};const
 handleReject = async (job: any, reason?: string): Promise<void> => {
  try {
    await productionStore.rejectJob(job.id, reason);
    emit('job-rejected', job);
    await refreshJobs();
    
    notificationStore.addNotification({
      type: 'warning',
      title: 'Job rejeitado',
      message: `Job ${job.orderId} foi rejeitado`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao rejeitar job',
      message: 'Não foi possível rejeitar o job',
    });
  }
};

const handleRerender = async (job: any): Promise<void> => {
  try {
    await productionStore.rerenderJob(job.id);
    emit('job-rerendered', job);
    await refreshJobs();
    
    notificationStore.addNotification({
      type: 'info',
      title: 'Re-render iniciado',
      message: `Re-render do job ${job.orderId} foi iniciado`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro no re-render',
      message: 'Não foi possível iniciar o re-render',
    });
  }
};

const handlePriorityChange = async (job: any, priority: string): Promise<void> => {
  try {
    await productionStore.updateJobPriority(job.id, priority);
    await refreshJobs();
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Prioridade atualizada',
      message: `Prioridade do job ${job.orderId} alterada para ${priority}`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao alterar prioridade',
      message: 'Não foi possível alterar a prioridade do job',
    });
  }
};

const openPreflightReview = (job: any): void => {
  selectedJob.value = job;
  showPreflightReview.value = true;
};

const closePreflightReview = (): void => {
  showPreflightReview.value = false;
  selectedJob.value = null;
};

const handlePreflightApprove = async (job: any): Promise<void> => {
  await handleApprove(job);
  closePreflightReview();
};

const handlePreflightReject = async (job: any, reason: string): Promise<void> => {
  await handleReject(job, reason);
  closePreflightReview();
};

// Watchers
watch([searchQuery, activeFilters], () => {
  handleSearch();
}, { debounce: 300 });

// Lifecycle
onMounted(async () => {
  await refreshJobs();
  
  // Auto-refresh a cada 30 segundos
  setInterval(refreshJobs, 30000);
});
</script><
style scoped>
.production-management {
  space-y: 6;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.header-content p {
  color: #4a5568;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.production-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.jobs-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.queue-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsivo */
@media (max-width: 1024px) {
  .management-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
  
  .production-stats {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .production-stats {
    grid-template-columns: 1fr;
  }
  
  .queue-controls {
    flex-direction: column;
  }
}
</style>