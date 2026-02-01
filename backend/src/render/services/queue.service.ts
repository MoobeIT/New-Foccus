import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';
import { RenderJobData, RenderResult } from './render.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('render-preview') private previewQueue: Queue,
    @InjectQueue('render-final') private finalQueue: Queue,
    @InjectQueue('render-3d') private render3dQueue: Queue,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async addRenderJob(queueName: string, data: RenderJobData): Promise<Job> {
    const queue = this.getQueue(queueName);
    
    const jobOptions = {
      priority: data.priority || 0,
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 20,
    };

    // Configurar timeout baseado no tipo
    if (data.type === 'preview') {
      jobOptions['timeout'] = this.configService.get('render.previewTimeout') || 30000;
    } else if (data.type === 'final') {
      jobOptions['timeout'] = this.configService.get('render.timeout') || 120000;
    }

    const job = await queue.add('render', data, jobOptions);

    this.logger.debug(
      `Job ${job.id} adicionado à fila ${queueName}`,
      'QueueService',
      { jobId: job.id, type: data.type, projectId: data.projectId },
    );

    return job;
  }

  async getJobStatus(jobId: string): Promise<RenderResult | null> {
    try {
      // Procurar o job em todas as filas
      const queues = [this.previewQueue, this.finalQueue, this.render3dQueue];
      
      for (const queue of queues) {
        const job = await queue.getJob(jobId);
        
        if (job) {
          const state = await job.getState();
          
          return {
            jobId: job.id.toString(),
            status: this.mapJobState(state),
            createdAt: new Date(job.timestamp),
            completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            processingTime: job.finishedOn && job.processedOn 
              ? job.finishedOn - job.processedOn 
              : undefined,
            url: job.returnvalue?.url,
            error: job.failedReason,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Erro ao consultar status do job', error.stack, 'QueueService');
      return null;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const queues = [this.previewQueue, this.finalQueue, this.render3dQueue];
      
      for (const queue of queues) {
        const job = await queue.getJob(jobId);
        
        if (job) {
          const state = await job.getState();
          
          if (state === 'waiting' || state === 'delayed') {
            await job.remove();
            this.logger.debug(`Job ${jobId} removido da fila`, 'QueueService');
            return true;
          } else if (state === 'active') {
            // Não é possível cancelar jobs em processamento
            return false;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Erro ao cancelar job', error.stack, 'QueueService');
      return false;
    }
  }

  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const queues = [this.previewQueue, this.finalQueue, this.render3dQueue];
      
      let totalQueued = 0;
      let totalProcessing = 0;
      let totalCompleted = 0;
      let totalFailed = 0;

      for (const queue of queues) {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
        ]);

        totalQueued += waiting.length;
        totalProcessing += active.length;
        totalCompleted += completed.length;
        totalFailed += failed.length;
      }

      return {
        queued: totalQueued,
        processing: totalProcessing,
        completed: totalCompleted,
        failed: totalFailed,
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas das filas', error.stack, 'QueueService');
      return {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };
    }
  }

  async cleanOldJobs(): Promise<void> {
    try {
      const queues = [this.previewQueue, this.finalQueue, this.render3dQueue];
      
      for (const queue of queues) {
        // Limpar jobs completados há mais de 24 horas
        await queue.clean(24 * 60 * 60 * 1000, 'completed');
        
        // Limpar jobs falhados há mais de 7 dias
        await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
      }

      this.logger.debug('Limpeza de jobs antigos concluída', 'QueueService');
    } catch (error) {
      this.logger.error('Erro na limpeza de jobs antigos', error.stack, 'QueueService');
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.debug(`Fila ${queueName} pausada`, 'QueueService');
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.debug(`Fila ${queueName} retomada`, 'QueueService');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Verificar se as filas estão respondendo
      const queues = [this.previewQueue, this.finalQueue, this.render3dQueue];
      
      for (const queue of queues) {
        await queue.getWaiting();
      }

      return true;
    } catch (error) {
      this.logger.error('Health check das filas falhou', error.stack, 'QueueService');
      return false;
    }
  }

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'render-preview':
        return this.previewQueue;
      case 'render-final':
        return this.finalQueue;
      case 'render-3d':
        return this.render3dQueue;
      default:
        throw new Error(`Fila desconhecida: ${queueName}`);
    }
  }

  private mapJobState(state: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }
}