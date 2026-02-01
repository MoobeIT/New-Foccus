/**
 * API Service para o Editor de Álbuns
 * Integração com backend para salvar projetos, upload de fotos e validação
 */

const API_BASE = '/api/v1';

// Tipos
export interface PageElement {
  id: string;
  type: 'image' | 'text' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  assetId?: string;
  content?: string;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  filter?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadow?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  color?: string;
  cropX?: number;
  cropY?: number;
  cropScale?: number;
}

export interface Page {
  id: string;
  type: 'cover-front' | 'cover-back' | 'page';
  elements: PageElement[];
  background?: string;
}

export interface Project {
  id: string;
  name: string;
  version: number;
  status: string;
  pageCount: number;
  spineWidth: number;
  width: number;
  height: number;
  bleed: number;
  safeMargin: number;
  product?: any;
  format?: any;
  paper?: any;
  coverType?: any;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SaveResult {
  projectId: string;
  version: number;
  savedAt: string;
  pageCount: number;
  spineWidth?: number;
}

export interface DpiValidationResult {
  dpi: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'low' | 'very_low';
  message: string;
  canPrint: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  storageKey: string;
  filename: string;
  width: number;
  height: number;
  size: number;
}

export interface SpineResult {
  spineWidth: number;
  formula: string;
}

export interface ProductConfig {
  product: {
    id: string;
    name: string;
    type: string;
    minPages: number;
    maxPages: number;
    pageIncrement: number;
    basePagesIncluded: number;
  };
  formats: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    orientation: string;
    bleed: number;
    safeMargin: number;
    gutterMargin: number;
  }>;
  papers: Array<{
    id: string;
    name: string;
    type: string;
    weight: number;
    thickness: number;
    finish: string;
    isDefault: boolean;
    priceAdjustment: number;
  }>;
  coverTypes: Array<{
    id: string;
    name: string;
    type: string;
    material: string;
    bindingTolerance: number;
    isDefault: boolean;
    priceAdjustment: number;
  }>;
}

// Helper para obter token
function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Helper para fazer requisições autenticadas
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Não adicionar Content-Type para FormData (o browser faz automaticamente)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response;
}

// ==========================================
// PROJETO
// ==========================================

/**
 * Carregar projeto completo do servidor
 */
export async function loadProject(projectId: string): Promise<{ project: Project; pages: Page[] }> {
  const response = await fetchWithAuth(`/editor/project/${projectId}`);
  return response.json();
}

/**
 * Salvar páginas do projeto no servidor
 */
export async function saveProject(
  projectId: string,
  name: string,
  pages: Page[],
  version?: number,
  settings?: Record<string, any>
): Promise<SaveResult> {
  const response = await fetchWithAuth(`/editor/project/${projectId}/save`, {
    method: 'POST',
    body: JSON.stringify({ name, pages, version, settings }),
  });
  return response.json();
}

/**
 * Criar versão de backup
 */
export async function createVersion(projectId: string, description?: string): Promise<{ versionNumber: number }> {
  const response = await fetchWithAuth(`/editor/project/${projectId}/version`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
  return response.json();
}

/**
 * Listar versões do projeto
 */
export async function listVersions(projectId: string): Promise<Array<{
  versionNumber: number;
  changesSummary: string;
  createdAt: string;
  isProduction: boolean;
}>> {
  const response = await fetchWithAuth(`/editor/project/${projectId}/versions`);
  return response.json();
}

/**
 * Restaurar versão anterior
 */
export async function restoreVersion(projectId: string, versionNumber: number): Promise<SaveResult> {
  const response = await fetchWithAuth(`/editor/project/${projectId}/restore/${versionNumber}`, {
    method: 'POST',
  });
  return response.json();
}

/**
 * Criar novo projeto
 */
export async function createProject(data: {
  name: string;
  productId?: string;
  formatId?: string;
  paperId?: string;
  coverTypeId?: string;
  pageCount?: number;
}): Promise<Project> {
  const response = await fetchWithAuth('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Listar projetos do usuário
 */
export async function listProjects(filters?: {
  status?: string;
  productId?: string;
  search?: string;
}): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.productId) params.append('productId', filters.productId);
  if (filters?.search) params.append('search', filters.search);
  
  const query = params.toString();
  const response = await fetchWithAuth(`/projects${query ? `?${query}` : ''}`);
  return response.json();
}

// ==========================================
// UPLOAD DE FOTOS
// ==========================================

/**
 * Upload de foto para o editor
 */
export async function uploadPhoto(file: File, projectId?: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }
  
  const response = await fetchWithAuth('/editor/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

/**
 * Upload de múltiplas fotos
 */
export async function uploadPhotos(files: File[], projectId?: string, onProgress?: (uploaded: number, total: number) => void): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadPhoto(files[i], projectId);
      results.push(result);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`Erro ao fazer upload de ${files[i].name}:`, error);
      // Continua com os outros arquivos
    }
  }
  
  return results;
}

// ==========================================
// VALIDAÇÃO DE QUALIDADE
// ==========================================

/**
 * Validar DPI de uma imagem
 */
