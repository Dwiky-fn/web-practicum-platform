# Web Practicum Platform — Production Deployment Guide

Dokumentasi resmi dan panduan deployment produksi untuk **Web Practicum Platform**, sebuah platform berbasis web untuk pengelolaan kegiatan praktikum pemrograman, jobsheet interaktif, eksekusi kode (*code execution*), dan evaluasi otomatis berbasis AI.

---

## 1. Overview & Arsitektur Deployment

Deployment produksi disederhanakan dengan mengamankan variabel lingkungan (*environment variables*) dalam bentuk file terenkripsi `config/production.env.enc` di repository, dan menyediakan script otomatisasi berbasis Docker Compose serta OpenSSL.

### Alur Deployment:

```text
[ Developer Environment ]
    │
    │ Edit config/production.env
    ↓
./scripts/encrypt-env.sh (OpenSSL AES-256-CBC PBKDF2)
    │
    ↓
Hasilkan config/production.env.enc
    │
    │ Git Push
    ↓
[ GitHub Repository ]
    │
    │ Git Clone
    ↓
[ Server / VM Production (Linux) ]
    │
    ↓
./scripts/setup.sh
    │
    ├── Meminta Deployment Key secara manual
    ├── Mendekripsi config/production.env (OpenSSL)
    ├── Memvalidasi Docker Compose Configuration
    ├── Build Docker Images (frontend, backend, ai-evaluator, runner)
    ├── Jalankan Container (docker compose up -d)
    ├── Menunggu PostgreSQL Healthy
    ├── Jalankan Database Migration (npm run migrate di dalam container backend)
    └── Menampilkan Status Deployment
```

### Arsitektur Container Docker:

Aplikasi berjalan di dalam jaringan terisolasi (`practicum-network`) dengan 6 service:
- **`nginx`** (Port 80): Gateway / Reverse Proxy publik untuk HTTP dan WebSocket.
- **`frontend`** (Port 80 Internal): React SPA (Vite + Monaco Editor + Tiptap).
- **`backend`** (Port 3000 Internal): Node.js Express API & WebSocket Server.
- **`ai-evaluator`** (Port 5000 Internal): Service Evaluator AI (MindRouter / Gemini API).
- **`runner`** (Port 4000 Internal): Code Runner Service (Node.js, Python 3, OpenJDK 17 Java).
- **`postgres`** (Port 5432 Internal): PostgreSQL 17 Database.

---

## 2. Prasyarat Server (Host Dependencies)

Host server / VM produksi **HANYA** memerlukan dependency minimal berikut:

- **Git**
- **Docker Engine** (v24.0+)
- **Docker Compose Plugin** (v2.0+)
- **OpenSSL**

> **PENTING**:
> **Node.js dan npm TIDAK DIPERLUKAN pada host server**. Seluruh runtime Node.js, build tool, dan proses migration berjalan di dalam Docker container. Administrator tidak perlu meng-install Node.js/npm langsung di sistem operasi host server.

---

## 3. Dukungan Sistem Operasi

- **Server Production**: Distribusi Linux 64-bit yang mendukung Bash, OpenSSL, Docker, dan Docker Compose (direkomendasikan: **Ubuntu Server 24.04 LTS / 22.04 LTS**, **Debian 12**).
- **Developer Environment**: Linux, macOS, atau Windows (via Git Bash / WSL) untuk mengelola dan mengenkripsi file environment.

---

## 4. Clone Repository

Jalankan perintah berikut di server produksi:

```bash
git clone -b development https://github.com/Dwiky-fn/web-practicum-platform.git
cd web-practicum-platform
```

> *Catatan*: Sesuaikan nama branch jika deployment menggunakan branch lain (misalnya `main` atau `development`).

### Verifikasi Branch Aktif:
```bash
git branch --show-current
```

---

## 5. Encrypted Environment & Deployment Key

Untuk menjaga keamanan credential produksi (seperti password database, JWT secret, API key AI, dan credential SMTP), repository hanya menyimpan versi terenkripsi:

```text
config/production.env (Plaintext — RAHASIA — DILARANG commit ke Git)
        ↓  (dimuat oleh ./scripts/encrypt-env.sh)
config/production.env.enc (Ter-enkripsi — AMAN dimasukkan ke Git)
```

### Konsep Deployment Key:
- **Deployment Key** adalah kunci rahasia (minimal 16 karakter) yang dibuat dan dikelola oleh pemilik deployment.
- Deployment Key **TIDAK PERNAH disimpan** di dalam repository, source code, README, file `.env`, atau log server.
- Deployment Key dimasukkan secara **manual** melalui prompt terminal saat `./scripts/setup.sh` atau `./scripts/decrypt-env.sh` dijalankan di server.

---

## 6. Mekanisme Enkripsi (OpenSSL)

Proses enkripsi dan dekripsi menggunakan standar enkripsi **OpenSSL**:
- **Cipher Algorithm**: AES-256-CBC (`-aes-256-cbc`)
- **Key Derivation Function**: PBKDF2 dengan Salt (`-salt -pbkdf2`)
- **Iteration Count**: 100,000 iterasi (`-iter 100000`)

---

## 7. Setup Otomatis Production (Entry Point Utama)

Administrator server **cukup menjalankan satu perintah setup utama**:

```bash
chmod +x scripts/setup.sh scripts/*.sh
./scripts/setup.sh
```

### Langkah-langkah Otomatis yang Dilakukan Script:
1. Memeriksa struktur project dan keberadaan dependency host (`git`, `openssl`, `docker`, `docker compose`).
2. Memeriksa status Docker daemon.
3. Meminta **Deployment Key** (input disembunyikan dari layar terminal).
4. Mendekripsi `config/production.env.enc` menjadi `config/production.env` dengan permission `600`.
5. Memvalidasi konfigurasi Docker Compose.
6. Membangun (*build*) Docker image seluruh service (`frontend`, `backend`, `ai-evaluator`, `runner`).
7. Menjalankan seluruh container dalam mode *detached* (`docker compose up -d`).
8. Menunggu database PostgreSQL mencapai status `healthy`.
9. Menjalankan migrasi database otomatis (`docker compose exec -T backend npm run migrate`).
10. Menampilkan status akhir seluruh container.

---

## 8. Verifikasi Deployment

Setelah `./scripts/setup.sh` selesai, verifikasi status service dengan perintah:

```bash
docker compose --env-file config/production.env -f docker-compose.yml ps
```

### Status Service yang Diharapkan:

| Service | Container Name | Target State |
| :--- | :--- | :--- |
| **postgres** | `postgres` | `running (healthy)` |
| **runner** | `runner` | `running (healthy)` |
| **ai-evaluator** | `ai-evaluator` | `running (healthy)` |
| **backend** | `backend` | `running (healthy)` |
| **frontend** | `frontend` | `running` |
| **nginx** | `nginx` | `running` |

Aplikasi kini dapat diakses melalui browser di: `http://<IP-SERVER>`

---

## 9. Database Migration

Migrasi database dikelola menggunakan `node-pg-migrate` yang dijalankan di dalam container `backend`.

Perintah ini dijalankan **secara otomatis** oleh `./scripts/setup.sh`. Jika perlu menjalankan migrasi manual di lain waktu:

```bash
docker compose --env-file config/production.env -f docker-compose.yml exec -T backend npm run migrate
```

---

## 10. Pengelolaan Service (Restart & Stop)

### Menghentikan Aplikasi:
```bash
docker compose --env-file config/production.env -f docker-compose.yml down
```

### Meng-restart Aplikasi:
```bash
docker compose --env-file config/production.env -f docker-compose.yml restart
```

> **PERINGATAN FATAL (DATA LOSS)**:
> Jangan pernah menjalankan perintah `docker compose down -v` secara sembarangan! Flag `-v` akan **menghapus volume persisten PostgreSQL (`postgres_data`)**, yang mengakibatkan seluruh data database terhapus secara permanen.

---

## 11. Updating Deployment

Ketika ada pembaruan kode aplikasi atau skema database pada repository:

