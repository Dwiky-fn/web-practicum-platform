#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# Platform Praktikum Pemrograman
# Production Deployment Setup Orchestrator (Option B)
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE="$PROJECT_ROOT/config/production.env"
ENC_FILE="$PROJECT_ROOT/config/production.env.enc"
DECRYPT_SCRIPT="$PROJECT_ROOT/scripts/decrypt-env.sh"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

print_header() {
    echo "============================================================"
    echo " Platform Praktikum Pemrograman"
    echo " Production Deployment Setup"
    echo "============================================================"
    echo
}

info() {
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

step() {
    echo
    echo "$1"
    echo "------------------------------------------------------------"
}

cleanup() {
    unset DEPLOYMENT_KEY 2>/dev/null || true
}

on_error() {
    local exit_code=$?
    echo
    error "Deployment gagal pada baris $1."
    cleanup
    exit "$exit_code"
}

trap 'on_error $LINENO' ERR
trap cleanup EXIT

cd "$PROJECT_ROOT"

print_header

# ============================================================
# [1/7] Memeriksa dependency...
# ============================================================

step "[1/7] Memeriksa dependency..."

if ! command -v git >/dev/null 2>&1; then
    error "Git tidak ditemukan. Install Git terlebih dahulu."
    exit 1
fi
success "Git tersedia."

if ! command -v openssl >/dev/null 2>&1; then
    error "OpenSSL tidak ditemukan. Install OpenSSL terlebih dahulu."
    exit 1
fi
success "OpenSSL tersedia."

if ! command -v docker >/dev/null 2>&1; then
    error "Docker tidak ditemukan. Install Docker terlebih dahulu."
    exit 1
fi
success "Docker tersedia."

if ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose Plugin tidak tersedia. Pastikan 'docker compose' dapat dijalankan."
    exit 1
fi
success "Docker Compose tersedia."

# ============================================================
# [2/7] Memeriksa project...
# ============================================================

step "[2/7] Memeriksa project..."

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

success "Struktur repository valid."

# ============================================================
# [3/7] Menyiapkan environment production...
# ============================================================

step "[3/7] Menyiapkan environment production..."

if [[ -f "$ENV_FILE" ]]; then
    warn "config/production.env sudah tersedia."
    read -r -p "  Gunakan file tersebut? [Y/n]: " USE_EXISTING
    if [[ ! "$USE_EXISTING" =~ ^[Nn]$ ]]; then
        success "Menggunakan config/production.env yang sudah ada."
    else
        rm -f "$ENV_FILE"
        info "Mendekripsi configuration..."
        read -r -s -p "  Deployment key: " DEPLOYMENT_KEY
        echo
        if [[ -z "$DEPLOYMENT_KEY" ]]; then
            error "Deployment key tidak boleh kosong."
            exit 1
        fi
        DEPLOYMENT_KEY="$DEPLOYMENT_KEY" bash "$DECRYPT_SCRIPT" >/dev/null 2>&1 || {
            error "Dekripsi gagal. Key salah atau file terenkripsi rusak."
            unset DEPLOYMENT_KEY
            exit 1
        }
        unset DEPLOYMENT_KEY
        success "config/production.env berhasil didekripsi."
    fi
else
    info "Mendekripsi configuration..."
    read -r -s -p "  Deployment key: " DEPLOYMENT_KEY
    echo
    if [[ -z "$DEPLOYMENT_KEY" ]]; then
        error "Deployment key tidak boleh kosong."
        exit 1
    fi
    DEPLOYMENT_KEY="$DEPLOYMENT_KEY" bash "$DECRYPT_SCRIPT" >/dev/null 2>&1 || {
        error "Dekripsi gagal. Key salah atau file terenkripsi rusak."
        unset DEPLOYMENT_KEY
        exit 1
    }
    unset DEPLOYMENT_KEY
    success "config/production.env berhasil didekripsi."
fi

if [[ ! -f "$ENV_FILE" ]]; then
    error "config/production.env gagal dibuat."
    exit 1
fi

chmod 600 "$ENV_FILE"
success "Permission config/production.env diset 600."

# Validasi keberadaan variabel penting (tanpa mencetak nilainya)
REQUIRED_VARS=("PGUSER" "PGPASSWORD" "PGDATABASE" "AUTH_TOKEN_SECRET" "RUNNER_API_KEY" "AI_SERVICE_API_KEY" "AI_PROVIDER" "MINDROUTER_API_KEY")
for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${VAR}=" "$ENV_FILE"; then
        error "Variable '${VAR}' tidak ditemukan di config/production.env."
        exit 1
    fi
done
success "Variabel lingkungan produksi terverifikasi."

# ============================================================
# [4/7] Memeriksa Docker & Validasi Configuration...
# ============================================================

step "[4/7] Memeriksa Docker & Validasi Configuration..."

if ! docker info >/dev/null 2>&1; then
    error "Docker daemon tidak dapat diakses. Pastikan service Docker sedang berjalan."
    exit 1
fi
success "Docker daemon aktif."

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
    error "Konfigurasi Docker Compose tidak valid."
    exit 1
fi
success "Konfigurasi Docker Compose valid."

info "Building Docker images..."
BUILD_LOG="$(mktemp 2>/dev/null || echo "$PROJECT_ROOT/.docker-build.log")"
if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build > "$BUILD_LOG" 2>&1; then
    rm -f "$BUILD_LOG"
    success "Docker images berhasil dibuat."
else
    error "Docker build failed."
    cat "$BUILD_LOG"
    rm -f "$BUILD_LOG"
    exit 1
fi

# ============================================================
# [5/7] Menjalankan database & service infrastruktur...
# ============================================================

step "[5/7] Menjalankan database & service infrastruktur..."

# 1. PostgreSQL
info "Starting PostgreSQL..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres >/dev/null 2>&1

info "Waiting for PostgreSQL healthy..."
MAX_ATTEMPTS=30
ATTEMPT=1
POSTGRES_READY=false
while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    HEALTH="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.Health}}' postgres 2>/dev/null || true)"
    if [[ "$HEALTH" == "healthy" ]]; then
        POSTGRES_READY=true
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [[ "$POSTGRES_READY" == "true" ]]; then
    success "PostgreSQL ready"
else
    error "PostgreSQL tidak healthy setelah 60 detik."
    exit 1
fi

# Memeriksa inisialisasi database & sejarah migrasi
PGUSER_VAL="$(grep '^PGUSER=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\r\n')"
PGDATABASE_VAL="$(grep '^PGDATABASE=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\r\n')"

HAS_PGMIGRATIONS="$(
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
        psql -U "${PGUSER_VAL:-platform_praktikum}" -d "${PGDATABASE_VAL:-platform_praktikum}" -t -Ac \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pgmigrations');" 2>/dev/null || echo "f"
)"
HAS_PGMIGRATIONS="$(echo "$HAS_PGMIGRATIONS" | tr -d ' \r\n')"

