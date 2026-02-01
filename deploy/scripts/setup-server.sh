#!/bin/bash
# ============================================
# Setup Inicial do Servidor - Editor
# Execute como root em um servidor Ubuntu/Debian
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo "Execute este script como root (sudo)"
    exit 1
fi

log_info "=========================================="
log_info "  Setup do Servidor - Editor"
log_info "=========================================="

# Atualizar sistema
log_info "Atualizando sistema..."
apt-get update && apt-get upgrade -y

# Instalar dependências básicas
log_info "Instalando dependências..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    unzip

# Instalar Docker
log_info "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    log_warn "Docker já instalado"
fi

# Instalar Docker Compose
log_info "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log_warn "Docker Compose já instalado"
fi

# Criar usuário deploy
log_info "Criando usuário deploy..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    touch /home/deploy/.ssh/authorized_keys
    chmod 600 /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    log_info "Usuário 'deploy' criado. Adicione sua chave SSH em /home/deploy/.ssh/authorized_keys"
else
    log_warn "Usuário deploy já existe"
fi

# Criar diretório do projeto
log_info "Criando diretório do projeto..."
mkdir -p /opt/editor
chown deploy:deploy /opt/editor

# Configurar firewall
log_info "Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar fail2ban
log_info "Configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Configurar swap (se não existir)
log_info "Verificando swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap de 2GB criado"
else
    log_warn "Swap já existe"
fi

# Configurar limites do sistema
log_info "Configurando limites do sistema..."
cat >> /etc/sysctl.conf << EOF

# Docker optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.max_map_count = 262144
EOF
sysctl -p

# Mostrar informações
log_info "=========================================="
log_info "  Setup concluído!"
log_info "=========================================="
echo ""
log_info "Próximos passos:"
echo "  1. Adicione sua chave SSH pública em:"
echo "     /home/deploy/.ssh/authorized_keys"
echo ""
echo "  2. Clone o repositório:"
echo "     su - deploy"
echo "     cd /opt/editor"
echo "     git clone <seu-repositorio> ."
echo ""
echo "  3. Configure as variáveis de ambiente:"
echo "     cp deploy/.env.production.example deploy/.env"
echo "     nano deploy/.env"
echo ""
echo "  4. Execute o deploy:"
echo "     ./deploy/scripts/deploy.sh"
echo ""
log_info "=========================================="
