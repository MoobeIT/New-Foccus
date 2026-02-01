/**
 * DPI Validation Service
 * 
 * Property 14: Effective DPI Calculation
 * Property 15: DPI Warning Classification
 * Validates: Requirements 7.5, 8.1, 8.2, 8.3, 8.4
 */

export interface DPIValidationResult {
  effectiveDPI: number
  status: 'optimal' | 'acceptable' | 'low'
  message: string
  color: string
}

export interface ImageDimensions {
  originalWidth: number  // pixels
  originalHeight: number // pixels
  printWidth: number     // mm
  printHeight: number    // mm
}

/**
 * Calculate effective DPI based on original image size and print size
 * Formula: effectiveDPI = originalPixels / printSizeInches
 * where printSizeInches = printSizeMM / 25.4
 */
export function calculateEffectiveDPI(dimensions: ImageDimensions): number {
  const { originalWidth, originalHeight, printWidth, printHeight } = dimensions
  
  // Convert mm to inches (1 inch = 25.4mm)
  const printWidthInches = printWidth / 25.4
  const printHeightInches = printHeight / 25.4
  
  // Calculate DPI for both dimensions
  const dpiWidth = originalWidth / printWidthInches
  const dpiHeight = originalHeight / printHeightInches
  
  // Return the lower of the two (worst case)
  return Math.min(dpiWidth, dpiHeight)
}

/**
 * Classify DPI into status categories
 * 
 * Property 15: DPI Warning Classification
 * - DPI < 150: red warning (low)
 * - 150 ≤ DPI < 300: yellow warning (acceptable)
 * - DPI ≥ 300: green indicator (optimal)
 */
export function classifyDPI(dpi: number): DPIValidationResult {
  if (dpi < 150) {
    return {
      effectiveDPI: dpi,
      status: 'low',
      message: 'Resolução baixa - pode resultar em impressão pixelada',
      color: '#ef4444' // red
    }
  }
  
  if (dpi < 300) {
    return {
      effectiveDPI: dpi,
      status: 'acceptable',
      message: 'Resolução aceitável - qualidade razoável para impressão',
      color: '#f59e0b' // yellow/amber
    }
  }
  
  return {
    effectiveDPI: dpi,
    status: 'optimal',
    message: 'Resolução ótima - qualidade profissional',
    color: '#22c55e' // green
  }
}

/**
 * Validate image for print quality
 */
export function validateImageDPI(dimensions: ImageDimensions): DPIValidationResult {
  const effectiveDPI = calculateEffectiveDPI(dimensions)
  return classifyDPI(effectiveDPI)
}

/**
 * Check if image meets minimum DPI requirement for preflight
 * Minimum for preflight warning: 200 DPI
 */
export function meetsPreflightDPI(dpi: number, minDPI: number = 200): boolean {
  return dpi >= minDPI
}

/**
 * Calculate maximum print size for a given DPI target
 */
export function calculateMaxPrintSize(
  originalWidth: number,
  originalHeight: number,
  targetDPI: number = 300
): { maxWidth: number; maxHeight: number } {
  // Convert pixels to inches at target DPI, then to mm
  const maxWidthInches = originalWidth / targetDPI
  const maxHeightInches = originalHeight / targetDPI
  
  return {
    maxWidth: maxWidthInches * 25.4, // mm
    maxHeight: maxHeightInches * 25.4 // mm
  }
}

/**
 * Get recommended scale factor to achieve target DPI
 */
export function getRecommendedScale(
  currentDPI: number,
  targetDPI: number = 300
): number {
  if (currentDPI >= targetDPI) return 1
  return currentDPI / targetDPI
}
