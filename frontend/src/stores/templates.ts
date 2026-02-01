import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'background' | 'calendar';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  required?: boolean;
  fontSize?: number;
  fontFamily?: string;
  properties?: Record<string, any>;
}

interface Template {
  id: string;
  name: string;
  productType: string;
  templateType: string;
  category: string;
  preview: string;
  thumbnail: string;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    spine?: number;
    center?: number;
  };
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  spine?: {
    width: number;
    minPages: number;
    maxPages: number;
  };
  elements: TemplateElement[];
  colors: string[];
  fonts: string[];
  tags: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface TemplateFilters {
  category?: string;
  productType?: string;
  templateType?: string;
  search?: string;
  tags?: string[];
}

export const useTemplatesStore = defineStore('templates', () => {
  // Estado
  const templates = ref<Template[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<TemplateFilters>({});
  const currentTemplate = ref<Template | null>(null);

  // Computed
  const filteredTemplates = computed(() => {
    let result = templates.value;

    if (filters.value.category) {
      result = result.filter(t => t.category === filters.value.category);
    }

    if (filters.value.productType) {
      result = result.filter(t => t.productType === filters.value.productType);
    }

    if (filters.value.templateType) {
      result = result.filter(t => t.templateType === filters.value.templateType);
    }

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.tags.some((tag: string) => tag.toLowerCase().includes(search))
      );
    }

    if (filters.value.tags && filters.value.tags.length > 0) {
      result = result.filter(t => 
        filters.value.tags!.some(tag => t.tags.includes(tag))
      );
    }

    return result;
  });

  const categories = computed(() => {
    const cats = new Set(templates.value.map(t => t.category));
    return Array.from(cats);
  });

  const productTypes = computed(() => {
    const types = new Set(templates.value.map(t => t.productType));
    return Array.from(types);
  });

  const templateTypes = computed(() => {
    const types = new Set(templates.value.map(t => t.templateType));
    return Array.from(types);
  });

  const totalTemplates = computed(() => templates.value.length);

  // Actions
  const fetchTemplates = async (queryParams?: Record<string, string>): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams(queryParams);
      const url = `/api/templates?${params.toString()}`;
      console.log('Fazendo requisição para:', url);
      
      const response = await fetch(url);
      console.log('Resposta da API:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      templates.value = data.templates || [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar templates:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const getTemplate = async (id: string): Promise<Template | null> => {
    try {
      const response = await fetch(`/api/templates/${id}`);
      
      if (!response.ok) {
        throw new Error('Template não encontrado');
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao buscar template';
      return null;
    }
  };

  const createTemplate = async (templateData: Partial<Template>): Promise<Template> => {
    console.log('🏪 Store: Criando template...', templateData);
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(templateData),
      });

      console.log('📡 Store: Resposta da API:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Store: Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao criar template');
      }

      const newTemplate = await response.json();
      console.log('✅ Store: Template criado:', newTemplate);
      
      templates.value.push(newTemplate);

      return newTemplate;
    } catch (err) {
      console.error('❌ Store: Erro ao criar template:', err);
      error.value = err instanceof Error ? err.message : 'Erro ao criar template';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<Template>): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar template');
      }

      const updatedTemplate = await response.json();
      const index = templates.value.findIndex(t => t.id === id);
      
      if (index > -1) {
        templates.value[index] = updatedTemplate;
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar template';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar template');
      }

      templates.value = templates.value.filter(t => t.id !== id);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao deletar template';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const duplicateTemplate = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/templates/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao duplicar template');
      }

      const duplicatedTemplate = await response.json();
      templates.value.push(duplicatedTemplate);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao duplicar template';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const setCurrentTemplate = (template: Template | null): void => {
    currentTemplate.value = template;
  };

  const setFilters = (newFilters: TemplateFilters): void => {
    filters.value = { ...filters.value, ...newFilters };
  };

  const clearFilters = (): void => {
    filters.value = {};
  };

  const clearError = (): void => {
    error.value = null;
  };

  return {
    // Estado
    templates,
    isLoading,
    error,
    filters,
    currentTemplate,

    // Computed
    filteredTemplates,
    categories,
    productTypes,
    templateTypes,
    totalTemplates,

    // Actions
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setCurrentTemplate,
    setFilters,
    clearFilters,
    clearError,
  };
});