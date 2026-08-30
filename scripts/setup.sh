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

print_header() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        PLATFORM PRAKTIKUM PEMROGRAMAN                     ║"
    echo "║        Production Deployment                              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo
}

print_section() {
    echo "▶ $1"
    echo "────────────────────────────────────────────────────────────"
}

print_success() {
    echo "  ✓ $1"
}

print_progress() {
    echo "  → $1"
}

print_warning() {
    echo "  ! $1"
}

print_error() {
    echo "  ✗ $1" >&2
}

cleanup() {
    unset DEPLOYMENT_KEY 2>/dev/null || true
}

on_error() {
    local exit_code=$?
    echo
    print_error "Deployment gagal pada baris $1."
    echo "  Deployment dihentikan."
    cleanup
    exit "$exit_code"
}

trap 'on_error $LINENO' ERR
trap cleanup EXIT

cd "$PROJECT_ROOT"

print_header

# ============================================================
# 1. SYSTEM CHECK
# ============================================================

print_section "1. SYSTEM CHECK"

if ! command -v git >/dev/null 2>&1; then
    print_error "Git tidak ditemukan. Install Git terlebih dahulu."
    exit 1
fi
print_success "Git                 tersedia"

if ! command -v openssl >/dev/null 2>&1; then
    print_error "OpenSSL tidak ditemukan. Install OpenSSL terlebih dahulu."
    exit 1
fi
print_success "OpenSSL             tersedia"

if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker tidak ditemukan. Install Docker terlebih dahulu."
    exit 1
fi
print_success "Docker              tersedia"

if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose Plugin tidak tersedia. Pastikan 'docker compose' dapat dijalankan."
    exit 1
fi
print_success "Docker Compose      tersedia"

if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon tidak dapat diakses. Pastikan service Docker sedang berjalan."
    exit 1
fi
print_success "Docker daemon       aktif"
echo

# ============================================================
# 2. ENVIRONMENT
# ============================================================

print_section "2. ENVIRONMENT"

if [[ ! -f "$ENC_FILE" ]]; then
    print_error "config/production.env.enc tidak ditemukan."
    exit 1
fi
print_success "Encrypted config    ditemukan"

if [[ ! -f "$DECRYPT_SCRIPT" ]]; then
    print_error "scripts/decrypt-env.sh tidak ditemukan."
    exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
    print_warning "config/production.env sudah tersedia."
    read -r -p "  Gunakan file tersebut? [Y/n]: " USE_EXISTING
    if [[ ! "$USE_EXISTING" =~ ^[Nn]$ ]]; then
        print_success "Production ENV      menggunakan file yang ada"
    else
        rm -f "$ENV_FILE"
        echo
        print_progress "Masukkan deployment key."
        read -r -s -p "  Deployment key: " DEPLOYMENT_KEY
        echo
        if [[ -z "$DEPLOYMENT_KEY" ]]; then
            print_error "Deployment key tidak boleh kosong."
            exit 1
        fi
        print_success "Deployment key      diterima"
        DEPLOYMENT_KEY="$DEPLOYMENT_KEY" bash "$DECRYPT_SCRIPT" >/dev/null 2>&1 || {
            print_error "Dekripsi gagal. Key salah atau file terenkripsi rusak."
            unset DEPLOYMENT_KEY
            exit 1
        }
        unset DEPLOYMENT_KEY
        print_success "Production ENV      berhasil didekripsi"
    fi
else
    print_progress "Masukkan deployment key."
    read -r -s -p "  Deployment key: " DEPLOYMENT_KEY
    echo
    if [[ -z "$DEPLOYMENT_KEY" ]]; then
        print_error "Deployment key tidak boleh kosong."
        exit 1
    fi
    print_success "Deployment key      diterima"
    DEPLOYMENT_KEY="$DEPLOYMENT_KEY" bash "$DECRYPT_SCRIPT" >/dev/null 2>&1 || {
        print_error "Dekripsi gagal. Key salah atau file terenkripsi rusak."
        unset DEPLOYMENT_KEY
        exit 1
    }
    unset DEPLOYMENT_KEY
    print_success "Production ENV      berhasil didekripsi"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    print_error "production.env gagal dibuat."
    exit 1
fi

chmod 600 "$ENV_FILE"
print_success "Permission          600"
echo

# ============================================================
# 3. DOCKER CONFIGURATION
# ============================================================

print_section "3. DOCKER CONFIGURATION"

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
    print_error "Docker Compose configuration tidak valid."
    exit 1
fi
print_success "Compose configuration valid"
echo

# ============================================================
# 4. BUILD APPLICATION
# ============================================================

print_section "4. BUILD APPLICATION"
print_progress "Building Docker images..."

BUILD_LOG="$(mktemp 2>/dev/null || echo "$PROJECT_ROOT/.docker-build.log")"

if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build > "$BUILD_LOG" 2>&1; then
    print_success "Backend"
    print_success "Frontend"
    print_success "AI Evaluator"
    print_success "Runner"
    rm -f "$BUILD_LOG"
else
    print_error "Docker build failed"
    echo
    cat "$BUILD_LOG"
    rm -f "$BUILD_LOG"
    exit 1
