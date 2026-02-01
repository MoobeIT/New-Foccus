/**
 * Spine Width Calculator Service
 * 
 * Property 7: Spine Width Calculation Formula
 * Property 8: Spine Width Precision
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

export interface SpineCalculationInput {
  pageCount: number
  paperThickness: number // mm per sheet
  bindingTolerance: number // mm (depends on cover type)
}

export interface SpineCalculationResult {
  spineWidth: number // mm, rounded to 0.5mm
  rawSpineWidth: number // mm, before rounding
  formula: string
}

export interface CoverSpreadDimensions {
  totalWidth: number // mm
  totalHeight: number // mm
  frontWidth: number // mm
  spineWidth: number // mm
  backWidth: number // mm
  bleed: number // mm
}

/**
 * Calculate spine width based on page count, paper thickness, and binding tolerance
 * 
 * Formula: spineWidth = (pageCount × paperThickness) + bindingTolerance
 * 
 * Property 7: Spine Width Calculation Formula
 * Validates: Requirements 3.1, 3.2, 3.4
 */
export function calculateSpineWidth(input: SpineCalculationInput): SpineCalculationResult {
  const { pageCount, paperThickness, bindingTolerance } = input

  // Calculate raw spine width
  const rawSpineWidth = (pageCount * paperThickness) + bindingTolerance

  // Round to nearest 0.5mm (Property 8)
  const spineWidth = roundToHalfMm(rawSpineWidth)

  return {
    spineWidth,
    rawSpineWidth,
    formula: `(${pageCount} páginas × ${paperThickness}mm) + ${bindingTolerance}mm = ${rawSpineWidth.toFixed(2)}mm → ${spineWidth}mm`
  }
}

/**
 * Round value to nearest 0.5mm
 * 
 * Property 8: Spine Width Precision
 * Validates: Requirements 3.3
 */
export function roundToHalfMm(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * Get binding tolerance based on cover type
 * 
 * Validates: Requirements 3.4
 */
export function getBindingTolerance(coverType: 'soft' | 'hard' | 'premium'): number {
  switch (coverType) {
    case 'soft':
      return 0 // No extra tolerance for soft cover
    case 'hard':
      return 2 // 2mm extra for hard cover binding
    case 'premium':
      return 3 // 3mm extra for premium binding
    default:
      return 0
  }
}

/**
 * Calculate cover spread dimensions including spine
 * 
 * Property 23: Cover PDF Spread Dimensions
 * Validates: Requirements 14.4
 * 
 * Cover spread = front + spine + back + bleeds on all sides
 * Width = bleed + pageWidth + spine + pageWidth + bleed
 */
export function calculateCoverSpreadDimensions(
  pageWidth: number,
  pageHeight: number,
  spineWidth: number,
  bleed: number
): CoverSpreadDimensions {
  // Total width = bleed + front + spine + back + bleed
  const totalWidth = (2 * bleed) + pageWidth + spineWidth + pageWidth

  // Total height = bleed + pageHeight + bleed
  const totalHeight = (2 * bleed) + pageHeight

  return {
    totalWidth,
    totalHeight,
    frontWidth: pageWidth,
    spineWidth,
    backWidth: pageWidth,
    bleed
  }
}

/**
 * Estimate spine width from page count using default paper thickness
 * Useful for quick estimates before paper selection
 */
export function estimateSpineWidth(
  pageCount: number,
  coverType: 'soft' | 'hard' | 'premium' = 'hard',
  paperType: 'standard' | 'photo' | 'premium' = 'photo'
): number {
  // Default paper thicknesses (mm per sheet)
  const paperThicknesses = {
    standard: 0.15, // Couché 170g
    photo: 0.25,    // Fotográfico 230g
    premium: 0.35   // Premium 300g
  }

  const paperThickness = paperThicknesses[paperType]
  const bindingTolerance = getBindingTolerance(coverType)

  const result = calculateSpineWidth({
    pageCount,
    paperThickness,
    bindingTolerance
  })

  return result.spineWidth
}

/**
 * Calculate minimum and maximum spine width for a format
 */
export function calculateSpineRange(
  minPages: number,
  maxPages: number,
  paperThickness: number,
  bindingTolerance: number
): { minSpine: number; maxSpine: number } {
  const minResult = calculateSpineWidth({
    pageCount: minPages,
    paperThickness,
    bindingTolerance
  })

  const maxResult = calculateSpineWidth({
    pageCount: maxPages,
    paperThickness,
    bindingTolerance
  })

  return {
    minSpine: minResult.spineWidth,
    maxSpine: maxResult.spineWidth
  }
}

/**
 * Validate spine width is within acceptable range
 */
export function validateSpineWidth(
  spineWidth: number,
  minSpine: number = 3,
  maxSpine: number = 50
): { isValid: boolean; message: string | null } {
  if (spineWidth < minSpine) {
    return {
      isValid: false,
      message: `Lombada muito fina (${spineWidth}mm). Mínimo: ${minSpine}mm`
    }
  }

  if (spineWidth > maxSpine) {
    return {
      isValid: false,
      message: `Lombada muito grossa (${spineWidth}mm). Máximo: ${maxSpine}mm`
    }
  }

  return {
    isValid: true,
    message: null
  }
}
