# Web Practicum Platform (Platform Praktikum Pemrograman)

Dokumentasi resmi dan panduan deployment lengkap untuk **Web Practicum Platform**, sebuah platform berbasis web yang dirancang untuk mengelola kegiatan praktikum pemrograman, jobsheet interaktif, kelas, mahasiswa, dosen, submission, eksekusi kode (*code execution*), dan evaluasi otomatis berbasis AI.

---

# 1. PROJECT OVERVIEW

**Web Practicum Platform** adalah sistem manajemen praktikum terpadu yang membantu dosen dan mahasiswa dalam proses pembelajaran pemrograman. Platform ini menyediakan:
- **Code Workspace Interaktif**: Monaco Editor berbasis browser dengan dukungan pengujian kode langsung via WebSocket.
- **Jobsheet & Rich Text Editor**: Pembuatan dan pengelolaan jobsheet interaktif menggunakan Tiptap Editor.
- **Penilaian Otomatis berbasis AI**: Integrasi AI Evaluator Service (MindRouter / Google Gemini API) untuk penilaian otomatis submission mahasiswa.
- **Manajemen Data Akademik**: Pengelolaan Jurusan, Program Studi, Mata Kuliah, Kelas Praktikum, Tahun Ajaran/Semester, Pengampu, serta Rekapitulasi Progress Mahasiswa.

---

# 2. ARCHITECTURE

Aplikasi ini menggunakan arsitektur *microservices* berbasis Docker Container yang saling berkomunikasi di dalam jaringan internal Docker (`practicum-network`). Seluruh lalu lintas publik (HTTP & WebSockets) dialirkan melalui **Nginx Reverse Proxy** sebagai satu-satunya pintu masuk (*entry point*).

### Service Docker Aktual:
1. **`nginx`**: Act as Reverse Proxy & Gateway. Meneruskan request HTTP ke `frontend` (React SPA) dan API/WebSocket ke `backend`. Expose port `80` ke host.
2. **`frontend`**: Service React SPA yang di-build menggunakan Vite dan disajikan melalui Nginx internal container pada port `80`.
3. **`backend`**: Node.js Express API server yang mengelola autentikasi, logika bisnis, query ke PostgreSQL, komunikasi WebSocket untuk live workspace/monitoring, dan integrasi webhook AI. Berjalan pada port internal `3000`.
4. **`ai-evaluator`**: Service berbasis Express.js yang bertugas mengevaluasi submission kode mahasiswa menggunakan AI Provider (MindRouter / Gemini API) dan mengirimkan callback ke backend. Berjalan pada port internal `5000`.
5. **`runner`**: WebSocket Code Runner Service berbasis Node.js yang mengeksekusi kode mahasiswa (Node.js, Python, Java) di lingkungan terisolasi. Berjalan pada port internal `4000`.
6. **`postgres`**: Database server PostgreSQL 17 Alpine untuk menyimpan seluruh data persisten sistem. Berjalan pada port internal `5432`.

### Diagram Arsitektur

```text
Client (Browser)
  |
  v (Port 80)
Nginx (Reverse Proxy)
  |
  +---> Frontend (React SPA) [internal port 80]
  |
  +---> Backend (Express API & WS) [internal port 3000]
          |
          +---> PostgreSQL Database [postgres:5432]
          +---> Code Runner (WebSocket) [runner:4000]
          +---> AI Evaluator Service [ai-evaluator:5000]
                       |
                       +---> LMS Webhook / Callback [http://backend:3000/api/internal/ai-callback]
                       +---> AI Provider (MindRouter / Gemini API)
```

---

# 3. TECHNOLOGY STACK

Berikut adalah teknologi yang digunakan dalam repository ini berdasarkan implementasi aktual:

- **Target Operating System**: Ubuntu Server 24.04 LTS
- **Orchestration & Containerization**: Docker & Docker Compose
- **Web Server / Reverse Proxy**: Nginx (1.27-alpine)
- **Database**: PostgreSQL 17 (`postgres:17-alpine`)
- **Backend API (`be_platform_praktikum`)**:
  - Runtime: Node.js (v22 - `node:22-bookworm-slim`)
  - Framework: Express.js (v5)
  - Real-time Communication: WebSocket (`ws`)
  - Migration Tool: `node-pg-migrate`
  - Auth & Security: JWT (`jsonwebtoken`), Bcrypt, Google Auth Library (`google-auth-library`)
  - Email Transport: Nodemailer (`nodemailer`), Resend SDK (`resend`)
