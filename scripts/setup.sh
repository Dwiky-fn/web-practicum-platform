#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# Platform Praktikum Pemrograman
# Production Deployment Setup
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE="$PROJECT_ROOT/config/production.env"
ENC_FILE="$PROJECT_ROOT/config/production.env.enc"
DECRYPT_SCRIPT="$PROJECT_ROOT/scripts/decrypt-env.sh"

COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

log() {
    echo "[INFO] $1"
}

success() {
    echo "[ OK ] $1"
}

warn() {
    echo "[WARN] $1"
}

error() {
    echo "[ERROR] $1" >&2
}

cleanup() {
    unset DEPLOYMENT_KEY 2>/dev/null || true
}

on_error() {
    local exit_code=$?
    error "Deployment gagal pada baris $1."
    cleanup
    exit "$exit_code"
}

trap 'on_error $LINENO' ERR
trap cleanup EXIT

cd "$PROJECT_ROOT"

echo
echo "============================================================"
echo " Platform Praktikum Pemrograman"
echo " Production Deployment Setup"
echo "============================================================"
echo

# ============================================================
# 1. Validate project structure
# ============================================================

log "Memeriksa struktur project..."

if [[ ! -f "$COMPOSE_FILE" ]]; then
    error "docker-compose.yml tidak ditemukan."
    exit 1
fi

if [[ ! -f "$ENC_FILE" ]]; then
    error "config/production.env.enc tidak ditemukan."
    exit 1
fi

if [[ ! -f "$DECRYPT_SCRIPT" ]]; then
    error "scripts/decrypt-env.sh tidak ditemukan."
    exit 1
fi

success "Struktur project valid."

# ============================================================
# 2. Check required commands
# ============================================================

log "Memeriksa dependency sistem..."

if ! command -v git >/dev/null 2>&1; then
    error "Git tidak ditemukan."
    error "Install Git terlebih dahulu."
    exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
    error "OpenSSL tidak ditemukan."
    error "Install OpenSSL terlebih dahulu."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    error "Docker tidak ditemukan."
    error "Install Docker terlebih dahulu."
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose Plugin tidak tersedia."
    error "Pastikan 'docker compose' dapat dijalankan."
    exit 1
fi

success "Git tersedia."
success "OpenSSL tersedia."
success "Docker tersedia."
success "Docker Compose tersedia."

# ============================================================
# 3. Validate Docker daemon
# ============================================================

log "Memeriksa Docker daemon..."

if ! docker info >/dev/null 2>&1; then
    error "Docker daemon tidak dapat diakses."
    error "Pastikan service Docker sedang berjalan."
    exit 1
fi

success "Docker daemon aktif."

# ============================================================
# 4. Prepare environment
# ============================================================

echo
log "Menyiapkan production environment..."

if [[ -f "$ENV_FILE" ]]; then
    warn "config/production.env sudah tersedia."

    read -r -p "Gunakan file tersebut? [Y/n]: " USE_EXISTING

    if [[ ! "$USE_EXISTING" =~ ^[Nn]$ ]]; then
        success "Menggunakan production.env yang sudah ada."
    else
        rm -f "$ENV_FILE"

        echo
        log "Masukkan deployment key."
        echo "Input tidak akan ditampilkan di terminal."
        echo

        read -r -s -p "Deployment key: " DEPLOYMENT_KEY
        echo

        if [[ -z "$DEPLOYMENT_KEY" ]]; then
            error "Deployment key tidak boleh kosong."
            exit 1
        fi

        DEPLOYMENT_KEY="$DEPLOYMENT_KEY" \
            bash "$DECRYPT_SCRIPT"

        unset DEPLOYMENT_KEY
    fi
else
    log "production.env belum tersedia."

    echo
    log "Masukkan deployment key."
    echo "Input tidak akan ditampilkan di terminal."
    echo

    read -r -s -p "Deployment key: " DEPLOYMENT_KEY
    echo

    if [[ -z "$DEPLOYMENT_KEY" ]]; then
        error "Deployment key tidak boleh kosong."
        exit 1
    fi

    DEPLOYMENT_KEY="$DEPLOYMENT_KEY" \
        bash "$DECRYPT_SCRIPT"

    unset DEPLOYMENT_KEY
fi

if [[ ! -f "$ENV_FILE" ]]; then
    error "production.env gagal dibuat."
    exit 1
fi

chmod 600 "$ENV_FILE"

success "Production environment siap."

# ============================================================
# 5. Validate Docker Compose configuration
# ============================================================

echo
log "Memvalidasi Docker Compose configuration..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    config >/dev/null

success "Docker Compose configuration valid."

# ============================================================
# 6. Build application images
# ============================================================

echo
echo "============================================================"
echo " Building Application Images"
echo "============================================================"
echo

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    build

success "Docker images berhasil dibuat."

# ============================================================
# 7. Start application
# ============================================================

echo
echo "============================================================"
echo " Starting Application Services"
echo "============================================================"
echo

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    up -d

success "Container berhasil dijalankan."

# ============================================================
# 8. Wait for PostgreSQL
# ============================================================

echo
log "Menunggu PostgreSQL menjadi healthy..."

MAX_ATTEMPTS=30
ATTEMPT=1

while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do

    POSTGRES_HEALTH="$(
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_FILE" \
            ps --format '{{.Health}}' postgres 2>/dev/null || true
    )"

    if [[ "$POSTGRES_HEALTH" == "healthy" ]]; then
        success "PostgreSQL healthy."
        break
    fi

    if [[ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]]; then
        error "PostgreSQL tidak menjadi healthy."

        echo
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_FILE" \
            ps

        exit 1
    fi

    printf "."
    sleep 2

    ATTEMPT=$((ATTEMPT + 1))
done

echo

# ============================================================
# 9. Run database migration
# ============================================================

echo
log "Menjalankan database migration..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T backend npm run migrate

success "Database migration selesai."

# ============================================================
# 10. Final service status
# ============================================================

echo
echo "============================================================"
echo " Deployment Status"
echo "============================================================"
echo

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    ps

echo
echo "============================================================"
echo " Deployment selesai."
echo "============================================================"
echo
echo "Aplikasi:"
echo "  http://<IP-SERVER>"
echo
echo "Untuk melihat log:"
echo "  docker compose logs -f"
echo