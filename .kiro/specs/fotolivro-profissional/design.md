# Design Document: Editor de Fotolivros Profissional

## Overview

Este documento descreve a arquitetura técnica e o design do sistema de Editor de Fotolivros Profissional. O sistema permite que fotógrafos criem fotolivros com qualidade gráfica profissional, oferecendo um fluxo completo desde a criação até a exportação para produção.

### Objetivos Principais
1. Editor de diagramação profissional com guias visuais e validações
2. Cálculo automático de lombada e dimensões
3. Validações pré-impressão (DPI, área segura, perfil de cor)
4. Exportação PDF profissional (PDF/X compatível)
5. Sistema de pedidos com fluxo de aprovação
6. Versionamento e bloqueio de projetos

## Architecture

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue 3 + TypeScript)            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Editor     │  │   Preview    │  │   Admin Dashboard    │  │
│  │   Canvas     │  │   Mode       │  │   (Products/Orders)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Pinia Stores (State Management)              │  │
│  │  projects | pages | elements | validation | orders        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Projects   │  │   Assets     │  │   Orders             │  │
│  │   Service    │  │   Service    │  │   Service            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   PDF        │  │   Preflight  │  │   Notification       │  │
│  │   Generator  │  │   Validator  │  │   Service            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │PostgreSQL│    │  MinIO   │    │  Redis   │
       │(Projects)│    │ (Assets) │    │ (Cache)  │
       └──────────┘    └──────────┘    └──────────┘
```


### Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Frontend | Vue 3 + TypeScript | Já em uso, reatividade eficiente |
| Canvas | Konva.js | Biblioteca 2D performática, já integrada |
| State | Pinia | Gerenciamento de estado modular |
| Backend | NestJS | Framework robusto, TypeScript nativo |
| Database | PostgreSQL | Dados relacionais, JSONB para flexibilidade |
| Storage | MinIO (S3) | Armazenamento de assets escalável |
| Cache | Redis | Cache de sessão e filas |
| PDF | pdf-lib + Puppeteer | Geração de PDF profissional |

## Components and Interfaces

### 1. Editor Canvas Component

```typescript
interface EditorCanvasProps {
  project: Project;
  currentPage: number;
  viewMode: 'single' | 'spread';
  zoom: number;
  showGuides: boolean;
  showBleed: boolean;
  showSafeArea: boolean;
}

interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  data: ImageData | TextData | ShapeData;
}

interface ImageData {
  assetId: string;
  src: string;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  effectiveDPI: number;
  colorProfile: string;
}

interface TextData {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
}
```

### 2. Project Service Interface

```typescript
interface IProjectService {
  create(data: CreateProjectDTO): Promise<Project>;
  findById(id: string): Promise<Project>;
  update(id: string, data: UpdateProjectDTO): Promise<Project>;
  duplicate(id: string): Promise<Project>;
  delete(id: string): Promise<void>;
  
  // Versioning
  createVersion(projectId: string): Promise<ProjectVersion>;
  getVersions(projectId: string): Promise<ProjectVersion[]>;
  restoreVersion(projectId: string, versionId: string): Promise<Project>;
  lockForProduction(projectId: string): Promise<Project>;
  
  // Pages
  addPage(projectId: string, position: number): Promise<Page>;
  removePage(projectId: string, pageId: string): Promise<void>;
  reorderPages(projectId: string, pageIds: string[]): Promise<void>;
  duplicatePage(projectId: string, pageId: string): Promise<Page>;
}
```

### 3. Preflight Validator Interface

```typescript
interface IPreflightValidator {
  validate(project: Project): Promise<PreflightReport>;
  validateImage(element: CanvasElement): Promise<ImageValidation>;
  validateSafeArea(element: CanvasElement, page: Page): Promise<SafeAreaValidation>;
  validateColorProfile(asset: Asset): Promise<ColorValidation>;
}

interface PreflightReport {
  status: 'pass' | 'warning' | 'fail';
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
  summary: {
    totalImages: number;
    lowDPIImages: number;
    safeAreaViolations: number;
    emptyPages: number;
    colorProfileIssues: number;
  };
}

interface PreflightIssue {
  type: 'dpi' | 'safe_area' | 'empty_page' | 'color_profile' | 'font' | 'overflow';
  severity: 'error' | 'warning';
  pageNumber: number;
  elementId?: string;
  message: string;
  details: Record<string, any>;
}
```

### 4. PDF Generator Interface

```typescript
interface IPDFGenerator {
  generateCover(project: Project, options: PDFOptions): Promise<Buffer>;
  generateInterior(project: Project, options: PDFOptions): Promise<Buffer>;
  generateProof(project: Project): Promise<Buffer>;
}

