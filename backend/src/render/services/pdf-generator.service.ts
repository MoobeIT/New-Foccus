import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PDF Generator Service
 * 
 * Generates production-ready PDFs for photobooks
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */

export interface PDFOptions {
  includeBleed: boolean;
  bleedSize: number; // mm
  includeCropMarks: boolean;
  cropMarkOffset: number; // mm
  colorProfile: 'sRGB' | 'AdobeRGB' | 'CMYK';
  resolution: number; // DPI
  compression: 'none' | 'low' | 'medium' | 'high';
}

export interface PageContent {
  pageNumber: number;
  elements: ElementContent[];
  backgroundColor: string;
}

export interface ElementContent {
  id: string;
  type: 'image' | 'text' | 'shape';
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  rotation: number; // degrees
  // Image specific
  imageData?: Buffer;
  imageUrl?: string;
  // Text specific
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  // Shape specific
  shapeType?: 'rectangle' | 'circle';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ProjectDimensions {
  pageWidth: number; // mm
  pageHeight: number; // mm
  bleed: number; // mm
  spineWidth: number; // mm
}

export interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  pageCount: number;
  fileSizeBytes: number;
}

// Constants
const MM_TO_POINTS = 2.834645669; // 1mm = 2.834645669 points (72 points per inch)