fi
echo

# ============================================================
# 5. DATABASE
# ============================================================

print_section "5. DATABASE"

print_progress "Starting PostgreSQL..."
if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres >/dev/null 2>&1; then
    print_success "PostgreSQL started"
else
    print_error "Gagal menjalankan container PostgreSQL"
    exit 1
fi

echo
print_progress "Waiting for PostgreSQL..."
MAX_ATTEMPTS=30
ATTEMPT=1
POSTGRES_READY=false

while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    POSTGRES_HEALTH="$(
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_FILE" \
            ps --format '{{.Health}}' postgres 2>/dev/null || true
    )"

    if [[ "$POSTGRES_HEALTH" == "healthy" ]]; then
        POSTGRES_READY=true
        break
    fi

    if [[ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]]; then
        break
    fi

    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [[ "$POSTGRES_READY" == "true" ]]; then
    print_success "PostgreSQL ready"
else
    print_error "PostgreSQL tidak menjadi ready setelah 60 detik"
    exit 1
fi

echo
print_progress "Running database migrations..."
MIGRATE_LOG="$(mktemp 2>/dev/null || echo "$PROJECT_ROOT/.docker-migrate.log")"

if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend npm run migrate > "$MIGRATE_LOG" 2>&1; then
    print_success "Database migration complete"
    rm -f "$MIGRATE_LOG"
else
    print_error "Database migration failed"
    echo
    cat "$MIGRATE_LOG"
    rm -f "$MIGRATE_LOG"
    echo
    print_error "Deployment dihentikan."
    exit 1
fi
echo

# ============================================================
# 6. APPLICATION SERVICES
# ============================================================

print_section "6. APPLICATION SERVICES"

print_progress "Starting application services..."
if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d >/dev/null 2>&1; then
    print_success "Backend"
    print_success "AI Evaluator"
    print_success "Runner"
    print_success "Frontend"
    print_success "Nginx"
else
    print_error "Gagal menjalankan application services"
    exit 1
fi
echo

# ============================================================
# 7. HEALTH CHECK
# ============================================================

print_section "7. HEALTH CHECK"

SERVICES_TO_CHECK=("postgres" "backend" "ai-evaluator" "runner" "frontend" "nginx")
MAX_ATTEMPTS=20
ATTEMPT=1

while [[ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]]; do
    ALL_HEALTHY=true

    for SERVICE in "${SERVICES_TO_CHECK[@]}"; do
        HEALTH="$(
            docker compose \
                --env-file "$ENV_FILE" \
                -f "$COMPOSE_FILE" \
                ps --format '{{.Health}}' "$SERVICE" 2>/dev/null || true
        )"
        STATE="$(
            docker compose \
                --env-file "$ENV_FILE" \
                -f "$COMPOSE_FILE" \
                ps --format '{{.State}}' "$SERVICE" 2>/dev/null || true
        )"

        if [[ "$HEALTH" != "healthy" && "$STATE" != "running" ]]; then
            ALL_HEALTHY=false
            break
        fi
    done

    if [[ "$ALL_HEALTHY" == "true" ]]; then
        break
    fi

    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

for SERVICE in "${SERVICES_TO_CHECK[@]}"; do
    HEALTH="$(
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_FILE" \
            ps --format '{{.Health}}' "$SERVICE" 2>/dev/null || true
    )"
    STATE="$(
        docker compose \
            --env-file "$ENV_FILE" \
            -f "$COMPOSE_FILE" \
            ps --format '{{.State}}' "$SERVICE" 2>/dev/null || true
    )"

    STATUS_STR="running"
    if [[ -n "$HEALTH" && "$HEALTH" != "none" ]]; then
        STATUS_STR="$HEALTH"
    elif [[ -n "$STATE" ]]; then
        STATUS_STR="$STATE"
    fi

    case "$SERVICE" in
        postgres)     NAME_PADDED="PostgreSQL      " ;;
        backend)      NAME_PADDED="Backend         " ;;
        ai-evaluator) NAME_PADDED="AI Evaluator    " ;;
        runner)       NAME_PADDED="Runner          " ;;
        frontend)     NAME_PADDED="Frontend        " ;;
        nginx)        NAME_PADDED="Nginx           " ;;
        *)            NAME_PADDED="$SERVICE" ;;
    esac

    print_success "${NAME_PADDED} ${STATUS_STR}"
done
echo

# ============================================================
# DEPLOYMENT SUMMARY
# ============================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 DEPLOYMENT BERHASIL                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "  Application : http://<IP-SERVER>"
echo
echo "  Services:"
echo "    ✓ PostgreSQL"
echo "    ✓ Backend"
echo "    ✓ AI Evaluator"
echo "    ✓ Runner"
echo "    ✓ Frontend"
echo "    ✓ Nginx"
echo
echo "  Database:"
echo "    ✓ PostgreSQL ready"
echo "    ✓ Migration complete"
echo
echo "  Environment:"
echo "    ✓ Production environment loaded"
echo
echo "  Logs:"
echo "    docker compose logs -f"
echo
echo "  Backend logs:"
echo "    docker compose logs -f backend"
echo