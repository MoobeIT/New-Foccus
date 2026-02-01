import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SpineCalculationInput {
  pageCount: number;
  paperId: string;
  coverTypeId: string;
}

export interface SpineCalculationResult {
  spineWidth: number; // mm
  paperThickness: number; // mm per sheet
  bindingTolerance: number; // mm
  formula: string;
}

@Injectable()
export class SpineCalculatorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate spine width based on page count, paper thickness, and cover type
   * Formula: (pageCount × paperThickness) + bindingTolerance
   * 
   * Property 7: Spine Width Calculation Formula
   * Validates: Requirements 3.1, 3.2, 3.4
   */
  async calculateSpineWidth(input: SpineCalculationInput): Promise<SpineCalculationResult> {
    const { pageCount, paperId, coverTypeId } = input;

    // Get paper thickness
    const paper = await this.prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }

    // Get cover type binding tolerance
    const coverType = await this.prisma.coverType.findUnique({
      where: { id: coverTypeId },
    });

    if (!coverType) {
      throw new Error(`Cover type not found: ${coverTypeId}`);
    }

    const paperThickness = paper.thickness;
    const bindingTolerance = coverType.bindingTolerance;

    // Calculate raw spine width
    const rawSpineWidth = (pageCount * paperThickness) + bindingTolerance;

    // Round to nearest 0.5mm (Property 8: Spine Width Precision)
    const spineWidth = this.roundToHalfMm(rawSpineWidth);

    return {
      spineWidth,
      paperThickness,
      bindingTolerance,
      formula: `(${pageCount} × ${paperThickness}mm) + ${bindingTolerance}mm = ${rawSpineWidth.toFixed(2)}mm → ${spineWidth}mm`,
    };
  }

  /**
   * Calculate spine width with raw values (for testing without database)
   * 
   * Property 7: Spine Width Calculation Formula
   * Validates: Requirements 3.1, 3.2, 3.4
   */
  calculateSpineWidthRaw(
    pageCount: number,
    paperThickness: number,
    bindingTolerance: number,
  ): number {
    const rawSpineWidth = (pageCount * paperThickness) + bindingTolerance;
    return this.roundToHalfMm(rawSpineWidth);
  }

  /**
   * Round to nearest 0.5mm
   * 
   * Property 8: Spine Width Precision
   * Validates: Requirements 3.3
   */
  roundToHalfMm(value: number): number {
    return Math.round(value * 2) / 2;
  }

  /**
   * Calculate cover spread dimensions including spine
   * 
   * Property 23: Cover PDF Spread Dimensions
   * Validates: Requirements 14.4
   */
  calculateCoverSpreadDimensions(
    pageWidth: number,
    pageHeight: number,
    spineWidth: number,
    bleed: number,
  ): { width: number; height: number } {
    // Cover spread = front + spine + back + bleeds on all sides
    // Width = bleed + pageWidth + spine + pageWidth + bleed
    const width = (2 * bleed) + pageWidth + spineWidth + pageWidth;
    
    // Height = bleed + pageHeight + bleed
    const height = (2 * bleed) + pageHeight;

    return { width, height };
  }
}
