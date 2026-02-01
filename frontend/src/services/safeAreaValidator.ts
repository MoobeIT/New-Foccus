/**
 * Safe Area Validation Service
 * 
 * Property 16: Safe Area Violation Detection
 * Validates: Requirements 9.1, 9.2, 9.5
 */

export interface ElementBounds {
  x: number      // mm from page edge
  y: number      // mm from page edge
  width: number  // mm
  height: number // mm
}

export interface PageDimensions {
  width: number      // mm
  height: number     // mm
  bleed: number      // mm
  safeMargin: number // mm
  gutterMargin?: number // mm (for spread mode)
}

export interface SafeAreaViolation {
  type: 'top' | 'right' | 'bottom' | 'left' | 'gutter'
  overflow: number // mm outside safe area
  message: string
}

export interface SafeAreaValidationResult {
  isValid: boolean
  violations: SafeAreaViolation[]
  extendsToBleed: boolean
  inGutterZone: boolean
}

/**
 * Check if element is within safe area boundaries
 * 
 * Property 16: Safe Area Violation Detection
 * For any element, if any part extends beyond the safe area boundary
 * (page edge - safeMargin), a violation should be detected and reported.
 */
export function validateSafeArea(
  element: ElementBounds,
  page: PageDimensions
): SafeAreaValidationResult {
  const violations: SafeAreaViolation[] = []
  let extendsToBleed = false
  let inGutterZone = false

  // Calculate safe area boundaries
  const safeLeft = page.safeMargin
  const safeTop = page.safeMargin
  const safeRight = page.width - page.safeMargin
  const safeBottom = page.height - page.safeMargin

  // Calculate element edges
  const elementLeft = element.x
  const elementTop = element.y
  const elementRight = element.x + element.width
  const elementBottom = element.y + element.height

  // Check left boundary
  if (elementLeft < safeLeft) {
    const overflow = safeLeft - elementLeft
    violations.push({
      type: 'left',
      overflow,
      message: `Elemento ${overflow.toFixed(1)}mm fora da área segura (esquerda)`
    })
    
    // Check if extends to bleed
    if (elementLeft < 0) {
      extendsToBleed = true
    }
  }

  // Check top boundary
  if (elementTop < safeTop) {
    const overflow = safeTop - elementTop
    violations.push({
      type: 'top',
      overflow,
      message: `Elemento ${overflow.toFixed(1)}mm fora da área segura (topo)`
    })
    
    if (elementTop < 0) {
      extendsToBleed = true
    }
  }

  // Check right boundary
  if (elementRight > safeRight) {
    const overflow = elementRight - safeRight
    violations.push({
      type: 'right',
      overflow,
      message: `Elemento ${overflow.toFixed(1)}mm fora da área segura (direita)`
    })
    
    if (elementRight > page.width) {
      extendsToBleed = true
    }
  }

  // Check bottom boundary
  if (elementBottom > safeBottom) {
    const overflow = elementBottom - safeBottom
    violations.push({
      type: 'bottom',
      overflow,
      message: `Elemento ${overflow.toFixed(1)}mm fora da área segura (inferior)`
    })
    
    if (elementBottom > page.height) {
      extendsToBleed = true
    }
  }

  // Check gutter zone (for spread mode)
  if (page.gutterMargin) {
    const gutterCenter = page.width / 2
    const gutterLeft = gutterCenter - (page.gutterMargin / 2)
    const gutterRight = gutterCenter + (page.gutterMargin / 2)

    // Check if element crosses gutter
    if (elementLeft < gutterRight && elementRight > gutterLeft) {
      inGutterZone = true
      
      // Calculate how much is in the gutter
      const gutterOverlap = Math.min(elementRight, gutterRight) - Math.max(elementLeft, gutterLeft)
      
      violations.push({
        type: 'gutter',
        overflow: gutterOverlap,
        message: `Elemento cruza a área de dobra (${gutterOverlap.toFixed(1)}mm na lombada)`
      })
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    extendsToBleed,
    inGutterZone
  }
}

/**
 * Check if text is too close to edge (within 3mm of safe area)
 * 
 * Validates: Requirements 10.3
 */
export function validateTextNearEdge(
  element: ElementBounds,
  page: PageDimensions,
  warningDistance: number = 3 // mm
): { isNearEdge: boolean; warnings: string[] } {
  const warnings: string[] = []
  
  const safeLeft = page.safeMargin
  const safeTop = page.safeMargin
  const safeRight = page.width - page.safeMargin
  const safeBottom = page.height - page.safeMargin

  // Check distance from safe area boundaries
  const distanceFromLeft = element.x - safeLeft
  const distanceFromTop = element.y - safeTop
  const distanceFromRight = safeRight - (element.x + element.width)
  const distanceFromBottom = safeBottom - (element.y + element.height)

  if (distanceFromLeft >= 0 && distanceFromLeft < warningDistance) {
    warnings.push(`Texto muito próximo da margem esquerda (${distanceFromLeft.toFixed(1)}mm)`)
  }
  if (distanceFromTop >= 0 && distanceFromTop < warningDistance) {
    warnings.push(`Texto muito próximo da margem superior (${distanceFromTop.toFixed(1)}mm)`)
  }
  if (distanceFromRight >= 0 && distanceFromRight < warningDistance) {
    warnings.push(`Texto muito próximo da margem direita (${distanceFromRight.toFixed(1)}mm)`)
  }
  if (distanceFromBottom >= 0 && distanceFromBottom < warningDistance) {
    warnings.push(`Texto muito próximo da margem inferior (${distanceFromBottom.toFixed(1)}mm)`)
  }

  return {
    isNearEdge: warnings.length > 0,
    warnings
  }
}

/**
 * Check if important content (like faces) is in the gutter zone
 * 
 * Property 12: Gutter Warning Detection
 * For any element positioned in spread mode, if any part falls within
 * 10mm of the center gutter line, a warning should be generated.
 */
export function validateGutterContent(
  element: ElementBounds,
  pageWidth: number,
  gutterWarningZone: number = 10 // mm from center
): { inGutterZone: boolean; message: string | null } {
  const pageCenter = pageWidth / 2
  const gutterLeft = pageCenter - gutterWarningZone
  const gutterRight = pageCenter + gutterWarningZone

  const elementLeft = element.x
  const elementRight = element.x + element.width

  // Check if element crosses the gutter warning zone
  if (elementLeft < gutterRight && elementRight > gutterLeft) {
    return {
      inGutterZone: true,
      message: 'Conteúdo importante pode ficar oculto na dobra do livro'
    }
  }

  return {
    inGutterZone: false,
    message: null
  }
}

/**
 * Batch validate all elements on a page
 */
export function validatePageElements(
  elements: (ElementBounds & { id: string; type: string })[],
  page: PageDimensions
): Map<string, SafeAreaValidationResult> {
  const results = new Map<string, SafeAreaValidationResult>()

  for (const element of elements) {
    const result = validateSafeArea(element, page)
    results.set(element.id, result)
  }

  return results
}
