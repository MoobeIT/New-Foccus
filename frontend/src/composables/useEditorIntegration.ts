/**
 * Integração do Editor com Backend
 * Este composable adiciona funcionalidades de backend ao editor existente
 */

import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import * as editorApi from '../services/editorApi';

// Tipos
export interface EditorPage {
  id: string;
  type: 'cover-front' | 'cover-back' | 'page';
  elements: any[];
  background?: string;
}

export interface EditorPhoto {
  id: string;
  src: string;
  assetId?: string;
  width?: number;
  height?: number;
}

export interface DpiWarning {
  elementId: string;
  dpi: number;
  quality: string;
  message: string;
}

export function useEditorIntegration() {
  const route = useRoute();

  // Estado de integração
  const backendProjectId = ref<string | null>(null);
  const backendVersion = ref<number>(0);
  const isConnectedToBackend = ref(false);
  const isSavingToBackend = ref(false);
  const isUploadingToBackend = ref(false);
  const backendError = ref<string | null>(null);
  const lastBackendSave = ref<Date | null>(null);

  // Configurações do produto do backend
  const backendProductConfig = ref<editorApi.ProductConfig | null>(null);
  const calculatedSpineWidth = ref<number>(5);

  // Warnings de DPI
  const dpiWarnings = ref<Map<string, editorApi.DpiValidationResult>>(new Map());

  // Auto-save para backend
  let backendAutoSaveTimer: number | null = null;
  const BACKEND_AUTO_SAVE_INTERVAL = 60000; // 1 minuto

  /**
   * Inicializar conexão com backend
   */
  async function initBackendConnection(): Promise<{ pages: EditorPage[] } | null> {
    // Verificar se há projectId na URL
    const projectIdFromUrl = route.params.projectId as string || route.query.projectId as string || route.params.id as string;

    if (!projectIdFromUrl) {
      console.log('📦 Editor iniciado sem projeto do backend');
      return null;
    }

    if (!editorApi.isAuthenticated()) {
      console.log('🔒 Usuário não autenticado, usando modo local');
      return null;
    }

    try {
      console.log('🔄 Carregando projeto do backend:', projectIdFromUrl);
      const result = await editorApi.loadProject(projectIdFromUrl);

      backendProjectId.value = projectIdFromUrl;
      backendVersion.value = result.project.version;
      isConnectedToBackend.value = true;

      // Carregar configurações do produto
      if (result.project.product?.id) {
        try {
          backendProductConfig.value = await editorApi.getProductConfig(result.project.product.id);
          
          // Salvar config no localStorage para o editor usar
          const productConfig = {
            productId: result.project.product.id,
            productName: result.project.product.name,
            formatId: result.project.format?.id,
            formatName: result.project.format?.name,
            width: result.project.format?.width || result.project.width || 300,
            height: result.project.format?.height || result.project.height || 300,
            paperId: result.project.paper?.id,
            paperName: result.project.paper?.name,
            coverTypeId: result.project.coverType?.id,
            coverName: result.project.coverType?.name,
            pages: result.project.pageCount || 20,
            minPages: result.project.format?.minPages || 20,
            maxPages: result.project.format?.maxPages || 100,
          };
          localStorage.setItem('editor-product-config', JSON.stringify(productConfig));
          console.log('📦 Configuração do produto salva:', productConfig);
        } catch (e) {
          console.warn('Não foi possível carregar config do produto');
        }
      }

      // Atualizar lombada
      calculatedSpineWidth.value = result.project.spineWidth || 5;

      console.log('✅ Projeto carregado do backend:', result.project.name);

      return {
        pages: result.pages as EditorPage[],
        projectName: result.project.name,
        project: result.project,
      };
    } catch (error: any) {
      console.error('❌ Erro ao carregar projeto do backend:', error);
      backendError.value = error.message;
      return null;
    }
  }

  /**
   * Salvar páginas no backend
   */
  async function saveToBackend(
    projectName: string,
    pages: EditorPage[],
    settings?: Record<string, any>
  ): Promise<boolean> {
    if (!isConnectedToBackend.value || !backendProjectId.value) {
      console.log('💾 Salvando localmente (não conectado ao backend)');
      return false;
    }

    isSavingToBackend.value = true;
    backendError.value = null;

    try {
      const result = await editorApi.saveProject(
        backendProjectId.value,
        projectName,
        pages,
        backendVersion.value,
        settings
      );

      backendVersion.value = result.version;
      lastBackendSave.value = new Date(result.savedAt);

      if (result.spineWidth) {
        calculatedSpineWidth.value = result.spineWidth;
      }

      console.log('✅ Projeto salvo no backend, versão:', result.version);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao salvar no backend:', error);
      backendError.value = error.message;

      // Se for conflito de versão, avisar usuário
      if (error.message?.includes('Conflito') || error.message?.includes('versão')) {
        backendError.value = 'Projeto foi modificado em outra sessão. Recarregue a página.';
      }

      return false;
    } finally {
      isSavingToBackend.value = false;
    }
  }

  /**
   * Upload de foto para o backend
   */
  async function uploadPhotoToBackend(file: File): Promise<EditorPhoto | null> {
    if (!editorApi.isAuthenticated()) {
      // Fallback: usar base64 local
      return uploadPhotoLocal(file);
    }

    isUploadingToBackend.value = true;

    try {
      const result = await editorApi.uploadPhoto(file, backendProjectId.value || undefined);

      console.log('✅ Foto enviada para o backend:', result.filename);

      return {
        id: result.id,
        src: result.url,
        assetId: result.id,
        width: result.width,
        height: result.height,
      };
    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      // Fallback: usar base64 local
      return uploadPhotoLocal(file);
    } finally {
      isUploadingToBackend.value = false;
    }
  }

  /**
   * Upload local (base64) - fallback
   */
  async function uploadPhotoLocal(file: File): Promise<EditorPhoto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const src = e.target?.result as string;

        // Obter dimensões
        const img = new Image();
        img.onload = () => {
          resolve({
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => {
          resolve({
            id: `local-${Date.now()}`,
            src,
          });
        };
        img.src = src;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload de múltiplas fotos
   */
  async function uploadPhotosToBackend(
    files: File[],
    onProgress?: (current: number, total: number) => void
  ): Promise<EditorPhoto[]> {
    const photos: EditorPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      onProgress?.(i, files.length);

      const photo = await uploadPhotoToBackend(files[i]);
      if (photo) {
        photos.push(photo);
      }
    }

    onProgress?.(files.length, files.length);
    return photos;
  }

  /**
   * Validar DPI de uma imagem no elemento
   */
  function validateImageDpi(
    elementId: string,
    imageWidth: number,
    imageHeight: number,
    elementWidthPx: number,
    elementHeightPx: number,
    pageWidthMm: number = 200
  ): editorApi.DpiValidationResult {
    // Converter pixels do elemento para mm
    // Assumindo página de 420px = pageWidthMm
    const pxToMm = pageWidthMm / 420;
    const elementWidthMm = elementWidthPx * pxToMm;
    const elementHeightMm = elementHeightPx * pxToMm;

    const result = editorApi.validateDpiLocal(
      imageWidth,
      imageHeight,
      elementWidthMm,
      elementHeightMm
    );

    // Armazenar warning
    dpiWarnings.value.set(elementId, result);

    return result;
  }

  /**
   * Obter warning de DPI para um elemento
   */
  function getDpiWarning(elementId: string): editorApi.DpiValidationResult | undefined {
    return dpiWarnings.value.get(elementId);
  }

  /**
   * Limpar warning de DPI
   */
  function clearDpiWarning(elementId: string): void {
    dpiWarnings.value.delete(elementId);
  }

  /**
   * Calcular lombada
   * Usa gramatura do papel configurado ou padrão de 800g
   */
  async function calculateSpineWidth(pageCount: number): Promise<number> {
    // Obter gramatura do papel (padrão 800g para papel fotográfico premium)
    let paperWeight = 800
    
    // Se conectado ao backend e tem papel configurado
    if (isConnectedToBackend.value && backendProductConfig.value) {
      const defaultPaper = backendProductConfig.value.papers.find(p => p.isDefault)
      const defaultCover = backendProductConfig.value.coverTypes.find(c => c.isDefault)

      if (defaultPaper) {
        paperWeight = defaultPaper.weight || 800
      }

      if (defaultPaper && defaultCover) {
        try {
          const result = await editorApi.calculateSpine(
            pageCount,
            defaultPaper.id,
            defaultCover.id
          )
          calculatedSpineWidth.value = result.spineWidth
          console.log(`📏 Lombada calculada (backend): ${result.spineWidth}mm - ${result.formula}`)
          return result.spineWidth
        } catch (e) {
          // Fallback local
          console.warn('Fallback para cálculo local de lombada')
        }
      }
    }

    // Cálculo local com gramatura
    const result = editorApi.calculateSpineLocal(pageCount, paperWeight)
    calculatedSpineWidth.value = result.spineWidth
    console.log(`📏 Lombada calculada (local): ${result.spineWidth}mm - ${result.formula}`)
    return result.spineWidth
  }

  /**
   * Criar versão de backup
   */
  async function createBackupVersion(description?: string): Promise<number | null> {
    if (!isConnectedToBackend.value || !backendProjectId.value) {
      return null;
    }

    try {
      const result = await editorApi.createVersion(backendProjectId.value, description);
      console.log('✅ Versão de backup criada:', result.versionNumber);
      return result.versionNumber;
    } catch (error: any) {
      console.error('❌ Erro ao criar versão:', error);
      backendError.value = error.message;
      return null;
    }
  }

  /**
   * Listar versões do projeto
   */
  async function listProjectVersions() {
    if (!isConnectedToBackend.value || !backendProjectId.value) {
      return [];
    }

    try {
      return await editorApi.listVersions(backendProjectId.value);
    } catch (error) {
      console.error('Erro ao listar versões:', error);
      return [];
    }
  }

  /**
   * Restaurar versão anterior
   */
  async function restoreProjectVersion(versionNumber: number): Promise<EditorPage[] | null> {
    if (!isConnectedToBackend.value || !backendProjectId.value) {
      return null;
    }

    try {
      await editorApi.restoreVersion(backendProjectId.value, versionNumber);
      // Recarregar projeto
      const result = await editorApi.loadProject(backendProjectId.value);
      backendVersion.value = result.project.version;
      return result.pages as EditorPage[];
    } catch (error: any) {
      console.error('Erro ao restaurar versão:', error);
      backendError.value = error.message;
      return null;
    }
  }

  /**
   * Iniciar auto-save para backend
   */
  function startBackendAutoSave(
    getProjectName: () => string,
    getPages: () => EditorPage[],
    getSettings?: () => Record<string, any>
  ): void {
    if (backendAutoSaveTimer) {
      clearInterval(backendAutoSaveTimer);
    }

    backendAutoSaveTimer = window.setInterval(async () => {
      if (isConnectedToBackend.value && !isSavingToBackend.value) {
        console.log('🔄 Auto-save para backend...');
        await saveToBackend(getProjectName(), getPages(), getSettings?.());
      }
    }, BACKEND_AUTO_SAVE_INTERVAL);
  }

  /**
   * Parar auto-save
   */
  function stopBackendAutoSave(): void {
    if (backendAutoSaveTimer) {
      clearInterval(backendAutoSaveTimer);
      backendAutoSaveTimer = null;
    }
  }

  // Cleanup
  onUnmounted(() => {
    stopBackendAutoSave();
  });

  return {
    // Estado
    backendProjectId,
    backendVersion,
    isConnectedToBackend,
    isSavingToBackend,
    isUploadingToBackend,
    backendError,
    lastBackendSave,
    backendProductConfig,
    calculatedSpineWidth,
    dpiWarnings,

    // Métodos
    initBackendConnection,
    saveToBackend,
    uploadPhotoToBackend,
    uploadPhotoLocal,
    uploadPhotosToBackend,
    validateImageDpi,
    getDpiWarning,
    clearDpiWarning,
    calculateSpineWidth,
    createBackupVersion,
    listProjectVersions,
    restoreProjectVersion,
    startBackendAutoSave,
    stopBackendAutoSave,
  };
}
