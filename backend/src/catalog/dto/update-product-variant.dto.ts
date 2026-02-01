import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product-variant.dto';

// Remove productId do update (não deve ser alterado)
export class UpdateProductVariantDto extends PartialType(
  OmitType(CreateProductVariantDto, ['productId'] as const)
) {}