- **Frontend SPA (`fe_platform_praktikum`)**:
  - Framework: React 19, TypeScript
  - Build Tool: Vite 7
  - Code Editor: Monaco Editor (`@monaco-editor/react`)
  - Jobsheet Editor: Tiptap (`@tiptap/react`)
  - State Management: Zustand
  - Styling: Tailwind CSS v4, Lucide React Icons
- **AI Evaluator Service (`ai_evaluator_service`)**:
  - Runtime: Node.js (>=22 - `node:22-bookworm-slim`)
  - Framework: Express.js (v4)
  - Integration SDK: OpenAI SDK (`openai`) untuk MindRouter & Google Gemini API
- **Code Runner (`websocket-runner-demo`)**:
  - Runtime: Node.js (v22 - `node:22-bookworm-slim`)
  - Supported Executables: Node.js v22, Python 3 (`python3`), OpenJDK 17 (`openjdk-17-jdk`)

---

# 4. THIRD-PARTY SERVICES

| Service | Fungsi Utama | Environment Variables Terkait |
| :--- | :--- | :--- |
| **MindRouter** | AI Provider utama untuk evaluasi otomatis submission jobsheet mahasiswa. | `AI_PROVIDER`, `MINDROUTER_API_KEY`, `MINDROUTER_MODEL`, `MINDROUTER_BASE_URL` |
| **Google Gemini API** | AI Provider alternatif / fallback untuk evaluasi AI. | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| **Google OAuth** | Autentikasi Single Sign-On (SSO) login akun Google mahasiswa/dosen. | `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` |
| **Cloudinary** | Cloud storage untuk upload gambar/media pada editor jobsheet. | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Resend** | Service email transaksional berbasis API untuk pengiriman OTP & notifikasi. | `RESEND_API_KEY`, `RESEND_FROM` |
| **Gmail / Custom SMTP** | Service email berbasis SMTP (Nodemailer) untuk pengiriman OTP & notifikasi. | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` |

### Logika Pemilihan Email Service (`MailService`):
- **Resend Primary**: Berdasarkan implementasi `MailService.js`, apabila `RESEND_API_KEY` terkonfigurasi di `.env`, sistem akan mengutamakan pengiriman email melalui **Resend API**.
- **Gmail / Custom SMTP Fallback**: Apabila `RESEND_API_KEY` tidak diisi (kosong), sistem secara otomatis menggunakan **Gmail SMTP / Custom SMTP** via `Nodemailer`.
- **Primary & Fallback Transport (SMTP)**: Pada mode SMTP, `MailService` mengonfigurasi transport utama (default port `587`) dan transport cadangan (default port `465`). Jika transport utama gagal/timeout, sistem secara otomatis mencoba transport cadangan.
- *Catatan*: Resend bukan fallback otomatis saat SMTP gagal, melainkan pilihan provider utama jika API key tersedia. Untuk akun Gmail, gunakan **App Password** 16 karakter, bukan password akun Google biasa.

---

# 5. REPOSITORY STRUCTURE

```text
web-practicum-platform/
├── config/                       # File konfigurasi deployment terenkripsi
│   └── production.env.enc        # Konfigurasi production terenkripsi
├── scripts/                      # Script otomasi & utilitas deployment
│   └── setup-env.sh              # Script setup environment terenkripsi / mandiri
├── be_platform_praktikum/        # Backend API Express.js & Migration scripts
│   ├── src/                      # Source code (Controllers, Services, Models, Routes)
│   ├── migrations/               # File migrasi database (node-pg-migrate)
│   ├── Dockerfile                # Dockerfile untuk Backend Service
│   └── package.json              # Dependency backend
├── fe_platform_praktikum/        # Frontend React SPA (Vite + Monaco Editor + Tiptap)
│   ├── src/                      # Components, Pages, Stores, Services
│   ├── nginx.conf                # Konfigurasi Nginx internal untuk mendistribusikan build SPA
│   ├── Dockerfile                # Multi-stage Dockerfile untuk build & serve frontend
│   └── package.json              # Dependency frontend
├── ai_evaluator_service/         # Microservice Evaluator berbasis AI (MindRouter/Gemini)
│   ├── src/                      # Server Express.js & AI Prompt Handlers
│   ├── Dockerfile                # Dockerfile untuk AI Evaluator Service
│   └── package.json              # Dependency AI Evaluator
├── websocket-runner-demo/        # Real-time WebSocket Code Runner (Node.js, Python, Java)
│   ├── src/                      # Logic eksekusi kode & WebSocket server
│   ├── Dockerfile                # Dockerfile (Node.js + Python3 + OpenJDK 17)
│   └── package.json              # Dependency Runner
├── nginx/                        # Nginx Reverse Proxy (Entrypoint Server)
│   └── nginx.conf                # Routing utama HTTP & WebSockets
├── .env.example                  # Template environment variables
├── docker-compose.yml            # Konfigurasi Multi-Container Docker Deployment
└── README.md                     # Dokumentasi resmi & Panduan deployment
```

---

# INSTALLATION & DEPLOYMENT

Panduan langkah demi langkah berikut dimulai dari **Ubuntu Server 24.04 LTS yang masih fresh** hingga aplikasi siap diakses melalui browser.

---

## 1. Persiapan Server

Sebelum memulai, pastikan server Ubuntu memenuhi prasyarat berikut:

- **Operating System**: Ubuntu Server 24.04 LTS (Clean Installation).
- **Akses Sudo**: User non-root dengan previlege `sudo`.
- **Akses Remote**: SSH terkonfigurasi jika menggunakan VPS/Cloud Instance remote.
- **Koneksi Internet**: Diperlukan untuk update paket, instalasi Docker, clone repo, dan pendaftaran image.

### Spesifikasi Hardware:
- **Trial / Environment Percobaan**:
  - **RAM**: 16 GB
  - **Storage**: 25 GB Disk Space
  - **CPU**: Multi-Core vCPU (2+ Core)
- *Catatan Penting*: Spesifikasi 16 GB RAM dan 25 GB Storage di atas merupakan lingkungan VM yang digunakan pada pengujian/percobaan saat ini. Nilai tersebut **bukanlah klaim minimum spesifikasi produksi**. Alokasi produksi yang sesungguhnya harus memperhitungkan beban transaksi, skala mahasiswa, serta pertumbuhan database dan image Docker.

---

## 2. Update Ubuntu

Sebelum menginstall dependency, perbarui indeks paket sistem operasi Ubuntu:

```bash
sudo apt update
sudo apt upgrade -y
```

Verifikasi versi sistem operasi Ubuntu:

```bash
cat /etc/os-release
```

*Pastikan output menunjukkan versi `Ubuntu 24.04 LTS (Noble Numbat)`.*

---

## 3. Install Git

Install `git` untuk melakukan clone repository dari GitHub:

```bash
sudo apt install -y git
```

Verifikasi instalasi Git:

```bash
git --version
```

---

## 4. Install Docker Engine

Ikuti prosedur resmi instalasi Docker Engine & Docker Compose Plugin untuk Ubuntu 24.04 LTS.

> **Catatan**: Jangan gunakan Docker Desktop pada Ubuntu Server headless. Gunakan Docker Engine (`docker-ce`) resmi.

### 4.1 Hapus Paket Docker Lama (Jika Ada)
```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove -y $pkg; done
```

### 4.2 Tambahkan Repository GPG Key Resmi Docker
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
```

