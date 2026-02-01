#!/bin/bash

# Script para executar testes unitários
# Uso: ./scripts/run-tests.sh [opções]

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
    echo "  -w, --watch             Executa testes em modo watch"
    echo "  -c, --coverage          Executa testes com cobertura"
    echo "  -u, --unit              Executa apenas testes unitários"
    echo "  -i, --integration       Executa apenas testes de integração"
    echo "  -f, --file <pattern>    Executa testes que correspondem ao padrão"
    echo "  -v, --verbose           Saída verbosa"
    echo "  --ci                    Modo CI (sem interação)"
    echo "  --update-snapshots      Atualiza snapshots"
    echo ""
    echo "Exemplos:"
    echo "  $0                      # Executa todos os testes"
    echo "  $0 -c                   # Executa com cobertura"
    echo "  $0 -f auth              # Executa testes relacionados a auth"
    echo "  $0 -w                   # Executa em modo watch"
}

# Variáveis padrão
WATCH_MODE=false
COVERAGE=false
UNIT_ONLY=false
INTEGRATION_ONLY=false
FILE_PATTERN=""
VERBOSE=false
CI_MODE=false
UPDATE_SNAPSHOTS=false

# Parse dos argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -u|--unit)
            UNIT_ONLY=true
            shift
            ;;
        -i|--integration)
            INTEGRATION_ONLY=true
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
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
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

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    print_message $RED "❌ npm não está instalado"
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    print_message $YELLOW "📦 Instalando dependências..."
    npm install
fi

# Construir comando Jest
JEST_CMD="npx jest"

# Adicionar opções baseadas nos argumentos
if [ "$WATCH_MODE" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
fi

if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

if [ "$CI_MODE" = true ]; then
    JEST_CMD="$JEST_CMD --ci --watchAll=false"
fi

if [ "$UPDATE_SNAPSHOTS" = true ]; then
    JEST_CMD="$JEST_CMD --updateSnapshot"
fi

# Filtros de teste
if [ "$UNIT_ONLY" = true ]; then
    JEST_CMD="$JEST_CMD --testPathPattern=spec.ts"
elif [ "$INTEGRATION_ONLY" = true ]; then
    JEST_CMD="$JEST_CMD --testPathPattern=integration.spec.ts"
fi

if [ -n "$FILE_PATTERN" ]; then
    JEST_CMD="$JEST_CMD --testNamePattern=$FILE_PATTERN"
fi

# Configurar variáveis de ambiente para testes
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret
export DATABASE_URL=postgresql://test:test@localhost:5432/test_db
export REDIS_URL=redis://localhost:6379

print_message $BLUE "🧪 Executando testes..."
print_message $YELLOW "Comando: $JEST_CMD"

# Executar testes
if eval $JEST_CMD; then
    print_message $GREEN "✅ Todos os testes passaram!"
    
    # Se executou com cobertura, mostrar informações
    if [ "$COVERAGE" = true ]; then
        print_message $BLUE "📊 Relatório de cobertura gerado em: coverage/"
        
        # Verificar se existe coverage/lcov-report/index.html
        if [ -f "coverage/lcov-report/index.html" ]; then
            print_message $YELLOW "🌐 Abra coverage/lcov-report/index.html no navegador para ver o relatório detalhado"
        fi
    fi
else
    print_message $RED "❌ Alguns testes falharam"
    exit 1
fi

# Estatísticas finais
if [ "$VERBOSE" = true ]; then
    print_message $BLUE "📈 Estatísticas dos testes:"
    
    # Contar arquivos de teste
    SPEC_FILES=$(find src -name "*.spec.ts" | wc -l)
    TEST_FILES=$(find src -name "*.test.ts" | wc -l)
    TOTAL_TEST_FILES=$((SPEC_FILES + TEST_FILES))
    
    echo "  - Arquivos .spec.ts: $SPEC_FILES"
    echo "  - Arquivos .test.ts: $TEST_FILES"
    echo "  - Total de arquivos de teste: $TOTAL_TEST_FILES"
fi

print_message $GREEN "🎉 Execução de testes concluída!"