MIGRATION_FILES_COUNT=0
if [[ -d "$PROJECT_ROOT/be_platform_praktikum/migrations" ]]; then
    MIGRATION_FILES_COUNT="$(ls -1 "$PROJECT_ROOT/be_platform_praktikum/migrations"/*.js 2>/dev/null | wc -l | tr -d ' \r\n')"
fi

if [[ "$HAS_PGMIGRATIONS" != "t" && "$HAS_PGMIGRATIONS" != "true" ]]; then
    info "Database belum diinisialisasi"
    info "Running database migrations..."
    MIGRATE_LOG="$(mktemp 2>/dev/null || echo "$PROJECT_ROOT/.docker-migrate.log")"
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend npm run migrate > "$MIGRATE_LOG" 2>&1; then
        success "Database migrations completed"
        rm -f "$MIGRATE_LOG"
    else
        error "Database migration failed."
        cat "$MIGRATE_LOG"
        rm -f "$MIGRATE_LOG"
        exit 1
    fi
else
    APPLIED_COUNT="$(
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
            psql -U "${PGUSER_VAL:-platform_praktikum}" -d "${PGDATABASE_VAL:-platform_praktikum}" -t -Ac \
            "SELECT COUNT(*) FROM pgmigrations;" 2>/dev/null || echo "0"
    )"
    APPLIED_COUNT="$(echo "$APPLIED_COUNT" | tr -d ' \r\n')"

    info "Existing database detected"
    success "Migration history ditemukan"
    success "Database sudah pernah diinisialisasi"

    if [[ "$MIGRATION_FILES_COUNT" -gt 0 && "$MIGRATION_FILES_COUNT" -gt "$APPLIED_COUNT" ]]; then
        warn "Terdeteksi $((MIGRATION_FILES_COUNT - APPLIED_COUNT)) migration baru yang belum diterapkan"
        info "Running pending database migrations..."
        MIGRATE_LOG="$(mktemp 2>/dev/null || echo "$PROJECT_ROOT/.docker-migrate.log")"
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend npm run migrate > "$MIGRATE_LOG" 2>&1; then
            success "Pending database migrations completed"
            rm -f "$MIGRATE_LOG"
        else
            error "Pending database migration failed."
            cat "$MIGRATE_LOG"
            rm -f "$MIGRATE_LOG"
            exit 1
        fi
    else
        info "Migration dilewati"
    fi
