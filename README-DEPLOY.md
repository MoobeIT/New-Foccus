# 🚀 Guia de Deploy - Editor

Este guia explica como fazer deploy do sistema Editor em um servidor de produção.

## 📋 Pré-requisitos

### No Servidor
- Ubuntu 20.04+ ou Debian 11+
- Mínimo 2GB RAM, 2 vCPUs
- 20GB+ de disco
- Acesso root via SSH

### Local
- Git configurado
- Repositório no GitHub

## 🖥️ Setup Inicial do Servidor

### 1. Conectar ao servidor
```bash
ssh root@seu-servidor-ip
```

### 2. Executar script de setup
```bash
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/Editor/deploy/scripts/setup-server.sh | bash
```

Ou manualmente:
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /opt/editor
cd /opt/editor
chmod +x deploy/scripts/setup-server.sh
./deploy/scripts/setup-server.sh
```

### 3. Configurar chave SSH para deploy
```bash
# No seu computador local, gere uma chave (se não tiver)
ssh-keygen -t ed25519 -C "deploy@editor"

# Copie a chave pública para o servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@seu-servidor-ip
```

### 4. Configurar variáveis de ambiente
```bash
cd /opt/editor
cp deploy/.env.production.example deploy/.env
nano deploy/.env  # Edite com seus valores
```

## 🔐 Configurar GitHub Secrets

No repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

| Secret | Descrição |
|--------|-----------|
| `SSH_PRIVATE_KEY` | Chave SSH privada para conectar ao servidor |
| `SERVER_HOST` | IP ou domínio do servidor |
| `SERVER_USER` | Usuário SSH (geralmente `deploy`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe |

## 🚀 Deploy

### Deploy Automático
Push para a branch `main` dispara o deploy automaticamente:
```bash
git push origin main
```

### Deploy Manual
No GitHub, vá em **Actions > Deploy > Run workflow**

### Deploy via SSH
```bash
ssh deploy@seu-servidor
cd /opt/editor
./deploy/scripts/deploy.sh
```

## 🔒 Configurar SSL (HTTPS)

### 1. Apontar domínio para o servidor
Configure o DNS do seu domínio para apontar para o IP do servidor.

### 2. Gerar certificado SSL
```bash
ssh deploy@seu-servidor
cd /opt/editor

# Instalar certbot
sudo apt install certbot

# Parar nginx temporariamente
docker compose -f deploy/docker-compose.prod.yml stop nginx

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com.br -d www.seu-dominio.com.br

# Reiniciar nginx
docker compose -f deploy/docker-compose.prod.yml start nginx
```

### 3. Habilitar HTTPS no nginx
Edite `deploy/nginx/nginx.conf` e descomente a seção HTTPS.

## 📊 Monitoramento

### Ver logs
```bash
# Todos os serviços
docker compose -f deploy/docker-compose.prod.yml logs -f

# Serviço específico
docker compose -f deploy/docker-compose.prod.yml logs -f backend
```

### Status dos containers
```bash
docker compose -f deploy/docker-compose.prod.yml ps
```

### Uso de recursos
```bash
docker stats
```

## 🔄 Rollback

Se algo der errado:
```bash
./deploy/scripts/rollback.sh
```

## 🛠️ Comandos Úteis

```bash
# Reiniciar todos os serviços
docker compose -f deploy/docker-compose.prod.yml restart

# Reiniciar serviço específico
docker compose -f deploy/docker-compose.prod.yml restart backend

# Executar migrations manualmente
docker exec editor-backend npx prisma migrate deploy

# Acessar banco de dados
docker exec -it editor-postgres psql -U editor editor_prod

# Limpar imagens antigas
docker image prune -a

# Ver uso de disco
docker system df
```

## 🆘 Troubleshooting

### Container não inicia
```bash
docker compose -f deploy/docker-compose.prod.yml logs backend
```

### Erro de conexão com banco
Verifique se o PostgreSQL está rodando:
```bash
docker compose -f deploy/docker-compose.prod.yml ps postgres
```

### Erro 502 Bad Gateway
O backend pode estar iniciando. Aguarde 30 segundos e tente novamente.

### Falta de espaço em disco
```bash
docker system prune -a --volumes
```

## 📁 Estrutura de Arquivos

```
/opt/editor/
├── deploy/
│   ├── .env                    # Variáveis de ambiente (NÃO commitar!)
│   ├── docker-compose.prod.yml # Compose de produção
│   ├── Dockerfile.backend      # Build do backend
│   ├── Dockerfile.frontend     # Build do frontend
│   ├── nginx/                  # Configurações do nginx
│   ├── scripts/                # Scripts de deploy
│   └── backups/                # Backups do banco
├── backend/                    # Código do backend
└── frontend/                   # Código do frontend
```

## 📞 Suporte

Em caso de problemas, verifique:
1. Logs dos containers
2. Status dos serviços
3. Variáveis de ambiente
4. Conectividade de rede
