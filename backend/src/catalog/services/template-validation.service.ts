import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

export interface TemplateLayout {
  type: string;
  elements: LayoutElement[];
  guides?: LayoutGuides;
  pages?: PageLayout[];
  metadata?: LayoutMetadata;
}

export interface LayoutElement {
  id?: string;
  type: 'photo' | 'text' | 'shape' | 'background';
  frame: ElementFrame;
  properties?: Record<string, any>;
  constraints?: ElementConstraints;
}

export interface ElementFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface ElementConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  lockAspectRatio?: boolean;
}

export interface LayoutGuides {
  bleed?: number;
  safeArea?: number;
  grid?: GridGuides;
  rulers?: boolean;
}

export interface GridGuides {
  enabled: boolean;
  size: number;
  subdivisions?: number;
  snap?: boolean;
}

export interface PageLayout {
  id: string;
  type: 'cover' | 'page' | 'back';
  elements: LayoutElement[];
  background?: string;
}

export interface LayoutMetadata {
  version: string;
  created: string;
  modified: string;
  author?: string;
  description?: string;
}

@Injectable()
export class TemplateValidationService {
  constructor(private logger: LoggerService) {}

  /**
   * Validar layout completo do template
   */
  validateLayout(layout: TemplateLayout, productType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validações básicas de estrutura
    this.validateBasicStructure(layout, errors);

    // Validações específicas por tipo de produto
    this.validateProductSpecific(layout, productType, errors, warnings);

    // Validações de elementos
    this.validateElements(layout.elements || [], errors, warnings);

    // Validações de guias
    if (layout.guides) {
      this.validateGuides(layout.guides, errors, warnings);
    }

    // Validações de páginas (para produtos multi-página)
    if (layout.pages) {
      this.validatePages(layout.pages, errors, warnings);
    }

    // Calcular score de qualidade
    const score = this.calculateQualityScore(layout, errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Validar estrutura básica do layout
   */
  private validateBasicStructure(layout: TemplateLayout, errors: ValidationError[]): void {
    if (!layout.type) {
      errors.push({
        code: 'MISSING_TYPE',
        message: 'Layout deve ter um tipo definido',
        path: 'type',
        severity: 'error',
      });
    }

    if (!Array.isArray(layout.elements)) {
      errors.push({
        code: 'INVALID_ELEMENTS',
        message: 'Layout deve ter um array de elementos',
        path: 'elements',
        severity: 'error',
      });
    }

    // Validar metadados se presentes
    if (layout.metadata) {
      if (!layout.metadata.version) {
        errors.push({
          code: 'MISSING_VERSION',
          message: 'Metadados devem incluir versão',
          path: 'metadata.version',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validações específicas por tipo de produto
   */
  private validateProductSpecific(
    layout: TemplateLayout,
    productType: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    switch (productType) {
      case 'photobook':
        this.validatePhotobook(layout, errors, warnings);
        break;
      case 'calendar':
        this.validateCalendar(layout, errors, warnings);
        break;
      case 'frame':
        this.validateFrame(layout, errors, warnings);
        break;
      default:
        warnings.push({
          code: 'UNKNOWN_PRODUCT_TYPE',
          message: `Tipo de produto desconhecido: ${productType}`,
          path: 'productType',
        });
    }
  }

  /**
   * Validações específicas para fotolivro
   */
  private validatePhotobook(
    layout: TemplateLayout,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Fotolivros devem ter páginas
    if (!layout.pages || layout.pages.length === 0) {
      errors.push({
        code: 'PHOTOBOOK_NO_PAGES',
        message: 'Fotolivro deve ter pelo menos uma página',
        path: 'pages',
        severity: 'error',
      });
    }

    // Verificar número par de páginas (exceto capa)
    if (layout.pages) {
      const contentPages = layout.pages.filter(p => p.type === 'page');
      if (contentPages.length % 2 !== 0) {
        warnings.push({
          code: 'PHOTOBOOK_ODD_PAGES',
          message: 'Fotolivros geralmente têm número par de páginas',
          path: 'pages',
          suggestion: 'Adicione ou remova uma página para ter número par',
        });
      }
    }

    // Verificar sangria para fotolivros
    if (!layout.guides?.bleed || layout.guides.bleed < 3) {
      warnings.push({
        code: 'PHOTOBOOK_INSUFFICIENT_BLEED',
        message: 'Fotolivros requerem pelo menos 3mm de sangria',
        path: 'guides.bleed',
        suggestion: 'Configure sangria de pelo menos 3mm',
      });
    }
  }

  /**
   * Validações específicas para calendário
   */
  private validateCalendar(
    layout: TemplateLayout,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Calendários devem ter 12 páginas + capa
    if (layout.pages && layout.pages.length < 13) {
      warnings.push({
        code: 'CALENDAR_INSUFFICIENT_PAGES',
        message: 'Calendários geralmente têm 13 páginas (capa + 12 meses)',
        path: 'pages',
        suggestion: 'Adicione páginas para completar os 12 meses',
      });
    }

    // Verificar elementos de data/calendário
    const hasDateElements = layout.elements?.some(el => 
      el.type === 'text' && el.properties?.textType === 'date'
    );

    if (!hasDateElements && layout.pages) {
      const hasDateInPages = layout.pages.some(page =>
        page.elements.some(el => 
          el.type === 'text' && el.properties?.textType === 'date'
        )
      );

      if (!hasDateInPages) {
        warnings.push({
          code: 'CALENDAR_NO_DATE_ELEMENTS',
          message: 'Calendários devem ter elementos de data',
          path: 'elements',
          suggestion: 'Adicione elementos de texto com tipo "date"',
        });
      }
    }
  }

  /**
   * Validações específicas para quadro
   */
  private validateFrame(
    layout: TemplateLayout,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Quadros devem ter apenas uma página/elemento principal
    if (layout.pages && layout.pages.length > 1) {
      warnings.push({
        code: 'FRAME_MULTIPLE_PAGES',
        message: 'Quadros geralmente têm apenas uma página',
        path: 'pages',
      });
    }

    // Verificar se tem elemento de foto principal
    const photoElements = layout.elements?.filter(el => el.type === 'photo') || [];
    if (photoElements.length === 0) {
      errors.push({
        code: 'FRAME_NO_PHOTO',
        message: 'Quadros devem ter pelo menos um elemento de foto',
        path: 'elements',
        severity: 'error',
      });
    }

    if (photoElements.length > 1) {
      warnings.push({
        code: 'FRAME_MULTIPLE_PHOTOS',
        message: 'Quadros geralmente têm apenas uma foto principal',
        path: 'elements',
        suggestion: 'Considere usar apenas uma foto principal',
      });
    }
  }

  /**
   * Validar elementos do layout
   */
  private validateElements(
    elements: LayoutElement[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    elements.forEach((element, index) => {
      const path = `elements[${index}]`;

      // Validar tipo do elemento
      if (!element.type) {
        errors.push({
          code: 'ELEMENT_NO_TYPE',
          message: 'Elemento deve ter um tipo definido',
          path: `${path}.type`,
          severity: 'error',
        });
      }

      // Validar frame
      if (!element.frame) {
        errors.push({
          code: 'ELEMENT_NO_FRAME',
          message: 'Elemento deve ter um frame definido',
          path: `${path}.frame`,
          severity: 'error',
        });
      } else {
        this.validateElementFrame(element.frame, `${path}.frame`, errors, warnings);
      }

      // Validações específicas por tipo
      switch (element.type) {
        case 'photo':
          this.validatePhotoElement(element, path, errors, warnings);
          break;
        case 'text':
          this.validateTextElement(element, path, errors, warnings);
          break;
        case 'shape':
          this.validateShapeElement(element, path, errors, warnings);
          break;
      }

      // Validar constraints se presentes
      if (element.constraints) {
        this.validateElementConstraints(element.constraints, `${path}.constraints`, errors, warnings);
      }
    });

    // Verificar sobreposições
    this.checkElementOverlaps(elements, errors, warnings);
  }

  /**
   * Validar frame do elemento
   */
  private validateElementFrame(
    frame: ElementFrame,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const { x, y, width, height } = frame;

    // Verificar se coordenadas são números
    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number') {
      errors.push({
        code: 'INVALID_FRAME_COORDINATES',
        message: 'Frame deve ter coordenadas numéricas',
        path,
        severity: 'error',
      });
    }

    // Verificar valores positivos
    if (width <= 0 || height <= 0) {
      errors.push({
        code: 'INVALID_FRAME_SIZE',
        message: 'Frame deve ter largura e altura positivas',
        path,
        severity: 'error',
      });
    }

    // Verificar se está dentro dos limites da página (assumindo A4: 210x297mm)
    const pageWidth = 210;
    const pageHeight = 297;

    if (x < 0 || y < 0 || x + width > pageWidth || y + height > pageHeight) {
      warnings.push({
        code: 'ELEMENT_OUTSIDE_PAGE',
        message: 'Elemento pode estar fora dos limites da página',
        path,
        suggestion: 'Verifique se o elemento está dentro da área de impressão',
      });
    }

    // Verificar rotação se presente
    if (frame.rotation !== undefined) {
      if (typeof frame.rotation !== 'number') {
        errors.push({
          code: 'INVALID_ROTATION',
          message: 'Rotação deve ser um número',
          path: `${path}.rotation`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validar elemento de foto
   */
  private validatePhotoElement(
    element: LayoutElement,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Verificar propriedades de ajuste
    if (element.properties?.fit) {
      const validFits = ['cover', 'contain', 'fill', 'scale-down'];
      if (!validFits.includes(element.properties.fit)) {
        errors.push({
          code: 'INVALID_PHOTO_FIT',
          message: `Ajuste de foto inválido: ${element.properties.fit}`,
          path: `${path}.properties.fit`,
          severity: 'error',
        });
      }
    }

    // Verificar resolução mínima
    const minArea = element.frame.width * element.frame.height;
    if (minArea < 100) { // 10mm x 10mm
      warnings.push({
        code: 'PHOTO_TOO_SMALL',
        message: 'Elemento de foto muito pequeno pode resultar em baixa qualidade',
        path,
        suggestion: 'Aumente o tamanho do elemento ou use imagens de alta resolução',
      });
    }
  }

  /**
   * Validar elemento de texto
   */
  private validateTextElement(
    element: LayoutElement,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Verificar propriedades de fonte
    if (element.properties?.fontSize) {
      if (typeof element.properties.fontSize !== 'number' || element.properties.fontSize <= 0) {
        errors.push({
          code: 'INVALID_FONT_SIZE',
          message: 'Tamanho da fonte deve ser um número positivo',
          path: `${path}.properties.fontSize`,
          severity: 'error',
        });
      }

      // Verificar se fonte não é muito pequena para impressão
      if (element.properties.fontSize < 8) {
        warnings.push({
          code: 'FONT_TOO_SMALL',
          message: 'Fonte muito pequena pode ser difícil de ler na impressão',
          path: `${path}.properties.fontSize`,
          suggestion: 'Use fonte de pelo menos 8pt para melhor legibilidade',
        });
      }
    }

    // Verificar alinhamento
    if (element.properties?.textAlign) {
      const validAligns = ['left', 'center', 'right', 'justify'];
      if (!validAligns.includes(element.properties.textAlign)) {
        errors.push({
          code: 'INVALID_TEXT_ALIGN',
          message: `Alinhamento de texto inválido: ${element.properties.textAlign}`,
          path: `${path}.properties.textAlign`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validar elemento de forma
   */
  private validateShapeElement(
    element: LayoutElement,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Verificar tipo de forma
    if (element.properties?.shapeType) {
      const validShapes = ['rectangle', 'circle', 'ellipse', 'polygon', 'line'];
      if (!validShapes.includes(element.properties.shapeType)) {
        errors.push({
          code: 'INVALID_SHAPE_TYPE',
          message: `Tipo de forma inválido: ${element.properties.shapeType}`,
          path: `${path}.properties.shapeType`,
          severity: 'error',
        });
      }
    }

    // Verificar cor de preenchimento
    if (element.properties?.fillColor) {
      if (!this.isValidColor(element.properties.fillColor)) {
        errors.push({
          code: 'INVALID_FILL_COLOR',
          message: 'Cor de preenchimento inválida',
          path: `${path}.properties.fillColor`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validar constraints do elemento
   */
  private validateElementConstraints(
    constraints: ElementConstraints,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Verificar valores mínimos e máximos
    if (constraints.minWidth !== undefined && constraints.maxWidth !== undefined) {
      if (constraints.minWidth > constraints.maxWidth) {
        errors.push({
          code: 'INVALID_WIDTH_CONSTRAINTS',
          message: 'Largura mínima não pode ser maior que a máxima',
          path,
          severity: 'error',
        });
      }
    }

    if (constraints.minHeight !== undefined && constraints.maxHeight !== undefined) {
      if (constraints.minHeight > constraints.maxHeight) {
        errors.push({
          code: 'INVALID_HEIGHT_CONSTRAINTS',
          message: 'Altura mínima não pode ser maior que a máxima',
          path,
          severity: 'error',
        });
      }
    }

    // Verificar aspect ratio
    if (constraints.aspectRatio !== undefined) {
      if (typeof constraints.aspectRatio !== 'number' || constraints.aspectRatio <= 0) {
        errors.push({
          code: 'INVALID_ASPECT_RATIO',
          message: 'Proporção deve ser um número positivo',
          path: `${path}.aspectRatio`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Verificar sobreposições entre elementos
   */
  private checkElementOverlaps(
    elements: LayoutElement[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const elem1 = elements[i];
        const elem2 = elements[j];

        if (this.elementsOverlap(elem1.frame, elem2.frame)) {
          warnings.push({
            code: 'ELEMENTS_OVERLAP',
            message: `Elementos ${i} e ${j} se sobrepõem`,
            path: `elements[${i}], elements[${j}]`,
            suggestion: 'Verifique se a sobreposição é intencional',
          });
        }
      }
    }
  }

  /**
   * Validar guias do layout
   */
  private validateGuides(
    guides: LayoutGuides,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Validar sangria
    if (guides.bleed !== undefined) {
      if (typeof guides.bleed !== 'number' || guides.bleed < 0) {
        errors.push({
          code: 'INVALID_BLEED',
          message: 'Sangria deve ser um número positivo',
          path: 'guides.bleed',
          severity: 'error',
        });
      }
    }

    // Validar área segura
    if (guides.safeArea !== undefined) {
      if (typeof guides.safeArea !== 'number' || guides.safeArea < 0) {
        errors.push({
          code: 'INVALID_SAFE_AREA',
          message: 'Área segura deve ser um número positivo',
          path: 'guides.safeArea',
          severity: 'error',
        });
      }
    }

    // Validar grid
    if (guides.grid) {
      if (typeof guides.grid.size !== 'number' || guides.grid.size <= 0) {
        errors.push({
          code: 'INVALID_GRID_SIZE',
          message: 'Tamanho do grid deve ser um número positivo',
          path: 'guides.grid.size',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validar páginas do layout
   */
  private validatePages(
    pages: PageLayout[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    pages.forEach((page, index) => {
      const path = `pages[${index}]`;

      if (!page.id) {
        errors.push({
          code: 'PAGE_NO_ID',
          message: 'Página deve ter um ID',
          path: `${path}.id`,
          severity: 'error',
        });
      }

      if (!page.type) {
        errors.push({
          code: 'PAGE_NO_TYPE',
          message: 'Página deve ter um tipo',
          path: `${path}.type`,
          severity: 'error',
        });
      }

      // Validar elementos da página
      if (page.elements) {
        this.validateElements(page.elements, errors, warnings);
      }
    });
  }

  /**
   * Calcular score de qualidade do template
   */
  private calculateQualityScore(
    layout: TemplateLayout,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): number {
    let score = 100;

    // Penalizar por erros
    const criticalErrors = errors.filter(e => e.severity === 'error').length;
    const warningErrors = errors.filter(e => e.severity === 'warning').length;
    
    score -= criticalErrors * 20;
    score -= warningErrors * 10;
    score -= warnings.length * 5;

    // Bonificar por boas práticas
    if (layout.guides?.bleed && layout.guides.bleed >= 3) score += 5;
    if (layout.guides?.safeArea && layout.guides.safeArea >= 5) score += 5;
    if (layout.metadata?.version) score += 5;
    if (layout.metadata?.description) score += 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Verificar se dois elementos se sobrepõem
   */
  private elementsOverlap(frame1: ElementFrame, frame2: ElementFrame): boolean {
    return !(
      frame1.x + frame1.width <= frame2.x ||
      frame2.x + frame2.width <= frame1.x ||
      frame1.y + frame1.height <= frame2.y ||
      frame2.y + frame2.height <= frame1.y
    );
  }

  /**
   * Verificar se cor é válida
   */
  private isValidColor(color: string): boolean {
    // Verificar formatos: #RGB, #RRGGBB, rgb(), rgba(), hsl(), hsla()
    const colorRegex = /^(#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\))$/;
    return colorRegex.test(color);
  }
}