interface PDFOptions {
  includeBleed: boolean;
  bleedSize: number; // mm
  includeCropMarks: boolean;
  cropMarkOffset: number; // mm
  colorProfile: 'sRGB' | 'AdobeRGB' | 'CMYK';
  resolution: number; // DPI
  compression: 'none' | 'low' | 'medium' | 'high';
}
```


## Data Models

### Project Entity

```typescript
interface Project {
  id: string;
  userId: string;
  name: string;
  status: 'draft' | 'locked' | 'submitted' | 'completed';
  
  // Product Configuration
  productId: string;
  formatId: string;
  paperId: string;
  coverType: 'soft' | 'hard' | 'premium';
  
  // Calculated Values
  pageCount: number;
  spineWidth: number; // mm, calculated
  
  // Dimensions (from format)
  width: number; // mm
  height: number; // mm
  bleed: number; // mm
  safeMargin: number; // mm
  gutterMargin: number; // mm
  
  // Pages
  pages: Page[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lockedAt?: Date;
  lockedVersionId?: string;
}

interface Page {
  id: string;
  projectId: string;
  pageNumber: number;
  pageType: 'regular' | 'guard_front' | 'guard_back' | 'title' | 'dedication';
  templateId?: string;
  elements: CanvasElement[];
  backgroundColor: string;
}

interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  data: string; // JSON snapshot
  createdAt: Date;
  isProduction: boolean;
}
```

### Product Catalog Entities

```typescript
interface Product {
  id: string;
  name: string;
  type: 'photobook' | 'calendar' | 'card' | 'poster';
  description: string;
  isActive: boolean;
  formats: Format[];
  papers: Paper[];
  coverTypes: CoverType[];
  basePrice: number;
}

interface Format {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
  orientation: 'square' | 'portrait' | 'landscape';
  minPages: number;
  maxPages: number;
  pageIncrement: number; // must be multiple of this
  bleed: number; // mm
  safeMargin: number; // mm
  gutterMargin: number; // mm
  priceMultiplier: number;
}

interface Paper {
  id: string;
  name: string;
  type: 'photo' | 'coated' | 'matte' | 'recycled';
  weight: number; // g/m²
  thickness: number; // mm per sheet
  finish: 'glossy' | 'matte' | 'satin';
  lamination: 'none' | 'matte' | 'glossy' | 'soft_touch';
  pricePerPage: number;
  compatibleFormats: string[]; // format IDs
}

interface CoverType {
  id: string;
  name: string;
  type: 'soft' | 'hard' | 'premium';
  bindingTolerance: number; // mm added to spine
  price: number;
}
```

### Order Entity

```typescript
interface Order {
  id: string;
  projectId: string;
  userId: string;
  status: OrderStatus;
  
  // Snapshot at order time
  productSnapshot: {
    productName: string;
    formatName: string;
    paperName: string;
    coverType: string;
    pageCount: number;
    spineWidth: number;
  };
  
  // Pricing
  subtotal: number;
  discount: number;
  total: number;
  
  // Files
  coverPdfUrl: string;
  interiorPdfUrl: string;
  
  // Timeline
  createdAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  completedAt?: Date;
  
  // Review
  reviewerId?: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

type OrderStatus = 
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'in_production'
  | 'completed'
  | 'cancelled';
```

### Asset Entity

```typescript
interface Asset {
  id: string;
  userId: string;
  projectId: string;
  
  // File Info
  filename: string;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  
  // Image Properties
  width: number; // pixels
  height: number; // pixels
  dpi: number;
  colorProfile: string;
  hasAlpha: boolean;
  
  // Storage
  storageKey: string;
  url: string;
  thumbnails: {
    small: string; // 150px
    medium: string; // 300px
    large: string; // 600px
  };
  
