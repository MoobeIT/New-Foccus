import { Module } from '@nestjs/common';
import { CartService } from './services/cart.service';

@Module({
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
