/**
 * Composable para integração do Editor com o Backend
 * Gerencia salvamento, upload e validação
 */

import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as editorApi from '../services/editorApi';
import type { Page, PageElement, Project, DpiValidationResult, UploadResult } from '../services/editorApi';

export interface Photo {
  id: string;
  src: string;
  assetId?: string;
  width?: number;
  height?: number;
  filename?: string;
}

export function useEditorBackend() {
  const route = useRoute();
  const router = useRouter();

  // Estado
  const projectId = ref<string | null>(null);
  const project = ref<Project | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isUploading = ref(false);
  const error = ref<string | null>(null);
  const lastSaveTime = ref<Date | null>(null);
  const hasUnsavedChanges = ref(false);
  const uploadProgress = ref({ current: 0, total: 0 });

  // Configurações do produto
  const productConfig = ref<editorApi.ProductConfig | null>(null);
  const spineWidth = ref(5); // mm

  // Validações de DPI
  const dpiWarnings = ref<Map<string, DpiValidationResult>>(new Map());

  // Computed
  const isOnline = computed(() => editorApi.isAuthenticated());
  const canSaveToServer = computed(() => isOnline.value && projectId.value !== null);

  /**
   * Inicializar editor com projeto existente ou novo
   */
  async function initializeEditor(id?: string): Promise<{ pages: Page[] } | null> {
    isLoading.value = true;
    error.value = null;

    try {
      if (id) {
        // Carregar projeto existente
        projectId.value = id;
        const result = await editorApi.loadProject(id);
        project.value = result.project;
        
        // Carregar configurações do produto se disponível
        if (result.project.product?.id) {
          await loadProductConfig(result.project.product.id);
        }

        // Atualizar lombada
        spineWidth.value = result.project.spineWidth || 5;

        return { pages: result.pages };
      } else {
        // Verificar se há configuração de produto no localStorage
        const savedConfig = localStorage.getItem('editor-product-config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          if (config.productId) {
            await loadProductConfig(config.productId);
          }
        }
        return null;
      }
    } catch (err: any) {
      error.value = err.message || 'Erro ao carregar projeto';
      console.error('Erro ao inicializar editor:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Carregar configurações do produto
   */
  async function loadProductConfig(productId: string): Promise<void> {
    try {
      productConfig.value = await editorApi.getProductConfig(productId);
    } catch (err) {
      console.warn('Não foi possível carregar configurações do produto:', err);
    }
  }

  /**
   * Salvar projeto no servidor
   */
  async function saveToServer(
    name: string,
    pages: Page[],
    settings?: Record<string, any>
  ): Promise<boolean> {
    if (!canSaveToServer.value) {
      // Salvar localmente se não puder salvar no servidor
      saveToLocalStorage(name, pages, settings);
      return true;
    }

    isSaving.value = true;
    error.value = null;

    try {
      const result = await editorApi.saveProject(
        projectId.value!,
        name,
        pages,
        project.value?.version,
        settings
      );

      // Atualizar estado
      if (project.value) {
        project.value.version = result.version;
      }
      lastSaveTime.value = new Date(result.savedAt);
      hasUnsavedChanges.value = false;

      // Atualizar lombada se retornada
      if (result.spineWidth) {
        spineWidth.value = result.spineWidth;
      }

      return true;
    } catch (err: any) {
      error.value = err.message || 'Erro ao salvar projeto';
      console.error('Erro ao salvar:', err);

      // Se for conflito de versão, tentar recarregar
      if (err.message?.includes('Conflito')) {
        error.value = 'Projeto foi modificado em outra sessão. Recarregue a página.';
      }

      return false;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Salvar no localStorage (fallback)
   */
  function saveToLocalStorage(name: string, pages: Page[], settings?: Record<string, any>): void {
    const data = {
      name,
      pages,
      settings,
      savedAt: new Date().toISOString(),
      projectId: projectId.value,
    };
    localStorage.setItem('album-project', JSON.stringify(data));
    lastSaveTime.value = new Date();
    hasUnsavedChanges.value = false;
  }

  /**
   * Carregar do localStorage
   */
  function loadFromLocalStorage(): { name: string; pages: Page[]; settings?: Record<string, any> } | null {
    const saved = localStorage.getItem('album-project');
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  /**
   * Upload de foto
   */
  async function uploadPhoto(file: File): Promise<Photo | null> {
    isUploading.value = true;
    error.value = null;

    try {
      // Obter dimensões antes do upload
      const dimensions = await editorApi.getImageDimensions(file);

      // Fazer upload
      const result = await editorApi.uploadPhoto(file, projectId.value || undefined);

      return {
        id: result.id,
        src: result.url,
        assetId: result.id,
        width: result.width || dimensions.width,
        height: result.height || dimensions.height,
        filename: result.filename,
      };
    } catch (err: any) {
      error.value = err.message || 'Erro ao fazer upload';
      console.error('Erro no upload:', err);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  /**
   * Upload de múltiplas fotos
   */
  async function uploadPhotos(files: File[]): Promise<Photo[]> {
    isUploading.value = true;
    uploadProgress.value = { current: 0, total: files.length };
    error.value = null;

    const photos: Photo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadProgress.value.current = i;

        try {
          const dimensions = await editorApi.getImageDimensions(file);
          const result = await editorApi.uploadPhoto(file, projectId.value || undefined);

          photos.push({
            id: result.id,
            src: result.url,
            assetId: result.id,
            width: result.width || dimensions.width,
            height: result.height || dimensions.height,
            filename: result.filename,
          });
        } catch (err) {
          console.error(`Erro ao fazer upload de ${file.name}:`, err);
          // Continua com os outros arquivos
        }
      }

      uploadProgress.value.current = files.length;
      return photos;
    } finally {
      isUploading.value = false;
    }
  }

  /**
   * Upload de foto local (base64) - fallback quando offline
   */
  async function uploadPhotoLocal(file: File): Promise<Photo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const src = e.target?.result as string;
        const dimensions = await editorApi.getImageDimensions(file);

        resolve({
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          src,
          width: dimensions.width,
          height: dimensions.height,
          filename: file.name,
        });
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validar DPI de um elemento de imagem
   */
  function validateElementDpi(
    element: PageElement,
    imageWidth: number,
    imageHeight: number,
    pageWidthMm: number = 200,
    pageHeightMm: number = 200
  ): DpiValidationResult {
    // Converter posição do elemento de pixels para mm
    // Assumindo que a página tem 420px de largura = pageWidthMm
    const pixelToMm = pageWidthMm / 420;
    const elementWidthMm = element.width * pixelToMm;
    const elementHeightMm = element.height * pixelToMm;

    const result = editorApi.validateDpiLocal(
      imageWidth,
      imageHeight,
      elementWidthMm,
      elementHeightMm
    );

    // Armazenar warning
    dpiWarnings.value.set(element.id, result);

    return result;
  }

  /**
   * Calcular lombada
   */
  async function calculateSpine(pageCount: number): Promise<number> {
    try {
      // Se tiver configuração do produto, usar papel e capa
      if (project.value?.paper?.id && project.value?.coverType?.id) {
        const result = await editorApi.calculateSpine(
          pageCount,
          project.value.paper.id,
          project.value.coverType.id
        );
        spineWidth.value = result.spineWidth;
        return result.spineWidth;
      }

      // Usar valores padrão
      const result = editorApi.calculateSpineLocal(pageCount);
      spineWidth.value = result.spineWidth;
      return result.spineWidth;
    } catch (err) {
      // Fallback local
      const result = editorApi.calculateSpineLocal(pageCount);
      spineWidth.value = result.spineWidth;
      return result.spineWidth;
    }
  }

  /**
   * Criar versão de backup
   */
  async function createBackupVersion(description?: string): Promise<number | null> {
    if (!projectId.value) return null;

    try {
      const result = await editorApi.createVersion(projectId.value, description);
      return result.versionNumber;
    } catch (err: any) {
      error.value = err.message || 'Erro ao criar versão';
      return null;
    }
  }

  /**
   * Listar versões
   */
  async function listVersions() {
    if (!projectId.value) return [];

    try {
      return await editorApi.listVersions(projectId.value);
    } catch (err) {
      console.error('Erro ao listar versões:', err);
      return [];
    }
  }

  /**
   * Restaurar versão
   */
  async function restoreVersion(versionNumber: number): Promise<Page[] | null> {
    if (!projectId.value) return null;

    try {
      const result = await editorApi.restoreVersion(projectId.value, versionNumber);
      // Recarregar projeto
      const loaded = await editorApi.loadProject(projectId.value);
      return loaded.pages;
    } catch (err: any) {
      error.value = err.message || 'Erro ao restaurar versão';
      return null;
    }
  }

  /**
   * Criar novo projeto
   */
  async function createNewProject(data: {
    name: string;
    productId?: string;
    formatId?: string;
    paperId?: string;
    coverTypeId?: string;
    pageCount?: number;
  }): Promise<string | null> {
    try {
      const newProject = await editorApi.createProject(data);
      projectId.value = newProject.id;
      project.value = newProject as Project;
      return newProject.id;
    } catch (err: any) {
      error.value = err.message || 'Erro ao criar projeto';
      return null;
    }
  }

  /**
   * Marcar como tendo alterações não salvas
   */
  function markAsChanged(): void {
    hasUnsavedChanges.value = true;
  }

  /**
   * Limpar warnings de DPI
   */
  function clearDpiWarnings(): void {
    dpiWarnings.value.clear();
  }

  /**
   * Obter warning de DPI para um elemento
   */
  function getDpiWarning(elementId: string): DpiValidationResult | undefined {
    return dpiWarnings.value.get(elementId);
  }

  return {
    // Estado
    projectId,
    project,
    isLoading,
    isSaving,
    isUploading,
    error,
    lastSaveTime,
    hasUnsavedChanges,
    uploadProgress,
    productConfig,
    spineWidth,
    dpiWarnings,

    // Computed
    isOnline,
    canSaveToServer,

    // Métodos
    initializeEditor,
    loadProductConfig,
    saveToServer,
    saveToLocalStorage,
    loadFromLocalStorage,
    uploadPhoto,
    uploadPhotos,
    uploadPhotoLocal,
    validateElementDpi,
    calculateSpine,
    createBackupVersion,
    listVersions,
    restoreVersion,
    createNewProject,
    markAsChanged,
    clearDpiWarnings,
    getDpiWarning,
  };
}
