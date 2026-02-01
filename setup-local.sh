#!/bin/bash

# Script de setup local para o Editor de Produtos Personalizados
echo "🚀 Configurando ambiente local do Editor de Produtos Personalizados..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs
mkdir -p uploads/temp
mkdir -p storage/assets
mkdir -p storage/renders

# Copiar arquivo de ambiente se não existir
if [ ! -f .env ]; then
    echo "📋 Copiando arquivo de configuração..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Ajuste as configurações se necessário."
fi

# Subir containers Docker
echo "🐳 Iniciando containers Docker..."
docker-compose up -d

# Aguardar containers ficarem prontos
echo "⏳ Aguardando containers ficarem prontos..."
sleep 30

# Verificar se PostgreSQL está pronto
echo "🔍 Verificando PostgreSQL..."
until docker exec editor-postgres pg_isready -U editor_user -d editor_produtos; do
    echo "Aguardando PostgreSQL..."
    sleep 5
done

# Verificar se Redis está pronto
echo "🔍 Verificando Redis..."
until docker exec editor-redis redis-cli -a redis_password ping; do
    echo "Aguardando Redis..."
    sleep 5
done

# Verificar se RabbitMQ está pronto
echo "🔍 Verificando RabbitMQ..."
until docker exec editor-rabbitmq rabbitmq-diagnostics -q ping; do
    echo "Aguardando RabbitMQ..."
    sleep 5
done

# Verificar se MinIO está pronto
echo "🔍 Verificando MinIO..."
until curl -f http://localhost:9000/minio/health/live; do
    echo "Aguardando MinIO..."
    sleep 5
done

# Criar buckets no MinIO
echo "🪣 Criando buckets no MinIO..."
docker run --rm --network editor-produtos-personalizados_editor-network \
    -e MC_HOST_minio=http://editor_minio:minio_password@minio:9000 \
    minio/mc:latest sh -c "
    mc mb minio/editor-assets --ignore-existing
    mc mb minio/editor-renders --ignore-existing
    mc policy set public minio/editor-assets
    mc policy set public minio/editor-renders
"

echo "✅ Infraestrutura local configurada com sucesso!"
echo ""
echo "🌐 Serviços disponíveis:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - RabbitMQ: localhost:5672"
echo "  - RabbitMQ Management: http://localhost:15672 (editor_user/rabbitmq_password)"
echo "  - MinIO: http://localhost:9000 (editor_minio/minio_password)"
echo "  - MinIO Console: http://localhost:9001"
echo "  - pgAdmin: http://localhost:5050 (admin@editor.com/pgadmin_password)"
echo ""
echo "📝 Próximos passos:"
echo "  1. cd backend && npm install"
echo "  2. cd frontend && npm install"
echo "  3. npm run dev (para iniciar ambos os serviços)"
echo ""
echo "🔧 Para parar os serviços: docker-compose down"
echo "🗑️  Para limpar tudo: docker-compose down -v"