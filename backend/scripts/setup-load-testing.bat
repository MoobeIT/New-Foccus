@echo off
echo 🚀 Configurando ambiente de testes de carga...

REM Verificar se k6 está instalado
k6 version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ k6 não encontrado. 
    echo.
    echo Para instalar o k6 no Windows:
    echo   1. Usando Chocolatey: choco install k6
    echo   2. Usando Scoop: scoop install k6
    echo   3. Download manual: https://github.com/grafana/k6/releases
    echo.
    echo Instale o k6 e execute este script novamente.
    pause
    exit /b 1
) else (
    echo ✅ k6 já está instalado
)

REM Verificar versão do k6
for /f "tokens=*" %%i in ('k6 version') do set K6_VERSION=%%i
echo 📦 Versão do k6: %K6_VERSION%

REM Criar diretório temp se não existir
if not exist "temp" mkdir temp
echo 📁 Diretório temp criado

REM Verificar se o serviço está rodando
echo 🔍 Verificando se o serviço está rodando na porta 3001...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Serviço está rodando na porta 3001
) else (
    echo ⚠️  Serviço não está rodando na porta 3001
    echo    Certifique-se de iniciar o serviço antes de executar os testes
)

REM Executar teste de conectividade
echo 🌐 Testando conectividade...
echo import http from 'k6/http'; > temp\connectivity-test.js
echo export const options = { vus: 1, duration: '5s' }; >> temp\connectivity-test.js
echo export default function() { >> temp\connectivity-test.js
echo   const response = http.get(__ENV.BASE_URL + '/api/health'); >> temp\connectivity-test.js
echo   console.log(`Health check: ${response.status}`); >> temp\connectivity-test.js
echo } >> temp\connectivity-test.js

k6 run --quiet -e BASE_URL=http://localhost:3001 temp\connectivity-test.js
del temp\connectivity-test.js

echo.
echo 🎯 Configuração concluída!
echo.
echo Para executar os testes:
echo   📊 Render Service: k6 run -e BASE_URL=http://localhost:3001 k6-scripts/render-service-load.js
echo   📤 Asset Upload:   k6 run -e BASE_URL=http://localhost:3001 k6-scripts/asset-upload-stress.js
echo   🌐 API Geral:      k6 run -e BASE_URL=http://localhost:3001 k6-scripts/api-general-load.js
echo.
echo Ou via API:
echo   📋 Listar testes:  curl http://localhost:3001/testing/load/tests
echo   ▶️  Executar teste: curl -X POST http://localhost:3001/testing/load/execute/render_service_load
echo   📈 Ver resultados:  curl http://localhost:3001/testing/load/results
echo.
pause