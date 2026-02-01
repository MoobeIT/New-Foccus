# Tarefas: Deploy em Produção com CI/CD

## Fase 1: Dockerfiles de Produção

- [x] 1.1 Criar Dockerfile.backend otimizado (multi-stage)
  - Build stage com todas as dependências
  - Production stage apenas com dist e node_modules
  - Prisma client gerado
  - Health check endpoint

- [x] 1.2 Criar Dockerfile.frontend otimizado
  - Build stage com Vite
  - Nginx alpine para servir arquivos estáticos
  - Configuração de cache para assets

- [x] 1.3 Criar docker-compose.prod.yml
  - Todos os serviços necessários
  - Volumes persistentes
  - Network interna
  - Restart policies
  - Health checks

## Fase 2: Configuração do Servidor

- [x] 2.1 Criar script de setup inicial do servidor (setup-server.sh)
  - Instalação do Docker e Docker Compose
  - Configuração do firewall (ufw)
  - Criação de usuário deploy
  - Configuração de SSH

- [x] 2.2 Criar configuração do Nginx proxy
  - SSL termination
  - Proxy para frontend e backend
  - Headers de segurança
  - Gzip compression

- [ ] 2.3 Criar script de configuração SSL (setup-ssl.sh)
  - Certbot para Let's Encrypt
  - Auto-renovação de certificados

## Fase 3: GitHub Actions CI/CD

- [x] 3.1 Criar workflow de CI (.github/workflows/ci.yml)
  - Trigger em pull requests
  - Lint (ESLint)
  - Type check
  - Testes unitários
  - Build de verificação

- [x] 3.2 Criar workflow de Deploy (.github/workflows/deploy.yml)
  - Trigger em push para main
  - Build das imagens Docker
  - Push para GitHub Container Registry
  - Deploy via SSH
  - Health check
  - Notificação de status

## Fase 4: Scripts de Deploy

- [x] 4.1 Criar script de deploy (deploy/scripts/deploy.sh)
  - Pull das imagens
  - Backup do banco
  - Restart dos containers
  - Migrations
  - Health check

- [x] 4.2 Criar script de rollback (deploy/scripts/rollback.sh)
  - Restore da versão anterior
  - Restore do backup se necessário

- [ ] 4.3 Criar script de backup (deploy/scripts/backup.sh)
  - Backup do PostgreSQL
  - Backup dos volumes
  - Rotação de backups antigos

## Fase 5: Configuração de Ambiente

- [x] 5.1 Criar .env.production.example
  - Todas as variáveis necessárias
  - Valores de exemplo seguros
  - Comentários explicativos

- [x] 5.2 Documentar secrets necessários no GitHub
  - SSH_PRIVATE_KEY
  - SERVER_HOST
  - SERVER_USER
  - Variáveis de produção

## Fase 6: Documentação

- [x] 6.1 Criar README-DEPLOY.md
  - Pré-requisitos
  - Configuração inicial do servidor
  - Como fazer deploy manual
  - Troubleshooting comum
  - Comandos úteis

## Fase 7: Monitoramento (Opcional)

- [ ]* 7.1 Configurar endpoint de health check no backend
- [ ]* 7.2 Configurar alertas via webhook
- [ ]* 7.3 Configurar monitoramento externo (UptimeRobot)
