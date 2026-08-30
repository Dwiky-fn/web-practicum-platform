#!/usr/bin/env bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_FILE="$PROJECT_ROOT/config/production.env.enc"
OUTPUT_FILE="$PROJECT_ROOT/config/production.env"

echo "=========================================="
echo " Platform Praktikum Pemrograman"
echo " Environment Decryption (OpenSSL)"
echo "=========================================="
echo

if [ ! -f "$INPUT_FILE" ]; then
    echo "ERROR: config/production.env.enc tidak ditemukan." >&2
    exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: OpenSSL tidak ditemukan." >&2
    echo "Install OpenSSL terlebih dahulu." >&2
    exit 1
fi

if [ -f "$OUTPUT_FILE" ]; then
    echo "config/production.env sudah ada."
    read -r -p "Timpa dengan hasil dekripsi baru? [y/N]: " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Dekripsi dibatalkan."
        exit 0
    fi

    rm -f "$OUTPUT_FILE"
fi

if [ -z "${DEPLOYMENT_KEY:-}" ]; then
    echo "Masukkan deployment key untuk dekripsi."
    echo "Input tidak akan ditampilkan di terminal."
    echo
    read -r -s -p "Deployment key: " DEPLOYMENT_KEY
    echo
fi

if [ -z "$DEPLOYMENT_KEY" ]; then
    echo "ERROR: Deployment key tidak boleh kosong." >&2
    exit 1
fi

echo "Mendekripsi configuration..."

TMP_FILE="$(mktemp 2>/dev/null || echo "$OUTPUT_FILE.tmp")"

if openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "$INPUT_FILE" \
    -out "$TMP_FILE" \
    -pass pass:"$DEPLOYMENT_KEY" 2>/dev/null; then

    mv "$TMP_FILE" "$OUTPUT_FILE"
    chmod 600 "$OUTPUT_FILE"
    unset DEPLOYMENT_KEY

    echo
    echo "=========================================="
    echo "✓ Configuration berhasil didekripsi."
    echo "✓ Output: config/production.env"
    echo "✓ Permission: 600"
    echo "=========================================="
else
    rm -f "$TMP_FILE"
    unset DEPLOYMENT_KEY
    echo
    echo "ERROR: Dekripsi gagal." >&2
    echo "Deployment key mungkin salah atau file terenkripsi rusak." >&2
    exit 1
fi