### 4.3 Install Paket Utama Docker
```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 4.4 Enable & Start Docker Service
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 4.5 Verifikasi Instalasi Docker
```bash
docker --version
docker compose version
sudo systemctl status docker --no-pager
```

---

## 5. Konfigurasi User Docker

Tambahkan user deployment aktif ke dalam group `docker` agar dapat menjalankan perintah Docker tanpa awalan `sudo`:

```bash
sudo usermod -aG docker $USER
```

Agar perubahan group berlaku, lakukan logout lalu login kembali ke server SSH, atau jalankan perintah:

```bash
newgrp docker
```

Verifikasi bahwa Docker dapat dijalankan tanpa `sudo`:

```bash
docker run hello-world
```

*Jika lingkungan server membatasi izin group user, Anda tetap dapat menjalankan perintah Docker dengan menambahkan awalan `sudo`.*

---

## 6. Install Repository

Deployment percobaan saat ini menggunakan branch `development`. Clone repository menggunakan branch tersebut:

```bash
git clone -b development https://github.com/Dwiky-fn/web-practicum-platform.git
cd web-practicum-platform
```

Verifikasi branch dan status repository:

```bash
git branch --show-current
git status
```

*Pastikan output mengonfirmasi bahwa Anda berada di branch `development`.*

---

## 7. Konfigurasi Environment

Sistem menyediakan script setup interaktif `./scripts/setup-env.sh` untuk menyiapkan file `.env` deployment. Jalankan perintah:

```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

