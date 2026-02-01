import { Controller, Post, Get, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ShippingService, ShippingRequest, ShippingResult, CepInfo } from '../services/shipping.service';
import { LoggerService } from '../../common/services/logger.service';

export class CalculateShippingDto {
  destinationCep: string;
  weight?: number;
  productId?: string;
  quantity?: number;
}

export class ShippingOptionDto {
  service: string;
  serviceName: string;
  price: number;
  deliveryTime: number;
  deliveryTimeMax?: number;
  formattedPrice: string;
  formattedDelivery: string;
}

export class ShippingResponseDto {
  success: boolean;
  options: ShippingOptionDto[];
  freeShippingThreshold?: number;
  freeShippingEligible?: boolean;
  address?: {
    cep: string;
    city: string;
    state: string;
    neighborhood: string;
  };
}

@ApiTags('Shipping')
@Controller('public/shipping')
export class ShippingController {
  private readonly DEFAULT_ORIGIN_CEP = '01310-100'; // São Paulo
  private readonly DEFAULT_WEIGHT = 800; // 800g para álbum padrão
  private readonly DEFAULT_DIMENSIONS = { length: 30, width: 25, height: 3 };

  constructor(
    private shippingService: ShippingService,
    private logger: LoggerService,
  ) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calcular frete para um CEP' })
  @ApiBody({ type: CalculateShippingDto })
  @ApiResponse({ status: 200, description: 'Opções de frete calculadas' })
  @ApiResponse({ status: 400, description: 'CEP inválido' })
  async calculateShipping(@Body() dto: CalculateShippingDto): Promise<ShippingResponseDto> {
    try {
      // Validar CEP
      const cleanCep = dto.destinationCep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        throw new BadRequestException('CEP inválido. Informe 8 dígitos.');
      }

      // Buscar informações do CEP
      let cepInfo: CepInfo | null = null;
      try {
        cepInfo = await this.shippingService.getCepInfo(cleanCep);
      } catch (error) {
        this.logger.warn('Erro ao buscar CEP', 'ShippingController', { cep: cleanCep });
      }

      // Calcular peso baseado na quantidade
      const quantity = dto.quantity || 1;
      const baseWeight = dto.weight || this.DEFAULT_WEIGHT;
      const totalWeight = baseWeight * quantity;

      // Preparar request de frete
      const shippingRequest: ShippingRequest = {
        originCep: this.DEFAULT_ORIGIN_CEP,
        destinationCep: cleanCep,
        weight: totalWeight,
        dimensions: this.DEFAULT_DIMENSIONS,
        declaredValue: 200 * quantity, // Valor declarado estimado
        services: ['04014', '04510'], // SEDEX e PAC
      };

      // Calcular frete
      const result = await this.shippingService.calculateShipping(shippingRequest);

      // Formatar resposta
      const options: ShippingOptionDto[] = result.options.map(option => ({
        service: option.service,
        serviceName: option.serviceName,
        price: option.price,
        deliveryTime: option.deliveryTime,
        deliveryTimeMax: option.deliveryTimeMax,
        formattedPrice: option.price === 0 
          ? 'Grátis' 
          : `R$ ${option.price.toFixed(2).replace('.', ',')}`,
        formattedDelivery: option.deliveryTimeMax 
          ? `${option.deliveryTime} a ${option.deliveryTimeMax} dias úteis`
          : `${option.deliveryTime} dias úteis`,
      }));

      return {
        success: true,
        options,
        freeShippingThreshold: result.freeShippingThreshold,
        freeShippingEligible: result.options.some(o => o.price === 0),
        address: cepInfo ? {
          cep: cepInfo.cep,
          city: cepInfo.localidade,
          state: cepInfo.uf,
          neighborhood: cepInfo.bairro,
        } : undefined,
      };
    } catch (error) {
      this.logger.error('Erro ao calcular frete', error.stack, 'ShippingController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Não foi possível calcular o frete. Verifique o CEP informado.');
    }
  }

  @Get('cep/:cep')
  @ApiOperation({ summary: 'Buscar informações de um CEP' })
  @ApiParam({ name: 'cep', description: 'CEP para consulta' })
  @ApiResponse({ status: 200, description: 'Informações do CEP' })
  @ApiResponse({ status: 400, description: 'CEP inválido' })
  async getCepInfo(@Param('cep') cep: string): Promise<CepInfo> {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        throw new BadRequestException('CEP inválido. Informe 8 dígitos.');
      }

      return await this.shippingService.getCepInfo(cleanCep);
    } catch (error) {
      this.logger.error('Erro ao buscar CEP', error.stack, 'ShippingController');
      throw new BadRequestException('CEP não encontrado.');
    }
  }
}