fi

# 2. Runner
info "Starting Runner..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d runner >/dev/null 2>&1

info "Waiting for Runner healthy..."
ATTEMPT=1
RUNNER_READY=false
while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    HEALTH="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.Health}}' runner 2>/dev/null || true)"
    if [[ "$HEALTH" == "healthy" ]]; then
        RUNNER_READY=true
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [[ "$RUNNER_READY" == "true" ]]; then
    success "Runner healthy & ready."
else
    error "Runner tidak healthy setelah 60 detik."
    exit 1
fi

# 3. AI Evaluator
info "Starting AI Evaluator..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d ai-evaluator >/dev/null 2>&1

info "Waiting for AI Evaluator healthy..."
ATTEMPT=1
AI_READY=false
while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    HEALTH="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.Health}}' ai-evaluator 2>/dev/null || true)"
    if [[ "$HEALTH" == "healthy" ]]; then
        AI_READY=true
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [[ "$AI_READY" == "true" ]]; then
    success "AI Evaluator healthy & ready."
else
    error "AI Evaluator tidak healthy. Periksa konfigurasi AI provider / API credential."
    exit 1
fi

# ============================================================
# [6/7] Menjalankan application services...
# ============================================================

step "[6/7] Menjalankan application services..."

# Backend
info "Starting Backend..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend >/dev/null 2>&1

info "Waiting for Backend healthy..."
ATTEMPT=1
BACKEND_READY=false
while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    HEALTH="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.Health}}' backend 2>/dev/null || true)"
    if [[ "$HEALTH" == "healthy" ]]; then
        BACKEND_READY=true
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [[ "$BACKEND_READY" == "true" ]]; then
    success "Backend healthy & ready."
else
    error "Backend tidak healthy setelah 60 detik."
    exit 1
fi

# Frontend & Nginx
info "Starting Frontend & Nginx..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d frontend nginx >/dev/null 2>&1
success "Frontend & Nginx started."

# ============================================================
# [7/7] Verifikasi deployment...
# ============================================================

step "[7/7] Verifikasi deployment..."

SERVICES_TO_CHECK=("postgres" "runner" "ai-evaluator" "backend" "frontend" "nginx")
DEPLOYMENT_OK=true

for SERVICE in "${SERVICES_TO_CHECK[@]}"; do
    HEALTH="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.Health}}' "$SERVICE" 2>/dev/null || true)"
    STATE="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format '{{.State}}' "$SERVICE" 2>/dev/null || true)"

    STATUS_STR="running"
    if [[ -n "$HEALTH" && "$HEALTH" != "none" ]]; then
        STATUS_STR="$HEALTH"
    elif [[ -n "$STATE" ]]; then
        STATUS_STR="$STATE"
    fi

    if [[ "$STATUS_STR" != "healthy" && "$STATUS_STR" != "running" ]]; then
        error "Service ${SERVICE} tidak healthy / gagal (status: ${STATUS_STR})."
        DEPLOYMENT_OK=false
    else
        success "Service ${SERVICE} (${STATUS_STR})"
    fi
done

if [[ "$DEPLOYMENT_OK" != "true" ]]; then
    error "Verifikasi deployment gagal. Beberapa service mengalami masalah."
    exit 1
fi

echo
echo "============================================================"
echo " Deployment selesai"
echo "============================================================"
echo
echo "Aplikasi:"
echo "  http://<IP-SERVER>"
echo
echo "Monitoring Log:"
echo "  docker compose --env-file config/production.env logs -f"
echo