Administrator dapat memilih 2 opsi setup:
1. **Gunakan Konfigurasi Bawaan Sistem**: Mendekripsi file `config/production.env.enc` menggunakan **Deployment Key** yang dimasukkan secara manual oleh administrator setiap kali proses decrypt dilakukan.
   - *Kunci Deployment Bawaan (Percobaan/Testing)*: `DeploymentKey123!`
   - *Catatan*: Dalam lingkungan produksi nyata, Deployment Key ini dibuat dan disimpan secara aman oleh Lead DevOps/System Administrator (misal melalui Password Manager / Vault).
2. **Gunakan Konfigurasi secara Mandiri**: Menyalin `.env.example` ke `.env` untuk mengonfigurasi parameter secara manual (`nano .env`).

#### Pembuatan / Pembaruan File Terenkripsi Baru (`config/production.env.enc`):
Jika administrator ingin memperbarui isi rahasia dan membuat file terenkripsi baru dengan Deployment Key sendiri:
```bash
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -in .env -out config/production.env.enc
```

### Kelompok Variabel Lingkungan:

#### 1. Configuration Database PostgreSQL
```env
PGUSER=platform_user
PGPASSWORD=super_secret_db_password
PGDATABASE=platform_praktikum
```

#### 2. Security & Token Secrets (Wajib Diganti)
```env
AUTH_TOKEN_SECRET=change_this_jwt_secret_token_in_production
AUTH_TOKEN_EXPIRES_IN=12h
RUNNER_API_KEY=change_this_runner_secret_key
AI_SERVICE_API_KEY=change_this_ai_service_secret_key
```

#### 3. AI Evaluator Service
```env
AI_PROVIDER=mindrouter
MINDROUTER_API_KEY=your_mindrouter_api_key_here
MINDROUTER_MODEL=openai/gpt-5.6-luna
MINDROUTER_BASE_URL=https://api.mindrouter.io/v1

# Alternative AI Provider (Optional)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite

AI_TEMPERATURE=0.1
AI_CONTEXT_LENGTH=4096
AI_REQUEST_TIMEOUT_MS=300000
AI_MAX_CONCURRENT_REQUESTS=1
AI_MAX_RETRIES=2
```

#### 4. Code Runner Timeout Settings
```env
EXECUTION_TIMEOUT_MS=120000
IDLE_TIMEOUT_MS=60000
```

#### 5. Cloudinary Storage (Media Jobsheet)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

#### 6. Google OAuth (SSO Login)
```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

#### 7. Email / SMTP Configuration
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM="Platform Praktikum Pemrograman <your_email@gmail.com>"
```

#### 8. Resend Email Configuration (Optional / Primary)
```env
RESEND_API_KEY=
RESEND_FROM=
```

> **PERINGATAN KEAMANAN**:
> Jangan pernah meng-commit file `.env` ke versi kontrol (Git). Selalu gunakan credential khusus environment deployment.

---

## 8. Validasi Docker Compose

Sebelum melakukan proses build, validasi file `.env` dan struktur `docker-compose.yml` dengan perintah:

