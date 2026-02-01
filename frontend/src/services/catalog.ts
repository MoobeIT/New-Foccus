// Catalog Service - Public product catalog API

export interface ProductFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  orientation: string;
  minPages: number;
  maxPages: number;
  pageIncrement: number;
  basePrice: number;
  pricePerExtraPage: number;
  priceMultiplier: number;
}

export interface ProductPaper {
  id: string;
  name: string;
  type: string;
  finish: string;
  weight?: number;
  description?: string;
  pricePerPage: number;
  priceAdjustment?: number;
  isDefault?: boolean;
}

export interface ProductCoverType {
  id: string;
  name: string;
  type: string;
  material?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  priceAdjustment?: number;
  isDefault?: boolean;
}

export interface ProductSpec {
  icon: string;
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  shortDescription?: string;
  basePrice: number;
  basePagesIncluded?: number;
  pricePerExtraPage?: number;
  pricePerExtraSpread?: number;
  minPages?: number;
  maxPages?: number;
  pageIncrement?: number;
  category: string;
  badge?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  galleryImages?: string[];
  features: string[];
  specs: ProductSpec[];
  hasCase?: boolean;
  casePrice?: number;
  caseDescription?: string;
  formats: ProductFormat[];
  papers: ProductPaper[];
  coverTypes: ProductCoverType[];
}