@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  /**
   * Generate interior PDF (miolo)
   * 
   * Property 22: PDF Bleed Inclusion
   * Validates: Requirements 14.1, 14.2
   */
  async generateInteriorPDF(
    pages: PageContent[],
    dimensions: ProjectDimensions,
    options: PDFOptions,
    projectName: string,
  ): Promise<PDFGenerationResult> {
    this.logger.log(`Generating interior PDF for ${pages.length} pages`);

    const pdfDoc = await PDFDocument.create();
    
    // Calculate page dimensions with bleed
    const pageWidthPt = this.mmToPoints(dimensions.pageWidth + (options.includeBleed ? 2 * options.bleedSize : 0));
    const pageHeightPt = this.mmToPoints(dimensions.pageHeight + (options.includeBleed ? 2 * options.bleedSize : 0));

    // Embed standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Generate each page
    for (const pageContent of pages) {
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
      
      // Draw background
      this.drawBackground(page, pageContent.backgroundColor, pageWidthPt, pageHeightPt);

      // Draw elements
      for (const element of pageContent.elements) {
        await this.drawElement(page, element, options, font, fontBold, pdfDoc);
      }

      // Add crop marks if enabled
      if (options.includeCropMarks) {
        this.drawCropMarks(page, dimensions, options);
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    // Generate filename
    // Property 24: File Naming Convention
    const filename = this.generateFilename(projectName, 'MIOLO', dimensions, pages.length);

    return {
      buffer,
      filename,
      pageCount: pages.length,
      fileSizeBytes: buffer.length,
    };
  }

  /**
   * Generate cover PDF (capa)
   * 
   * Property 23: Cover PDF Generation
   * Validates: Requirements 14.3
   */
  async generateCoverPDF(
    frontCover: PageContent,
    backCover: PageContent,
    spine: PageContent | null,
    dimensions: ProjectDimensions,
    options: PDFOptions,
    projectName: string,
  ): Promise<PDFGenerationResult> {
    this.logger.log('Generating cover PDF');

    const pdfDoc = await PDFDocument.create();
    
    // Calculate total cover width (back + spine + front)
    const totalWidth = dimensions.pageWidth * 2 + dimensions.spineWidth;
    const coverWidthPt = this.mmToPoints(totalWidth + (options.includeBleed ? 2 * options.bleedSize : 0));
    const coverHeightPt = this.mmToPoints(dimensions.pageHeight + (options.includeBleed ? 2 * options.bleedSize : 0));

    const page = pdfDoc.addPage([coverWidthPt, coverHeightPt]);
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw back cover (left side)
    const bleedOffset = options.includeBleed ? options.bleedSize : 0;
    await this.drawCoverSection(page, backCover, 0, dimensions.pageWidth, dimensions, options, font, fontBold, pdfDoc);

    // Draw spine (center)
    if (spine) {
      await this.drawSpineSection(page, spine, dimensions.pageWidth, dimensions.spineWidth, dimensions, options, font, fontBold, pdfDoc);
    }

    // Draw front cover (right side)
    await this.drawCoverSection(page, frontCover, dimensions.pageWidth + dimensions.spineWidth, dimensions.pageWidth, dimensions, options, font, fontBold, pdfDoc);

    // Add crop marks if enabled
    if (options.includeCropMarks) {
      this.drawCoverCropMarks(page, dimensions, options);
    }

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const filename = this.generateFilename(projectName, 'CAPA', dimensions, 1);

    return {
      buffer,
      filename,
      pageCount: 1,
      fileSizeBytes: buffer.length,
    };
  }

  /**
   * Generate complete photobook PDF (interior + cover)
   * 
   * Validates: Requirements 14.4
   */
  async generateCompletePhotobook(
    interiorPages: PageContent[],
    frontCover: PageContent,
    backCover: PageContent,
    spine: PageContent | null,
    dimensions: ProjectDimensions,
    options: PDFOptions,
    projectName: string,
  ): Promise<{ interior: PDFGenerationResult; cover: PDFGenerationResult }> {
    this.logger.log(`Generating complete photobook: ${interiorPages.length} interior pages`);

    const [interior, cover] = await Promise.all([
      this.generateInteriorPDF(interiorPages, dimensions, options, projectName),
      this.generateCoverPDF(frontCover, backCover, spine, dimensions, options, projectName),
    ]);

    return { interior, cover };
  }

  /**
   * Generate preview PDF (low resolution for proofing)
   * 
   * Validates: Requirements 14.5
   */
  async generatePreviewPDF(
    pages: PageContent[],
    dimensions: ProjectDimensions,
    projectName: string,
  ): Promise<PDFGenerationResult> {
    const previewOptions: PDFOptions = {
      includeBleed: false,
      bleedSize: 0,
      includeCropMarks: false,
      cropMarkOffset: 0,
      colorProfile: 'sRGB',
      resolution: 72, // Low resolution for preview
      compression: 'high',
    };

    return this.generateInteriorPDF(pages, dimensions, previewOptions, `${projectName}_PREVIEW`);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private mmToPoints(mm: number): number {
    return mm * MM_TO_POINTS;
  }

  private pointsToMm(points: number): number {
    return points / MM_TO_POINTS;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      };
    }
    return { r: 1, g: 1, b: 1 }; // Default white
  }

  private drawBackground(page: PDFPage, backgroundColor: string, width: number, height: number): void {
    const color = this.hexToRgb(backgroundColor);
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(color.r, color.g, color.b),
    });
  }

  private async drawElement(
    page: PDFPage,
    element: ElementContent,
    options: PDFOptions,
    font: PDFFont,
    fontBold: PDFFont,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    const bleedOffset = options.includeBleed ? this.mmToPoints(options.bleedSize) : 0;
    const x = this.mmToPoints(element.x) + bleedOffset;
    const y = page.getHeight() - this.mmToPoints(element.y + element.height) - bleedOffset;
    const width = this.mmToPoints(element.width);
    const height = this.mmToPoints(element.height);

    switch (element.type) {
      case 'image':
        await this.drawImage(page, element, x, y, width, height, pdfDoc);
        break;
      case 'text':
        this.drawText(page, element, x, y, width, height, font, fontBold);
        break;
      case 'shape':
        this.drawShape(page, element, x, y, width, height);
        break;
    }
  }

  private async drawImage(
    page: PDFPage,
    element: ElementContent,
    x: number,
    y: number,
    width: number,
    height: number,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    try {
      let imageData = element.imageData;
      
      // Load image from URL if no buffer provided
      if (!imageData && element.imageUrl) {
        imageData = await this.loadImageFromUrl(element.imageUrl);
      }

      if (!imageData) {
        this.logger.warn(`No image data for element ${element.id}`);
        // Draw placeholder
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(0.9, 0.9, 0.9),
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });
        return;
      }

      // Detect image type and embed
      const isPng = this.isPngImage(imageData);
      const image = isPng 
        ? await pdfDoc.embedPng(imageData)
        : await pdfDoc.embedJpg(imageData);

      // Handle rotation
      if (element.rotation && element.rotation !== 0) {
        page.pushOperators();
        // Translate to center, rotate, translate back
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radians = (element.rotation * Math.PI) / 180;
        
        page.drawImage(image, {
          x,
          y,
          width,
          height,
          rotate: { type: 'degrees' as any, angle: element.rotation },
        });
      } else {
        page.drawImage(image, { x, y, width, height });
      }
    } catch (error) {
      this.logger.error(`Error drawing image: ${error.message}`);
      // Draw error placeholder
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(1, 0.8, 0.8),
        borderColor: rgb(1, 0, 0),
        borderWidth: 1,
      });
    }
  }

  private drawText(
    page: PDFPage,
    element: ElementContent,
    x: number,
    y: number,
    width: number,
    height: number,
    font: PDFFont,
    fontBold: PDFFont,
  ): void {
    if (!element.content) return;

    const selectedFont = element.fontWeight === 'bold' ? fontBold : font;
    const fontSize = element.fontSize || 12;
    const color = element.color ? this.hexToRgb(element.color) : { r: 0, g: 0, b: 0 };

    // Calculate text position based on alignment
    const textWidth = selectedFont.widthOfTextAtSize(element.content, fontSize);
    let textX = x;
    
    switch (element.alignment) {
      case 'center':
        textX = x + (width - textWidth) / 2;
        break;
      case 'right':
        textX = x + width - textWidth;
        break;
    }

    // Draw text (y is baseline position)
    page.drawText(element.content, {
      x: textX,
      y: y + height / 2 - fontSize / 2,
      size: fontSize,
      font: selectedFont,
      color: rgb(color.r, color.g, color.b),
    });
  }

  private drawShape(
    page: PDFPage,
    element: ElementContent,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const fillColor = element.fillColor ? this.hexToRgb(element.fillColor) : null;
    const strokeColor = element.strokeColor ? this.hexToRgb(element.strokeColor) : null;

    if (element.shapeType === 'circle') {
      const radius = Math.min(width, height) / 2;
      page.drawCircle({
        x: x + width / 2,
        y: y + height / 2,
        size: radius,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined,
        borderWidth: element.strokeWidth || 1,
      });
    } else {
      // Rectangle (default)
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined,
        borderWidth: element.strokeWidth || 1,
      });
    }
  }

  private drawCropMarks(page: PDFPage, dimensions: ProjectDimensions, options: PDFOptions): void {
    const bleedPt = this.mmToPoints(options.bleedSize);
    const cropMarkLength = this.mmToPoints(5); // 5mm crop marks
    const cropMarkOffset = this.mmToPoints(options.cropMarkOffset || 3);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const markColor = rgb(0, 0, 0);
    const lineWidth = 0.5;

    // Top-left corner
    // Horizontal
    page.drawLine({
      start: { x: bleedPt - cropMarkOffset - cropMarkLength, y: pageHeight - bleedPt },
      end: { x: bleedPt - cropMarkOffset, y: pageHeight - bleedPt },
      thickness: lineWidth,
      color: markColor,
    });
    // Vertical
    page.drawLine({
      start: { x: bleedPt, y: pageHeight - bleedPt + cropMarkOffset },
      end: { x: bleedPt, y: pageHeight - bleedPt + cropMarkOffset + cropMarkLength },
      thickness: lineWidth,
      color: markColor,
    });

    // Top-right corner
    page.drawLine({
      start: { x: pageWidth - bleedPt + cropMarkOffset, y: pageHeight - bleedPt },
      end: { x: pageWidth - bleedPt + cropMarkOffset + cropMarkLength, y: pageHeight - bleedPt },
      thickness: lineWidth,
      color: markColor,
    });
    page.drawLine({
      start: { x: pageWidth - bleedPt, y: pageHeight - bleedPt + cropMarkOffset },
      end: { x: pageWidth - bleedPt, y: pageHeight - bleedPt + cropMarkOffset + cropMarkLength },
      thickness: lineWidth,
      color: markColor,
    });

    // Bottom-left corner
    page.drawLine({
      start: { x: bleedPt - cropMarkOffset - cropMarkLength, y: bleedPt },
      end: { x: bleedPt - cropMarkOffset, y: bleedPt },
      thickness: lineWidth,
      color: markColor,
    });
    page.drawLine({
      start: { x: bleedPt, y: bleedPt - cropMarkOffset },
      end: { x: bleedPt, y: bleedPt - cropMarkOffset - cropMarkLength },
      thickness: lineWidth,
      color: markColor,
    });

    // Bottom-right corner
    page.drawLine({
      start: { x: pageWidth - bleedPt + cropMarkOffset, y: bleedPt },
      end: { x: pageWidth - bleedPt + cropMarkOffset + cropMarkLength, y: bleedPt },
      thickness: lineWidth,
      color: markColor,
    });
    page.drawLine({
      start: { x: pageWidth - bleedPt, y: bleedPt - cropMarkOffset },
      end: { x: pageWidth - bleedPt, y: bleedPt - cropMarkOffset - cropMarkLength },
      thickness: lineWidth,
      color: markColor,
    });
  }

  private drawCoverCropMarks(page: PDFPage, dimensions: ProjectDimensions, options: PDFOptions): void {
    // Similar to drawCropMarks but also includes spine fold marks
    this.drawCropMarks(page, dimensions, options);

    const bleedPt = this.mmToPoints(options.bleedSize);
    const pageHeight = page.getHeight();
    const spineStartX = this.mmToPoints(dimensions.pageWidth) + bleedPt;
    const spineEndX = spineStartX + this.mmToPoints(dimensions.spineWidth);
    const markLength = this.mmToPoints(5);

    const markColor = rgb(0, 0, 0);

    // Spine fold marks (top)
    page.drawLine({
      start: { x: spineStartX, y: pageHeight - bleedPt + 3 },
      end: { x: spineStartX, y: pageHeight - bleedPt + 3 + markLength },
      thickness: 0.5,
      color: markColor,
    });
    page.drawLine({
      start: { x: spineEndX, y: pageHeight - bleedPt + 3 },
      end: { x: spineEndX, y: pageHeight - bleedPt + 3 + markLength },
      thickness: 0.5,
      color: markColor,
    });

    // Spine fold marks (bottom)
    page.drawLine({
      start: { x: spineStartX, y: bleedPt - 3 },
      end: { x: spineStartX, y: bleedPt - 3 - markLength },
      thickness: 0.5,
      color: markColor,
    });
    page.drawLine({
      start: { x: spineEndX, y: bleedPt - 3 },
      end: { x: spineEndX, y: bleedPt - 3 - markLength },
      thickness: 0.5,
      color: markColor,
    });
  }

  private async drawCoverSection(
    page: PDFPage,
    content: PageContent,
    xOffset: number,
    sectionWidth: number,
    dimensions: ProjectDimensions,
    options: PDFOptions,
    font: PDFFont,
    fontBold: PDFFont,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    const bleedOffset = options.includeBleed ? options.bleedSize : 0;
    
    // Draw background for this section
    const bgColor = this.hexToRgb(content.backgroundColor);
    page.drawRectangle({
      x: this.mmToPoints(xOffset + bleedOffset),
      y: this.mmToPoints(bleedOffset),
      width: this.mmToPoints(sectionWidth),
      height: this.mmToPoints(dimensions.pageHeight),
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    // Draw elements with offset
    for (const element of content.elements) {
      const adjustedElement = {
        ...element,
        x: element.x + xOffset,
      };
      await this.drawElement(page, adjustedElement, options, font, fontBold, pdfDoc);
    }
  }

  private async drawSpineSection(
    page: PDFPage,
    content: PageContent,
    xOffset: number,
    spineWidth: number,
    dimensions: ProjectDimensions,
    options: PDFOptions,
    font: PDFFont,
    fontBold: PDFFont,
    pdfDoc: PDFDocument,
  ): Promise<void> {
    const bleedOffset = options.includeBleed ? options.bleedSize : 0;
    
    // Draw spine background
    const bgColor = this.hexToRgb(content.backgroundColor);
    page.drawRectangle({
      x: this.mmToPoints(xOffset + bleedOffset),
      y: this.mmToPoints(bleedOffset),
      width: this.mmToPoints(spineWidth),
      height: this.mmToPoints(dimensions.pageHeight),
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    // Draw spine elements (usually rotated text)
    for (const element of content.elements) {
      const adjustedElement = {
        ...element,
        x: element.x + xOffset,
      };
      await this.drawElement(page, adjustedElement, options, font, fontBold, pdfDoc);
    }
  }

  private async loadImageFromUrl(url: string): Promise<Buffer> {
    try {
      // Handle local file paths
      if (url.startsWith('file://') || url.startsWith('/') || url.match(/^[A-Z]:\\/i)) {
        const filePath = url.replace('file://', '');
        return fs.readFileSync(filePath);
      }

      // Handle HTTP URLs
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Error loading image from URL: ${url}`, error);
      throw error;
    }
  }

  private isPngImage(buffer: Buffer): boolean {
    // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  /**
   * Generate standardized filename
   * 
   * Property 24: File Naming Convention
   * Format: PROJETO_TIPO_WxH_PAGINAS_TIMESTAMP.pdf
   */
  private generateFilename(
    projectName: string,
    type: 'MIOLO' | 'CAPA',
    dimensions: ProjectDimensions,
    pageCount: number,
  ): string {
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const size = `${Math.round(dimensions.pageWidth)}x${Math.round(dimensions.pageHeight)}`;
    
    return `${sanitizedName}_${type}_${size}_${pageCount}P_${timestamp}.pdf`;
  }

  /**
   * Validate PDF generation parameters
   */
  validateParameters(
    pages: PageContent[],
    dimensions: ProjectDimensions,
    options: PDFOptions,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pages || pages.length === 0) {
      errors.push('No pages provided');
    }

    if (dimensions.pageWidth <= 0 || dimensions.pageHeight <= 0) {
      errors.push('Invalid page dimensions');
    }

    if (options.includeBleed && options.bleedSize <= 0) {
      errors.push('Bleed size must be positive when bleed is enabled');
    }

    if (options.resolution < 72 || options.resolution > 600) {
      errors.push('Resolution must be between 72 and 600 DPI');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate estimated file size
   */
  estimateFileSize(
    pageCount: number,
    dimensions: ProjectDimensions,
    options: PDFOptions,
    averageImageCount: number = 2,
  ): number {
    // Base PDF overhead
    let estimatedSize = 50 * 1024; // 50KB base

    // Per page overhead
    estimatedSize += pageCount * 10 * 1024; // 10KB per page

    // Image estimation (assuming average 500KB per image at 300 DPI)
    const imageSize = averageImageCount * pageCount * 500 * 1024;
    
    // Apply compression factor
    const compressionFactors = {
      none: 1.0,
      low: 0.8,
      medium: 0.5,
      high: 0.3,
    };
    
    estimatedSize += imageSize * compressionFactors[options.compression];

    return Math.round(estimatedSize);
  }
}