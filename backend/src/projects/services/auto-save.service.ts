import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { ProjectsService } from './projects.service';
import { AutoSaveDto } from '../dto/auto-save.dto';

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxRetries: number;
  debounceMs: number;
}

export interface AutoSaveSession {
  projectId: string;
  userId: string;
  tenantId: string;
  lastSave: Date;
  pendingChanges: boolean;
  retryCount: number;
  timer?: NodeJS.Timeout;
}

@Injectable()
export class AutoSaveService {
  private sessions = new Map<string, AutoSaveSession>();
  private config: AutoSaveConfig;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
    private projectsService: ProjectsService,
  ) {
    this.config = {
      enabled: true,
      intervalMs: 30000, // 30 segundos
      maxRetries: 3,
      debounceMs: 2000, // 2 segundos de debounce
    };
  }

  /**
   * Inicia uma sessão de auto-save para um projeto
   */
  startSession(projectId: string, userId: string, tenantId: string): void {
    if (!this.config.enabled) {
      return;
    }

    const sessionKey = this.getSessionKey(projectId, userId);

    // Parar sessão existente se houver
    this.stopSession(sessionKey);

    const session: AutoSaveSession = {
      projectId,
      userId,
      tenantId,
      lastSave: new Date(),
      pendingChanges: false,
      retryCount: 0,
    };

    this.sessions.set(sessionKey, session);

    this.logger.debug(`Auto-save iniciado para projeto ${projectId}`, 'AutoSaveService');
  }

  /**
   * Para uma sessão de auto-save
   */
  stopSession(sessionKey: string): void {
    const session = this.sessions.get(sessionKey);
    
    if (session?.timer) {
      clearTimeout(session.timer);
    }

    this.sessions.delete(sessionKey);
  }

  /**
   * Marca que há mudanças pendentes e agenda um auto-save
   */
  scheduleAutoSave(
    projectId: string,
    userId: string,
    tenantId: string,
    data: AutoSaveDto,
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const sessionKey = this.getSessionKey(projectId, userId);
    const session = this.sessions.get(sessionKey);

    if (!session) {
      this.logger.warn(`Tentativa de auto-save sem sessão ativa: ${projectId}`, 'AutoSaveService');
      return;
    }

    // Marcar mudanças pendentes
    session.pendingChanges = true;

    // Cancelar timer anterior se existir
    if (session.timer) {
      clearTimeout(session.timer);
    }

    // Agendar novo auto-save com debounce
    session.timer = setTimeout(async () => {
      await this.performAutoSave(sessionKey, data);
    }, this.config.debounceMs);

    this.logger.debug(`Auto-save agendado para projeto ${projectId} em ${this.config.debounceMs}ms`, 'AutoSaveService');
  }

  /**
   * Força um auto-save imediato
   */
  async forceAutoSave(
    projectId: string,
    userId: string,
    tenantId: string,
    data: AutoSaveDto,
  ): Promise<boolean> {
    const sessionKey = this.getSessionKey(projectId, userId);
    return this.performAutoSave(sessionKey, data);
  }

  /**
   * Executa o auto-save
   */
  private async performAutoSave(sessionKey: string, data: AutoSaveDto): Promise<boolean> {
    const session = this.sessions.get(sessionKey);

    if (!session || !session.pendingChanges) {
      return true;
    }

    try {
      await this.projectsService.autoSave(
        session.projectId,
        session.userId,
        session.tenantId,
        data,
      );

      // Sucesso - resetar contadores
      session.pendingChanges = false;
      session.retryCount = 0;
      session.lastSave = new Date();

      this.logger.debug(`Auto-save realizado com sucesso: ${session.projectId}`, 'AutoSaveService');
      return true;

    } catch (error) {
      session.retryCount++;

      this.logger.error(
        `Erro no auto-save (tentativa ${session.retryCount}/${this.config.maxRetries}): ${session.projectId}`,
        error.stack,
        'AutoSaveService',
      );

      // Tentar novamente se não excedeu o limite
      if (session.retryCount < this.config.maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, session.retryCount), 10000); // Backoff exponencial, máx 10s
        
        session.timer = setTimeout(async () => {
          await this.performAutoSave(sessionKey, data);
        }, retryDelay);

        this.logger.debug(`Reagendando auto-save em ${retryDelay}ms`, 'AutoSaveService');
      } else {
        this.logger.error(`Auto-save falhou após ${this.config.maxRetries} tentativas: ${session.projectId}`, null, 'AutoSaveService');
        session.pendingChanges = false; // Parar de tentar
      }

      return false;
    }
  }

  /**
   * Obtém informações sobre uma sessão de auto-save
   */
  getSessionInfo(projectId: string, userId: string): {
    active: boolean;
    lastSave?: Date;
    pendingChanges?: boolean;
    retryCount?: number;
  } {
    const sessionKey = this.getSessionKey(projectId, userId);
    const session = this.sessions.get(sessionKey);

    if (!session) {
      return { active: false };
    }

    return {
      active: true,
      lastSave: session.lastSave,
      pendingChanges: session.pendingChanges,
      retryCount: session.retryCount,
    };
  }

  /**
   * Lista todas as sessões ativas (para debug/monitoramento)
   */
  getActiveSessions(): Array<{
    projectId: string;
    userId: string;
    lastSave: Date;
    pendingChanges: boolean;
    retryCount: number;
  }> {
    return Array.from(this.sessions.values()).map(session => ({
      projectId: session.projectId,
      userId: session.userId,
      lastSave: session.lastSave,
      pendingChanges: session.pendingChanges,
      retryCount: session.retryCount,
    }));
  }

  /**
   * Limpa sessões inativas (cleanup)
   */
  cleanupInactiveSessions(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutos

    for (const [sessionKey, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastSave.getTime();
      
      if (inactiveTime > maxInactiveTime) {
        this.stopSession(sessionKey);
        this.logger.debug(`Sessão inativa removida: ${session.projectId}`, 'AutoSaveService');
      }
    }
  }

  /**
   * Configura o auto-save (para testes ou configuração dinâmica)
   */
  configure(config: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug('Configuração do auto-save atualizada', 'AutoSaveService');
  }

  /**
   * Obtém a configuração atual
   */
  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  private getSessionKey(projectId: string, userId: string): string {
    return `${userId}:${projectId}`;
  }

  /**
   * Método para ser chamado periodicamente para limpeza
   */
  onModuleInit(): void {
    // Configurar limpeza periódica de sessões inativas
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  /**
   * Método para limpeza ao destruir o módulo
   */
  onModuleDestroy(): void {
    // Parar todas as sessões
    for (const sessionKey of this.sessions.keys()) {
      this.stopSession(sessionKey);
    }
  }
}