class CatalogService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '';
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // API retorna { success, data } ou diretamente os dados
      return result?.data || result;
    } catch (error) {
      console.error('Catalog API error:', error);
      throw error;
    }
  }

  // Buscar produto por slug
  async getProductBySlug(slug: string): Promise<Product> {
    try {
      return await this.request<Product>(`/api/v1/public/catalog/products/${slug}`);
    } catch (error) {
      console.warn('Produto não encontrado no backend, usando dados locais');
      return this.getLocalProduct(slug);
    }
  }

  // Listar todos os produtos
  async getProducts(type?: string): Promise<Product[]> {
    const query = type ? `?type=${type}` : '';
    try {
      return await this.request<Product[]>(`/api/v1/public/catalog/products${query}`);
    } catch (error) {
      console.warn('Erro ao buscar produtos, usando dados locais');
      return this.getLocalProducts();
    }
  }

  // Listar formatos disponíveis
  async getFormats(productId?: string): Promise<ProductFormat[]> {
    const query = productId ? `?productId=${productId}` : '';
    return this.request<ProductFormat[]>(`/api/v1/public/catalog/formats${query}`);
  }

  // Listar papéis disponíveis
  async getPapers(): Promise<ProductPaper[]> {
    return this.request<ProductPaper[]>(`/api/v1/public/catalog/papers`);
  }

  // Listar tipos de capa
  async getCoverTypes(): Promise<ProductCoverType[]> {
    return this.request<ProductCoverType[]>(`/api/v1/public/catalog/cover-types`);
  }

  // Dados locais de fallback
  private getLocalProduct(slug: string): Product {
    const products = this.getLocalProducts();
    return products.find(p => p.slug === slug) || products[0];
  }

  private getLocalProducts(): Product[] {
    return [
      {
        id: 'local-album-casamento',
        name: 'Álbum Casamento',
        slug: 'album-casamento',
        type: 'photobook',
        category: 'casamento',
        badge: 'Mais Vendido',
        description: 'O álbum perfeito para eternizar o dia mais especial. Capa dura premium, papel fotográfico 800g e acabamento impecável.',
        shortDescription: 'Capa dura, papel fotográfico 800g, acabamento premium',
        basePrice: 299,
        minPages: 20,
        maxPages: 60,
        pageIncrement: 2,
        basePagesIncluded: 20,
        pricePerExtraSpread: 15,
        imageUrl: '/images/album-casamento.jpg',
        galleryImages: ['/images/album-casamento.jpg', '/images/album-casamento-2.jpg'],
        hasCase: true,
        casePrice: 89,
        caseDescription: 'Estojo em madeira maciça com acabamento aveludado',
        features: [
          'Capa dura com acabamento premium e laminação',
          'Papel fotográfico 800g de alta gramatura',
          'Impressão em alta definição com cores vibrantes',
          'Encadernação layflat - abertura 180° perfeita',
          'Caixa protetora de luxo inclusa',
          'Personalização completa de cores e materiais',
        ],
        specs: [
          { icon: '📐', label: 'Tamanhos', value: '20x20, 25x25, 30x30, 35x25 cm' },
          { icon: '📄', label: 'Páginas', value: '20 a 60 páginas' },
          { icon: '🎨', label: 'Papel', value: 'Fotográfico 800g fosco ou brilho' },
          { icon: '📚', label: 'Encadernação', value: 'Layflat (abertura 180°)' },
          { icon: '✨', label: 'Acabamento', value: 'Laminação fosca ou brilho' },
          { icon: '📦', label: 'Embalagem', value: 'Caixa cartonada protetora' },
        ],
        formats: [
          { id: 'f1', name: '20x20', width: 200, height: 200, orientation: 'square', minPages: 20, maxPages: 60, pageIncrement: 2, basePrice: 299, pricePerExtraPage: 15, priceMultiplier: 1, isDefault: true },
          { id: 'f2', name: '25x25', width: 250, height: 250, orientation: 'square', minPages: 20, maxPages: 60, pageIncrement: 2, basePrice: 389, pricePerExtraPage: 18, priceMultiplier: 1.3 },
          { id: 'f3', name: '30x30', width: 300, height: 300, orientation: 'square', minPages: 20, maxPages: 60, pageIncrement: 2, basePrice: 479, pricePerExtraPage: 22, priceMultiplier: 1.6 },
          { id: 'f4', name: '35x25', width: 350, height: 250, orientation: 'landscape', minPages: 20, maxPages: 60, pageIncrement: 2, basePrice: 539, pricePerExtraPage: 25, priceMultiplier: 1.8 },
        ],
        papers: [
          { id: 'p1', name: 'Fotográfico Fosco 800g', type: 'photo', finish: 'matte', weight: 800, pricePerPage: 0, priceAdjustment: 0, isDefault: true },
          { id: 'p2', name: 'Fotográfico Brilho 800g', type: 'photo', finish: 'glossy', weight: 800, pricePerPage: 0, priceAdjustment: 5 },
          { id: 'p3', name: 'Fotográfico Premium 1000g', type: 'premium', finish: 'matte', weight: 1000, pricePerPage: 0, priceAdjustment: 25 },
        ],
        coverTypes: [
          { id: 'c1', name: 'Capa Dura', type: 'hard', price: 0, priceAdjustment: 0, isDefault: true },
          { id: 'c2', name: 'Couro Sintético', type: 'premium', price: 50, priceAdjustment: 0 },
          { id: 'c3', name: 'Tecido Linho', type: 'premium', price: 35, priceAdjustment: 0 },
        ],
      },
      {
        id: 'local-album-ensaio',
        name: 'Álbum Ensaio',
        slug: 'album-ensaio',
        type: 'photobook',
        category: 'ensaio',
        description: 'Formato quadrado ideal para books e ensaios fotográficos. Design moderno e elegante.',
        shortDescription: 'Formato quadrado, design moderno',
        basePrice: 199,
        minPages: 16,
        maxPages: 40,
        pageIncrement: 2,
        basePagesIncluded: 16,
        pricePerExtraSpread: 12,
        imageUrl: '/images/album-ensaio.jpg',
        galleryImages: ['/images/album-ensaio.jpg'],
        hasCase: false,
        casePrice: 0,
        features: [
          'Formato quadrado moderno e elegante',
          'Ideal para books, ensaios e 15 anos',
          'Papel fotográfico de alta qualidade',
          'Várias opções de capa personalizáveis',
        ],
        specs: [
          { icon: '📐', label: 'Tamanhos', value: '20x20, 25x25, 30x30 cm' },
          { icon: '📄', label: 'Páginas', value: '16 a 40 páginas' },
          { icon: '🎨', label: 'Papel', value: 'Fotográfico 200g' },
          { icon: '📚', label: 'Encadernação', value: 'Layflat ou wire-o' },
        ],
        formats: [
          { id: 'f1', name: '20x20', width: 200, height: 200, orientation: 'square', minPages: 16, maxPages: 40, pageIncrement: 2, basePrice: 199, pricePerExtraPage: 12, priceMultiplier: 1, isDefault: true },
          { id: 'f2', name: '25x25', width: 250, height: 250, orientation: 'square', minPages: 16, maxPages: 40, pageIncrement: 2, basePrice: 259, pricePerExtraPage: 14, priceMultiplier: 1.3 },
          { id: 'f3', name: '30x30', width: 300, height: 300, orientation: 'square', minPages: 16, maxPages: 40, pageIncrement: 2, basePrice: 319, pricePerExtraPage: 16, priceMultiplier: 1.6 },
        ],
        papers: [
          { id: 'p1', name: 'Fosco 200g', type: 'photo', finish: 'matte', weight: 200, pricePerPage: 0, priceAdjustment: 0, isDefault: true },
          { id: 'p2', name: 'Brilho 200g', type: 'photo', finish: 'glossy', weight: 200, pricePerPage: 0, priceAdjustment: 5 },
        ],
        coverTypes: [
          { id: 'c1', name: 'Capa Dura', type: 'hard', price: 0, priceAdjustment: 0, isDefault: true },
          { id: 'c2', name: 'Couro Sintético', type: 'premium', price: 50, priceAdjustment: 0 },
        ],
      },
      {
        id: 'local-fotolivro-familia',
        name: 'Fotolivro Família',
        slug: 'fotolivro-familia',
        type: 'photobook',
        category: 'familia',
        description: 'Perfeito para registrar momentos em família. Qualidade profissional com preço acessível.',
        shortDescription: 'Qualidade profissional, preço acessível',
        basePrice: 149,
        minPages: 20,
        maxPages: 80,
        pageIncrement: 4,
        basePagesIncluded: 20,
        pricePerExtraSpread: 8,
        imageUrl: '/images/fotolivro-familia.jpg',
        galleryImages: ['/images/fotolivro-familia.jpg'],
        hasCase: false,
        casePrice: 0,
        features: [
          'Ideal para álbuns de família',
          'Papel de alta qualidade',
          'Capa personalizável',
          'Entrega rápida',
        ],
        specs: [
          { icon: '📐', label: 'Tamanhos', value: 'A4, A5, 20x20 cm' },
          { icon: '📄', label: 'Páginas', value: '20 a 80 páginas' },
          { icon: '🎨', label: 'Papel', value: 'Couchê 170g' },
          { icon: '📚', label: 'Encadernação', value: 'Colado ou wire-o' },
        ],
        formats: [
          { id: 'f1', name: 'A5', width: 148, height: 210, orientation: 'portrait', minPages: 20, maxPages: 80, pageIncrement: 4, basePrice: 149, pricePerExtraPage: 8, priceMultiplier: 1, isDefault: true },
          { id: 'f2', name: 'A4', width: 210, height: 297, orientation: 'portrait', minPages: 20, maxPages: 80, pageIncrement: 4, basePrice: 199, pricePerExtraPage: 10, priceMultiplier: 1.3 },
          { id: 'f3', name: '20x20', width: 200, height: 200, orientation: 'square', minPages: 20, maxPages: 80, pageIncrement: 4, basePrice: 179, pricePerExtraPage: 9, priceMultiplier: 1.2 },
        ],
        papers: [
          { id: 'p1', name: 'Couchê Fosco 170g', type: 'couche', finish: 'matte', weight: 170, pricePerPage: 0, priceAdjustment: 0, isDefault: true },
          { id: 'p2', name: 'Couchê Brilho 170g', type: 'couche', finish: 'glossy', weight: 170, pricePerPage: 0, priceAdjustment: 0 },
        ],
        coverTypes: [
          { id: 'c1', name: 'Capa Flexível', type: 'soft', price: 0, priceAdjustment: 0, isDefault: true },
          { id: 'c2', name: 'Capa Dura', type: 'hard', price: 25, priceAdjustment: 0 },
        ],
      },
    ];
  }
}

// Export singleton instance
export const catalogService = new CatalogService();
