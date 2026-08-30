#!/usr/bin/env bash

# Setup Environment Configuration Script for Web Practicum Platform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"
ENC_CONFIG="${ROOT_DIR}/config/production.env.enc"

echo "========================================================"
echo "    Web Practicum Platform - Environment Setup Tool     "
echo "========================================================"
echo ""
echo "Pilih metode konfigurasi environment deployment:"
echo "1) Gunakan konfigurasi bawaan sistem (Decrypt config/production.env.enc)"
echo "2) Gunakan konfigurasi secara mandiri (Salin dari .env.example)"
echo ""

read -rp "Masukkan pilihan [1-2]: " CHOICE

case "$CHOICE" in
    1)
        echo ""
        echo "[Opsi 1] Menggunakan Konfigurasi Bawaan Sistem"
        
        if [ ! -f "$ENC_CONFIG" ]; then
            echo "Error: File konfigurasi terenkripsi '$ENC_CONFIG' tidak ditemukan!"
            exit 1
        fi

        if ! command -v openssl &> /dev/null; then
            echo "Error: Perintah 'openssl' tidak ditemukan. Harap install OpenSSL terlebih dahulu."
            exit 1
        fi

        read -sp "Masukkan Deployment Key: " DEPLOYMENT_KEY
        echo ""

        if [ -z "$DEPLOYMENT_KEY" ]; then
            echo "Error: Deployment Key tidak boleh kosong!"
            exit 1
        fi

        echo "Mendekripsi file konfigurasi..."

        # Temporary file for decrypted output to prevent overwriting existing .env on failure
        TMP_ENV="$(mktemp)"

        if openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in "$ENC_CONFIG" -out "$TMP_ENV" -pass pass:"$DEPLOYMENT_KEY" 2>/dev/null; then
            mv "$TMP_ENV" "$ENV_FILE"
            chmod 600 "$ENV_FILE" 2>/dev/null || true
            echo ""
            echo "SUCCESS: File '.env' berhasil dibuat dari konfigurasi terenkripsi!"
            echo "Catatan: Jaga kerahasiaan file '.env' dan jangan simpan di versi kontrol git."
        else
            rm -f "$TMP_ENV"
            echo ""
            echo "ERROR: Gagal mendekripsi file! Deployment key salah atau file terenkripsi tidak valid."
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "[Opsi 2] Menggunakan Konfigurasi secara Mandiri"

        if [ ! -f "$ENV_EXAMPLE" ]; then
            echo "Error: File template '$ENV_EXAMPLE' tidak ditemukan!"
            exit 1
        fi

        if [ -f "$ENV_FILE" ]; then
            read -rp "File '.env' sudah ada. Apakah Anda ingin menimpanya? (y/N): " CONFIRM
            case "$CONFIRM" in
                [yY][eE][sS]|[yY])
                    ;;
                *)
                    echo "Operasi dibatalkan. File '.env' tidak diubah."
                    exit 0
                    ;;
            esac
        fi

        cp "$ENV_EXAMPLE" "$ENV_FILE"
        chmod 600 "$ENV_FILE" 2>/dev/null || true
        echo ""
        echo "SUCCESS: File '.env' berhasil dibuat dari '.env.example'."
        echo "Silakan edit file '.env' secara manual untuk menyesuaikan parameter environment Anda."
        ;;
    *)
        echo ""
        echo "Error: Pilihan tidak valid ($CHOICE). Silakan jalankan ulang script."
        exit 1
        ;;
esac
