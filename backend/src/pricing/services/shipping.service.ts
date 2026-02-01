import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';

export interface ShippingRequest {
  originCep: string;
  destinationCep: string;
  weight: number; // em gramas
  dimensions: {
    length: number; // em cm
    width: number;
    height: number;
  };
  declaredValue: number;
  services?: string[]; // PAC, SEDEX, etc.
}

export interface ShippingOption {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number; // em dias úteis
  deliveryTimeMax?: number;
  currency: string;
  provider: 'correios' | 'transportadora' | 'custom';
  metadata?: Record<string, any>;
}

export interface ShippingResult {
  options: ShippingOption[];
  freeShippingThreshold?: number;
  estimatedDelivery?: {
    min: Date;
    max: Date;
  };
  metadata: {
    originCep: string;
    destinationCep: string;
    calculatedAt: Date;
    cacheKey: string;
  };
}

export interface CepInfo {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

@Injectable()
export class ShippingService {
  private readonly CACHE_TTL = 3600; // 1 hora
  private readonly FREE_SHIPPING_THRESHOLD = 150; // R$ 150

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async calculateShipping(request: ShippingRequest): Promise<ShippingResult> {
    try {
      this.logger.debug(
        `Calculando frete: ${request.originCep} -> ${request.destinationCep}`,
        'ShippingService',
        { weight: request.weight, declaredValue: request.declaredValue },
      );

      // Verificar cache
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.cacheManager.get<ShippingResult>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug('Frete servido do cache', 'ShippingService');
        return cachedResult;
      }

      // Validar CEPs
      await this.validateCeps(request.originCep, request.destinationCep);

      // Calcular opções de frete
      const options = await this.calculateShippingOptions(request);

      // Verificar frete grátis
      const freeShippingThreshold = await this.getFreeShippingThreshold(request.destinationCep);
      
      // Aplicar frete grátis se aplicável
      if (request.declaredValue >= freeShippingThreshold) {
        options.forEach(option => {
          if (option.service === 'PAC' || option.service === 'SEDEX') {
            option.price = 0;
            option.metadata = { ...option.metadata, freeShipping: true };
          }
        });
      }

      // Calcular estimativa de entrega
      const estimatedDelivery = this.calculateEstimatedDelivery(options);

      const result: ShippingResult = {
        options,
        freeShippingThreshold,
        estimatedDelivery,
        metadata: {
          originCep: request.originCep,
          destinationCep: request.destinationCep,
          calculatedAt: new Date(),
          cacheKey,
        },
      };

      // Salvar no cache
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      this.logger.debug(
        `Frete calculado: ${options.length} opções`,
        'ShippingService',
        { cheapest: Math.min(...options.map(o => o.price)) },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Erro no cálculo de frete',
        error.stack,
        'ShippingService',
        { request },
      );
      throw error;
    }
  }

  async getCepInfo(cep: string): Promise<CepInfo> {
    try {
      const cleanCep = this.cleanCep(cep);
      
      // Verificar cache
      const cacheKey = `cep:${cleanCep}`;
      const cachedInfo = await this.cacheManager.get<CepInfo>(cacheKey);
      
      if (cachedInfo) {
        return cachedInfo;
      }

      // Consultar API dos Correios ou ViaCEP
      const cepInfo = await this.fetchCepInfo(cleanCep);

      // Salvar no cache por 24 horas
      await this.cacheManager.set(cacheKey, cepInfo, 86400);

      return cepInfo;
    } catch (error) {
      this.logger.error('Erro ao consultar CEP', error.stack, 'ShippingService');
      throw new Error(`CEP inválido: ${cep}`);
    }
  }

  private async calculateShippingOptions(request: ShippingRequest): Promise<ShippingOption[]> {
    const options: ShippingOption[] = [];

    // Usar mock para desenvolvimento
    if (this.configService.get('features.mockExternalServices')) {
      return this.getMockShippingOptions(request);
    }

    // Calcular frete pelos Correios
    const correiosOptions = await this.calculateCorreiosShipping(request);
    options.push(...correiosOptions);

    // Calcular frete por transportadoras
    const transportadoraOptions = await this.calculateTransportadoraShipping(request);
    options.push(...transportadoraOptions);

    // Ordenar por preço
    return options.sort((a, b) => a.price - b.price);
  }

