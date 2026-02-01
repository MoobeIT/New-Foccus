@echo off
REM Script de setup local para Windows
echo 🚀 Configurando ambiente local do Editor de Produtos Personalizados...

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado. Por favor, instale o Docker Desktop primeiro.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro.
    pause
    exit /b 1
)

REM Criar diretórios necessários
echo 📁 Criando diretórios...
if not exist "logs" mkdir logs
if not exist "uploads\temp" mkdir uploads\temp
if not exist "storage\assets" mkdir storage\assets
if not exist "storage\renders" mkdir storage\renders

REM Copiar arquivo de ambiente se não existir
if not exist ".env" (
    echo 📋 Copiando arquivo de configuração...
    copy .env.example .env
    echo ✅ Arquivo .env criado. Ajuste as configurações se necessário.
)

REM Subir containers Docker
echo 🐳 Iniciando containers Docker...
docker-compose up -d

REM Aguardar containers ficarem prontos
echo ⏳ Aguardando containers ficarem prontos...
timeout /t 30 /nobreak >nul

REM Verificar se PostgreSQL está pronto
echo 🔍 Verificando PostgreSQL...
:wait_postgres
docker exec editor-postgres pg_isready -U editor_user -d editor_produtos >nul 2>&1
if errorlevel 1 (
    echo Aguardando PostgreSQL...
    timeout /t 5 /nobreak >nul
    goto wait_postgres
)

REM Verificar se Redis está pronto
echo 🔍 Verificando Redis...
:wait_redis
docker exec editor-redis redis-cli -a redis_password ping >nul 2>&1
if errorlevel 1 (
    echo Aguardando Redis...
    timeout /t 5 /nobreak >nul
    goto wait_redis
)

REM Criar buckets no MinIO
echo 🪣 Criando buckets no MinIO...
docker run --rm --network editor-produtos-personalizados_editor-network -e MC_HOST_minio=http://editor_minio:minio_password@minio:9000 minio/mc:latest sh -c "mc mb minio/editor-assets --ignore-existing && mc mb minio/editor-renders --ignore-existing && mc policy set public minio/editor-assets && mc policy set public minio/editor-renders"

echo ✅ Infraestrutura local configurada com sucesso!
echo.
echo 🌐 Serviços disponíveis:
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6379
echo   - RabbitMQ: localhost:5672
echo   - RabbitMQ Management: http://localhost:15672 (editor_user/rabbitmq_password)
echo   - MinIO: http://localhost:9000 (editor_minio/minio_password)
echo   - MinIO Console: http://localhost:9001
echo   - pgAdmin: http://localhost:5050 (admin@editor.com/pgadmin_password)
echo.
echo 📝 Próximos passos:
echo   1. cd backend && npm install
echo   2. cd frontend && npm install  
echo   3. npm run dev (para iniciar ambos os serviços)
echo.
echo 🔧 Para parar os serviços: docker-compose down
echo 🗑️  Para limpar tudo: docker-compose down -v
pause