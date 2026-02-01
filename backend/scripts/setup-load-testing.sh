#!/bin/bash

# Script para configurar testes de carga
echo "🚀 Configurando ambiente de testes de carga..."

# Verificar se k6 está instalado
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 não encontrado. Instalando..."
    
    # Detectar sistema operacional
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install k6
        else
            echo "❌ Homebrew não encontrado. Instale o Homebrew primeiro: https://brew.sh"
            exit 1
        fi
    else
        echo "❌ Sistema operacional não suportado. Instale o k6 manualmente: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
else
    echo "✅ k6 já está instalado"
fi

# Verificar versão do k6
K6_VERSION=$(k6 version | head -n1)
echo "📦 Versão do k6: $K6_VERSION"

# Criar diretório temp se não existir
mkdir -p ./temp
echo "📁 Diretório temp criado"

# Verificar se o serviço está rodando
echo "🔍 Verificando se o serviço está rodando na porta 3001..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Serviço está rodando na porta 3001"
else
    echo "⚠️  Serviço não está rodando na porta 3001"
    echo "   Certifique-se de iniciar o serviço antes de executar os testes"
fi

# Executar teste de conectividade
echo "🌐 Testando conectividade..."
k6 run --quiet -e BASE_URL=http://localhost:3001 - <<EOF
import http from 'k6/http';

export const options = {
  vus: 1,
  duration: '5s',
};

export default function() {
  const response = http.get(__ENV.BASE_URL + '/api/health');
  console.log(\`Health check: \${response.status}\`);
}
EOF

echo ""
echo "🎯 Configuração concluída!"
echo ""
echo "Para executar os testes:"
echo "  📊 Render Service: k6 run -e BASE_URL=http://localhost:3001 k6-scripts/render-service-load.js"
echo "  📤 Asset Upload:   k6 run -e BASE_URL=http://localhost:3001 k6-scripts/asset-upload-stress.js"
echo "  🌐 API Geral:      k6 run -e BASE_URL=http://localhost:3001 k6-scripts/api-general-load.js"
echo ""
echo "Ou via API:"
echo "  📋 Listar testes:  curl http://localhost:3001/testing/load/tests"
echo "  ▶️  Executar teste: curl -X POST http://localhost:3001/testing/load/execute/render_service_load"
echo "  📈 Ver resultados:  curl http://localhost:3001/testing/load/results"