#!/usr/bin/env bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENC_FILE="$PROJECT_ROOT/config/production.env.enc"
ENV_FILE="$PROJECT_ROOT/config/production.env"
DECRYPT_SCRIPT="$PROJECT_ROOT/scripts/decrypt-env.sh"

echo "=========================================="
echo " Platform Praktikum Pemrograman"
echo " Environment Setup"
echo "=========================================="
echo

if [ ! -f "$ENC_FILE" ]; then
    echo "ERROR: config/production.env.enc tidak ditemukan."
    exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: OpenSSL tidak ditemukan."
    echo "Install OpenSSL terlebih dahulu."
    exit 1
fi

if [ ! -f "$DECRYPT_SCRIPT" ]; then
    echo "ERROR: scripts/decrypt-env.sh tidak ditemukan."
    exit 1
fi

bash "$DECRYPT_SCRIPT"