  private async calculateCorreiosShipping(request: ShippingRequest): Promise<ShippingOption[]> {
    const options: ShippingOption[] = [];

    try {
      // Serviços dos Correios
      const services = request.services || ['04014', '04510']; // PAC e SEDEX

      for (const service of services) {
        const result = await this.callCorreiosAPI(service, request);
        
        if (result.success) {
          options.push({
            service: result.code,
            serviceName: result.name,
            price: parseFloat(result.price),
            deliveryTime: parseInt(result.deliveryTime),
            currency: 'BRL',
            provider: 'correios',
            metadata: {
              code: result.code,
              error: result.error,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn('Erro ao calcular frete Correios', 'ShippingService', { error: error.message });
    }

    return options;
  }

  private async calculateTransportadoraShipping(request: ShippingRequest): Promise<ShippingOption[]> {
    const options: ShippingOption[] = [];

    try {
      // Calcular frete por transportadora baseado em tabela
      const transportadoraPrice = this.calculateTransportadoraPrice(request);
      const deliveryTime = this.calculateTransportadoraDeliveryTime(request);

      options.push({
        service: 'TRANSPORTADORA',
        serviceName: 'Transportadora Expressa',
        price: transportadoraPrice,
        deliveryTime,
        currency: 'BRL',
        provider: 'transportadora',
        metadata: {
          type: 'express',
        },
      });
    } catch (error) {
      this.logger.warn('Erro ao calcular frete transportadora', 'ShippingService');
    }

    return options;
  }

  private async callCorreiosAPI(service: string, request: ShippingRequest): Promise<any> {
    // TODO: Implementar chamada real para API dos Correios
    // Por enquanto, retornar dados mock
    return this.getMockCorreiosResponse(service, request);
  }

  private calculateTransportadoraPrice(request: ShippingRequest): number {
    // Cálculo baseado em peso e distância (simplificado)
    const basePrice = 15.00;
    const weightFactor = request.weight / 1000; // kg
    const volumeFactor = (request.dimensions.length * request.dimensions.width * request.dimensions.height) / 1000000; // m³
    
    return basePrice + (weightFactor * 5) + (volumeFactor * 100);
  }

  private calculateTransportadoraDeliveryTime(request: ShippingRequest): number {
    // Tempo baseado na região (simplificado)
    const destUf = request.destinationCep.substring(0, 2);
    
    // Tempos por região (dias úteis)
    const deliveryTimes: Record<string, number> = {
      '01': 2, // SP
      '02': 3, // RJ
      '03': 4, // MG
      '04': 5, // RS
      '05': 6, // PR
      '06': 7, // SC
      '07': 8, // BA
      '08': 10, // Outros
    };

    return deliveryTimes[destUf] || 10;
  }

  private async validateCeps(originCep: string, destinationCep: string): Promise<void> {
    const cleanOrigin = this.cleanCep(originCep);
    const cleanDestination = this.cleanCep(destinationCep);

    if (!this.isValidCep(cleanOrigin)) {
      throw new Error(`CEP de origem inválido: ${originCep}`);
    }

    if (!this.isValidCep(cleanDestination)) {
      throw new Error(`CEP de destino inválido: ${destinationCep}`);
    }
  }

  private cleanCep(cep: string): string {
    return cep.replace(/\D/g, '');
  }

  private isValidCep(cep: string): boolean {
    return /^\d{8}$/.test(cep);
  }

  private async fetchCepInfo(cep: string): Promise<CepInfo> {
    try {
      // Consultar API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao consultar ViaCEP');
      }

      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      return {
        cep: data.cep,
        logradouro: data.logradouro || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || '',
        ibge: data.ibge || '',
        gia: data.gia || '',
        ddd: data.ddd || '',
        siafi: data.siafi || '',
      };
    } catch (error) {
      this.logger.warn('Erro ao consultar ViaCEP, usando mock', 'ShippingService', { cep });
      return this.getMockCepInfo(cep);
    }
  }

  private async getFreeShippingThreshold(destinationCep: string): Promise<number> {
    // Pode variar por região
    return this.FREE_SHIPPING_THRESHOLD;
  }

  private calculateEstimatedDelivery(options: ShippingOption[]): { min: Date; max: Date } | undefined {
    if (options.length === 0) {
      return undefined;
    }

    const minDays = Math.min(...options.map(o => o.deliveryTime));
    const maxDays = Math.max(...options.map(o => o.deliveryTimeMax || o.deliveryTime));

    const now = new Date();
    const minDate = new Date(now);
    const maxDate = new Date(now);

    // Adicionar dias úteis
    minDate.setDate(minDate.getDate() + minDays);
    maxDate.setDate(maxDate.getDate() + maxDays);

    return { min: minDate, max: maxDate };
  }

  private generateCacheKey(request: ShippingRequest): string {
    const keyData = {
      origin: request.originCep,
      destination: request.destinationCep,
      weight: request.weight,
      dimensions: request.dimensions,
      value: Math.floor(request.declaredValue / 10) * 10, // Arredondar para cache
    };

    return `shipping:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  // Métodos mock para desenvolvimento
  private getMockShippingOptions(request: ShippingRequest): ShippingOption[] {
    const basePrice = 15.00;
    const weightFactor = request.weight / 1000;
    
    return [
      {
        service: '04014',
        serviceName: 'SEDEX',
        price: basePrice + (weightFactor * 8),
        deliveryTime: 2,
        deliveryTimeMax: 3,
        currency: 'BRL',
        provider: 'correios',
        metadata: { mock: true },
      },
      {
        service: '04510',
        serviceName: 'PAC',
        price: basePrice + (weightFactor * 5),
        deliveryTime: 5,
        deliveryTimeMax: 7,
        currency: 'BRL',
        provider: 'correios',
        metadata: { mock: true },
      },
      {
        service: 'TRANSPORTADORA',
        serviceName: 'Transportadora Expressa',
        price: this.calculateTransportadoraPrice(request),
        deliveryTime: this.calculateTransportadoraDeliveryTime(request),
        currency: 'BRL',
        provider: 'transportadora',
        metadata: { mock: true },
      },
    ];
  }

  private getMockCorreiosResponse(service: string, request: ShippingRequest): any {
    const serviceNames: Record<string, string> = {
      '04014': 'SEDEX',
      '04510': 'PAC',
    };

    const basePrice = service === '04014' ? 25.00 : 15.00;
    const deliveryTime = service === '04014' ? 2 : 5;

    return {
      success: true,
      code: service,
      name: serviceNames[service] || 'Serviço',
      price: (basePrice + (request.weight / 1000) * 5).toFixed(2),
      deliveryTime: deliveryTime.toString(),
      error: null,
    };
  }

  private getMockCepInfo(cep: string): CepInfo {
    return {
      cep,
      logradouro: 'Rua Exemplo',
      complemento: '',
      bairro: 'Centro',
      localidade: 'São Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    };
  }

  // Método para invalidar cache
  async invalidateCache(cep?: string): Promise<void> {
    if (cep) {
      const cleanCep = this.cleanCep(cep);
      await this.cacheManager.del(`cep:${cleanCep}`);
    } else {
      // Invalidar todo o cache de frete (não recomendado em produção)
      await this.cacheManager.reset();
    }

    this.logger.debug('Cache de frete invalidado', 'ShippingService', { cep });
  }

  // Método para configurar regras de frete grátis
  async setFreeShippingRules(tenantId: string, rules: any): Promise<void> {
    // TODO: Implementar persistência de regras de frete grátis
    this.logger.debug('Regras de frete grátis configuradas', 'ShippingService', { tenantId, rules });
  }
}