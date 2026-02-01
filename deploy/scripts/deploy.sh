#!/bin/bash
# ============================================
# Script de Deploy - Editor
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório do projeto
DEPLOY_DIR="/opt/editor"
BACKUP_DIR="/opt/editor/deploy/backups"
COMPOSE_FILE="deploy/docker-compose.prod.yml"

# Funções de log
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar se está no diretório correto
check_directory() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Arquivo $COMPOSE_FILE não encontrado!"
        log_error "Execute este script do diretório raiz do projeto."
        exit 1
    fi
}

# Backup do banco de dados
backup_database() {
    log_info "Criando backup do banco de dados..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker exec editor-postgres pg_dump -U editor editor_prod > "$BACKUP_FILE" 2>/dev/null || {
        log_warn "Não foi possível criar backup (container pode não existir ainda)"
        return 0
    }
    
    # Comprimir backup
    gzip "$BACKUP_FILE"
    log_info "Backup criado: ${BACKUP_FILE}.gz"
    
    # Manter apenas os últimos 7 backups
    ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
}

# Pull das imagens mais recentes
pull_images() {
    log_info "Baixando imagens base..."
    docker compose -f "$COMPOSE_FILE" pull postgres redis rabbitmq minio nginx
}

# Build das imagens do projeto
build_images() {
    log_info "Construindo imagens do projeto..."
    docker compose -f "$COMPOSE_FILE" build --no-cache frontend backend
}

# Parar containers antigos
stop_containers() {
    log_info "Parando containers antigos..."
    docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
}

# Iniciar novos containers
start_containers() {
    log_info "Iniciando containers..."
    docker compose -f "$COMPOSE_FILE" up -d
}

# Executar migrations
run_migrations() {
    log_info "Executando migrations do Prisma..."
    sleep 10  # Aguardar banco inicializar
    
    docker exec editor-backend npx prisma migrate deploy || {
        log_warn "Migrations falharam ou não há migrations pendentes"
    }
}

# Health check
health_check() {
    log_info "Verificando saúde dos serviços..."
    
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            log_info "✓ Frontend OK"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Frontend não respondeu após $MAX_RETRIES tentativas"
        return 1
    fi
    
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -sf http://localhost/api/health > /dev/null 2>&1; then
            log_info "✓ Backend OK"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Backend não respondeu após $MAX_RETRIES tentativas"
        return 1
    fi
    
    log_info "✓ Todos os serviços estão saudáveis!"
}

# Limpar imagens antigas
cleanup() {
    log_info "Limpando imagens antigas..."
    docker image prune -f
}

# Mostrar status
show_status() {
    log_info "Status dos containers:"
    docker compose -f "$COMPOSE_FILE" ps
}

# Main
main() {
    log_info "=========================================="
    log_info "  Deploy Editor - $(date)"
    log_info "=========================================="
    
    check_directory
    backup_database
    pull_images
    build_images
    stop_containers
    start_containers
    run_migrations
    
    if health_check; then
        cleanup
        show_status
        log_info "=========================================="
        log_info "  Deploy concluído com sucesso! ✓"
        log_info "=========================================="
    else
        log_error "=========================================="
        log_error "  Deploy falhou! Executando rollback..."
        log_error "=========================================="
        ./deploy/scripts/rollback.sh
        exit 1
    fi
}

# Executar
main "$@"