```bash
docker compose config
```

Perintah ini akan mencetak hasil sintaks yang sudah di-parse. Jika terdapat kesalahan penulisan variabel lingkungan atau tipe data, perbaiki file `.env` sebelum melanjutkan.

---

## 9. Build Docker Images

Jalankan perintah build untuk membuat seluruh image kustom aplikasi:

```bash
docker compose build
```

Proses build akan mengompilasi:
1. **`frontend`**: Multi-stage build (Node 22 -> Vite Build -> Nginx Alpine image).
2. **`backend`**: Node 22 slim image + dependency + file migrasi.
3. **`ai-evaluator`**: Node 22 slim image + OpenAI SDK dependency.
4. **`runner`**: Node 22 slim image + Python 3 + OpenJDK 17 Java SDK.

*Image PostgreSQL 17 Alpine dan Nginx Reverse Proxy Gateway diunduh langsung dari Docker Hub.*

---

## 10. Jalankan Semua Container

Jalankan seluruh service dalam mode latar belakang (*detached mode*):

```bash
docker compose up -d
```

Periksa status kontainer yang sedang berjalan:

```bash
docker compose ps
```

### Status Service yang Diharapkan:

| Service | State Target |
| :--- | :--- |
| **postgres** | `running (healthy)` |
| **runner** | `running (healthy)` |
| **ai-evaluator** | `running (healthy)` |
| **backend** | `running (healthy)` |
| **frontend** | `running` |
| **nginx** | `running` |

*Jika container backend menunjukkan status `starting`, tunggu beberapa detik hingga healthcheck HTTP bernilai sukses.*

---

## 11. Database Migration

Setelah service `backend` dan `postgres` berstatus aktif dan sehat (*healthy*), jalankan perbaikan skema database melalui skrip migrasi `node-pg-migrate`:

```bash
docker compose exec backend npm run migrate
```

### Verifikasi Skema Database PostgreSQL

1. **Cek Daftar Tabel Terbuat**:
   ```bash
   docker compose exec postgres psql -U platform_user -d platform_praktikum -c "\dt"
   ```

2. **Cek Skema Tabel `users`**:
   ```bash
   docker compose exec postgres psql -U platform_user -d platform_praktikum -c "\d users"
   ```
   *Pastikan file migrasi `1780888806800_add-is-email-changed-to-users.js` sukses diterapkan dan kolom `is_email_changed` bertipe `boolean` muncul pada tabel `users`.*

> **PERINGATAN FATAL**:
> Jangan pernah menggunakan perintah `docker compose down -v` secara sembarangan! Flag `-v` akan **menghapus volume Docker `postgres_data`**, yang mengakibatkan **seluruh data database terhapus secara permanen**.

---

## 12. Verifikasi Service

Lakukan pemeriksaan kesehatan seluruh log service container untuk memastikan tidak ada eror runtime saat inisialisasi:

```bash
docker compose ps
```

### Memeriksa Log Masing-Masing Service:

- **Nginx Reverse Proxy**:
  ```bash
  docker compose logs --tail=100 nginx
  ```
- **Frontend SPA**:
  ```bash
  docker compose logs --tail=100 frontend
  ```
- **Backend API**:
  ```bash
  docker compose logs --tail=100 backend
  ```
- **AI Evaluator Service**:
  ```bash
  docker compose logs --tail=100 ai-evaluator
  ```
- **WebSocket Code Runner**:
  ```bash
  docker compose logs --tail=100 runner
  ```
- **PostgreSQL Database**:
  ```bash
  docker compose logs --tail=100 postgres
  ```

---

## 13. Firewall Ubuntu (UFW)

Atur pengamanan server Ubuntu menggunakan Uncomplicated Firewall (UFW).

Berdasarkan `docker-compose.yml`, hanya port Nginx (**80**) yang dipublish ke publik host. Port internal aplikasi (`5432`, `3000`, `4000`, `5000`) **TIDAK Boleh** dibuka ke publik.

### Langkah Konfigurasi UFW yang Aman:

1. **Izinkan SSH (Agar Koneksi Remote Tidak Terputus)**:
   ```bash
   sudo ufw allow ssh
   ```

