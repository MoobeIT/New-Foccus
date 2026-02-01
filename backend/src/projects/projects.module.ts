import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ProjectsService } from './services/projects.service';
import { ProjectValidationService } from './services/project-validation.service';
import { AutoSaveService } from './services/auto-save.service';
import { SpineCalculatorService } from './services/spine-calculator.service';
import { PageManagerService } from './services/page-manager.service';
import { ProjectVersionService } from './services/project-version.service';
import { PageContentService } from './services/page-content.service';
import { ApprovalService } from './services/approval.service';
import { ProjectsController } from './controllers/projects.controller';
import { EditorController } from './controllers/editor.controller';
import { ApprovalController } from './controllers/approval.controller';
import { CatalogModule } from '../catalog/catalog.module';
import { AssetsModule } from '../assets/assets.module';
import { TenantsModule } from '../tenants/tenants.module';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TenantsModule,
    DatabaseModule,
    CommonModule,
    // Cache para projetos com TTL menor (dados mais dinâmicos)
    CacheModule.register({
      ttl: 300, // 5 minutos para dados de projetos
    }),
    CatalogModule,
    AssetsModule,
  ],
  controllers: [ProjectsController, EditorController, ApprovalController],
  providers: [
    ProjectsService,
    ProjectValidationService,
    AutoSaveService,
    SpineCalculatorService,
    PageManagerService,
    ProjectVersionService,
    PageContentService,
    ApprovalService,
  ],
  exports: [
    ProjectsService,
    ProjectValidationService,
    AutoSaveService,
    SpineCalculatorService,
    PageManagerService,
    ProjectVersionService,
    PageContentService,
    ApprovalService,
  ],
})
export class ProjectsModule {}