export async function validateDpi(
  imageWidth: number,
  imageHeight: number,
  elementWidth: number,
  elementHeight: number
): Promise<DpiValidationResult> {
  const response = await fetchWithAuth('/editor/validate-dpi', {
    method: 'POST',
    body: JSON.stringify({ imageWidth, imageHeight, elementWidth, elementHeight }),
  });
  return response.json();
}

/**
 * Validar DPI localmente (sem chamada ao servidor)
 */
export function validateDpiLocal(
  imageWidth: number,
  imageHeight: number,
  elementWidthMm: number,
  elementHeightMm: number
): DpiValidationResult {
  // Converter mm para polegadas
  const elementWidthInches = elementWidthMm / 25.4;
  const elementHeightInches = elementHeightMm / 25.4;
  
  // Calcular DPI
  const dpiWidth = imageWidth / elementWidthInches;
  const dpiHeight = imageHeight / elementHeightInches;
  const dpi = Math.round(Math.min(dpiWidth, dpiHeight));
  
  // Classificar
  let quality: DpiValidationResult['quality'];
  let message: string;
  let canPrint: boolean;
  
  if (dpi >= 300) {
    quality = 'excellent';
    message = `Excelente qualidade (${dpi} DPI)`;
    canPrint = true;
  } else if (dpi >= 250) {
    quality = 'good';
    message = `Boa qualidade (${dpi} DPI)`;
    canPrint = true;
  } else if (dpi >= 150) {
    quality = 'acceptable';
    message = `Qualidade aceitável (${dpi} DPI)`;
    canPrint = true;
  } else if (dpi >= 100) {
    quality = 'low';
    message = `Baixa qualidade (${dpi} DPI) - pode ficar pixelado`;
    canPrint = true;
  } else {
    quality = 'very_low';
    message = `Qualidade muito baixa (${dpi} DPI) - não recomendado`;
    canPrint = false;
  }
  
  return { dpi, quality, message, canPrint };
}

// ==========================================
// CÁLCULO DE LOMBADA
// ==========================================

/**
 * Calcular largura da lombada
 */
export async function calculateSpine(
  pageCount: number,
  paperId?: string,
  coverTypeId?: string,
  paperThickness?: number,
  bindingTolerance?: number
): Promise<SpineResult> {
  const response = await fetchWithAuth('/editor/calculate-spine', {
    method: 'POST',
    body: JSON.stringify({ pageCount, paperId, coverTypeId, paperThickness, bindingTolerance }),
  });
  return response.json();
}

/**
 * Calcular lombada localmente (sem chamada ao servidor)
 * 
 * Fórmula: (número de folhas × espessura do papel) + tolerância de encadernação
 * 
 * Para papel 800g/m²: espessura aproximada de 0.95mm por folha
 * Para papel 300g/m²: espessura aproximada de 0.35mm por folha
 * Para papel 150g/m²: espessura aproximada de 0.18mm por folha
 * 
 * Nota: cada página do álbum = 1 folha (frente e verso)
 * Páginas do miolo = total de páginas - 2 (capas)
 */
export function calculateSpineLocal(
  pageCount: number,
  paperWeight: number = 800, // gramatura em g/m²
  bindingTolerance: number = 2 // tolerância de encadernação em mm
): SpineResult {
  // Calcular espessura do papel baseado na gramatura
  // Fórmula aproximada: espessura (mm) = gramatura / 850
  // Papel 800g ≈ 0.94mm, Papel 300g ≈ 0.35mm
  const paperThickness = paperWeight / 850
  
  // Número de folhas do miolo (cada spread = 1 folha)
  // pageCount aqui é o número de páginas do miolo (sem as capas)
  const sheets = Math.ceil(pageCount / 2)
  
  // Cálculo da lombada
  const rawSpine = (sheets * paperThickness) + bindingTolerance
  
  // Arredondar para 0.5mm (mínimo 5mm para encadernação)
  const spineWidth = Math.max(5, Math.round(rawSpine * 2) / 2)
  
  return {
    spineWidth,
    formula: `(${sheets} folhas × ${paperThickness.toFixed(2)}mm) + ${bindingTolerance}mm = ${spineWidth}mm`,
  };
}

/**
 * Obter presets de lombada
 */
export async function getSpinePresets(): Promise<{
  papers: Array<{ id: string; name: string; thickness: number; weight: number }>;
  coverTypes: Array<{ id: string; name: string; bindingTolerance: number; type: string }>;
  examples: Array<{
    paper: string;
    paperId: string;
    cover: string;
    coverTypeId: string;
    spines: { '20_pages': number; '40_pages': number; '60_pages': number };
  }>;
}> {
  const response = await fetchWithAuth('/editor/spine-presets');
  return response.json();
}

// ==========================================
// CONFIGURAÇÕES DO PRODUTO
// ==========================================

/**
 * Obter configurações do produto para o editor
 */
export async function getProductConfig(productId: string): Promise<ProductConfig> {
  const response = await fetchWithAuth(`/editor/product-config/${productId}`);
  return response.json();
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Verificar se usuário está autenticado
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Obter dimensões de uma imagem a partir de um File
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Não foi possível carregar a imagem'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Obter dimensões de uma imagem a partir de uma URL
 */
export function getImageDimensionsFromUrl(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Não foi possível carregar a imagem'));
    };
    img.src = url;
  });
}
