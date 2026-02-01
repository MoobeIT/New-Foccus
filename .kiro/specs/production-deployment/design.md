# Design: Deploy em Produção com CI/CD

## Arquitetura de Deploy

```
┌─────────────────────────────────────────────────────────────────┐
│                        DESENVOLVEDOR                             │
│                    git push origin main                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GITHUB ACTIONS                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │
│  │  Lint   │→ │  Test   │→ │  Build  │→ │  Deploy via SSH     │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ SSH + Docker
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIDOR VPS                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      NGINX (Proxy)                          ││
│  │              :80/:443 → SSL Termination                     ││
│  └─────────────────────┬───────────────────────────────────────┘│
│                        │                                         │
│  ┌─────────────────────┼───────────────────────────────────────┐│
│  │              DOCKER COMPOSE                                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    ││
│  │  │ Frontend │  │ Backend  │  │ Postgres │  │  Redis   │    ││
│  │  │  :80     │  │  :3000   │  │  :5432   │  │  :6379   │    ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    ││
│  │  ┌──────────┐  ┌──────────┐                                 ││
│  │  │ RabbitMQ │  │  MinIO   │                                 ││
│  │  │  :5672   │  │  :9000   │                                 ││
│  │  └──────────┘  └──────────┘                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Arquivos

```
Editor/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + Test em PRs
│       └── deploy.yml          # Deploy para produção
├── deploy/
│   ├── docker-compose.prod.yml # Compose para produção
│   ├── nginx/
│   │   └── nginx.conf          # Configuração do proxy
│   ├── Dockerfile.backend      # Build do backend
│   ├── Dockerfile.frontend     # Build do frontend
│   └── scripts/
│       ├── deploy.sh           # Script de deploy
│       └── rollback.sh         # Script de rollback
├── .env.production.example     # Template de variáveis
└── README-DEPLOY.md            # Documentação de deploy
```

## Componentes

### 1. GitHub Actions Workflow

**ci.yml** - Executa em Pull Requests:
- Lint (ESLint)
- Type check (TypeScript)
- Testes unitários
- Build de verificação

**deploy.yml** - Executa em push para `main`:
- Build das imagens Docker
- Push para registry (GitHub Container Registry)
- SSH para servidor
- Pull das novas imagens
- Restart dos containers
- Health check
- Rollback se falhar

### 2. Dockerfiles Otimizados

**Backend (multi-stage)**:
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Frontend (nginx)**:
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### 3. Docker Compose Produção

Serviços:
- **frontend**: Nginx servindo build estático
- **backend**: NestJS em modo produção
- **postgres**: PostgreSQL 15 com volume persistente
- **redis**: Cache e sessões
- **rabbitmq**: Fila de mensagens para render
- **minio**: Storage S3-compatible

### 4. Nginx Proxy

Configuração:
- SSL com Let's Encrypt
- Proxy para frontend (/)
- Proxy para API (/api)
- WebSocket support
- Gzip compression
- Security headers

### 5. Scripts de Deploy

**deploy.sh**:
1. Pull das imagens mais recentes
2. Backup do banco de dados
3. Stop containers antigos
4. Start novos containers
5. Run migrations
6. Health check
7. Cleanup de imagens antigas

**rollback.sh**:
1. Stop containers atuais
2. Restore imagem anterior
3. Start containers
4. Restore backup do banco (se necessário)

## Variáveis de Ambiente (Produção)

```env
# Aplicação
NODE_ENV=production
PORT=3000
API_URL=https://api.seudominio.com
FRONTEND_URL=https://seudominio.com

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/editor_prod

# Redis
REDIS_URL=redis://:senha@redis:6379

# JWT (gerar chaves fortes!)
JWT_SECRET=<chave-secreta-forte-64-chars>
JWT_EXPIRES_IN=15m

# Storage
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>

# Stripe (produção)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Fluxo de Deploy

1. **Desenvolvedor** faz push para `main`
2. **GitHub Actions** detecta o push
3. **CI** executa lint, tests, build
4. **CD** conecta via SSH no servidor
5. **Servidor** faz pull das novas imagens
6. **Docker Compose** reinicia os serviços
7. **Health check** verifica se está funcionando
8. **Notificação** de sucesso/falha

## Segurança

- Secrets armazenados no GitHub Secrets
- SSH com chave privada (não senha)
- Firewall configurado (apenas 80, 443, 22)
- Fail2ban para proteção contra brute force
- Backups automáticos do banco de dados
- HTTPS obrigatório em produção

## Monitoramento

- Logs via `docker logs` ou Loki
- Métricas básicas via endpoint `/health`
- Alertas via webhook (Discord/Slack)
- Uptime monitoring externo (UptimeRobot)