2. **Izinkan HTTP Port 80 (Nginx Entrypoint)**:
   ```bash
   sudo ufw allow 80/tcp
   ```

3. **(Opsional) Izinkan HTTPS Port 443 jika nanti menggunakan SSL**:
   ```bash
   sudo ufw allow 443/tcp
   ```

4. **Aktifkan UFW Firewall**:
   > **PERINGATAN**: Pastikan langkah (1) `sudo ufw allow ssh` sudah dijalankan sebelum mengaktifkan UFW untuk menghindari terputusnya sesi SSH.

   ```bash
   sudo ufw enable
   ```

5. **Cek Status Firewall**:
   ```bash
   sudo ufw status verbose
   ```

---

## 14. Akses Aplikasi

### 1. Dapatkan Alamat IP Server Ubuntu
```bash
ip -4 addr
```
*Cari alamat IP pada antarmuka jaringan aktif (misal: `192.168.x.x` atau IP Publik VPS).*

### 2. Buka Aplikasi di Browser
Buka web browser pada PC klien dan akses:

```text
http://<IP-SERVER>
```

Nginx sebagai entrypoint publik port `80` akan merender Frontend SPA dan meneruskan request API ke backend.

---

## 15. Verifikasi Fitur Aplikasi

Setelah halaman web terbuka, lakukan pengujian fitur-fitur utama berikut:

- [ ] **Tampilan Landing Page / Login**: Halaman pembuka dan form login muncul dengan sempurna.
- [ ] **Autentikasi Standard**: Login menggunakan Email / NIM / NIP.
- [ ] **Google OAuth**: Test Login via akun Google (jika OAuth Client ID dikonfigurasi).
- [ ] **Reset Password & Email OTP**: Permintaan OTP dan verifikasi kode OTP email.
- [ ] **Perubahan Email & Password**: Pengujian pembaharuan profil pengguna.
- [ ] **Dashboard Role**: Akses role Admin, Dosen, dan Mahasiswa.
- [ ] **Jobsheet & Rich Text**: Pembuatan dan pembacaan konten jobsheet.
- [ ] **Code Workspace**: Pembukaan Monaco Editor pada kelas praktikum.
- [ ] **Eksekusi Kode Node.js**: Running skrip JavaScript/Node.js di Code Runner via WebSocket.
- [ ] **Eksekusi Kode Python**: Running skrip Python 3 di Code Runner.
- [ ] **Eksekusi Kode Java**: Running skrip OpenJDK 17 Java di Code Runner.
- [ ] **Real-time WebSocket**: Pengujian monitoring & live workspace interaktif.
- [ ] **AI Evaluation**: Uji coba tombol "Evaluasi AI" pada tugas submission mahasiswa.
- [ ] **Media Upload**: Pengujian unggah gambar jobsheet ke Cloudinary (jika dikonfigurasi).

---

## 16. Konfigurasi Domain (Opsional)

Untuk menghubungkan server aplikasi dengan nama domain (misal: `praktikum.yourdomain.com`):

### Skema Alur DNS:
```text
Domain DNS (A Record) ---> IP Server Ubuntu ---> Nginx Port 80 ---> Frontend / Backend
```

1. Buka DNS Management provider domain Anda.
2. Tambahkan **A Record**:
   - **Host**: `praktikum` (atau `@` untuk root domain)
   - **Value**: `IP-SERVER-PUBLIC`
   - **TTL**: Auto / 300
3. Pada file `.env`, perbarui Authorized Origins Google OAuth agar mencakup domain baru.

---

## 17. HTTPS / SSL (Production Opsional)

Untuk penggunaan produksi terenkripsi, sangat disarankan menggunakan sertifikat SSL/TLS HTTPS melalui Certbot / Let's Encrypt.

### Gambaran Langkah Setup HTTPS:
1. Pastikan domain sudah mengarah ke IP Server dan Port `443` sudah diizinkan di UFW (`sudo ufw allow 443/tcp`).
2. Install Certbot di host Ubuntu:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
3. Konfigurasikan sertifikat SSL pada Nginx reverse proxy server block.

---

