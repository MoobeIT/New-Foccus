@echo off
REM Script de setup local SEM Docker para Windows
echo 🚀 Configurando ambiente local SEM Docker...

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado. Por favor, instale o Node.js 18+ primeiro.
    echo    Download: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar versão do Node.js
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION:~1%") do set MAJOR_VERSION=%%i
if %MAJOR_VERSION% LSS 18 (
    echo ❌ Node.js versão 18+ necessária. Versão atual: %NODE_VERSION%
    pause
    exit /b 1
)

REM Verificar se PostgreSQL está instalado
psql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL não encontrado.
    echo    Opções:
    echo    1. Instalar PostgreSQL: https://www.postgresql.org/download/
    echo    2. Usar SQLite (menos recursos^): npm run setup:sqlite
    echo.
    set /p CONTINUE="Continuar mesmo assim? (y/N): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

REM Criar diretórios necessários
echo 📁 Criando diretórios...
if not exist "logs" mkdir logs
if not exist "uploads\temp" mkdir uploads\temp
if not exist "storage\assets" mkdir storage\assets
if not exist "storage\renders" mkdir storage\renders
if not exist "storage\thumbnails" mkdir storage\thumbnails

REM Usar configuração local
echo 📋 Configurando ambiente local...
if exist ".env.local" (
    copy .env.local .env >nul
    echo ✅ Usando configuração local (.env.local^)
) else (
    copy .env.example .env >nul
    echo ✅ Usando configuração padrão (.env.example^)
)

REM Verificar npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não encontrado. Instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Configurar banco de dados PostgreSQL se disponível
psql --version >nul 2>&1
if not errorlevel 1 (
    echo 🗄️  Configurando banco de dados PostgreSQL...
    
    REM Tentar criar banco de dados
    createdb editor_produtos_dev >nul 2>&1
    
    REM Executar scripts SQL se PostgreSQL estiver disponível
    psql -d editor_produtos_dev -c "\q" >nul 2>&1
    if not errorlevel 1 (
        echo Executando scripts de inicialização...
        psql -d editor_produtos_dev -f database\init\01-init-extensions.sql >nul 2>&1
        psql -d editor_produtos_dev -f database\init\02-create-schema.sql >nul 2>&1
        psql -d editor_produtos_dev -f database\init\03-seed-data.sql >nul 2>&1
        echo ✅ Banco de dados configurado
    ) else (
        echo ⚠️  Não foi possível conectar ao PostgreSQL
        echo    Configure manualmente ou use SQLite
    )
) else (
    echo ⚠️  PostgreSQL não disponível - usando configuração simplificada
)

echo ✅ Ambiente local configurado com sucesso!
echo.
echo 📝 Próximos passos:
echo   1. cd backend ^&^& npm install
echo   2. cd ..\frontend ^&^& npm install
echo   3. cd .. ^&^& npm run dev
echo.
echo 🔧 Configuração:
echo   - Banco: PostgreSQL local ou SQLite
echo   - Cache: Em memória (sem Redis^)
echo   - Filas: Em memória (sem RabbitMQ^)
echo   - Storage: Sistema de arquivos local
echo   - Render: Mock para desenvolvimento
echo.
echo 💡 Para usar Docker: execute setup-local.bat
pause