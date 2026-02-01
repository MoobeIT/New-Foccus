import { Global, Module } from '@nestjs/common';
import { HashService } from './services/hash.service';
import { ValidationService } from './services/validation.service';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
  providers: [
    HashService,
    ValidationService,
    LoggerService,
  ],
  exports: [
    HashService,
    ValidationService,
    LoggerService,
  ],
})
export class CommonModule {}