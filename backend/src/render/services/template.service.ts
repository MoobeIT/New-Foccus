import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';

export interface ProjectElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  properties: {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    textAlign?: string;
    lineHeight?: number;
    letterSpacing?: number;
    src?: string;
    fit?: string;
    opacity?: number;
    filters?: any;
    shape?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}

export interface ProjectPage {
  id: string;
  width: number;
  height: number;
  background?: string;
  elements: ProjectElement[];
}

export interface RenderTemplate {
  html: string;
  css: string;
  metadata: {
    width: number;
    height: number;
    dpi: number;
    bleedSize?: number;
    safeArea?: number;
  };
}

@Injectable()
export class TemplateService {
  constructor(private logger: LoggerService) {}

  generateRenderTemplate(
    page: ProjectPage,
    options: {
      dpi?: number;
      includeGuides?: boolean;
      includeBleed?: boolean;
      safeAreaSize?: number;
      bleedSize?: number;
    } = {},
  ): RenderTemplate {
    const {
      dpi = 300,
      includeGuides = false,
      includeBleed = false,
      safeAreaSize = 5, // 5mm
      bleedSize = 3, // 3mm
    } = options;

    // Calcular dimensões em pixels baseado no DPI
    const pixelWidth = Math.round((page.width * dpi) / 25.4); // mm para pixels
    const pixelHeight = Math.round((page.height * dpi) / 25.4);

    // Gerar HTML da página
    const html = this.generatePageHtml(page, {
      includeGuides,
      includeBleed,
      safeAreaSize,
      bleedSize,
    });

    // Gerar CSS da página
    const css = this.generatePageCss(page, {
      dpi,
      includeGuides,
      includeBleed,
      safeAreaSize,
      bleedSize,
    });

    this.logger.debug(
      `Template gerado: ${pixelWidth}x${pixelHeight}px @ ${dpi}DPI`,
      'TemplateService',
    );

    return {
      html,
      css,
      metadata: {
        width: pixelWidth,
        height: pixelHeight,
        dpi,
        bleedSize: includeBleed ? bleedSize : undefined,
        safeArea: includeGuides ? safeAreaSize : undefined,
      },
    };
  }

  private generatePageHtml(
    page: ProjectPage,
    options: {
      includeGuides: boolean;
      includeBleed: boolean;
      safeAreaSize: number;
      bleedSize: number;
    },
  ): string {
    const elementsHtml = page.elements
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(element => this.generateElementHtml(element))
      .join('\n');

    const guidesHtml = options.includeGuides
      ? this.generateGuidesHtml(page, options)
      : '';

    return `
      <div class="page" id="page-${page.id}">
        ${elementsHtml}
        ${guidesHtml}
      </div>
    `;
  }

  private generateElementHtml(element: ProjectElement): string {
    const baseAttributes = `
      id="element-${element.id}"
      class="element element-${element.type}"
      style="
        left: ${element.x}mm;
        top: ${element.y}mm;
        width: ${element.width}mm;
        height: ${element.height}mm;
        transform: rotate(${element.rotation || 0}deg);
        z-index: ${element.zIndex || 0};
      "
    `;

    switch (element.type) {
      case 'image':
        return this.generatePhotoElementHtml(element, baseAttributes);
      case 'text':
        return this.generateTextElementHtml(element, baseAttributes);
      case 'shape':
        return this.generateShapeElementHtml(element, baseAttributes);
      default:
        return `<div ${baseAttributes}></div>`;
    }
  }

  private generatePhotoElementHtml(element: ProjectElement, baseAttributes: string): string {
    const { src, fit = 'cover', opacity = 1, filters = {} } = element.properties;

    const filterStyle = this.generateFilterStyle(filters);

    return `
      <div ${baseAttributes}>
        <img 
          src="${src}" 
          alt="Photo element"
          style="
            width: 100%;
            height: 100%;
            object-fit: ${fit};
            opacity: ${opacity};
            ${filterStyle}
          "
          loading="eager"
        />
      </div>
    `;
  }

  private generateTextElementHtml(element: ProjectElement, baseAttributes: string): string {
    const {
      text = '',
      fontSize = 12,
      fontFamily = 'Arial',
      fontWeight = 'normal',
      fontStyle = 'normal',
      color = '#000000',
      textAlign = 'left',
      lineHeight = 1.2,
      letterSpacing = 0,
    } = element.properties;

    return `
      <div ${baseAttributes}>
        <div class="text-content" style="
          font-family: ${fontFamily};
          font-size: ${fontSize}pt;
          font-weight: ${fontWeight};
          font-style: ${fontStyle};
          color: ${color};
          text-align: ${textAlign};
          line-height: ${lineHeight};
          letter-spacing: ${letterSpacing}px;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          word-wrap: break-word;
          overflow: hidden;
        ">
          ${this.escapeHtml(text)}
        </div>
      </div>
    `;
  }

  private generateShapeElementHtml(element: ProjectElement, baseAttributes: string): string {
    const {
      shape = 'rectangle',
      fill = '#ffffff',
      stroke = '#000000',
      strokeWidth = 0,
      opacity = 1,
    } = element.properties;

    const shapeStyle = this.generateShapeStyle(shape, {
      fill,
      stroke,
      strokeWidth,
      opacity,
    });

    return `
      <div ${baseAttributes}>
        <div class="shape-content" style="${shapeStyle}"></div>
      </div>
    `;
  }

