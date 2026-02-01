#!/bin/bash
# ============================================
# Script de Rollback - Editor
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE_FILE="deploy/docker-compose.prod.yml"
BACKUP_DIR="/opt/editor/deploy/backups"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Restaurar banco de dados do último backup
restore_database() {
    log_info "Procurando último backup..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_warn "Nenhum backup encontrado para restaurar"
        return 0
    fi
    
    log_info "Restaurando backup: $LATEST_BACKUP"
    
    # Descomprimir e restaurar
    gunzip -c "$LATEST_BACKUP" | docker exec -i editor-postgres psql -U editor editor_prod
    
    log_info "Banco de dados restaurado!"
}

# Rollback para versão anterior das imagens
rollback_images() {
    log_info "Fazendo rollback das imagens..."
    
    # Parar containers atuais
    docker compose -f "$COMPOSE_FILE" down
    
    # Tentar usar imagem anterior (se existir tag previous)
    # Por padrão, apenas reinicia com as imagens existentes
    docker compose -f "$COMPOSE_FILE" up -d
}

# Main
main() {
    log_warn "=========================================="
    log_warn "  ROLLBACK Editor - $(date)"
    log_warn "=========================================="
    
    read -p "Deseja restaurar o banco de dados também? (s/N): " restore_db
    
    rollback_images
    
    if [[ "$restore_db" =~ ^[Ss]$ ]]; then
        restore_database
    fi
    
    log_info "Verificando status..."
    docker compose -f "$COMPOSE_FILE" ps
    
    log_info "=========================================="
    log_info "  Rollback concluído!"
    log_info "=========================================="
}

main "$@"