## 18. Backup Database

Lakukan backup berkala database PostgreSQL menggunakan utilitas `pg_dump` melalui container Docker:

### Perintah Backup Database:
```bash
docker compose exec -T postgres pg_dump -U platform_user -d platform_praktikum > backup_platform_$(date +%Y%m%d_%H%M%S).sql
```
*Simpan file `backup_*.sql` di lokasi penyimpanan eksternal yang aman.*

### Perintah Restore Database (Hati-hati):
> **PERINGATAN**: Restore database akan menimpa data yang ada saat ini.

```bash
cat backup_file.sql | docker compose exec -T postgres psql -U platform_user -d platform_praktikum
```

---

## 19. Storage Monitoring

Pantau penggunaan penyimpanan disk secara rutin, terutama pada VM percobaan (25 GB):

```bash
# Cek sisa kapasitas disk sistem operasi
df -h

# Cek penggunaan kapasitas storage oleh Docker
docker system df
```

### Membersihkan Cache Docker secara Aman:
```bash
# Membersihkan cache build Docker yang tidak terpakai
docker builder prune -f

# Membersihkan image Docker gantung (dangling images)
docker image prune -f
```

*Catatan*: Hindari menjalankan `docker system prune -a --volumes` kecuali Anda benar-beingar paham risiko kehilangan volume persisten.

---

## 20. Updating Application

Prosedur pembaruan kode aplikasi dari branch `development`:

### 1. Pull Update dari Git
```bash
git pull origin development
```

### 2. Rebuild & Restart Service yang Berubah

- **Jika Perubahan pada Backend**:
  ```bash
  docker compose build backend
  docker compose up -d backend
  ```

- **Jika Perubahan pada Frontend**:
  ```bash
  docker compose build frontend
  docker compose up -d frontend
  ```

- **Jika Perubahan pada Migrasi Database**:
  ```bash
  docker compose build backend
  docker compose up -d backend
  docker compose exec backend npm run migrate
  ```

- **Jika Perubahan pada Dockerfile / docker-compose.yml**:
  ```bash
  docker compose build
  docker compose up -d
  ```

---

## 21. Rollback / Recovery

Jika deployment terbaru mengalami masalah kritikal:

1. **Cek Status & History Git**:
   ```bash
   git status
   git log -n 5 --oneline
   ```
2. **Kembali ke Commit Stabil Sebelumnya**:
   ```bash
   git checkout <commit-hash-sebelumnya>
   ```
3. **Rebuild & Restart Service**:
   ```bash
   docker compose build
   docker compose up -d
   ```

---

## 22. Shutdown / Restart Server

Seluruh service di `docker-compose.yml` telah dikonfigurasi dengan kebijakan restart:
```yaml
restart: unless-stopped
```

Artinya, apabila server Ubuntu di-restart atau mengalami reboot mati listrik:
- Service Docker Engine akan otomatis berjalan saat boot.
- Seluruh 6 container aplikasi akan otomatis menyala kembali ke kondisi terakhir.

### Verifikasi Setelah Reboot:
```bash
docker compose ps
```

Jika ada service yang belum berjalan:
```bash
docker compose up -d
```

---

## 23. Troubleshooting

