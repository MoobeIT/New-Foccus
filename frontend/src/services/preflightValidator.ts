/**
 * Preflight Validation Service
 * 
 * Validates project before sending to production
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { calculateEffectiveDPI, classifyDPI, meetsPreflightDPI } from './dpiValidator'
import { validateSafeArea, validateTextNearEdge, type ElementBounds, type PageDimensions } from './safeAreaValidator'

export interface PreflightIssue {
  id: string
  type: 'dpi' | 'safe_area' | 'empty_page' | 'color_profile' | 'font' | 'overflow' | 'gutter'
  severity: 'error' | 'warning'
  pageNumber: number
  elementId?: string
  message: string
  details: Record<string, any>
}

export interface PreflightSummary {
  totalImages: number
  lowDPIImages: number
  safeAreaViolations: number
  emptyPages: number
  colorProfileIssues: number
  gutterWarnings: number
}

export interface PreflightReport {
  status: 'pass' | 'warning' | 'fail'
  errors: PreflightIssue[]
  warnings: PreflightIssue[]
  summary: PreflightSummary
  timestamp: Date
  projectId: string
}

export interface CanvasElement {
  id: string
  type: 'image' | 'text' | 'shape'
  x: number
  y: number
  width: number
  height: number
  // Image specific
  originalWidth?: number
  originalHeight?: number
  colorProfile?: string
  // Text specific
  content?: string
  fontFamily?: string
  isOverflowing?: boolean
}

export interface Page {
  id: string
  pageNumber: number
  pageType: string
  elements: CanvasElement[]
}

export interface Project {
  id: string
  pages: Page[]
  width: number
  height: number
  bleed: number
  safeMargin: number
  gutterMargin: number
}

/**
 * Run complete preflight validation on a project
 * 
 * Property 25: Preflight Pass Condition
 * For any project, preflight status should be "pass" if and only if
 * there are zero errors (warnings are allowed).
 */
export function runPreflightValidation(project: Project): PreflightReport {
  const errors: PreflightIssue[] = []
  const warnings: PreflightIssue[] = []
  const summary: PreflightSummary = {
    totalImages: 0,
    lowDPIImages: 0,
    safeAreaViolations: 0,
    emptyPages: 0,
    colorProfileIssues: 0,
    gutterWarnings: 0
  }

  const pageDimensions: PageDimensions = {
    width: project.width,
    height: project.height,
    bleed: project.bleed,
    safeMargin: project.safeMargin,
    gutterMargin: project.gutterMargin
  }

  // Validate each page
  for (const page of project.pages) {
    // Check for empty pages (excluding special pages)
    if (page.pageType === 'regular' && page.elements.length === 0) {
      summary.emptyPages++
      errors.push({
        id: `empty-${page.id}`,
        type: 'empty_page',
        severity: 'error',
        pageNumber: page.pageNumber,
        message: `Página ${page.pageNumber} está vazia`,
        details: { pageId: page.id }
      })
    }

    // Validate each element
    for (const element of page.elements) {
      // Validate images
      if (element.type === 'image') {
        summary.totalImages++
        validateImageElement(element, page, pageDimensions, errors, warnings, summary)
      }

      // Validate text
      if (element.type === 'text') {
        validateTextElement(element, page, pageDimensions, errors, warnings)
      }

      // Validate safe area for all elements
      validateElementSafeArea(element, page, pageDimensions, errors, warnings, summary)
    }
  }

  // Determine overall status
  // Property 25: status is "pass" if and only if there are zero errors
  const status: 'pass' | 'warning' | 'fail' = 
    errors.length > 0 ? 'fail' : 
    warnings.length > 0 ? 'warning' : 
    'pass'

  return {
    status,
    errors,
    warnings,
    summary,
    timestamp: new Date(),
    projectId: project.id
  }
}


/**
 * Validate image element for DPI and color profile
 */
