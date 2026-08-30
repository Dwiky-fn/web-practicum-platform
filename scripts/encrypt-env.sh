#!/usr/bin/env bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_FILE="$PROJECT_ROOT/config/production.env"
OUTPUT_FILE="$PROJECT_ROOT/config/production.env.enc"

echo "=========================================="
echo " Platform Praktikum Pemrograman"
echo " Environment Encryption (OpenSSL)"
echo "=========================================="
echo

if [ ! -f "$INPUT_FILE" ]; then
    echo "ERROR: config/production.env tidak ditemukan."
    exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: OpenSSL tidak ditemukan."
    echo "Install OpenSSL terlebih dahulu."
    exit 1
fi

if [ -f "$OUTPUT_FILE" ]; then
    echo "config/production.env.enc sudah ada."
    read -r -p "Timpa dengan hasil enkripsi baru? [y/N]: " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Enkripsi dibatalkan."
        exit 0
    fi

    rm -f "$OUTPUT_FILE"
fi

if [ -z "${DEPLOYMENT_KEY:-}" ]; then
    echo "Masukkan deployment key untuk enkripsi."
    echo "Input tidak akan ditampilkan di terminal."
    echo
    read -r -s -p "Deployment key: " DEPLOYMENT_KEY
    echo
fi

if [ -z "$DEPLOYMENT_KEY" ] || [ "${#DEPLOYMENT_KEY}" -lt 16 ]; then
    echo "ERROR: Deployment key tidak valid (minimal 16 karakter)."
    exit 1
fi

echo "Mengenkripsi configuration..."

openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$INPUT_FILE" \
    -out "$OUTPUT_FILE" \
    -pass pass:"$DEPLOYMENT_KEY"

chmod 600 "$OUTPUT_FILE"
unset DEPLOYMENT_KEY

echo
echo "=========================================="
echo "✓ Configuration berhasil dienkripsi."
echo "✓ Output: config/production.env.enc"
echo "✓ Permission: 600"
echo "=========================================="
