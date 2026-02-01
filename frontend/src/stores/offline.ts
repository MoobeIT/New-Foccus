import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { openDB, type IDBPDatabase } from 'idb';

interface OfflineProject {
  id: string;
  name: string;
  data: any;
  lastModified: number;
  synced: boolean;
}

interface OfflineAsset {
  id: string;
  filename: string;
  blob: Blob;
  metadata: any;
  lastModified: number;
  synced: boolean;
}

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'project' | 'asset' | 'metadata';
  resourceId: string;
  data: any;
  timestamp: number;
  retries: number;
}

export const useOfflineStore = defineStore('offline', () => {
  // Estado
  const isOnline = ref(navigator.onLine);
  const db = ref<IDBPDatabase | null>(null);
  const syncInProgress = ref(false);
  const lastSyncTime = ref<number>(0);
  
  // Projetos offline
  const offlineProjects = ref<Map<string, OfflineProject>>(new Map());
  const offlineAssets = ref<Map<string, OfflineAsset>>(new Map());
  const pendingOperations = ref<Map<string, OfflineOperation>>(new Map());
  
  // Computed
  const hasOfflineData = computed(() => 
    offlineProjects.value.size > 0 || 
    offlineAssets.value.size > 0 || 
    pendingOperations.value.size > 0
  );
  
  const unsyncedProjectsCount = computed(() => 
    Array.from(offlineProjects.value.values()).filter(p => !p.synced).length
  );
  
  const unsyncedAssetsCount = computed(() => 
    Array.from(offlineAssets.value.values()).filter(a => !a.synced).length
  );
  
  const pendingOperationsCount = computed(() => pendingOperations.value.size);
  
  // Inicializar IndexedDB
  const initDB = async (): Promise<void> => {
    try {
      db.value = await openDB('EditorOfflineDB', 1, {
        upgrade(db) {
          // Store para projetos
          if (!db.objectStoreNames.contains('projects')) {
            const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
            projectStore.createIndex('lastModified', 'lastModified');
            projectStore.createIndex('synced', 'synced');
          }
          
          // Store para assets
          if (!db.objectStoreNames.contains('assets')) {
            const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
            assetStore.createIndex('lastModified', 'lastModified');
            assetStore.createIndex('synced', 'synced');
          }
          
          // Store para operações pendentes
          if (!db.objectStoreNames.contains('operations')) {
            const operationStore = db.createObjectStore('operations', { keyPath: 'id' });
            operationStore.createIndex('timestamp', 'timestamp');
            operationStore.createIndex('type', 'type');
          }
          
          // Store para configurações
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        },
      });
      
      await loadOfflineData();
    } catch (error) {
      console.error('Erro ao inicializar IndexedDB:', error);
    }
  };
  
  // Carregar dados offline do IndexedDB
  const loadOfflineData = async (): Promise<void> => {
    if (!db.value) return;
    
    try {
      // Carregar projetos
      const projects = await db.value.getAll('projects');
      offlineProjects.value.clear();
      projects.forEach(project => {
        offlineProjects.value.set(project.id, project);
      });
      
      // Carregar assets
      const assets = await db.value.getAll('assets');
      offlineAssets.value.clear();
      assets.forEach(asset => {
        offlineAssets.value.set(asset.id, asset);
      });
      
      // Carregar operações pendentes
      const operations = await db.value.getAll('operations');
      pendingOperations.value.clear();
      operations.forEach(operation => {
        pendingOperations.value.set(operation.id, operation);
      });
      
      // Carregar configurações
      const lastSync = await db.value.get('settings', 'lastSyncTime');
      if (lastSync) {
        lastSyncTime.value = lastSync.value;
      }
    } catch (error) {
      console.error('Erro ao carregar dados offline:', error);
    }
  };
  
  // Salvar projeto offline
  const saveProjectOffline = async (project: any): Promise<void> => {
    if (!db.value) return;
    
    const offlineProject: OfflineProject = {
      id: project.id,
      name: project.name,
      data: project,
      lastModified: Date.now(),
      synced: false,
    };
    
    try {
      await db.value.put('projects', offlineProject);
      offlineProjects.value.set(project.id, offlineProject);
      
      // Adicionar operação pendente
      await addPendingOperation({
        type: 'update',
        resource: 'project',
        resourceId: project.id,
        data: project,
      });
    } catch (error) {
      console.error('Erro ao salvar projeto offline:', error);
    }
  };
  
  // Salvar asset offline
  const saveAssetOffline = async (asset: any, blob: Blob): Promise<void> => {
    if (!db.value) return;
    
    const offlineAsset: OfflineAsset = {
      id: asset.id,
      filename: asset.filename,
      blob,
      metadata: asset,
      lastModified: Date.now(),
      synced: false,
    };
    
    try {
      await db.value.put('assets', offlineAsset);
      offlineAssets.value.set(asset.id, offlineAsset);
      
      // Adicionar operação pendente
      await addPendingOperation({
        type: 'create',
        resource: 'asset',
        resourceId: asset.id,
        data: asset,
      });
    } catch (error) {
      console.error('Erro ao salvar asset offline:', error);
    }
  };
  
  // Adicionar operação pendente
  const addPendingOperation = async (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> => {
    if (!db.value) return;
    
    const pendingOperation: OfflineOperation = {
      ...operation,
      id: generateOperationId(),
      timestamp: Date.now(),
      retries: 0,
    };
    
    try {
      await db.value.put('operations', pendingOperation);
      pendingOperations.value.set(pendingOperation.id, pendingOperation);
    } catch (error) {
      console.error('Erro ao adicionar operação pendente:', error);
    }
  };
  
  // Obter projeto offline
  const getOfflineProject = (projectId: string): OfflineProject | null => {
    return offlineProjects.value.get(projectId) || null;
  };
  
  // Obter asset offline
  const getOfflineAsset = (assetId: string): OfflineAsset | null => {
    return offlineAssets.value.get(assetId) || null;
  };
  
  // Listar projetos offline
  const listOfflineProjects = (): OfflineProject[] => {
    return Array.from(offlineProjects.value.values())
      .sort((a, b) => b.lastModified - a.lastModified);
  };
  
  // Listar assets offline
  const listOfflineAssets = (): OfflineAsset[] => {
    return Array.from(offlineAssets.value.values())
      .sort((a, b) => b.lastModified - a.lastModified);
  };
  
  // Sincronizar dados com o servidor
  const syncWithServer = async (): Promise<void> => {
    if (!isOnline.value || syncInProgress.value) {
      return;
    }
    
    syncInProgress.value = true;
    
    try {
      // Sincronizar operações pendentes
      await syncPendingOperations();
      
      // Marcar projetos como sincronizados
      await markProjectsAsSynced();
      
      // Marcar assets como sincronizados
      await markAssetsAsSynced();
      
      // Atualizar tempo da última sincronização
      lastSyncTime.value = Date.now();
      if (db.value) {
        await db.value.put('settings', { key: 'lastSyncTime', value: lastSyncTime.value });
      }
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      syncInProgress.value = false;
    }
  };
  
  // Sincronizar operações pendentes
  const syncPendingOperations = async (): Promise<void> => {
    const operations = Array.from(pendingOperations.value.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    for (const operation of operations) {
      try {
        await executeOperation(operation);
        await removePendingOperation(operation.id);
      } catch (error) {
        console.error('Erro ao executar operação:', error);
        
        // Incrementar tentativas
        operation.retries++;
        
        // Remover se excedeu o limite de tentativas
        if (operation.retries >= 3) {
          await removePendingOperation(operation.id);
        } else if (db.value) {
          await db.value.put('operations', operation);
        }
      }
    }
  };
  
  // Executar operação no servidor
  const executeOperation = async (operation: OfflineOperation): Promise<void> => {
    const { type, resource, resourceId, data } = operation;
    
    let url = '';
    let method = '';
    
    switch (resource) {
      case 'project':
        url = `/api/projects/${resourceId}`;
        method = type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE';
        break;
      case 'asset':
        url = `/api/assets/${resourceId}`;
        method = type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE';
        break;
      case 'metadata':
        url = `/api/assets/${resourceId}/metadata`;
        method = 'PUT';
        break;
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  };
  
  // Remover operação pendente
  const removePendingOperation = async (operationId: string): Promise<void> => {
    if (!db.value) return;
    
    try {
      await db.value.delete('operations', operationId);
      pendingOperations.value.delete(operationId);
    } catch (error) {
      console.error('Erro ao remover operação pendente:', error);
    }
  };
  
  // Marcar projetos como sincronizados
  const markProjectsAsSynced = async (): Promise<void> => {
    if (!db.value) return;
    
    const unsyncedProjects = Array.from(offlineProjects.value.values())
      .filter(p => !p.synced);
    
    for (const project of unsyncedProjects) {
      project.synced = true;
      await db.value.put('projects', project);
      offlineProjects.value.set(project.id, project);
    }
  };
  
  // Marcar assets como sincronizados
  const markAssetsAsSynced = async (): Promise<void> => {
    if (!db.value) return;
    
    const unsyncedAssets = Array.from(offlineAssets.value.values())
      .filter(a => !a.synced);
    
    for (const asset of unsyncedAssets) {
      asset.synced = true;
      await db.value.put('assets', asset);
      offlineAssets.value.set(asset.id, asset);
    }
  };
  
  // Limpar dados offline antigos
  const cleanupOldData = async (maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> => {
    if (!db.value) return;
    
    const cutoffTime = Date.now() - maxAge;
    
    try {
      // Limpar projetos antigos sincronizados
      const oldProjects = Array.from(offlineProjects.value.values())
        .filter(p => p.synced && p.lastModified < cutoffTime);
      
      for (const project of oldProjects) {
        await db.value.delete('projects', project.id);
        offlineProjects.value.delete(project.id);
      }
      
      // Limpar assets antigos sincronizados
      const oldAssets = Array.from(offlineAssets.value.values())
        .filter(a => a.synced && a.lastModified < cutoffTime);
      
      for (const asset of oldAssets) {
        await db.value.delete('assets', asset.id);
        offlineAssets.value.delete(asset.id);
      }
      
    } catch (error) {
      console.error('Erro ao limpar dados antigos:', error);
    }
  };
  
  // Obter tamanho do armazenamento offline
  const getStorageSize = async (): Promise<number> => {
    if (!db.value) return 0;
    
    try {
      let totalSize = 0;
      
      // Calcular tamanho dos assets (blobs)
      const assets = await db.value.getAll('assets');
      for (const asset of assets) {
        totalSize += asset.blob.size;
      }
      
      // Estimar tamanho dos projetos (JSON)
      const projects = await db.value.getAll('projects');
      for (const project of projects) {
        totalSize += JSON.stringify(project.data).length * 2; // UTF-16
      }
      
      return totalSize;
    } catch (error) {
      console.error('Erro ao calcular tamanho do armazenamento:', error);
      return 0;
    }
  };
  
  // Limpar todos os dados offline
  const clearAllOfflineData = async (): Promise<void> => {
    if (!db.value) return;
    
    try {
      await db.value.clear('projects');
      await db.value.clear('assets');
      await db.value.clear('operations');
      
      offlineProjects.value.clear();
      offlineAssets.value.clear();
      pendingOperations.value.clear();
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
    }
  };
  
  // Utilitários
  const generateOperationId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Monitorar status da rede
  const updateOnlineStatus = (): void => {
    isOnline.value = navigator.onLine;
    
    // Sincronizar automaticamente quando voltar online
    if (isOnline.value && hasOfflineData.value) {
      setTimeout(() => syncWithServer(), 1000);
    }
  };
  
  // Event listeners
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  return {
    // Estado
    isOnline,
    syncInProgress,
    lastSyncTime,
    hasOfflineData,
    unsyncedProjectsCount,
    unsyncedAssetsCount,
    pendingOperationsCount,
    
    // Métodos
    initDB,
    saveProjectOffline,
    saveAssetOffline,
    getOfflineProject,
    getOfflineAsset,
    listOfflineProjects,
    listOfflineAssets,
    syncWithServer,
    cleanupOldData,
    getStorageSize,
    clearAllOfflineData,
    updateOnlineStatus,
  };
});