  private generateGuidesHtml(
    page: ProjectPage,
    options: { safeAreaSize: number; bleedSize: number },
  ): string {
    const { safeAreaSize, bleedSize } = options;

    return `
      <div class="guides">
        <!-- Área segura -->
        <div class="safe-area-guide" style="
          left: ${safeAreaSize}mm;
          top: ${safeAreaSize}mm;
          width: ${page.width - safeAreaSize * 2}mm;
          height: ${page.height - safeAreaSize * 2}mm;
        "></div>
        
        <!-- Sangria -->
        <div class="bleed-guide" style="
          left: -${bleedSize}mm;
          top: -${bleedSize}mm;
          width: ${page.width + bleedSize * 2}mm;
          height: ${page.height + bleedSize * 2}mm;
        "></div>
      </div>
    `;
  }

  private generatePageCss(
    page: ProjectPage,
    options: {
      dpi: number;
      includeGuides: boolean;
      includeBleed: boolean;
      safeAreaSize: number;
      bleedSize: number;
    },
  ): string {
    const { dpi, includeGuides, includeBleed } = options;

    return `
      /* Reset e configurações base */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: white;
        overflow: hidden;
      }

      /* Página principal */
      .page {
        position: relative;
        width: ${page.width}mm;
        height: ${page.height}mm;
        background: ${page.background || '#ffffff'};
        overflow: hidden;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      /* Elementos base */
      .element {
        position: absolute;
        overflow: hidden;
      }

      .element-photo {
        border-radius: 0;
      }

      .element-photo img {
        display: block;
        max-width: none;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }

      .element-text {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .text-content {
        user-select: none;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .element-shape .shape-content {
        width: 100%;
        height: 100%;
      }

      /* Guias (apenas para preview) */
      ${includeGuides ? `
      .guides {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }

      .safe-area-guide {
        position: absolute;
        border: 1px dashed #00ff00;
        opacity: 0.5;
      }

      .bleed-guide {
        position: absolute;
        border: 1px dashed #ff0000;
        opacity: 0.3;
      }
      ` : ''}

      /* Otimizações para alta resolução */
      @media print {
        .page {
          margin: 0;
          page-break-inside: avoid;
        }
        
        .guides {
          display: none;
        }
      }

      /* Configurações específicas para DPI alto */
      ${dpi > 150 ? `
      .element-photo img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: optimize-contrast;
        image-rendering: crisp-edges;
      }
      ` : ''}
    `;
  }

  private generateFilterStyle(filters: any): string {
    const filterParts = [];

    if (filters.brightness !== undefined) {
      filterParts.push(`brightness(${filters.brightness}%)`);
    }
    if (filters.contrast !== undefined) {
      filterParts.push(`contrast(${filters.contrast}%)`);
    }
    if (filters.saturation !== undefined) {
      filterParts.push(`saturate(${filters.saturation}%)`);
    }
    if (filters.blur !== undefined) {
      filterParts.push(`blur(${filters.blur}px)`);
    }
    if (filters.sepia !== undefined) {
      filterParts.push(`sepia(${filters.sepia}%)`);
    }

    return filterParts.length > 0 ? `filter: ${filterParts.join(' ')};` : '';
  }

  private generateShapeStyle(
    shape: string,
    options: {
      fill: string;
      stroke: string;
      strokeWidth: number;
      opacity: number;
    },
  ): string {
    const { fill, stroke, strokeWidth, opacity } = options;

    let shapeSpecificStyle = '';

    switch (shape) {
      case 'circle':
        shapeSpecificStyle = 'border-radius: 50%;';
        break;
      case 'ellipse':
        shapeSpecificStyle = 'border-radius: 50%;';
        break;
      case 'rectangle':
        shapeSpecificStyle = '';
        break;
      case 'rounded-rectangle':
        shapeSpecificStyle = 'border-radius: 8px;';
        break;
      default:
        shapeSpecificStyle = '';
    }

    return `
      background-color: ${fill};
      border: ${strokeWidth}px solid ${stroke};
      opacity: ${opacity};
      ${shapeSpecificStyle}
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Método para gerar template de teste
  generateTestTemplate(): RenderTemplate {
    const testPage: ProjectPage = {
      id: 'test-page',
      width: 210, // A4 width in mm
      height: 297, // A4 height in mm
      background: '#ffffff',
      elements: [
        {
          id: 'title',
          type: 'text',
          x: 20,
          y: 20,
          width: 170,
          height: 20,
          properties: {
            text: 'Preview HiDPI - Teste de Renderização',
            fontSize: 18,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            color: '#333333',
            textAlign: 'center',
          },
        },
        {
          id: 'photo-placeholder',
          type: 'shape',
          x: 50,
          y: 60,
          width: 110,
          height: 80,
          properties: {
            shape: 'rectangle',
            fill: '#f0f0f0',
            stroke: '#cccccc',
            strokeWidth: 2,
          },
        },
        {
          id: 'description',
          type: 'text',
          x: 20,
          y: 160,
          width: 170,
          height: 40,
          properties: {
            text: 'Este é um template de teste para validar a renderização HiDPI com elementos de texto e formas geométricas.',
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#666666',
            textAlign: 'justify',
            lineHeight: 1.4,
          },
        },
      ],
    };

    return this.generateRenderTemplate(testPage, {
      dpi: 300,
      includeGuides: true,
      safeAreaSize: 5,
    });
  }
}