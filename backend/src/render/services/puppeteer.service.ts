import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';

export interface RenderOptions {
  width: number;
  height: number;
  dpi?: number;
  format?: 'png' | 'jpeg' | 'pdf';
  quality?: number;
  background?: string;
  timeout?: number;
}

export interface PdfRenderOptions extends RenderOptions {
  includeBleed?: boolean;
  includeCropMarks?: boolean;
  colorProfile?: string;
}

@Injectable()
export class PuppeteerService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeBrowser();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.debug('Puppeteer browser fechado', 'PuppeteerService');
    }
  }

  private async initializeBrowser(): Promise<void> {
    try {
      // Verificar se deve usar mock
      if (this.configService.get('render.useMock')) {
        this.logger.debug('Usando mock do Puppeteer para desenvolvimento', 'PuppeteerService');
        this.isInitialized = true;
        return;
      }

      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        defaultViewport: null,
      });

      this.isInitialized = true;
      this.logger.debug('Puppeteer browser inicializado', 'PuppeteerService');
    } catch (error) {
      this.logger.error('Erro ao inicializar Puppeteer', error.stack, 'PuppeteerService');
      throw error;
    }
  }

  async renderHtml(html: string, css: string, options: RenderOptions): Promise<Buffer> {
    if (this.configService.get('render.useMock')) {
      return this.mockRender(options);
    }

    if (!this.isInitialized || !this.browser) {
      await this.initializeBrowser();
    }

    const page = await this.browser.newPage();

    try {
      // Configurar viewport
      await page.setViewport({
        width: options.width,
        height: options.height,
        deviceScaleFactor: options.dpi ? options.dpi / 96 : 2, // 96 DPI base
      });

      // Configurar timeout
      const timeout = options.timeout || this.configService.get('render.previewTimeout') || 30000;
      page.setDefaultTimeout(timeout);

      // Construir HTML completo
      const fullHtml = this.buildFullHtml(html, css, options);

      // Carregar conteúdo
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout,
      });

      // Aguardar renderização completa
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', () => resolve());
          }
        });
      });

      // Renderizar baseado no formato
      let result: Buffer;

      if (options.format === 'pdf') {
        result = await this.renderToPdf(page, options as PdfRenderOptions);
      } else {
        result = await this.renderToImage(page, options);
      }

      return result;
    } catch (error) {
      this.logger.error('Erro na renderização com Puppeteer', error.stack, 'PuppeteerService');
      throw error;
    } finally {
      await page.close();
    }
  }

  private async renderToImage(page: Page, options: RenderOptions): Promise<Buffer> {
    const screenshotOptions: any = {
      type: options.format || 'png',
      fullPage: true,
    };

    if (options.format === 'jpeg') {
      screenshotOptions.quality = options.quality || 90;
    }

    if (options.background) {
      screenshotOptions.omitBackground = false;
    }

    const result = await page.screenshot(screenshotOptions);
    return Buffer.from(result);
  }

  private async renderToPdf(page: Page, options: PdfRenderOptions): Promise<Buffer> {
    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    };

    // Configurar dimensões customizadas se fornecidas
    if (options.width && options.height) {
      pdfOptions.width = `${options.width}mm`;
      pdfOptions.height = `${options.height}mm`;
    }

    return page.pdf(pdfOptions);
  }

  private buildFullHtml(html: string, css: string, options: RenderOptions): string {
    const backgroundColor = options.background || '#ffffff';
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Render</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            background-color: ${backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: ${options.width}px;
            height: ${options.height}px;
            overflow: hidden;
          }
          
          .page {
            width: ${options.width}px;
            height: ${options.height}px;
            position: relative;
            background: white;
          }
          
          .element {
            position: absolute;
          }
          
          .photo-element img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .text-element {
            display: flex;
            align-items: center;
            justify-content: center;
            word-wrap: break-word;
            overflow: hidden;
          }
          
          /* Guias de sangria e área segura (apenas para preview) */
          .guides {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
          }
          
          .bleed-guide {
            position: absolute;
            border: 1px dashed #ff0000;
            opacity: 0.3;
          }
          
          .safe-area-guide {
            position: absolute;
            border: 1px dashed #00ff00;
            opacity: 0.3;
          }
          
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
  }

  private async mockRender(options: RenderOptions): Promise<Buffer> {
    // Simular tempo de processamento
    const processingTime = 100 + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Gerar imagem mock baseada nas dimensões
    const sharp = require('sharp');
    
    const mockImage = await sharp({
      create: {
        width: options.width,
        height: options.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
    .png()
    .toBuffer();

    this.logger.debug(`Mock render gerado: ${options.width}x${options.height}`, 'PuppeteerService');
    
    return mockImage;
  }

  // Método para verificar se Puppeteer está funcionando
  async healthCheck(): Promise<boolean> {
    if (this.configService.get('render.useMock')) {
      return true;
    }

    try {
      if (!this.isInitialized || !this.browser) {
        await this.initializeBrowser();
      }

      const page = await this.browser.newPage();
      await page.setContent('<html><body><h1>Health Check</h1></body></html>');
      await page.close();

      return true;
    } catch (error) {
      this.logger.error('Health check do Puppeteer falhou', error.stack, 'PuppeteerService');
      return false;
    }
  }

  // Método para obter informações do browser
  async getBrowserInfo(): Promise<{
    version: string;
    userAgent: string;
    isConnected: boolean;
  }> {
    if (this.configService.get('render.useMock')) {
      return {
        version: 'Mock Browser 1.0.0',
        userAgent: 'Mock User Agent',
        isConnected: true,
      };
    }

    try {
      if (!this.isInitialized || !this.browser) {
        await this.initializeBrowser();
      }

      const version = await this.browser.version();
      const userAgent = await this.browser.userAgent();
      const isConnected = this.browser.isConnected();

      return {
        version,
        userAgent,
        isConnected,
      };
    } catch (error) {
      this.logger.error('Erro ao obter informações do browser', error.stack, 'PuppeteerService');
      return {
        version: 'Unknown',
        userAgent: 'Unknown',
        isConnected: false,
      };
    }
  }
}