  // Metadata
  exifData?: Record<string, any>;
  createdAt: Date;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Project Save/Load Round-Trip
*For any* valid project state, saving the project and then loading it should produce an equivalent project state with all pages, elements, and configurations preserved.
**Validates: Requirements 1.2, 1.3**

### Property 2: Project Duplication Independence
*For any* project, duplicating it should create a new project with a different ID but equivalent content, and modifications to the duplicate should not affect the original.
**Validates: Requirements 1.4**

### Property 3: Modification Timestamp Update
*For any* project modification (page add/remove, element change, configuration update), the project's updatedAt timestamp should be greater than or equal to the previous value.
**Validates: Requirements 1.5**

### Property 4: Paper Compatibility Filtering
*For any* format selection, the returned paper options should only include papers where the format ID is in the paper's compatibleFormats array.
**Validates: Requirements 2.2**

### Property 5: Page Count Even Number Invariant
*For any* page add or remove operation, the resulting page count should always be an even number within the format's min/max limits.
**Validates: Requirements 2.4, 5.1, 5.2**

### Property 6: Price Calculation Consistency
*For any* product configuration (format, paper, cover, pages, quantity), the calculated price should equal: (basePrice × formatMultiplier) + (pages × pricePerPage) + coverPrice - quantityDiscount.
**Validates: Requirements 2.5**

### Property 7: Spine Width Calculation Formula
*For any* page count and paper selection, the spine width should equal: (pageCount × paperThickness) + bindingTolerance, where bindingTolerance depends on cover type.
**Validates: Requirements 3.1, 3.2, 3.4**

### Property 8: Spine Width Precision
*For any* calculated spine width, the displayed value should be rounded to the nearest 0.5mm.
**Validates: Requirements 3.3**

### Property 9: Layer Ordering Consistency
*For any* sequence of layer operations (bring to front, send to back, move up, move down), the resulting z-index values should maintain a valid ordering where no two elements have the same z-index.
**Validates: Requirements 4.4**

### Property 10: Page Reorder Content Preservation
*For any* page reorder operation, the total number of pages and the content of each page should remain unchanged, only the page numbers should be reassigned.
**Validates: Requirements 5.3**

### Property 11: Page Duplication Equivalence
*For any* page duplication, the duplicated page should have a different ID but equivalent elements (same positions, sizes, and content).
**Validates: Requirements 5.4**

### Property 12: Gutter Warning Detection
*For any* element positioned in spread mode, if any part of the element falls within 10mm of the center gutter line, a warning should be generated.
**Validates: Requirements 6.2**

### Property 13: View Mode Position Invariant
*For any* toggle between single and spread view modes, element positions (x, y, width, height) should remain unchanged.
**Validates: Requirements 6.4**

### Property 14: Effective DPI Calculation
*For any* placed image, the effective DPI should equal: (originalPixels / printSizeInches), where printSizeInches = printSizeMM / 25.4.
**Validates: Requirements 7.5, 8.1**

### Property 15: DPI Warning Classification
*For any* effective DPI value: DPI < 150 → red warning, 150 ≤ DPI < 300 → yellow warning, DPI ≥ 300 → green indicator.
**Validates: Requirements 8.2, 8.3, 8.4**

### Property 16: Safe Area Violation Detection
*For any* element, if any part extends beyond the safe area boundary (page edge - safeMargin), a violation should be detected and reported.
**Validates: Requirements 9.1, 9.2, 9.5**

### Property 17: Text Overflow Detection
*For any* text element, if the rendered text height exceeds the container height, an overflow warning should be generated.
**Validates: Requirements 10.5**

### Property 18: Template Application Image Preservation
*For any* template application to a page with existing images, images should be preserved and repositioned to template placeholders where possible.
**Validates: Requirements 11.2**

### Property 19: Special Page Count Exclusion
*For any* project with special pages (guards, title, dedication), the displayed "page count" should exclude special pages, but the total page count for pricing should include them.
**Validates: Requirements 12.4**

### Property 20: Version Snapshot Completeness
*For any* version creation, the snapshot should contain the complete project state such that restoring it produces an equivalent project.
**Validates: Requirements 13.1, 13.3**

### Property 21: Production Lock Immutability
*For any* project locked for production, subsequent modification attempts should be rejected and the locked version should remain unchanged.
**Validates: Requirements 13.5, 16.3**

### Property 22: PDF Bleed Inclusion
*For any* exported PDF, the document dimensions should equal: (pageWidth + 2×bleed) × (pageHeight + 2×bleed).
**Validates: Requirements 14.2**

### Property 23: Cover PDF Spread Dimensions
*For any* cover PDF export, the document width should equal: frontWidth + spineWidth + backWidth + 4×bleed.
**Validates: Requirements 14.4**

### Property 24: File Naming Convention
*For any* PDF export, the filename should match the pattern: {PROJECT_NAME}__{TYPE}__{FORMAT}__{PAGES|SPINE}mm.pdf where TYPE is "MIOLO" or "CAPA".
**Validates: Requirements 14.5**

### Property 25: Preflight Pass Condition
*For any* project, preflight status should be "pass" if and only if there are zero errors (warnings are allowed).
**Validates: Requirements 15.5**

### Property 26: Order Status Transition Validity
*For any* order status change, the transition should follow the valid state machine: draft → submitted → in_review → (approved | rejected) → in_production → completed.
**Validates: Requirements 17.3, 17.5**

### Property 27: Role-Based Access Control
*For any* feature access attempt, the action should be allowed if and only if the user's role has the required permission for that feature.
**Validates: Requirements 18.4, 18.5**

### Property 28: Color Profile Detection
*For any* uploaded image, the system should detect and store the color profile, defaulting to sRGB if no profile is embedded.
**Validates: Requirements 20.1, 20.2**

### Property 29: Audit Log Completeness
*For any* auditable action (export, order status change, catalog modification, failed login), a log entry should be created with timestamp, actor, and action details.
**Validates: Requirements 25.1, 25.2, 25.3, 25.4**


## Error Handling

### Frontend Error Handling

```typescript
// Categorias de erro
enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  PERMISSION = 'permission',
  SYSTEM = 'system'
}

// Handler centralizado
class ErrorHandler {
  handle(error: AppError): void {
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        // Mostrar mensagem inline no formulário
        this.showValidationError(error);
        break;
      case ErrorCategory.NETWORK:
        // Tentar reconexão, mostrar toast
        this.handleNetworkError(error);
        break;
      case ErrorCategory.STORAGE:
        // Salvar localmente, notificar usuário
        this.handleStorageError(error);
        break;
      case ErrorCategory.PERMISSION:
        // Redirecionar para login ou mostrar acesso negado
        this.handlePermissionError(error);
        break;
      default:
        // Log e mostrar erro genérico
        this.handleSystemError(error);
    }
  }
}
```

### Backend Error Responses

```typescript
// Formato padrão de erro
interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
}

// Códigos de erro específicos
const ErrorCodes = {
  PROJECT_NOT_FOUND: 'PROJECT_001',
  PROJECT_LOCKED: 'PROJECT_002',
  INVALID_PAGE_COUNT: 'PROJECT_003',
  
  ASSET_TOO_LARGE: 'ASSET_001',
  ASSET_INVALID_FORMAT: 'ASSET_002',
  ASSET_LOW_RESOLUTION: 'ASSET_003',
  
  ORDER_ALREADY_SUBMITTED: 'ORDER_001',
  ORDER_PREFLIGHT_FAILED: 'ORDER_002',
  
  PERMISSION_DENIED: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
};
```

### Retry Strategy

```typescript
// Configuração de retry para operações críticas
const retryConfig = {
  save: { maxAttempts: 3, backoff: 'exponential', initialDelay: 1000 },
  upload: { maxAttempts: 3, backoff: 'linear', initialDelay: 2000 },
  export: { maxAttempts: 2, backoff: 'fixed', initialDelay: 5000 },
};
```

## Testing Strategy

### Dual Testing Approach

O sistema utiliza uma abordagem dual de testes:

1. **Unit Tests**: Verificam exemplos específicos e casos de borda
2. **Property-Based Tests**: Verificam propriedades universais que devem valer para todas as entradas

### Property-Based Testing Framework

**Framework escolhido**: fast-check (TypeScript)

```typescript
import * as fc from 'fast-check';

// Configuração padrão: mínimo 100 iterações
const defaultConfig = { numRuns: 100 };
```

### Test Categories

#### 1. Core Logic Properties (fast-check)

```typescript
// Exemplo: Spine calculation property
describe('Spine Calculation', () => {
  it('should calculate spine width correctly for any valid input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 200 }).filter(n => n % 2 === 0), // pageCount
        fc.float({ min: 0.05, max: 0.3 }), // paperThickness
        fc.float({ min: 0, max: 3 }), // bindingTolerance
        (pageCount, thickness, tolerance) => {
          const result = calculateSpineWidth(pageCount, thickness, tolerance);
          const expected = (pageCount * thickness) + tolerance;
          return Math.abs(result - expected) < 0.001;
        }
      ),
      defaultConfig
    );
  });
});
```

#### 2. Data Integrity Properties

```typescript
// Exemplo: Project save/load round-trip
describe('Project Persistence', () => {
  it('should preserve project state through save/load cycle', () => {
    fc.assert(
      fc.property(
        projectArbitrary(), // Generator for valid projects
        async (project) => {
          const saved = await projectService.save(project);
          const loaded = await projectService.load(saved.id);
          return deepEqual(project.pages, loaded.pages) &&
                 deepEqual(project.elements, loaded.elements);
        }
      ),
      defaultConfig
    );
  });
});
```

#### 3. Validation Properties

```typescript
// Exemplo: DPI classification
describe('DPI Validation', () => {
  it('should classify DPI correctly for any value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000 }),
        (dpi) => {
          const result = classifyDPI(dpi);
          if (dpi < 150) return result === 'error';
          if (dpi < 300) return result === 'warning';
          return result === 'ok';
        }
      ),
      defaultConfig
    );
  });
});
```

### Unit Test Coverage

- Services: 80% coverage mínimo
- Validators: 90% coverage mínimo
- Utils/Helpers: 95% coverage mínimo

### Integration Tests

- API endpoints: todos os endpoints críticos
- Database operations: CRUD completo
- File operations: upload, download, delete

### Test Annotations

Cada property-based test deve ser anotado com:
```typescript
/**
 * Feature: fotolivro-profissional, Property 7: Spine Width Calculation Formula
 * Validates: Requirements 3.1, 3.2, 3.4
 */
```
