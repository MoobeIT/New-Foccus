import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggerService } from '../../common/services/logger.service';
import {
  EmailTemplate,
  TemplateVariable,
  NotificationType,
} from '../entities/notification.entity';

@Injectable()
export class TemplateService {
  private readonly TEMPLATE_CACHE_TTL = 3600; // 1 hora

  constructor(
    private logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // Inicializar templates padrão
    this.initializeDefaultTemplates();
  }

  async getTemplate(templateId: string, language: string = 'pt-BR'): Promise<EmailTemplate | null> {
    try {
      const cacheKey = `template:${templateId}:${language}`;
      let template = await this.cacheManager.get<EmailTemplate>(cacheKey);

      if (!template) {
        // TODO: Buscar template do banco de dados
        template = await this.loadTemplateFromDatabase(templateId, language);
        
        if (template) {
          await this.cacheManager.set(cacheKey, template, this.TEMPLATE_CACHE_TTL);
        }
      }

      return template;
    } catch (error) {
      this.logger.error('Erro ao buscar template', error.stack, 'TemplateService');
      return null;
    }
  }

  async renderTemplate(templateContent: string, data: Record<string, any>): Promise<string> {
    try {
      let rendered = templateContent;

      // Substituir variáveis simples {{variable}}
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, String(value || ''));
      }

      // Processar condicionais {{#if condition}}...{{/if}}
      rendered = this.processConditionals(rendered, data);

      // Processar loops {{#each items}}...{{/each}}
      rendered = this.processLoops(rendered, data);

      // Processar formatação de data {{formatDate date}}
      rendered = this.processDateFormatting(rendered, data);

      // Processar formatação de moeda {{formatCurrency amount}}
      rendered = this.processCurrencyFormatting(rendered, data);