function validateImageElement(
  element: CanvasElement,
  page: Page,
  pageDimensions: PageDimensions,
  errors: PreflightIssue[],
  warnings: PreflightIssue[],
  summary: PreflightSummary
): void {
  // Check DPI
  if (element.originalWidth && element.originalHeight) {
    const effectiveDPI = calculateEffectiveDPI({
      originalWidth: element.originalWidth,
      originalHeight: element.originalHeight,
      printWidth: element.width,
      printHeight: element.height
    })

    const dpiResult = classifyDPI(effectiveDPI)

    // DPI below 200 is an error for preflight
    if (!meetsPreflightDPI(effectiveDPI, 200)) {
      summary.lowDPIImages++
      errors.push({
        id: `dpi-${element.id}`,
        type: 'dpi',
        severity: 'error',
        pageNumber: page.pageNumber,
        elementId: element.id,
        message: `Imagem com resolução baixa (${Math.round(effectiveDPI)} DPI). Mínimo recomendado: 200 DPI`,
        details: {
          effectiveDPI,
          originalWidth: element.originalWidth,
          originalHeight: element.originalHeight,
          printWidth: element.width,
          printHeight: element.height
        }
      })
    } else if (dpiResult.status === 'acceptable') {
      // DPI between 150-300 is a warning
      warnings.push({
        id: `dpi-warn-${element.id}`,
        type: 'dpi',
        severity: 'warning',
        pageNumber: page.pageNumber,
        elementId: element.id,
        message: `Imagem com resolução aceitável (${Math.round(effectiveDPI)} DPI). Recomendado: 300 DPI`,
        details: { effectiveDPI }
      })
    }
  }

  // Check color profile
  if (element.colorProfile) {
    if (element.colorProfile === 'untagged' || !element.colorProfile) {
      summary.colorProfileIssues++
      warnings.push({
        id: `color-${element.id}`,
        type: 'color_profile',
        severity: 'warning',
        pageNumber: page.pageNumber,
        elementId: element.id,
        message: 'Imagem sem perfil de cor definido. Será assumido sRGB.',
        details: { colorProfile: element.colorProfile || 'none' }
      })
    } else if (element.colorProfile !== 'sRGB' && element.colorProfile !== 'AdobeRGB') {
      warnings.push({
        id: `color-convert-${element.id}`,
        type: 'color_profile',
        severity: 'warning',
        pageNumber: page.pageNumber,
        elementId: element.id,
        message: `Perfil de cor ${element.colorProfile} será convertido para sRGB na exportação.`,
        details: { colorProfile: element.colorProfile }
      })
    }
  }
}

/**
 * Validate text element for overflow and edge proximity
 */
function validateTextElement(
  element: CanvasElement,
  page: Page,
  pageDimensions: PageDimensions,
  errors: PreflightIssue[],
  warnings: PreflightIssue[]
): void {
  // Check for text overflow
  if (element.isOverflowing) {
    warnings.push({
      id: `overflow-${element.id}`,
      type: 'overflow',
      severity: 'warning',
      pageNumber: page.pageNumber,
      elementId: element.id,
      message: 'Texto excede o tamanho da caixa de texto',
      details: { content: element.content?.substring(0, 50) }
    })
  }

  // Check for text near edges
  const edgeResult = validateTextNearEdge(
    { x: element.x, y: element.y, width: element.width, height: element.height },
    pageDimensions,
    3 // 3mm warning distance
  )

  if (edgeResult.isNearEdge) {
    for (const warning of edgeResult.warnings) {
      warnings.push({
        id: `edge-${element.id}-${Math.random()}`,
        type: 'safe_area',
        severity: 'warning',
        pageNumber: page.pageNumber,
        elementId: element.id,
        message: warning,
        details: {}
      })
    }
  }

  // Check for missing font (if we had font embedding info)
  if (element.fontFamily && !isSystemFont(element.fontFamily)) {
    warnings.push({
      id: `font-${element.id}`,
      type: 'font',
      severity: 'warning',
      pageNumber: page.pageNumber,
      elementId: element.id,
      message: `Fonte "${element.fontFamily}" será incorporada no PDF`,
      details: { fontFamily: element.fontFamily }
    })
  }
}

