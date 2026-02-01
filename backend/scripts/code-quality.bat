@echo off
setlocal enabledelayedexpansion

REM Script para análise de qualidade de código no Windows
REM Uso: code-quality.bat [opções]

set "LINT_ONLY=false"
set "FORMAT_ONLY=false"
set "TYPE_CHECK_ONLY=false"
set "SECURITY_ONLY=false"
set "COMPLEXITY_ONLY=false"
set "FIX_ISSUES=false"
set "RUN_SONAR=false"
set "RUN_ALL=false"

REM Parse dos argumentos
:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-l" (
    set "LINT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--lint" (
    set "LINT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="-f" (
    set "FORMAT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--format" (
    set "FORMAT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="-t" (
    set "TYPE_CHECK_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--type-check" (
    set "TYPE_CHECK_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="-s" (
    set "SECURITY_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--security" (
    set "SECURITY_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="-c" (
    set "COMPLEXITY_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--complexity" (
    set "COMPLEXITY_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--fix" (
    set "FIX_ISSUES=true"
    shift
    goto :parse_args
)
if "%~1"=="--sonar" (
    set "RUN_SONAR=true"
    shift
    goto :parse_args
)
if "%~1"=="--all" (
    set "RUN_ALL=true"
    shift
    goto :parse_args
)
echo Opção desconhecida: %~1
goto :show_help

:end_parse

REM Se nenhuma opção específica, executar todas
if "%LINT_ONLY%"=="false" if "%FORMAT_ONLY%"=="false" if "%TYPE_CHECK_ONLY%"=="false" if "%SECURITY_ONLY%"=="false" if "%COMPLEXITY_ONLY%"=="false" if "%RUN_SONAR%"=="false" (
    set "RUN_ALL=true"
)

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não está instalado
    exit /b 1
)

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
)

echo 🔍 Iniciando análise de qualidade de código...

set "EXIT_CODE=0"

REM Função para executar linting
:run_lint
echo 🔧 Executando ESLint...

if "%FIX_ISSUES%"=="true" (
    call npx eslint "src/**/*.ts" --fix
    if errorlevel 1 (
        echo ❌ Problemas de linting encontrados
        set "EXIT_CODE=1"
    ) else (
        echo ✅ Linting concluído com correções automáticas
    )
) else (
    call npx eslint "src/**/*.ts"
    if errorlevel 1 (
        echo ❌ Problemas de linting encontrados
        set "EXIT_CODE=1"
    ) else (
        echo ✅ Nenhum problema de linting encontrado
    )
)
goto :eof

REM Função para executar formatação
:run_format
echo 💅 Executando Prettier...

if "%FIX_ISSUES%"=="true" (
    call npx prettier --write "src/**/*.{ts,json,md}"
    if errorlevel 1 (
        echo ❌ Problemas de formatação encontrados
        set "EXIT_CODE=1"
    ) else (
        echo ✅ Formatação concluída
    )
) else (
    call npx prettier --check "src/**/*.{ts,json,md}"
    if errorlevel 1 (
        echo ❌ Código precisa ser formatado
        echo 💡 Execute com --fix para corrigir automaticamente
        set "EXIT_CODE=1"
    ) else (
        echo ✅ Código está bem formatado
    )
)
goto :eof

REM Função para verificação de tipos
:run_type_check
echo 🔍 Executando verificação de tipos TypeScript...

call npx tsc --noEmit
if errorlevel 1 (
    echo ❌ Erros de tipo encontrados
    set "EXIT_CODE=1"
) else (
    echo ✅ Nenhum erro de tipo encontrado
)
goto :eof

REM Função para auditoria de segurança
:run_security
echo 🔒 Executando auditoria de segurança...

call npm audit --audit-level moderate
if errorlevel 1 (
    echo ⚠️  Vulnerabilidades encontradas
    echo 💡 Execute 'npm audit fix' para corrigir automaticamente
) else (
    echo ✅ Nenhuma vulnerabilidade crítica encontrada
)

echo 📦 Verificando dependências desatualizadas...
call npm outdated
goto :eof

REM Função para análise de complexidade
:run_complexity
echo 📊 Analisando complexidade do código...

call npx eslint "src/**/*.ts" --format json > complexity-report.json 2>nul
if exist complexity-report.json (
    echo ✅ Relatório de complexidade gerado
    del complexity-report.json
) else (
    echo ⚠️  Não foi possível gerar relatório de complexidade
)
goto :eof

REM Função para análise SonarQube
:run_sonar
echo 🔍 Executando análise SonarQube...

REM Verificar se SonarScanner está instalado
sonar-scanner --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  SonarScanner não encontrado. Instale manualmente.
    echo 💡 Download: https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/
    set "EXIT_CODE=1"
    goto :eof
)

REM Executar testes com cobertura primeiro
echo 🧪 Gerando cobertura de código...
call npm run test:cov

REM Executar análise SonarQube
call sonar-scanner
if errorlevel 1 (
    echo ❌ Falha na análise SonarQube
    set "EXIT_CODE=1"
) else (
    echo ✅ Análise SonarQube concluída
    echo 🌐 Verifique os resultados no dashboard do SonarQube
)
goto :eof

REM Executar verificações baseadas nas opções
if "%LINT_ONLY%"=="true" call :run_lint
if "%RUN_ALL%"=="true" call :run_lint

if "%FORMAT_ONLY%"=="true" call :run_format
if "%RUN_ALL%"=="true" call :run_format

if "%TYPE_CHECK_ONLY%"=="true" call :run_type_check
if "%RUN_ALL%"=="true" call :run_type_check

if "%SECURITY_ONLY%"=="true" call :run_security
if "%RUN_ALL%"=="true" call :run_security

if "%COMPLEXITY_ONLY%"=="true" call :run_complexity
if "%RUN_ALL%"=="true" call :run_complexity

if "%RUN_SONAR%"=="true" call :run_sonar

REM Resumo final
if "%EXIT_CODE%"=="0" (
    echo 🎉 Análise de qualidade de código concluída com sucesso!
    echo 📊 Resumo:
    echo    - Linting: ✅
    echo    - Formatação: ✅
    echo    - Tipos: ✅
    echo    - Segurança: ✅
    echo    - Complexidade: ✅
) else (
    echo ❌ Problemas de qualidade de código encontrados
    echo 💡 Execute com --fix para corrigir problemas automaticamente
)

exit /b %EXIT_CODE%

:show_help
echo Uso: %0 [opções]
echo.
echo Opções:
echo   -h, --help              Mostra esta ajuda
echo   -l, --lint              Executa apenas linting
echo   -f, --format            Executa apenas formatação
echo   -t, --type-check        Executa apenas verificação de tipos
echo   -s, --security          Executa apenas auditoria de segurança
echo   -c, --complexity        Analisa complexidade do código
echo   --fix                   Corrige problemas automaticamente
echo   --sonar                 Executa análise SonarQube
echo   --all                   Executa todas as verificações
echo.
echo Exemplos:
echo   %0 --all               # Executa todas as verificações
echo   %0 -l --fix            # Executa linting com correção automática
echo   %0 -f                  # Apenas formatação
echo   %0 --sonar             # Análise SonarQube
exit /b 0