      return rendered;
    } catch (error) {
      this.logger.error('Erro ao renderizar template', error.stack, 'TemplateService');
      return templateContent; // Retornar template original em caso de erro
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    try {
      const newTemplate: EmailTemplate = {
        ...template,
        id: this.generateTemplateId(),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Salvar no banco de dados
      await this.saveTemplateToDatabase(newTemplate);

      // Invalidar cache
      const cacheKey = `template:${newTemplate.id}:${newTemplate.language}`;
      await this.cacheManager.del(cacheKey);

      this.logger.debug(
        'Template criado',
        'TemplateService',
        { templateId: newTemplate.id, type: newTemplate.type },
      );

      return newTemplate;
    } catch (error) {
      this.logger.error('Erro ao criar template', error.stack, 'TemplateService');
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    try {
      const existingTemplate = await this.getTemplate(templateId);
      if (!existingTemplate) {
        throw new Error('Template não encontrado');
      }

      const updatedTemplate: EmailTemplate = {
        ...existingTemplate,
        ...updates,
        id: templateId, // Manter ID original
        version: existingTemplate.version + 1,
        updatedAt: new Date(),
      };

      // TODO: Salvar no banco de dados
      await this.saveTemplateToDatabase(updatedTemplate);

      // Invalidar cache
      const cacheKey = `template:${templateId}:${updatedTemplate.language}`;
      await this.cacheManager.del(cacheKey);

      this.logger.debug(
        'Template atualizado',
        'TemplateService',
        { templateId, version: updatedTemplate.version },
      );

      return updatedTemplate;
    } catch (error) {
      this.logger.error('Erro ao atualizar template', error.stack, 'TemplateService');
      throw error;
    }
  }

  async getTemplatesByType(type: NotificationType, language: string = 'pt-BR'): Promise<EmailTemplate[]> {
    try {
      // TODO: Buscar templates do banco de dados por tipo
      const allTemplates = await this.getAllTemplates(language);
      return allTemplates.filter(template => template.type === type);
    } catch (error) {
      this.logger.error('Erro ao buscar templates por tipo', error.stack, 'TemplateService');
      return [];
    }
  }

  async validateTemplate(template: Partial<EmailTemplate>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validações obrigatórias
      if (!template.name || template.name.trim().length === 0) {
        errors.push('Nome do template é obrigatório');
      }

      if (!template.subject || template.subject.trim().length === 0) {
        errors.push('Assunto é obrigatório');
      }

      if (!template.htmlContent || template.htmlContent.trim().length === 0) {
        errors.push('Conteúdo HTML é obrigatório');
      }

      if (!template.textContent || template.textContent.trim().length === 0) {
        warnings.push('Conteúdo de texto não fornecido - será gerado automaticamente');
      }

      // Validar variáveis no template
      if (template.htmlContent) {
        const htmlVariables = this.extractVariables(template.htmlContent);
        const definedVariables = (template.variables || []).map(v => v.name);
        
        for (const variable of htmlVariables) {
          if (!definedVariables.includes(variable)) {
            warnings.push(`Variável '${variable}' usada no HTML mas não definida`);
          }
        }
      }

      // Validar HTML básico
      if (template.htmlContent) {
        const htmlErrors = this.validateHTML(template.htmlContent);
        errors.push(...htmlErrors);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Erro ao validar template', error.stack, 'TemplateService');
      return {
        valid: false,
        errors: ['Erro interno na validação'],
        warnings: [],
      };
    }
  }

  async previewTemplate(
    templateId: string,
    sampleData: Record<string, any>,
    language: string = 'pt-BR',
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
  }> {
    try {
      const template = await this.getTemplate(templateId, language);
      if (!template) {
        throw new Error('Template não encontrado');
      }

      const subject = await this.renderTemplate(template.subject, sampleData);
      const htmlContent = await this.renderTemplate(template.htmlContent, sampleData);
      const textContent = await this.renderTemplate(template.textContent, sampleData);

      return {
        subject,
        htmlContent,
        textContent,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar preview do template', error.stack, 'TemplateService');
      throw error;
    }
  }

  // Métodos privados
  private async initializeDefaultTemplates(): Promise<void> {
    try {
      const defaultTemplates = this.getDefaultTemplates();
      
      for (const template of defaultTemplates) {
        const existing = await this.getTemplate(template.id, template.language);
        if (!existing) {
          await this.saveTemplateToDatabase(template);
        }
      }

      this.logger.debug('Templates padrão inicializados', 'TemplateService');
    } catch (error) {
      this.logger.error('Erro ao inicializar templates padrão', error.stack, 'TemplateService');
    }
  }

  private getDefaultTemplates(): EmailTemplate[] {
    return [
      // Template de confirmação de pedido
      {
        id: 'order_confirmation',
        name: 'Confirmação de Pedido',
        type: 'order_confirmation',
        language: 'pt-BR',
        subject: 'Pedido {{orderNumber}} confirmado!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Olá {{customerName}}!</h1>
            <p>Seu pedido foi confirmado e está sendo processado.</p>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
              <h2>Detalhes do Pedido</h2>
              <p><strong>Número:</strong> {{orderNumber}}</p>
              <p><strong>Total:</strong> {{formatCurrency total currency}}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3>Itens do Pedido</h3>
              {{#each items}}
              <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <p><strong>{{productName}}</strong></p>
                <p>Quantidade: {{quantity}} | Preço: {{formatCurrency unitPrice ../currency}}</p>
              </div>
              {{/each}}
            </div>
            
            <p>Você receberá atualizações sobre o status do seu pedido por email.</p>
            <p>Obrigado por escolher nossa loja!</p>
          </div>
        `,
        textContent: `
          Olá {{customerName}}!
          
          Seu pedido foi confirmado e está sendo processado.
          
          Detalhes do Pedido:
          Número: {{orderNumber}}
          Total: {{formatCurrency total currency}}
          
          Itens do Pedido:
          {{#each items}}
          - {{productName}} (Quantidade: {{quantity}}, Preço: {{formatCurrency unitPrice ../currency}})
          {{/each}}
          
          Você receberá atualizações sobre o status do seu pedido por email.
          Obrigado por escolher nossa loja!
        `,
        fromEmail: 'pedidos@exemplo.com',
        fromName: 'Loja Exemplo',
        variables: [
          { name: 'customerName', type: 'string', description: 'Nome do cliente', required: true },
          { name: 'orderNumber', type: 'string', description: 'Número do pedido', required: true },
          { name: 'total', type: 'number', description: 'Valor total', required: true },
          { name: 'currency', type: 'string', description: 'Moeda', required: true },
          { name: 'items', type: 'object', description: 'Itens do pedido', required: true },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Template de carrinho abandonado
      {
        id: 'cart_abandoned',
        name: 'Carrinho Abandonado',
        type: 'cart_abandoned',
        language: 'pt-BR',
        subject: 'Você esqueceu algo no seu carrinho, {{customerName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Olá {{customerName}}!</h1>
            <p>Notamos que você deixou alguns itens no seu carrinho. Que tal finalizar sua compra?</p>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
              <h2>Seus Itens</h2>
              {{#each items}}
              <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <p><strong>{{productName}}</strong></p>
                <p>Quantidade: {{quantity}} | Preço: {{formatCurrency unitPrice ../currency}}</p>
              </div>
              {{/each}}
              <p style="font-size: 18px; font-weight: bold; margin-top: 15px;">
                Total: {{formatCurrency total currency}}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{cartUrl}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Finalizar Compra
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Este carrinho expira em 7 dias. Finalize sua compra antes que os itens sejam removidos.
            </p>
          </div>
        `,
        textContent: `
          Olá {{customerName}}!
          
          Notamos que você deixou alguns itens no seu carrinho. Que tal finalizar sua compra?
          
          Seus Itens:
          {{#each items}}
          - {{productName}} (Quantidade: {{quantity}}, Preço: {{formatCurrency unitPrice ../currency}})
          {{/each}}
          
          Total: {{formatCurrency total currency}}
          
          Finalize sua compra: {{cartUrl}}
          
          Este carrinho expira em 7 dias. Finalize sua compra antes que os itens sejam removidos.
        `,
        fromEmail: 'marketing@exemplo.com',
        fromName: 'Loja Exemplo',
        variables: [
          { name: 'customerName', type: 'string', description: 'Nome do cliente', required: true },
          { name: 'items', type: 'object', description: 'Itens do carrinho', required: true },
          { name: 'total', type: 'number', description: 'Valor total', required: true },
          { name: 'currency', type: 'string', description: 'Moeda', required: true },
          { name: 'cartUrl', type: 'string', description: 'URL do carrinho', required: true },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Template de boas-vindas
      {
        id: 'welcome',
        name: 'Boas-vindas',
        type: 'welcome',
        language: 'pt-BR',
        subject: 'Bem-vindo à Loja Exemplo, {{name}}!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Bem-vindo, {{name}}!</h1>
            <p>É um prazer ter você conosco. Sua conta foi criada com sucesso!</p>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
              <h2>O que você pode fazer agora:</h2>
              <ul>
                <li>Explorar nossos produtos personalizados</li>
                <li>Criar seus primeiros projetos</li>
                <li>Configurar suas preferências</li>
                <li>Convidar amigos e ganhar descontos</li>
              </ul>
            </div>
            
            {{#if verificationUrl}}
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verificar Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Por favor, verifique seu email para ativar todas as funcionalidades da sua conta.
            </p>
            {{/if}}
            
            <p>Se você tiver alguma dúvida, nossa equipe de suporte está sempre pronta para ajudar.</p>
            <p>Bem-vindo à família!</p>
          </div>
        `,
        textContent: `
          Bem-vindo, {{name}}!
          
          É um prazer ter você conosco. Sua conta foi criada com sucesso!
          
          O que você pode fazer agora:
          - Explorar nossos produtos personalizados
          - Criar seus primeiros projetos
          - Configurar suas preferências
          - Convidar amigos e ganhar descontos
          
          {{#if verificationUrl}}
          Por favor, verifique seu email: {{verificationUrl}}
          {{/if}}
          
          Se você tiver alguma dúvida, nossa equipe de suporte está sempre pronta para ajudar.
          Bem-vindo à família!
        `,
        fromEmail: 'boas-vindas@exemplo.com',
        fromName: 'Equipe Loja Exemplo',
        variables: [
          { name: 'name', type: 'string', description: 'Nome do usuário', required: true },
          { name: 'verificationUrl', type: 'string', description: 'URL de verificação', required: false },
        ],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private processConditionals(content: string, data: Record<string, any>): string {
    // Processar {{#if condition}}...{{/if}}
    const ifRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    return content.replace(ifRegex, (match, condition, innerContent) => {
      const value = data[condition];
      return value ? innerContent : '';
    });
  }

  private processLoops(content: string, data: Record<string, any>): string {
    // Processar {{#each items}}...{{/each}}
    const eachRegex = /{{#each\s+(\w+)}}(.*?){{\/each}}/gs;
    return content.replace(eachRegex, (match, arrayName, innerContent) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        let itemContent = innerContent;
        
        // Substituir variáveis do item
        for (const [key, value] of Object.entries(item)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemContent = itemContent.replace(regex, String(value || ''));
        }
        
        // Substituir referências ao contexto pai (../variable)
        const parentRegex = /{{\.\.\/(\w+)}}/g;
        itemContent = itemContent.replace(parentRegex, (match, parentKey) => {
          return String(data[parentKey] || '');
        });
        
        return itemContent;
      }).join('');
    });
  }

  private processDateFormatting(content: string, data: Record<string, any>): string {
    // Processar {{formatDate date}}
    const dateRegex = /{{formatDate\s+(\w+)}}/g;
    return content.replace(dateRegex, (match, dateKey) => {
      const date = data[dateKey];
      if (!date) return '';
      
      try {
        return new Date(date).toLocaleDateString('pt-BR');
      } catch {
        return String(date);
      }
    });
  }

  private processCurrencyFormatting(content: string, data: Record<string, any>): string {
    // Processar {{formatCurrency amount currency}}
    const currencyRegex = /{{formatCurrency\s+(\w+)\s+(\w+)}}/g;
    return content.replace(currencyRegex, (match, amountKey, currencyKey) => {
      const amount = data[amountKey];
      const currency = data[currencyKey] || 'BRL';
      
      if (typeof amount !== 'number') return String(amount || '');
      
      try {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currency,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toFixed(2)}`;
      }
    });
  }

  private extractVariables(content: string): string[] {
    const variableRegex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  private validateHTML(html: string): string[] {
    const errors: string[] = [];
    
    // Validações básicas de HTML
    if (!html.includes('<html>') && !html.includes('<div>')) {
      // HTML pode ser um fragmento, não é erro
    }
    
    // Verificar tags não fechadas (validação simples)
    const openTags = html.match(/<(\w+)[^>]*>/g) || [];
    const closeTags = html.match(/<\/(\w+)>/g) || [];
    
    if (openTags.length !== closeTags.length) {
      errors.push('Possível problema com tags HTML não fechadas');
    }
    
    return errors;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadTemplateFromDatabase(templateId: string, language: string): Promise<EmailTemplate | null> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retornar templates padrão se existirem
    const defaultTemplates = this.getDefaultTemplates();
    return defaultTemplates.find(t => t.id === templateId && t.language === language) || null;
  }

  private async saveTemplateToDatabase(template: EmailTemplate): Promise<void> {
    // TODO: Implementar salvamento no banco de dados
    // Por enquanto, apenas salvar no cache
    const cacheKey = `template:${template.id}:${template.language}`;
    await this.cacheManager.set(cacheKey, template, this.TEMPLATE_CACHE_TTL);
  }

  private async getAllTemplates(language: string): Promise<EmailTemplate[]> {
    // TODO: Implementar busca de todos os templates no banco
    return this.getDefaultTemplates().filter(t => t.language === language);
  }
}