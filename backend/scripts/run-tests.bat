@echo off
setlocal enabledelayedexpansion

REM Script para executar testes unitários no Windows
REM Uso: run-tests.bat [opções]

set "WATCH_MODE=false"
set "COVERAGE=false"
set "UNIT_ONLY=false"
set "INTEGRATION_ONLY=false"
set "FILE_PATTERN="
set "VERBOSE=false"
set "CI_MODE=false"
set "UPDATE_SNAPSHOTS=false"

REM Parse dos argumentos
:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-w" (
    set "WATCH_MODE=true"
    shift
    goto :parse_args
)
if "%~1"=="--watch" (
    set "WATCH_MODE=true"
    shift
    goto :parse_args
)
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
if "%~1"=="-u" (
    set "UNIT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--unit" (
    set "UNIT_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="-i" (
    set "INTEGRATION_ONLY=true"
    shift
    goto :parse_args
)
if "%~1"=="--integration" (
    set "INTEGRATION_ONLY=true"
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
if "%~1"=="--update-snapshots" (
    set "UPDATE_SNAPSHOTS=true"
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

REM Verificar se o npm está instalado
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não está instalado
    exit /b 1
)

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
)

REM Construir comando Jest
set "JEST_CMD=npx jest"

REM Adicionar opções baseadas nos argumentos
if "%WATCH_MODE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --watch"
)

if "%COVERAGE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --coverage"
)

if "%VERBOSE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --verbose"
)

if "%CI_MODE%"=="true" (
    set "JEST_CMD=!JEST_CMD! --ci --watchAll=false"
)

if "%UPDATE_SNAPSHOTS%"=="true" (
    set "JEST_CMD=!JEST_CMD! --updateSnapshot"
)

REM Filtros de teste
if "%UNIT_ONLY%"=="true" (
    set "JEST_CMD=!JEST_CMD! --testPathPattern=spec.ts"
) else if "%INTEGRATION_ONLY%"=="true" (
    set "JEST_CMD=!JEST_CMD! --testPathPattern=integration.spec.ts"
)

if not "%FILE_PATTERN%"=="" (
    set "JEST_CMD=!JEST_CMD! --testNamePattern=%FILE_PATTERN%"
)

REM Configurar variáveis de ambiente para testes
set NODE_ENV=test
set JWT_SECRET=test-jwt-secret
set DATABASE_URL=postgresql://test:test@localhost:5432/test_db
set REDIS_URL=redis://localhost:6379

echo 🧪 Executando testes...
echo Comando: !JEST_CMD!

REM Executar testes
call !JEST_CMD!
if errorlevel 1 (
    echo ❌ Alguns testes falharam
    exit /b 1
)

echo ✅ Todos os testes passaram!

REM Se executou com cobertura, mostrar informações
if "%COVERAGE%"=="true" (
    echo 📊 Relatório de cobertura gerado em: coverage/
    
    REM Verificar se existe coverage/lcov-report/index.html
    if exist "coverage\lcov-report\index.html" (
        echo 🌐 Abra coverage\lcov-report\index.html no navegador para ver o relatório detalhado
    )
)

REM Estatísticas finais
if "%VERBOSE%"=="true" (
    echo 📈 Estatísticas dos testes:
    
    REM Contar arquivos de teste (aproximado)
    for /f %%i in ('dir /s /b src\*.spec.ts 2^>nul ^| find /c /v ""') do set SPEC_FILES=%%i
    for /f %%i in ('dir /s /b src\*.test.ts 2^>nul ^| find /c /v ""') do set TEST_FILES=%%i
    set /a TOTAL_TEST_FILES=!SPEC_FILES!+!TEST_FILES!
    
    echo   - Arquivos .spec.ts: !SPEC_FILES!
    echo   - Arquivos .test.ts: !TEST_FILES!
    echo   - Total de arquivos de teste: !TOTAL_TEST_FILES!
)

echo 🎉 Execução de testes concluída!
goto :eof

:show_help
echo Uso: %0 [opções]
echo.
echo Opções:
echo   -h, --help              Mostra esta ajuda
echo   -w, --watch             Executa testes em modo watch
echo   -c, --coverage          Executa testes com cobertura
echo   -u, --unit              Executa apenas testes unitários
echo   -i, --integration       Executa apenas testes de integração
echo   -f, --file ^<pattern^>    Executa testes que correspondem ao padrão
echo   -v, --verbose           Saída verbosa
echo   --ci                    Modo CI (sem interação)
echo   --update-snapshots      Atualiza snapshots
echo.
echo Exemplos:
echo   %0                      # Executa todos os testes
echo   %0 -c                   # Executa com cobertura
echo   %0 -f auth              # Executa testes relacionados a auth
echo   %0 -w                   # Executa em modo watch
exit /b 0