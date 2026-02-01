#!/bin/bash

# Script para executar testes de integração
# Uso: ./scripts/run-integration-tests.sh [opções]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  -h, --help              Mostra esta ajuda"
    echo "  -c, --coverage          Executa testes com cobertura"
    echo "  -f, --file <pattern>    Executa testes que correspondem ao padrão"
    echo "  -v, --verbose           Saída verbosa"
    echo "  --ci                    Modo CI (sem interação)"
    echo "  --setup-db              Configura banco de dados de teste"
    echo "  --cleanup-db            Limpa banco de dados de teste"
    echo ""
    echo "Exemplos:"
    echo "  $0                      # Executa todos os testes de integração"
    echo "  $0 -c                   # Executa com cobertura"
    echo "  $0 -f auth              # Executa testes relacionados a auth"
    echo "  $0 --setup-db           # Apenas configura o banco de teste"
}

# Variáveis padrão
COVERAGE=false
FILE_PATTERN=""
VERBOSE=false
CI_MODE=false
SETUP_DB_ONLY=false
CLEANUP_DB_ONLY=false

# Parse dos argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -f|--file)
            FILE_PATTERN="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --setup-db)
            SETUP_DB_ONLY=true
            shift
            ;;
        --cleanup-db)
            CLEANUP_DB_ONLY=true
            shift
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    print_message $RED "❌ Node.js não está instalado"
    exit 1
fi

# Verificar se o PostgreSQL está disponível
if ! command -v psql &> /dev/null; then
    print_message $YELLOW "⚠️  PostgreSQL CLI não encontrado. Certifique-se de que o PostgreSQL está rodando."
fi

# Configurar variáveis de ambiente para testes de integração
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-integration
export DATABASE_URL=postgresql://test:test@localhost:5432/test_integration_db
export REDIS_URL=redis://localhost:6379/1
export AWS_S3_BUCKET=test-integration-bucket
export AWS_REGION=us-east-1

# Função para configurar banco de dados de teste
setup_test_database() {
    print_message $BLUE "🗄️  Configurando banco de dados de teste..."
    
    # Criar banco de dados de teste se não existir
    if command -v psql &> /dev/null; then
        psql -h localhost -U test -c "CREATE DATABASE test_integration_db;" 2>/dev/null || true
        print_message $GREEN "✅ Banco de dados de teste configurado"
    else
        print_message $YELLOW "⚠️  Não foi possível configurar o banco automaticamente. Configure manualmente:"
        print_message $YELLOW "   CREATE DATABASE test_integration_db;"
    fi
    
    # Executar migrações
    if [ -f "prisma/schema.prisma" ]; then
        print_message $BLUE "🔄 Executando migrações..."
        npx prisma migrate deploy --schema=prisma/schema.prisma
        npx prisma generate --schema=prisma/schema.prisma
        print_message $GREEN "✅ Migrações executadas"
    fi
}

# Função para limpar banco de dados de teste
cleanup_test_database() {
    print_message $BLUE "🧹 Limpando banco de dados de teste..."
    
    if command -v psql &> /dev/null; then
        psql -h localhost -U test -c "DROP DATABASE IF EXISTS test_integration_db;" 2>/dev/null || true
        print_message $GREEN "✅ Banco de dados de teste removido"
    else
        print_message $YELLOW "⚠️  Não foi possível limpar o banco automaticamente. Limpe manualmente:"
        print_message $YELLOW "   DROP DATABASE IF EXISTS test_integration_db;"
    fi
}

# Se apenas configurar banco
if [ "$SETUP_DB_ONLY" = true ]; then
    setup_test_database
    exit 0
fi

# Se apenas limpar banco
if [ "$CLEANUP_DB_ONLY" = true ]; then
    cleanup_test_database
    exit 0
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    print_message $YELLOW "📦 Instalando dependências..."
    npm install
fi

# Configurar banco de dados de teste
setup_test_database

# Construir comando Jest para testes de integração
JEST_CMD="npx jest --config=test/jest-e2e.json"

# Adicionar opções baseadas nos argumentos
if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

if [ "$CI_MODE" = true ]; then
    JEST_CMD="$JEST_CMD --ci --watchAll=false"
fi

if [ -n "$FILE_PATTERN" ]; then
    JEST_CMD="$JEST_CMD --testNamePattern=$FILE_PATTERN"
fi

print_message $BLUE "🧪 Executando testes de integração..."
print_message $YELLOW "Comando: $JEST_CMD"

# Executar testes
if eval $JEST_CMD; then
    print_message $GREEN "✅ Todos os testes de integração passaram!"
    
    # Se executou com cobertura, mostrar informações
    if [ "$COVERAGE" = true ]; then
        print_message $BLUE "📊 Relatório de cobertura gerado em: coverage-integration/"
        
        # Verificar se existe coverage-integration/lcov-report/index.html
        if [ -f "coverage-integration/lcov-report/index.html" ]; then
            print_message $YELLOW "🌐 Abra coverage-integration/lcov-report/index.html no navegador para ver o relatório detalhado"
        fi
    fi
else
    print_message $RED "❌ Alguns testes de integração falharam"
    exit 1
fi

# Estatísticas finais
if [ "$VERBOSE" = true ]; then
    print_message $BLUE "📈 Estatísticas dos testes de integração:"
    
    # Contar arquivos de teste de integração
    INTEGRATION_FILES=$(find test -name "*.integration.spec.ts" | wc -l)
    
    echo "  - Arquivos de teste de integração: $INTEGRATION_FILES"
fi

print_message $GREEN "🎉 Execução de testes de integração concluída!"

# Limpeza opcional (descomente se quiser limpar automaticamente)
# cleanup_test_database