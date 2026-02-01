import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { ShippingService, ShippingRequest } from './shipping.service';
import { LoggerService } from '../../common/services/logger.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let cacheManager: jest.Mocked<any>;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockShippingRequest: ShippingRequest = {
    originCep: '01310-100',
    destinationCep: '04567-890',
    weight: 500,
    dimensions: {
      length: 30,
      width: 20,
      height: 5,
    },
    declaredValue: 100.00,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get(ConfigService);
    loggerService = module.get(LoggerService);
  });

  describe('calculateShipping', () => {
    it('deve calcular frete com múltiplas opções', async () => {
      configService.get.mockReturnValue(true); // mock external services
      cacheManager.get.mockResolvedValue(null);

      const result = await service.calculateShipping(mockShippingRequest);

      expect(result.options).toHaveLength(3); // SEDEX, PAC, Transportadora
      expect(result.options[0].provider).toBe('correios');
      expect(result.options[0].price).toBeGreaterThan(0);
      expect(result.options[0].deliveryTime).toBeGreaterThan(0);
      expect(result.freeShippingThreshold).toBe(150);
      expect(result.metadata.originCep).toBe(mockShippingRequest.originCep);
      expect(result.metadata.destinationCep).toBe(mockShippingRequest.destinationCep);
    });

    it('deve aplicar frete grátis quando valor for elegível', async () => {
      const highValueRequest = {
        ...mockShippingRequest,
        declaredValue: 200.00, // Acima do threshold de R$ 150
      };

      configService.get.mockReturnValue(true);
      cacheManager.get.mockResolvedValue(null);

      const result = await service.calculateShipping(highValueRequest);

      // Verificar se PAC e SEDEX ficaram gratuitos
      const pacOption = result.options.find(opt => opt.service === '04510');
      const sedexOption = result.options.find(opt => opt.service === '04014');

      expect(pacOption?.price).toBe(0);
      expect(sedexOption?.price).toBe(0);
      expect(pacOption?.metadata?.freeShipping).toBe(true);
      expect(sedexOption?.metadata?.freeShipping).toBe(true);
    });

    it('deve usar cache quando disponível', async () => {
      const cachedResult = {
        options: [
          {
            service: 'CACHED',
            serviceName: 'Cached Service',
            price: 10.00,
            deliveryTime: 3,
            currency: 'BRL',
            provider: 'correios',
          },
        ],
        metadata: { cached: true },
      };

      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.calculateShipping(mockShippingRequest);

      expect(result).toEqual(cachedResult);
      expect(configService.get).not.toHaveBeenCalled();
    });

    it('deve salvar resultado no cache', async () => {
      configService.get.mockReturnValue(true);
      cacheManager.get.mockResolvedValue(null);

      await service.calculateShipping(mockShippingRequest);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        3600, // TTL de 1 hora
      );
    });

    it('deve validar CEPs inválidos', async () => {
      const invalidRequest = {
        ...mockShippingRequest,
        destinationCep: '123', // CEP inválido
      };

      await expect(service.calculateShipping(invalidRequest)).rejects.toThrow(
        'CEP de destino inválido'
      );
    });

    it('deve calcular estimativa de entrega', async () => {
      configService.get.mockReturnValue(true);
      cacheManager.get.mockResolvedValue(null);

      const result = await service.calculateShipping(mockShippingRequest);

      expect(result.estimatedDelivery).toBeDefined();
      expect(result.estimatedDelivery!.min).toBeInstanceOf(Date);
      expect(result.estimatedDelivery!.max).toBeInstanceOf(Date);
      expect(result.estimatedDelivery!.max.getTime()).toBeGreaterThanOrEqual(
        result.estimatedDelivery!.min.getTime()
      );
    });
  });

  describe('getCepInfo', () => {
    it('deve retornar informações do CEP', async () => {
      const cep = '01310100';
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getCepInfo(cep);

      expect(result.cep).toBe(cep);
      expect(result.localidade).toBeDefined();
      expect(result.uf).toBeDefined();
      expect(result.logradouro).toBeDefined();
    });

    it('deve usar cache para CEP já consultado', async () => {
      const cep = '01310100';
      const cachedInfo = {
        cep,
        localidade: 'São Paulo',
        uf: 'SP',
        logradouro: 'Rua Cached',
      };

      cacheManager.get.mockResolvedValue(cachedInfo);

      const result = await service.getCepInfo(cep);

      expect(result).toEqual(cachedInfo);
    });

    it('deve limpar CEP formatado', async () => {
      const formattedCep = '01310-100';
      const cleanCep = '01310100';
      
      cacheManager.get.mockResolvedValue(null);

      await service.getCepInfo(formattedCep);

      // Verificar se foi usado o CEP limpo no cache
      expect(cacheManager.get).toHaveBeenCalledWith(`cep:${cleanCep}`);
    });

    it('deve rejeitar CEP inválido', async () => {
      const invalidCep = '123';

      await expect(service.getCepInfo(invalidCep)).rejects.toThrow(
        'CEP inválido: 123'
      );
    });
  });

  describe('invalidateCache', () => {
    it('deve invalidar cache específico do CEP', async () => {
      const cep = '01310-100';
      
      await service.invalidateCache(cep);

      expect(cacheManager.del).toHaveBeenCalledWith('cep:01310100');
    });

    it('deve invalidar todo o cache quando CEP não especificado', async () => {
      await service.invalidateCache();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    it('deve calcular preço de transportadora baseado em peso e volume', () => {
      const request = {
        ...mockShippingRequest,
        weight: 2000, // 2kg
        dimensions: { length: 40, width: 30, height: 10 }, // Volume maior
      };

      const price = (service as any).calculateTransportadoraPrice(request);

      expect(price).toBeGreaterThan(15.00); // Preço base
      expect(typeof price).toBe('number');
    });

    it('deve calcular tempo de entrega baseado na região', () => {
      const spRequest = { ...mockShippingRequest, destinationCep: '01000000' }; // SP
      const rjRequest = { ...mockShippingRequest, destinationCep: '20000000' }; // RJ

      const spTime = (service as any).calculateTransportadoraDeliveryTime(spRequest);
      const rjTime = (service as any).calculateTransportadoraDeliveryTime(rjRequest);

      expect(spTime).toBeLessThanOrEqual(rjTime); // SP deve ser mais rápido
      expect(spTime).toBeGreaterThan(0);
      expect(rjTime).toBeGreaterThan(0);
    });

    it('deve limpar CEP corretamente', () => {
      const cleanCep = (service as any).cleanCep('01310-100');
      expect(cleanCep).toBe('01310100');

      const alreadyClean = (service as any).cleanCep('01310100');
      expect(alreadyClean).toBe('01310100');
    });

    it('deve validar formato de CEP', () => {
      const isValid1 = (service as any).isValidCep('01310100');
      expect(isValid1).toBe(true);

      const isValid2 = (service as any).isValidCep('123');
      expect(isValid2).toBe(false);

      const isValid3 = (service as any).isValidCep('0131010a');
      expect(isValid3).toBe(false);
    });
  });

  describe('mock methods', () => {
    it('deve gerar opções mock consistentes', () => {
      const options = (service as any).getMockShippingOptions(mockShippingRequest);

      expect(options).toHaveLength(3);
      expect(options[0].service).toBe('04014'); // SEDEX
      expect(options[1].service).toBe('04510'); // PAC
      expect(options[2].service).toBe('TRANSPORTADORA');

      // SEDEX deve ser mais caro que PAC
      expect(options[0].price).toBeGreaterThan(options[1].price);
      
      // SEDEX deve ser mais rápido que PAC
      expect(options[0].deliveryTime).toBeLessThan(options[1].deliveryTime);
    });

    it('deve gerar resposta mock dos Correios', () => {
      const sedexResponse = (service as any).getMockCorreiosResponse('04014', mockShippingRequest);
      const pacResponse = (service as any).getMockCorreiosResponse('04510', mockShippingRequest);

      expect(sedexResponse.success).toBe(true);
      expect(sedexResponse.code).toBe('04014');
      expect(sedexResponse.name).toBe('SEDEX');
      expect(parseFloat(sedexResponse.price)).toBeGreaterThan(0);

      expect(pacResponse.code).toBe('04510');
      expect(pacResponse.name).toBe('PAC');
      
      // SEDEX deve ser mais caro que PAC
      expect(parseFloat(sedexResponse.price)).toBeGreaterThan(parseFloat(pacResponse.price));
    });

    it('deve gerar informações mock de CEP', () => {
      const cepInfo = (service as any).getMockCepInfo('01310100');

      expect(cepInfo.cep).toBe('01310100');
      expect(cepInfo.localidade).toBeDefined();
      expect(cepInfo.uf).toBeDefined();
      expect(cepInfo.logradouro).toBeDefined();
      expect(cepInfo.ddd).toBeDefined();
    });
  });
});