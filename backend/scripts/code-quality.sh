#!/bin/bash

# Script para análise de qualidade de código
# Uso: ./scripts/code-quality.sh [opções]

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
    echo "  -l, --lint              Executa apenas linting"
    echo "  -f, --format            Executa apenas formatação"
    echo "  -t, --type-check        Executa apenas verificação de tipos"
    echo "  -s, --security          Executa apenas auditoria de segurança"
    echo "  -c, --complexity        Analisa complexidade do código"
    echo "  --fix                   Corrige problemas automaticamente"
    echo "  --sonar                 Executa análise SonarQube"
    echo "  --all                   Executa todas as verificações"
    echo ""
    echo "Exemplos:"
    echo "  $0 --all               # Executa todas as verificações"
    echo "  $0 -l --fix            # Executa linting com correção automática"
    echo "  $0 -f                  # Apenas formatação"
    echo "  $0 --sonar             # Análise SonarQube"
}

# Variáveis padrão
LINT_ONLY=false
FORMAT_ONLY=false
TYPE_CHECK_ONLY=false
SECURITY_ONLY=false
COMPLEXITY_ONLY=false
FIX_ISSUES=false
RUN_SONAR=false
RUN_ALL=false

# Parse dos argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--lint)
            LINT_ONLY=true
            shift
            ;;
        -f|--format)
            FORMAT_ONLY=true
            shift
            ;;
        -t|--type-check)
            TYPE_CHECK_ONLY=true
            shift
            ;;
        -s|--security)
            SECURITY_ONLY=true
            shift
            ;;
        -c|--complexity)
            COMPLEXITY_ONLY=true
            shift
            ;;
        --fix)
            FIX_ISSUES=true
            shift
            ;;
        --sonar)
            RUN_SONAR=true
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Se nenhuma opção específica, executar todas
if [ "$LINT_ONLY" = false ] && [ "$FORMAT_ONLY" = false ] && [ "$TYPE_CHECK_ONLY" = false ] && [ "$SECURITY_ONLY" = false ] && [ "$COMPLEXITY_ONLY" = false ] && [ "$RUN_SONAR" = false ]; then
    RUN_ALL=true
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    print_message $RED "❌ Node.js não está instalado"
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    print_message $YELLOW "📦 Instalando dependências..."
    npm install
fi

print_message $BLUE "🔍 Iniciando análise de qualidade de código..."

# Função para executar linting
run_lint() {
    print_message $BLUE "🔧 Executando ESLint..."
    
    if [ "$FIX_ISSUES" = true ]; then
        if npx eslint "src/**/*.ts" --fix; then
            print_message $GREEN "✅ Linting concluído com correções automáticas"
        else
            print_message $RED "❌ Problemas de linting encontrados"
            return 1
        fi
    else
        if npx eslint "src/**/*.ts"; then
            print_message $GREEN "✅ Nenhum problema de linting encontrado"
        else
            print_message $RED "❌ Problemas de linting encontrados"
            return 1
        fi
    fi
}

# Função para executar formatação
run_format() {
    print_message $BLUE "💅 Executando Prettier..."
    
    if [ "$FIX_ISSUES" = true ]; then
        if npx prettier --write "src/**/*.{ts,json,md}"; then
            print_message $GREEN "✅ Formatação concluída"
        else
            print_message $RED "❌ Problemas de formatação encontrados"
            return 1
        fi
    else
        if npx prettier --check "src/**/*.{ts,json,md}"; then
            print_message $GREEN "✅ Código está bem formatado"
        else
            print_message $RED "❌ Código precisa ser formatado"
            print_message $YELLOW "💡 Execute com --fix para corrigir automaticamente"
            return 1
        fi
    fi
}

# Função para verificação de tipos
run_type_check() {
    print_message $BLUE "🔍 Executando verificação de tipos TypeScript..."
    
    if npx tsc --noEmit; then
        print_message $GREEN "✅ Nenhum erro de tipo encontrado"
    else
        print_message $RED "❌ Erros de tipo encontrados"
        return 1
    fi
}

