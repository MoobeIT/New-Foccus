import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { AssetsService } from '../../assets/services/assets.service';
import { ProductVariantsService } from '../../catalog/services/product-variants.service';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  elementId?: string;
  pageIndex?: number;
  suggestions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface ProjectElement {
  id: string;
  type: 'photo' | 'text' | 'shape';
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotation?: number;
  assetId?: string;
  content?: string;
  style?: Record<string, any>;
}

export interface ProjectPage {
  index: number;
  templateId?: string;
  elements: ProjectElement[];
  guides: {
    bleed: number;
    safeArea: number;
  };
}

@Injectable()
export class ProjectValidationService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
    private assetsService: AssetsService,
    private variantsService: ProductVariantsService,
  ) {}

  async validateProject(
    pages: ProjectPage[],
    variantId: string,
    userId: string,
    tenantId: string,
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    try {
      // Obter informações da variante
      const variant = await this.variantsService.findOne(variantId, tenantId);

      // Validar cada página
      for (const page of pages) {
        const pageIssues = await this.validatePage(page, variant, userId, tenantId);
        issues.push(...pageIssues);
      }

      // Validações globais do projeto
      const globalIssues = this.validateGlobalRules(pages, variant);
      issues.push(...globalIssues);

      // Calcular resumo
      const summary = {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        infos: issues.filter(i => i.type === 'info').length,
      };

      return {
        valid: summary.errors === 0,
        issues,
        summary,
      };
    } catch (error) {
      this.logger.error('Erro na validação do projeto', error.stack, 'ProjectValidationService');
      
      return {
        valid: false,
        issues: [{
          type: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Erro interno na validação do projeto',
        }],
        summary: { errors: 1, warnings: 0, infos: 0 },
      };
    }
  }

  async validatePage(
    page: ProjectPage,
    variant: any,
    userId: string,
    tenantId: string,
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Validar cada elemento da página
    for (const element of page.elements) {
      const elementIssues = await this.validateElement(element, page, variant, userId, tenantId);
      issues.push(...elementIssues);
    }

    // Validar sobreposições entre elementos
    const overlapIssues = this.validateElementOverlaps(page.elements, page.index);
    issues.push(...overlapIssues);

    return issues;
  }

  async validateElement(
    element: ProjectElement,
    page: ProjectPage,
    variant: any,
    userId: string,
    tenantId: string,
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Validar posicionamento (sangria e área segura)
    const positionIssues = this.validateElementPosition(element, page, variant);
    issues.push(...positionIssues);

    // Validar elemento específico por tipo
    switch (element.type) {
      case 'photo':
        const photoIssues = await this.validatePhotoElement(element, variant, userId, tenantId);
        issues.push(...photoIssues);
        break;
      case 'text':
        const textIssues = this.validateTextElement(element);
        issues.push(...textIssues);
        break;
      case 'shape':
        const shapeIssues = this.validateShapeElement(element);
        issues.push(...shapeIssues);
        break;
    }

    return issues;
  }

  private validateElementPosition(
    element: ProjectElement,
    page: ProjectPage,
    variant: any,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { frame } = element;
    const { guides } = page;
    
    // Obter dimensões da página da variante
    const pageWidth = variant.sizeMm?.width || 200;
    const pageHeight = variant.sizeMm?.height || 200;

    // Verificar se elemento está dentro da página
    if (frame.x < 0 || frame.y < 0 || 
        frame.x + frame.width > pageWidth || 
        frame.y + frame.height > pageHeight) {
      issues.push({
        type: 'error',
        code: 'ELEMENT_OUT_OF_BOUNDS',
        message: 'Elemento está fora dos limites da página',
        elementId: element.id,
        pageIndex: page.index,
        suggestions: ['Mova o elemento para dentro da página'],
      });
    }

    // Verificar sangria (bleed)
    const bleedMargin = guides.bleed || 3;
    if (frame.x < bleedMargin || frame.y < bleedMargin ||
        frame.x + frame.width > pageWidth - bleedMargin ||
        frame.y + frame.height > pageHeight - bleedMargin) {
      
      // Para fotos, sangria é menos crítica
      const issueType = element.type === 'photo' ? 'warning' : 'error';
      
      issues.push({
        type: issueType,
        code: 'ELEMENT_OUTSIDE_BLEED',
        message: `Elemento está fora da área de sangria (${bleedMargin}mm)`,
        elementId: element.id,
        pageIndex: page.index,
        suggestions: [
          'Mova o elemento para dentro da área de sangria',
          'Ou estenda a imagem até a borda se for intencional',
        ],
      });
    }

    // Verificar área segura
    const safeMargin = guides.safeArea || 5;
    if (element.type === 'text' && 
        (frame.x < safeMargin || frame.y < safeMargin ||
         frame.x + frame.width > pageWidth - safeMargin ||
         frame.y + frame.height > pageHeight - safeMargin)) {
      
      issues.push({
        type: 'warning',
        code: 'TEXT_OUTSIDE_SAFE_AREA',
        message: `Texto está fora da área segura (${safeMargin}mm)`,
        elementId: element.id,
        pageIndex: page.index,
        suggestions: ['Mova o texto para dentro da área segura para evitar cortes'],
      });
    }

    return issues;
  }

  private async validatePhotoElement(
    element: ProjectElement,
    variant: any,
    userId: string,
    tenantId: string,
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (!element.assetId) {
      issues.push({
        type: 'error',
        code: 'PHOTO_NO_ASSET',
        message: 'Elemento de foto não possui imagem associada',
        elementId: element.id,
        suggestions: ['Adicione uma imagem ao elemento'],
      });
      return issues;
    }

    try {
      // Buscar informações do asset
      const asset = await this.assetsService.findOne(element.assetId, userId, tenantId);

      // Verificar se asset foi processado
      if (asset.processingStatus !== 'completed') {
        issues.push({
          type: 'warning',
          code: 'PHOTO_NOT_PROCESSED',
          message: 'Imagem ainda está sendo processada',
          elementId: element.id,
          suggestions: ['Aguarde o processamento da imagem terminar'],
        });
        return issues;
      }

      // Calcular DPI baseado no tamanho do elemento
      const elementWidthMm = element.frame.width;
      const elementHeightMm = element.frame.height;
      
      if (asset.width && asset.height && elementWidthMm > 0 && elementHeightMm > 0) {
        const dpiWidth = (asset.width * 25.4) / elementWidthMm;
        const dpiHeight = (asset.height * 25.4) / elementHeightMm;
        const minDpi = Math.min(dpiWidth, dpiHeight);

        // Verificar qualidade para impressão
        if (minDpi < 150) {
          issues.push({
            type: 'error',
            code: 'PHOTO_LOW_RESOLUTION',
            message: `Resolução muito baixa para impressão: ${Math.round(minDpi)}dpi (mínimo 150dpi)`,
            elementId: element.id,
            suggestions: [
              'Use uma imagem de maior resolução',
              'Reduza o tamanho do elemento',
              'Considere usar uma imagem diferente',
            ],
          });
        } else if (minDpi < 300) {
          issues.push({
            type: 'warning',
            code: 'PHOTO_MEDIUM_RESOLUTION',
            message: `Resolução adequada mas não ideal: ${Math.round(minDpi)}dpi (recomendado 300dpi+)`,
            elementId: element.id,
            suggestions: [
              'Para melhor qualidade, use uma imagem de maior resolução',
              'Ou reduza ligeiramente o tamanho do elemento',
            ],
          });
        } else {
          issues.push({
            type: 'info',
            code: 'PHOTO_GOOD_RESOLUTION',
            message: `Boa resolução para impressão: ${Math.round(minDpi)}dpi`,
            elementId: element.id,
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'error',
        code: 'PHOTO_ASSET_NOT_FOUND',
        message: 'Imagem não encontrada ou inacessível',
        elementId: element.id,
        suggestions: ['Verifique se a imagem ainda existe', 'Substitua por outra imagem'],
      });
    }

    return issues;
  }

  private validateTextElement(element: ProjectElement): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!element.content || element.content.trim().length === 0) {
      issues.push({
        type: 'warning',
        code: 'TEXT_EMPTY',
        message: 'Elemento de texto está vazio',
        elementId: element.id,
        suggestions: ['Adicione conteúdo ao texto ou remova o elemento'],
      });
    }

    // Verificar tamanho mínimo do texto
    if (element.frame.width < 10 || element.frame.height < 5) {
      issues.push({
        type: 'warning',
        code: 'TEXT_TOO_SMALL',
        message: 'Elemento de texto muito pequeno, pode ser difícil de ler',
        elementId: element.id,
        suggestions: ['Aumente o tamanho do elemento de texto'],
      });
    }

    // Verificar se há estilo definido
    if (!element.style || !element.style.fontSize) {
      issues.push({
        type: 'info',
        code: 'TEXT_NO_FONT_SIZE',
        message: 'Tamanho da fonte não definido, usando padrão',
        elementId: element.id,
      });
    }

    return issues;
  }

  private validateShapeElement(element: ProjectElement): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Verificar tamanho mínimo
    if (element.frame.width < 1 || element.frame.height < 1) {
      issues.push({
        type: 'warning',
        code: 'SHAPE_TOO_SMALL',
        message: 'Elemento muito pequeno, pode não ser visível na impressão',
        elementId: element.id,
        suggestions: ['Aumente o tamanho do elemento'],
      });
    }

    return issues;
  }

  private validateElementOverlaps(elements: ProjectElement[], pageIndex: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const element1 = elements[i];
        const element2 = elements[j];

        if (this.elementsOverlap(element1, element2)) {
          issues.push({
            type: 'info',
            code: 'ELEMENTS_OVERLAP',
            message: `Elementos se sobrepõem: ${element1.id} e ${element2.id}`,
            pageIndex,
            suggestions: [
              'Verifique se a sobreposição é intencional',
              'Ajuste a posição dos elementos se necessário',
            ],
          });
        }
      }
    }

    return issues;
  }

  private elementsOverlap(element1: ProjectElement, element2: ProjectElement): boolean {
    const rect1 = element1.frame;
    const rect2 = element2.frame;

    return !(rect1.x + rect1.width <= rect2.x ||
             rect2.x + rect2.width <= rect1.x ||
             rect1.y + rect1.height <= rect2.y ||
             rect2.y + rect2.height <= rect1.y);
  }

  private validateGlobalRules(pages: ProjectPage[], variant: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Verificar número de páginas
    const minPages = variant.minPages || 1;
    const maxPages = variant.maxPages || 100;

    if (pages.length < minPages) {
      issues.push({
        type: 'error',
        code: 'TOO_FEW_PAGES',
        message: `Projeto tem ${pages.length} páginas, mínimo é ${minPages}`,
        suggestions: [`Adicione pelo menos ${minPages - pages.length} páginas`],
      });
    }

    if (pages.length > maxPages) {
      issues.push({
        type: 'error',
        code: 'TOO_MANY_PAGES',
        message: `Projeto tem ${pages.length} páginas, máximo é ${maxPages}`,
        suggestions: [`Remova pelo menos ${pages.length - maxPages} páginas`],
      });
    }

    // Verificar páginas vazias
    const emptyPages = pages.filter(page => !page.elements || page.elements.length === 0);
    if (emptyPages.length > 0) {
      issues.push({
        type: 'warning',
        code: 'EMPTY_PAGES',
        message: `${emptyPages.length} página(s) vazia(s) encontrada(s)`,
        suggestions: [
          'Adicione conteúdo às páginas vazias',
          'Ou remova as páginas desnecessárias',
        ],
      });
    }

    // Verificar se há pelo menos uma página com conteúdo
    const pagesWithContent = pages.filter(page => page.elements && page.elements.length > 0);
    if (pagesWithContent.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_CONTENT',
        message: 'Projeto não possui nenhum conteúdo',
        suggestions: ['Adicione pelo menos um elemento a uma página'],
      });
    }

    return issues;
  }

  // Método para validação rápida (apenas erros críticos)
  async quickValidate(
    pages: ProjectPage[],
    variantId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ valid: boolean; criticalIssues: ValidationIssue[] }> {
    const fullValidation = await this.validateProject(pages, variantId, userId, tenantId);
    
    const criticalIssues = fullValidation.issues.filter(issue => 
      issue.type === 'error' || 
      (issue.type === 'warning' && ['PHOTO_LOW_RESOLUTION', 'ELEMENT_OUT_OF_BOUNDS'].includes(issue.code))
    );

    return {
      valid: criticalIssues.length === 0,
      criticalIssues,
    };
  }
}