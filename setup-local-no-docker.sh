#!/bin/bash

# Script de setup local SEM Docker para o Editor de Produtos Personalizados
echo "🚀 Configurando ambiente local SEM Docker..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js 18+ primeiro."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ necessária. Versão atual: $(node -v)"
    exit 1
fi

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL não encontrado."
    echo "   Opções:"
    echo "   1. Instalar PostgreSQL: https://www.postgresql.org/download/"
    echo "   2. Usar SQLite (menos recursos): npm run setup:sqlite"
    echo ""
    read -p "Continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs
mkdir -p uploads/temp
mkdir -p storage/assets
mkdir -p storage/renders
mkdir -p storage/thumbnails

# Usar configuração local
echo "📋 Configurando ambiente local..."
if [ -f .env.local ]; then
    cp .env.local .env
    echo "✅ Usando configuração local (.env.local)"
else
    cp .env.example .env
    echo "✅ Usando configuração padrão (.env.example)"
fi

# Instalar dependências globais se necessário
echo "📦 Verificando dependências globais..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Criar banco de dados PostgreSQL se disponível
if command -v psql &> /dev/null; then
    echo "🗄️  Configurando banco de dados PostgreSQL..."
    
    # Tentar criar banco de dados
    createdb editor_produtos_dev 2>/dev/null || echo "Banco já existe ou erro na criação"
    
    # Executar scripts SQL se PostgreSQL estiver disponível
    if psql -d editor_produtos_dev -c '\q' 2>/dev/null; then
        echo "Executando scripts de inicialização..."
        psql -d editor_produtos_dev -f database/init/01-init-extensions.sql 2>/dev/null || echo "Extensões já existem"
        psql -d editor_produtos_dev -f database/init/02-create-schema.sql 2>/dev/null || echo "Schema já existe"
        psql -d editor_produtos_dev -f database/init/03-seed-data.sql 2>/dev/null || echo "Dados já existem"
        echo "✅ Banco de dados configurado"
    else
        echo "⚠️  Não foi possível conectar ao PostgreSQL"
        echo "   Configure manualmente ou use SQLite"
    fi
else
    echo "⚠️  PostgreSQL não disponível - usando configuração simplificada"
fi

echo "✅ Ambiente local configurado com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "  1. cd backend && npm install"
echo "  2. cd ../frontend && npm install"
echo "  3. cd .. && npm run dev"
echo ""
echo "🔧 Configuração:"
echo "  - Banco: PostgreSQL local ou SQLite"
echo "  - Cache: Em memória (sem Redis)"
echo "  - Filas: Em memória (sem RabbitMQ)"
echo "  - Storage: Sistema de arquivos local"
echo "  - Render: Mock para desenvolvimento"
echo ""
echo "💡 Para usar Docker: execute setup-local.sh"