```bash
# 1. Pull perubahan terbaru dari Git
git pull

# 2. Jalankan ulang setup otomatis
./scripts/setup.sh
```

`setup.sh` akan secara otomatis menggunakan `config/production.env` yang sudah ada (atau meminta dekripsi ulang jika diperlukan), mengompilasi ulang image service yang berubah, dan menjalankan migrasi database baru.

---

## 12. Troubleshooting

### 1. OpenSSL Tidak Ditemukan (`openssl: command not found`)
- **Penyebab**: OpenSSL belum ter-install pada host server.
- **Solusi**: Install OpenSSL via package manager: `sudo apt update && sudo apt install -y openssl`

### 2. Docker Tidak Ditemukan (`docker: command not found`)
- **Solusi**: Install Docker Engine pada host server Ubuntu/Debian.

### 3. Docker Daemon Tidak Aktif
- **Error**: `Docker daemon tidak dapat diakses.`
- **Solusi**: Biarkan service Docker berjalan: `sudo systemctl start docker`

### 4. Deployment Key Salah / Dekripsi Gagal
- **Error**: `ERROR: Dekripsi gagal. Deployment key mungkin salah...`
- **Solusi**: Jalankan kembali `./scripts/setup.sh` atau `./scripts/setup-env.sh` dan pastikan memasukkan Deployment Key yang benar.

### 5. PostgreSQL Belum Healthy
- **Solusi**: Cek log database dengan perintah:
  ```bash
  docker compose --env-file config/production.env -f docker-compose.yml logs postgres
  ```

### 6. Service Backend Error / Crash Loop
- **Solusi**: Periksa log 100 baris terakhir service backend:
  ```bash
  docker compose --env-file config/production.env -f docker-compose.yml logs --tail=100 backend
  ```

---

## 13. Security Notes

1. **Jangan Pernah Commit Plaintext Environment**: File `config/production.env` berisi credential rahasia dan **dilarang keras** di-commit ke Git.
2. **Jangan Pernah Commit Deployment Key**: Kunci dekripsi tidak boleh dicatat dalam file komit atau skrip.
3. **File Terenkripsi yang Diizinkan**: Hanya `config/production.env.enc` yang boleh di-commit dan masuk ke versi kontrol.
4. **Hak Akses File**: File `config/production.env` diatur secara otomatis dengan permission terbatas `600` (`chmod 600`).

---

## 14. Struktur File Deployment

```text
web-practicum-platform/
├── config/
│   ├── production.env.enc    # Environment terenkripsi (Tracked di Git)
│   └── production.env        # Environment dekripsi (Di-ignore Git, permission 600)
├── scripts/
│   ├── setup.sh              # Entry point utama deployment server
│   ├── setup-env.sh          # Helper script dekripsi environment
│   ├── encrypt-env.sh        # Script enkripsi environment (Workflow Developer)
│   └── decrypt-env.sh        # Script dekripsi environment (OpenSSL engine)
├── docker-compose.yml        # Konfigurasi container orchestration
└── README.md                 # Dokumentasi resmi deployment
```

---

## 15. Workflow Developer (Memperbarui Encrypted Environment)

Jika developer melakukan perubahan pada variabel lingkungan produksi di `config/production.env`:

```bash
# 1. Edit file config/production.env
nano config/production.env

# 2. Jalankan script enkripsi
./scripts/encrypt-env.sh

# 3. Masukkan Deployment Key (minimal 16 karakter) saat diminta
# Output: config/production.env.enc berhasil dibuat/diperbarui

# 4. Verifikasi keselamatan Git
git status
git check-ignore -v config/production.env

# 5. Commit & Push HANYA file terenkripsi
git add config/production.env.enc
git commit -m "chore: update encrypted production environment"
git push origin <branch-name>
```

---

## 16. Git Safety Check

Sebelum melakukan commit, jalankan verifikasi untuk memastikan plaintext environment tidak akan ter-commit ke Git:

```bash
git check-ignore -v config/production.env
```
*Output yang diharapkan:* `.gitignore:10:config/production.env config/production.env`
