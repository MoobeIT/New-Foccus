import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleLoggerService } from './common/services/simple-logger.service';

// Controller simples para teste
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Editor de Produtos Personalizados - API funcionando! 🚀';
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Editor Backend',
      version: '1.0.0'
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
  ],
  controllers: [AppController],
  providers: [SimpleLoggerService],
})
export class AppSimpleModule {}