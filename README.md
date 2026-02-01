# Editor Online de Produtos Personalizados

Sistema completo para criação de fotoprodutos (fotolivros, calendários, quadros, brindes) com pré-visualização em alta qualidade e geração de arquivos prontos para produção.

## 🚀 Setup Local Rápido

### Pré-requisitos

**Opção 1 - Com Docker (Recomendado):**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [Node.js 18+](https://nodejs.org/) instalado
- [Git](https://git-scm.com/) instalado

**Opção 2 - Sem Docker (Desenvolvimento local):**
- [Node.js 18+](https://nodejs.org/) instalado
- [PostgreSQL 15+](https://www.postgresql.org/download/) instalado
- [Redis](https://redis.io/download/) instalado (opcional)
- [Git](https://git-scm.com/) instalado

### Instalação

#### Opção 1: Com Docker (Recomendado)

**Windows:**
```bash
# Clone o repositório
git clone <repo-url>
cd editor-produtos-personalizados

# Execute o setup automático
setup-local.bat
```

**Linux/macOS:**
```bash
# Clone o repositório
git clone <repo-url>
cd editor-produtos-personalizados

# Torne o script executável e execute
chmod +x setup-local.sh
./setup-local.sh
```

#### Opção 2: Sem Docker (Desenvolvimento Simples)

**Windows:**
```bash
# Clone o repositório
git clone <repo-url>
cd editor-produtos-personalizados

# Execute o setup sem Docker
setup-local-no-docker.bat
```

**Linux/macOS:**
```bash
# Clone o repositório
git clone <repo-url>
cd editor-produtos-personalizados

# Torne o script executável e execute
chmod +x setup-local-no-docker.sh
./setup-local-no-docker.sh
```

#### Manual
```bash
# 1. Copie o arquivo de configuração
cp .env.example .env

# 2. Suba a infraestrutura
docker-compose up -d

# 3. Aguarde os serviços ficarem prontos (30-60s)

# 4. Instale dependências do backend
cd backend
npm install

# 5. Instale dependências do frontend
cd ../frontend
npm install

# 6. Volte para a raiz e inicie o desenvolvimento
cd ..
npm run dev
```

## 🌐 Serviços Locais

Após o setup, os seguintes serviços estarão disponíveis:

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:3000 | - |
| **PostgreSQL** | localhost:5432 | `editor_user` / `editor_password` |
| **Redis** | localhost:6379 | Senha: `redis_password` |
| **RabbitMQ** | localhost:5672 | `editor_user` / `rabbitmq_password` |
| **RabbitMQ Management** | http://localhost:15672 | `editor_user` / `rabbitmq_password` |
| **MinIO (S3)** | http://localhost:9000 | `editor_minio` / `minio_password` |
| **MinIO Console** | http://localhost:9001 | `editor_minio` / `minio_password` |
| **pgAdmin** | http://localhost:5050 | `admin@editor.com` / `pgadmin_password` |

## 📁 Estrutura do Projeto

```
editor-produtos-personalizados/
├── backend/                 # API Node.js + NestJS
│   ├── src/
│   │   ├── auth/           # Serviço de autenticação
│   │   ├── catalog/        # Serviço de catálogo
│   │   ├── assets/         # Serviço de assets
│   │   ├── projects/       # Serviço de projetos
│   │   ├── render/         # Serviço de renderização
│   │   ├── orders/         # Serviço de pedidos
│   │   └── common/         # Utilitários compartilhados
│   └── package.json
├── frontend/               # App React + TypeScript
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── stores/         # Estado global (Zustand)
│   │   ├── services/       # Clientes API
│   │   └── utils/          # Utilitários
│   └── package.json
├── database/               # Scripts SQL
│   └── init/              # Scripts de inicialização
├── docker-compose.yml      # Infraestrutura local
├── .env                   # Configurações locais
└── README.md
```

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Inicia frontend + backend
npm run dev:frontend        # Apenas frontend
npm run dev:backend         # Apenas backend

# Build
npm run build              # Build completo
npm run build:frontend     # Build frontend
npm run build:backend      # Build backend

# Testes
npm run test               # Todos os testes
npm run test:frontend      # Testes frontend
npm run test:backend       # Testes backend

# Docker
npm run docker:up          # Sobe infraestrutura
npm run docker:down        # Para infraestrutura
docker-compose logs -f     # Ver logs em tempo real

# Banco de dados
npm run db:migrate         # Executar migrações
npm run db:seed           # Popular dados iniciais
```

## 🔧 Configuração

### Variáveis de Ambiente

As principais configurações estão no arquivo `.env`:

```bash
# Banco de dados
DATABASE_URL=postgresql://editor_user:editor_password@localhost:5432/editor_produtos

# Cache
REDIS_URL=redis://:redis_password@localhost:6379

# Filas
RABBITMQ_URL=amqp://editor_user:rabbitmq_password@localhost:5672/editor_vhost

# Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=editor_minio
S3_SECRET_KEY=minio_password

# JWT
JWT_SECRET=local-development-jwt-secret-key-not-for-production
```

### Dados Iniciais

O sistema vem com dados de exemplo:
- **Tenant**: Editor Demo
- **Admin**: admin@editor.com / admin123
- **Produtos**: Fotolivro e Calendário
- **Templates**: Layouts básicos

## 🎯 Funcionalidades Principais

### MVP (Fase 1)
- ✅ Infraestrutura base (PostgreSQL, Redis, RabbitMQ, S3)
- 🔄 Autenticação e multi-tenancy
- 🔄 Catálogo de produtos
- 🔄 Upload e organização de fotos
- 🔄 Editor Canvas 2D
- 🔄 Auto-layout básico
- 🔄 Previews HiDPI
- 🔄 Checkout com PIX/cartão
- 🔄 Render PDF para produção

### Roadmap
- **Fase 2**: Preview 3D, IA face-aware, Templates dinâmicos
- **Fase 3**: PWA offline, Editor colaborativo, Marketplace

## 🐛 Troubleshooting

### Problemas Comuns

**Containers não sobem:**
```bash
# Verificar se as portas estão livres
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Limpar containers antigos
docker-compose down -v
docker system prune -f
```

**Erro de conexão com banco:**
```bash
# Verificar se PostgreSQL está rodando
docker exec editor-postgres pg_isready -U editor_user -d editor_produtos

# Ver logs do PostgreSQL
docker logs editor-postgres
```

**MinIO não cria buckets:**
```bash
# Criar buckets manualmente
docker exec -it editor-minio mc mb /data/editor-assets
docker exec -it editor-minio mc mb /data/editor-renders
```

### Logs

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq
docker-compose logs -f minio
```

## 📚 Documentação

- [Especificação Completa](.kiro/specs/editor-produtos-personalizados/)
- [Requisitos](.kiro/specs/editor-produtos-personalizados/requirements.md)
- [Design](.kiro/specs/editor-produtos-personalizados/design.md)
- [Tarefas](.kiro/specs/editor-produtos-personalizados/tasks.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.