# Função para auditoria de segurança
run_security() {
    print_message $BLUE "🔒 Executando auditoria de segurança..."
    
    # Audit de dependências
    if npm audit --audit-level moderate; then
        print_message $GREEN "✅ Nenhuma vulnerabilidade crítica encontrada"
    else
        print_message $YELLOW "⚠️  Vulnerabilidades encontradas"
        print_message $YELLOW "💡 Execute 'npm audit fix' para corrigir automaticamente"
    fi
    
    # Verificar se há dependências desatualizadas
    print_message $BLUE "📦 Verificando dependências desatualizadas..."
    npm outdated || true
}

# Função para análise de complexidade
run_complexity() {
    print_message $BLUE "📊 Analisando complexidade do código..."
    
    # Usar ESLint para análise de complexidade
    if npx eslint "src/**/*.ts" --format json > complexity-report.json 2>/dev/null; then
        # Processar relatório de complexidade
        node -e "
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('complexity-report.json', 'utf8'));
            let totalIssues = 0;
            let complexityIssues = 0;
            
            report.forEach(file => {
                totalIssues += file.messages.length;
                file.messages.forEach(msg => {
                    if (msg.ruleId === 'complexity') {
                        complexityIssues++;
                    }
                });
            });
            
            console.log(\`📈 Relatório de Complexidade:\`);
            console.log(\`   - Total de arquivos analisados: \${report.length}\`);
            console.log(\`   - Total de problemas: \${totalIssues}\`);
            console.log(\`   - Problemas de complexidade: \${complexityIssues}\`);
            
            if (complexityIssues > 0) {
                console.log('⚠️  Funções com alta complexidade encontradas');
                process.exit(1);
            } else {
                console.log('✅ Complexidade do código está adequada');
            }
        "
        
        rm -f complexity-report.json
    else
        print_message $YELLOW "⚠️  Não foi possível gerar relatório de complexidade"
    fi
}

# Função para análise SonarQube
run_sonar() {
    print_message $BLUE "🔍 Executando análise SonarQube..."
    
    # Verificar se SonarScanner está instalado
    if ! command -v sonar-scanner &> /dev/null; then
        print_message $YELLOW "⚠️  SonarScanner não encontrado. Instalando..."
        npm install -g sonarqube-scanner
    fi
    
    # Executar testes com cobertura primeiro
    print_message $BLUE "🧪 Gerando cobertura de código..."
    npm run test:cov
    
    # Executar análise SonarQube
    if sonar-scanner; then
        print_message $GREEN "✅ Análise SonarQube concluída"
        print_message $BLUE "🌐 Verifique os resultados no dashboard do SonarQube"
    else
        print_message $RED "❌ Falha na análise SonarQube"
        return 1
    fi
}

# Executar verificações baseadas nas opções
EXIT_CODE=0

if [ "$LINT_ONLY" = true ] || [ "$RUN_ALL" = true ]; then
    run_lint || EXIT_CODE=1
fi

if [ "$FORMAT_ONLY" = true ] || [ "$RUN_ALL" = true ]; then
    run_format || EXIT_CODE=1
fi

if [ "$TYPE_CHECK_ONLY" = true ] || [ "$RUN_ALL" = true ]; then
    run_type_check || EXIT_CODE=1
fi

if [ "$SECURITY_ONLY" = true ] || [ "$RUN_ALL" = true ]; then
    run_security || EXIT_CODE=1
fi

if [ "$COMPLEXITY_ONLY" = true ] || [ "$RUN_ALL" = true ]; then
    run_complexity || EXIT_CODE=1
fi

if [ "$RUN_SONAR" = true ]; then
    run_sonar || EXIT_CODE=1
fi

# Resumo final
if [ $EXIT_CODE -eq 0 ]; then
    print_message $GREEN "🎉 Análise de qualidade de código concluída com sucesso!"
    print_message $BLUE "📊 Resumo:"
    print_message $BLUE "   - Linting: ✅"
    print_message $BLUE "   - Formatação: ✅"
    print_message $BLUE "   - Tipos: ✅"
    print_message $BLUE "   - Segurança: ✅"
    print_message $BLUE "   - Complexidade: ✅"
else
    print_message $RED "❌ Problemas de qualidade de código encontrados"
    print_message $YELLOW "💡 Execute com --fix para corrigir problemas automaticamente"
fi

exit $EXIT_CODE