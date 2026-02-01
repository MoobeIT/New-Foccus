@echo off
setlocal enabledelayedexpansion

REM Script para executar testes de integração no Windows
REM Uso: run-integration-tests.bat [opções]

set "COVERAGE=false"
set "FILE_PATTERN="
set "VERBOSE=false"
set "CI_MODE=false"
set "SETUP_DB_ONLY=false"
set "CLEANUP_DB_ONLY=false"

REM Parse dos argumentos
:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-c" (
    set "COVERAGE=true"
    shift
    goto :parse_args
)
if "%~1"=="--coverage" (
    set "COVERAGE=true"
    shift
    goto :parse_args
)
if "%~1"=="-f" (
    set "FILE_PATTERN=%~2"
    shift
    shift
    goto :parse_args
)
if "%~1"=="--file" (
    set "FILE_PATTERN=%~2"
    shift
    shift
    goto :parse_args
)
if "%~1"=="-v" (
    set "VERBOSE=true"
    shift
    goto :parse_args
)
if "%~1"=="--verbose" (
    set "VERBOSE=true"
    shift
    goto :parse_args
)
if "%~1"=="--ci" (
    set "CI_MODE=true"
    shift
    goto :parse_args
)
if "%~1"=="--setup-db" (
    set "SETUP_DB_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--cleanup-db" (
    set "CLEANUP_DB_ONLY=true"
    shift
    goto :parse_args
)
echo Opção desconhecida: %~1
goto :show_help

:end_parse

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não está instalado
    exit /b 1
)

REM Configurar variáveis de ambiente para testes de integração
set NODE_ENV=test
set JWT_SECRET=test-jwt-secret-integration
set DATABASE_URL=postgresql://test:test@localhost:5432/test_integration_db
set REDIS_URL=redis://localhost:6379/1
set AWS_S3_BUCKET=test-integration-bucket
set AWS_REGION=us-east-1

REM Função para configurar banco de dados de teste
:setup_test_database
echo 🗄️  Configurando banco de dados de teste...

REM Criar banco de dados de teste se não existir
psql -h localhost -U test -c "CREATE DATABASE test_integration_db;" >nul 2>&1

REM Executar migrações
if exist "prisma\schema.prisma" (
    echo 🔄 Executando migrações...
    call npx prisma migrate deploy --schema=prisma/schema.prisma
    call npx prisma generate --schema=prisma/schema.prisma
    echo ✅ Migrações executadas
)
goto :eof

REM Função para limpar banco de dados de teste
:cleanup_test_database
echo 🧹 Limpando banco de dados de teste...
psql -h localhost -U test -c "DROP DATABASE IF EXISTS test_integration_db;" >nul 2>&1
echo ✅ Banco de dados de teste removido
goto :eof

REM Se apenas configurar banco
if "%SETUP_DB_ONLY%"=="true" (
    call :setup_test_database
    exit /b 0
)

REM Se apenas limpar banco
if "%CLEANUP_DB_ONLY%"=="true" (
    call :cleanup_test_database
    exit /b 0
)

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
)

REM Configurar banco de dados de teste
call :setup_test_database

REM Construir comando Jest para testes de integração
set "JEST_CMD=npx jest --config=test/jest-e2e.json"

REM Adicionar opções baseadas nos argumentos
if "%COVERAGE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --coverage"
)

if "%VERBOSE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --verbose"
)

if "%CI_MODE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --ci --watchAll=false"
)

if not "%FILE_PATTERN%"=="" (
    set "JEST_CMD=!JEST_CMD! --testNamePattern=%FILE_PATTERN%"
)

echo 🧪 Executando testes de integração...
echo Comando: !JEST_CMD!

REM Executar testes
call !JEST_CMD!
if errorlevel 1 (
    echo ❌ Alguns testes de integração falharam
    exit /b 1
)

echo ✅ Todos os testes de integração passaram!

REM Se executou com cobertura, mostrar informações
if "%COVERAGE%"=="true" (
    echo 📊 Relatório de cobertura gerado em: coverage-integration\
    
    REM Verificar se existe coverage-integration/lcov-report/index.html
    if exist "coverage-integration\lcov-report\index.html" (
        echo 🌐 Abra coverage-integration\lcov-report\index.html no navegador para ver o relatório detalhado
    )
)

REM Estatísticas finais
if "%VERBOSE%"=="true" (
    echo 📈 Estatísticas dos testes de integração:
    
    REM Contar arquivos de teste de integração (aproximado)
    for /f %%i in ('dir /s /b test\*.integration.spec.ts 2^>nul ^| find /c /v ""') do set INTEGRATION_FILES=%%i
    
    echo   - Arquivos de teste de integração: !INTEGRATION_FILES!
)

echo 🎉 Execução de testes de integração concluída!
goto :eof

:show_help
echo Uso: %0 [opções]
echo.
echo Opções:
echo   -h, --help              Mostra esta ajuda
echo   -c, --coverage          Executa testes com cobertura
echo   -f, --file ^<pattern^>    Executa testes que correspondem ao padrão
echo   -v, --verbose           Saída verbosa
echo   --ci                    Modo CI (sem interação)
echo   --setup-db              Configura banco de dados de teste
echo   --cleanup-db            Limpa banco de dados de teste
echo.
echo Exemplos:
echo   %0                      # Executa todos os testes de integração
echo   %0 -c                   # Executa com cobertura
echo   %0 -f auth              # Executa testes relacionados a auth
echo   %0 --setup-db           # Apenas configura o banco de teste
exit /b 0