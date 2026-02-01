import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  dimensions?: {
    width: number;
    height: number;
    pages?: number;
  };
  specifications?: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  variants: ProductVariant[];
  images: string[];
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductFilters {
  category?: string;
  priceRange?: [number, number];
  isActive?: boolean;
  search?: string;
}

export const useProductsStore = defineStore('products', () => {
  // Estado
  const products = ref<Product[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<ProductFilters>({});

  // Computed
  const filteredProducts = computed(() => {
    let result = products.value;

    if (filters.value.category) {
      result = result.filter(p => p.category === filters.value.category);
    }

    if (filters.value.isActive !== undefined) {
      result = result.filter(p => p.isActive === filters.value.isActive);
    }

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    if (filters.value.priceRange) {
      const [min, max] = filters.value.priceRange;
      result = result.filter(p => p.basePrice >= min && p.basePrice <= max);
    }

    return result;
  });

  const categories = computed(() => {
    const cats = new Set(products.value.map(p => p.category));
    return Array.from(cats);
  });

  const activeProducts = computed(() => products.value.filter(p => p.isActive));
  const totalProducts = computed(() => products.value.length);

  // Actions
  const fetchProducts = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/products');
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();
      // API pode retornar array diretamente ou objeto com products
      const productsList = Array.isArray(data) ? data : (data.products || data.data || []);
      products.value = productsList.map((p: any) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      }));
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar produtos:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const getProduct = (id: string): Product | undefined => {
    return products.value.find(p => p.id === id);
  };

  const createProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar produto');
      }

      const newProduct = await response.json();
      const product: Product = {
        ...newProduct,
        createdAt: new Date(newProduct.createdAt),
        updatedAt: new Date(newProduct.updatedAt),
      };

      products.value.push(product);
      return product;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao criar produto';
      console.error('Erro ao criar produto:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar produto');
      }

      const updatedProduct = await response.json();
      const index = products.value.findIndex(p => p.id === id);
      
      if (index > -1) {
        products.value[index] = {
          ...updatedProduct,
          createdAt: new Date(updatedProduct.createdAt),
          updatedAt: new Date(updatedProduct.updatedAt),
        };
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao atualizar produto';
      console.error('Erro ao atualizar produto:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir produto');
      }

      const index = products.value.findIndex(p => p.id === id);
      if (index > -1) {
        products.value.splice(index, 1);
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao excluir produto';
      console.error('Erro ao excluir produto:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const toggleProductStatus = async (id: string): Promise<boolean> => {
    const product = getProduct(id);
    if (!product) return false;

    return await updateProduct(id, { isActive: !product.isActive });
  };

  const addVariant = async (productId: string, variant: Omit<ProductVariant, 'id'>): Promise<boolean> => {
    const product = getProduct(productId);
    if (!product) return false;

    const newVariant: ProductVariant = {
      ...variant,
      id: generateVariantId(),
    };

    const updatedVariants = [...product.variants, newVariant];
    return await updateProduct(productId, { variants: updatedVariants });
  };

  const updateVariant = async (productId: string, variantId: string, variantData: Partial<ProductVariant>): Promise<boolean> => {
    const product = getProduct(productId);
    if (!product) return false;

    const updatedVariants = product.variants.map(v => 
      v.id === variantId ? { ...v, ...variantData } : v
    );

    return await updateProduct(productId, { variants: updatedVariants });
  };

  const removeVariant = async (productId: string, variantId: string): Promise<boolean> => {
    const product = getProduct(productId);
    if (!product) return false;

    const updatedVariants = product.variants.filter(v => v.id !== variantId);
    return await updateProduct(productId, { variants: updatedVariants });
  };

  const setFilters = (newFilters: ProductFilters): void => {
    filters.value = { ...filters.value, ...newFilters };
  };

  const clearFilters = (): void => {
    filters.value = {};
  };

  const clearError = (): void => {
    error.value = null;
  };

  // Utilitários
  const generateVariantId = (): string => {
    return `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Inicializar dados mock se necessário
  const initializeMockData = (): void => {
    if (products.value.length === 0) {
      products.value = [
        {
          id: '1',
          name: 'Fotolivro A4',
          description: 'Fotolivro personalizado formato A4 com acabamento premium',
          category: 'fotolivros',
          basePrice: 49.90,
          variants: [
            {
              id: '1-1',
              name: '20 páginas',
              price: 49.90,
              dimensions: { width: 210, height: 297, pages: 20 },
            },
            {
              id: '1-2',
              name: '40 páginas',
              price: 79.90,
              dimensions: { width: 210, height: 297, pages: 40 },
            },
          ],
          images: ['/images/fotolivro-a4.jpg'],
          features: ['Papel fotográfico', 'Capa dura', 'Acabamento premium'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Calendário 2024',
          description: 'Calendário personalizado de mesa ou parede',
          category: 'calendarios',
          basePrice: 29.90,
          variants: [
            {
              id: '2-1',
              name: 'Mesa',
              price: 29.90,
              dimensions: { width: 150, height: 210 },
            },
            {
              id: '2-2',
              name: 'Parede',
              price: 39.90,
              dimensions: { width: 210, height: 297 },
            },
          ],
          images: ['/images/calendario-2024.jpg'],
          features: ['12 meses', 'Papel couché', 'Espiral duplo'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
  };

  return {
    // Estado
    products,
    isLoading,
    error,
    filters,

    // Computed
    filteredProducts,
    categories,
    activeProducts,
    totalProducts,

    // Actions
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    addVariant,
    updateVariant,
    removeVariant,
    setFilters,
    clearFilters,
    clearError,
    initializeMockData,
  };
});