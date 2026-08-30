#!/usr/bin/env bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENC_FILE="$PROJECT_ROOT/config/production.env.enc"
ENV_FILE="$PROJECT_ROOT/config/production.env"

echo "=========================================="
echo " Platform Praktikum Pemrograman"
echo " Environment Setup"
echo "=========================================="
echo

if [ ! -f "$ENC_FILE" ]; then
    echo "ERROR: config/production.env.enc tidak ditemukan."
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js tidak ditemukan."
    echo "Install Node.js terlebih dahulu."
    exit 1
fi

if [ -f "$ENV_FILE" ]; then
    echo "config/production.env sudah ada."
    echo
    read -r -p "Timpa dengan hasil dekripsi baru? [y/N]: " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Setup dibatalkan."
        exit 0
    fi

    rm -f "$ENV_FILE"
fi

echo "Masukkan deployment key."
echo "Input tidak akan ditampilkan di terminal."
echo

read -r -s -p "Deployment key: " DEPLOYMENT_KEY
echo

if [ -z "$DEPLOYMENT_KEY" ]; then
    echo "ERROR: Deployment key tidak boleh kosong."
    exit 1
fi

echo
echo "Mendekripsi configuration..."

DEPLOYMENT_KEY="$DEPLOYMENT_KEY" node "$PROJECT_ROOT/scripts/decrypt-env.js"

unset DEPLOYMENT_KEY

chmod 600 "$ENV_FILE"

echo
echo "=========================================="
echo "✓ Environment berhasil disiapkan."
echo "✓ File: config/production.env"
echo "✓ Permission: 600"
echo "=========================================="