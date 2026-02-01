import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

export interface ThemeConfig {
  // Cores
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  
  // Logo e branding
  logo?: string;
  favicon?: string;
  brandName?: string;
  
  // Layout
  headerStyle?: 'default' | 'minimal' | 'centered';
  footerStyle?: 'default' | 'minimal' | 'extended';
  sidebarPosition?: 'left' | 'right' | 'none';
  
  // Tipografia
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  
  // Customizações CSS
  customCSS?: string;
  
  // Configurações de produto
  showPrices?: boolean;
  showDiscounts?: boolean;
  enableWishlist?: boolean;
  
  // Configurações de checkout
  checkoutStyle?: 'single-page' | 'multi-step';
  paymentMethods?: string[];
  
  // Configurações de email
  emailTemplate?: string;
  emailColors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
}

export interface TenantSettings {
  // Configurações de usuário
  allowRegistration?: boolean;
  requireEmailVerification?: boolean;
  maxProjectsPerUser?: number;
  maxAssetsPerProject?: number;
  
  // Configurações de produto
  enableProductReviews?: boolean;
  enableProductComments?: boolean;
  autoApproveReviews?: boolean;
  
  // Configurações de upload
  maxFileSize?: number;
  allowedFileTypes?: string[];
  enableImageOptimization?: boolean;
  
  // Configurações de notificação
  enableEmailNotifications?: boolean;
  enableSMSNotifications?: boolean;
  enablePushNotifications?: boolean;
  
  // Configurações de pagamento
  enablePIX?: boolean;
  enableCreditCard?: boolean;
  enableBankSlip?: boolean;
  
  // Configurações de frete
  enableShipping?: boolean;
  freeShippingThreshold?: number;
  defaultShippingMethod?: string;
  
  // Configurações de produção
  enableAutoProduction?: boolean;
  productionLeadTime?: number;
  qualityCheckRequired?: boolean;
  
  // Configurações de LGPD
  enableDataExport?: boolean;
  enableDataDeletion?: boolean;
  dataRetentionDays?: number;
  
  // Configurações de analytics
  enableAnalytics?: boolean;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  
  // Configurações de SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  
  // Configurações de API
  enablePublicAPI?: boolean;
  apiRateLimit?: number;
  webhookUrl?: string;
}

@Injectable()
export class TenantThemeService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async getThemeConfig(tenantId: string): Promise<ThemeConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { themeConfig: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const config = typeof tenant.themeConfig === 'string' 
      ? JSON.parse(tenant.themeConfig || '{}') 
      : tenant.themeConfig;

    return this.mergeWithDefaults(config as ThemeConfig);
  }

  async updateThemeConfig(tenantId: string, config: Partial<ThemeConfig>): Promise<ThemeConfig> {
    const currentConfig = await this.getThemeConfig(tenantId);
    const newConfig = { ...currentConfig, ...config };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { themeConfig: JSON.stringify(newConfig) },
    });

    this.logger.info('Theme config updated', 'TenantThemeService', { tenantId });

    return newConfig;
  }

  async getSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const settings = typeof tenant.settings === 'string' 
      ? JSON.parse(tenant.settings || '{}') 
      : tenant.settings;

    return this.mergeSettingsWithDefaults(settings as TenantSettings);
  }

  async updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const currentSettings = await this.getSettings(tenantId);
    const newSettings = { ...currentSettings, ...settings };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: JSON.stringify(newSettings) },
    });

    this.logger.info('Tenant settings updated', 'TenantThemeService', { tenantId });

    return newSettings;
  }

  async resetThemeToDefault(tenantId: string): Promise<ThemeConfig> {
    const defaultConfig = this.getDefaultThemeConfig();

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { themeConfig: JSON.stringify(defaultConfig) },
    });

    this.logger.info('Theme reset to default', 'TenantThemeService', { tenantId });

    return defaultConfig;
  }

  async resetSettingsToDefault(tenantId: string): Promise<TenantSettings> {
    const defaultSettings = this.getDefaultSettings();

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: JSON.stringify(defaultSettings) },
    });

    this.logger.info('Settings reset to default', 'TenantThemeService', { tenantId });

    return defaultSettings;
  }

  private mergeWithDefaults(config: ThemeConfig): ThemeConfig {
    const defaults = this.getDefaultThemeConfig();
    return { ...defaults, ...config };
  }

  private mergeSettingsWithDefaults(settings: TenantSettings): TenantSettings {
    const defaults = this.getDefaultSettings();
    return { ...defaults, ...settings };
  }

  private getDefaultThemeConfig(): ThemeConfig {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#64748B',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      logo: null,
      favicon: null,
      brandName: 'Editor de Produtos',
      headerStyle: 'default',
      footerStyle: 'default',
      sidebarPosition: 'left',
      fontFamily: 'Inter, sans-serif',
      fontSize: 'medium',
      customCSS: '',
      showPrices: true,
      showDiscounts: true,
      enableWishlist: true,
      checkoutStyle: 'multi-step',
      paymentMethods: ['pix', 'credit_card', 'bank_slip'],
      emailTemplate: 'default',
      emailColors: {
        primary: '#3B82F6',
        secondary: '#64748B',
        text: '#1F2937',
      },
    };
  }

  private getDefaultSettings(): TenantSettings {
    return {
      allowRegistration: true,
      requireEmailVerification: false,
      maxProjectsPerUser: 50,
      maxAssetsPerProject: 100,
      enableProductReviews: true,
      enableProductComments: true,
      autoApproveReviews: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'],
      enableImageOptimization: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      enablePushNotifications: true,
      enablePIX: true,
      enableCreditCard: true,
      enableBankSlip: true,
      enableShipping: true,
      freeShippingThreshold: 100,
      defaultShippingMethod: 'correios',
      enableAutoProduction: false,
      productionLeadTime: 5,
      qualityCheckRequired: true,
      enableDataExport: true,
      enableDataDeletion: true,
      dataRetentionDays: 730,
      enableAnalytics: false,
      googleAnalyticsId: null,
      facebookPixelId: null,
      metaTitle: 'Editor de Produtos Personalizados',
      metaDescription: 'Crie produtos personalizados únicos com nosso editor online',
      metaKeywords: 'produtos personalizados, editor online, impressão',
      enablePublicAPI: false,
      apiRateLimit: 100,
      webhookUrl: null,
    };
  }
}