/**
 * Validate element safe area
 */
function validateElementSafeArea(
  element: CanvasElement,
  page: Page,
  pageDimensions: PageDimensions,
  errors: PreflightIssue[],
  warnings: PreflightIssue[],
  summary: PreflightSummary
): void {
  const safeAreaResult = validateSafeArea(
    { x: element.x, y: element.y, width: element.width, height: element.height },
    pageDimensions
  )

  if (!safeAreaResult.isValid) {
    summary.safeAreaViolations++
    
    for (const violation of safeAreaResult.violations) {
      if (violation.type === 'gutter') {
        summary.gutterWarnings++
        warnings.push({
          id: `gutter-${element.id}`,
          type: 'gutter',
          severity: 'warning',
          pageNumber: page.pageNumber,
          elementId: element.id,
          message: violation.message,
          details: { overflow: violation.overflow }
        })
      } else {
        warnings.push({
          id: `safe-${element.id}-${violation.type}`,
          type: 'safe_area',
          severity: 'warning',
          pageNumber: page.pageNumber,
          elementId: element.id,
          message: violation.message,
          details: { overflow: violation.overflow, type: violation.type }
        })
      }
    }
  }

  // Note if element extends to bleed (this is allowed but noted)
  if (safeAreaResult.extendsToBleed) {
    warnings.push({
      id: `bleed-${element.id}`,
      type: 'safe_area',
      severity: 'warning',
      pageNumber: page.pageNumber,
      elementId: element.id,
      message: 'Elemento estende até a área de sangria (será cortado)',
      details: {}
    })
  }
}

/**
 * Check if font is a common system font
 */
function isSystemFont(fontFamily: string): boolean {
  const systemFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia',
    'Verdana', 'Courier New', 'Courier', 'Impact', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Palatino', 'Garamond', 'Bookman',
    'Tahoma', 'sans-serif', 'serif', 'monospace'
  ]
  
  return systemFonts.some(f => 
    fontFamily.toLowerCase().includes(f.toLowerCase())
  )
}

/**
 * Generate preflight report summary text
 */
export function generatePreflightSummaryText(report: PreflightReport): string {
  const lines: string[] = []
  
  lines.push(`Status: ${report.status.toUpperCase()}`)
  lines.push(`Data: ${report.timestamp.toLocaleString('pt-BR')}`)
  lines.push('')
  lines.push('Resumo:')
  lines.push(`- Total de imagens: ${report.summary.totalImages}`)
  lines.push(`- Imagens com baixa resolução: ${report.summary.lowDPIImages}`)
  lines.push(`- Violações de área segura: ${report.summary.safeAreaViolations}`)
  lines.push(`- Páginas vazias: ${report.summary.emptyPages}`)
  lines.push(`- Problemas de perfil de cor: ${report.summary.colorProfileIssues}`)
  lines.push(`- Avisos de lombada: ${report.summary.gutterWarnings}`)
  lines.push('')
  
  if (report.errors.length > 0) {
    lines.push(`Erros (${report.errors.length}):`)
    for (const error of report.errors) {
      lines.push(`  - Página ${error.pageNumber}: ${error.message}`)
    }
    lines.push('')
  }
  
  if (report.warnings.length > 0) {
    lines.push(`Avisos (${report.warnings.length}):`)
    for (const warning of report.warnings.slice(0, 10)) {
      lines.push(`  - Página ${warning.pageNumber}: ${warning.message}`)
    }
    if (report.warnings.length > 10) {
      lines.push(`  ... e mais ${report.warnings.length - 10} avisos`)
    }
  }
  
  return lines.join('\n')
}

/**
 * Check if project is ready for production
 * 
 * Property 25: Preflight Pass Condition
 */
export function isReadyForProduction(report: PreflightReport): boolean {
  return report.status !== 'fail'
}