| Gejala Masalah | Penyebab Umum | Perintah Pemeriksaan & Solusi |
| :--- | :--- | :--- |
| **Docker Daemon Inactive** | Service Docker belum berjalan. | `sudo systemctl status docker`<br>`sudo systemctl start docker` |
| **Docker Permission Denied** | User belum masuk group `docker`. | `sudo usermod -aG docker $USER`<br>Lalu jalankan `newgrp docker`. |
| **Port 80 Already in Use** | Port 80 terpakai service host lain (misal Apache/Nginx host). | `sudo netstat -tlpn \| grep :80`<br>`sudo systemctl stop nginx` (jika dari host). |
| **Container Restart Loop** | Eror konfigurasi `.env` atau crash script. | `docker compose logs --tail=100 <service-name>` |
| **Database Unhealthy** | Postgres belum siap atau password mismatch. | `docker compose logs postgres`<br>Cek kesamaan `PGPASSWORD` di `.env`. |
| **Migration Gagal** | Koneksi DB putus atau migrasi crash. | `docker compose exec backend npm run migrate` |
| **Frontend Blank Page** | Gagal load bundle JS / API URL salah. | Cek Console Browser (F12) & `docker compose logs frontend`. |
| **Login Gagal** | JWT secret mismatch / DB kosong. | Jalankan migrasi database & periksa log backend. |
| **WebSocket Gagal** | Blocking header proxy Nginx. | Cek `nginx/nginx.conf` pada blok `/execution`, `/monitoring`. |
| **AI Evaluator Timeout** | API Key MindRouter/Gemini invalid / exhausted. | Cek kuota API Key & `docker compose logs ai-evaluator`. |
| **Code Runner Timeout** | Resource limit berlebih / WS disconnect. | Cek `docker compose logs runner` & setting `EXECUTION_TIMEOUT_MS`. |
| **Email Gagal Terkirim** | SMTP App Password Gmail salah / API Key Resend invalid. | Cek `MAIL_PASS` 16 digit Gmail & `docker compose logs backend`. |
| **Disk Storage Full** | Log & image Docker menumpuk. | `df -h`<br>`docker builder prune -f`<br>`docker image prune -f` |

---

## 24. Quick Deployment Checklist

Gunakan checklist urutan dari **server Ubuntu kosong** ini untuk memastikan tidak ada langkah yang terlewat:

- [ ] Server Ubuntu 24.04 LTS siap & koneksi internet aktif
- [ ] User Memiliki Hak Sudo & Akses SSH
- [ ] Perintah `sudo apt update && sudo apt upgrade -y` berhasil
- [ ] Git terinstall (`git --version`)
- [ ] Docker Engine terinstall dari repository resmi
- [ ] Docker Compose Plugin terinstall (`docker compose version`)
- [ ] Docker Service active & enabled (`sudo systemctl status docker`)
- [ ] User terdaftar di group Docker (`docker run hello-world` sukses)
- [ ] Repository berhasil di-clone (`git clone -b development ...`)
- [ ] Verifikasi branch aktif (`git branch --show-current` -> `development`)
- [ ] File `.env` dibuat dari `.env.example`
- [ ] All Secrets & Credential third-party diisi di `.env`
- [ ] Perintah `docker compose config` berhasil tanpa sintaks error
- [ ] Perintah `docker compose build` sukses membuat seluruh image
- [ ] Perintah `docker compose up -d` sukses menyalakan 6 container
- [ ] Service PostgreSQL `healthy` (`docker compose ps`)
- [ ] Service Runner `healthy` (`docker compose ps`)
- [ ] Service AI Evaluator `healthy` (`docker compose ps`)
- [ ] Service Backend `healthy` (`docker compose ps`)
- [ ] Service Frontend `running` (`docker compose ps`)
- [ ] Service Nginx `running` (`docker compose ps`)
- [ ] Database migration sukses (`docker compose exec backend npm run migrate`)
- [ ] Skema database diverifikasi (`\dt` dan `\d users` memuat `is_email_changed`)
- [ ] UFW Firewall diatur aman (`allow ssh`, `allow 80/tcp`, `enable`)
- [ ] Aplikasi dapat dibuka via browser (`http://<IP-SERVER>`)
- [ ] Verifikasi Login & Dashboard berjalan
- [ ] Verifikasi Pengiriman Email OTP berjalan
- [ ] Verifikasi Eksekusi Kode (Node.js, Python, Java) di Code Runner berjalan
- [ ] Verifikasi Evaluasi Otomatis AI berjalan
- [ ] File backup database pertama berhasil dibuat (`pg_dump`)

---

# IMPORTANT NOTES

Dokumentasi [README.md](file:///d:/tugas_akhir/README.md) ini disusun berdasarkan implementasi aktual repository **web-practicum-platform** dan telah diuji pada lingkungan Ubuntu Server 24.04 LTS. Apabila terdapat pembaruan source code, penambahan microservice, atau perubahan variabel lingkungan di masa mendatang, README ini wajib diperbarui agar senantiasa menjadi panduan acuan standar pengembang dan tim administrator server.
