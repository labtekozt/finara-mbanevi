# 🚀 Setup Guide FINARA

Panduan lengkap untuk menjalankan aplikasi FINARA di local development.

## 📋 Prerequisites

Sebelum memulai, pastikan Anda telah menginstal:

1. **Node.js** versi 18 atau lebih tinggi
   - Download dari [nodejs.org](https://nodejs.org/)
   - Verifikasi: `node --version`

2. **PostgreSQL** versi 14 atau lebih tinggi
   - Download dari [postgresql.org](https://www.postgresql.org/download/)
   - Verifikasi: `psql --version`

3. **Git** (optional, untuk clone repository)
   - Download dari [git-scm.com](https://git-scm.com/)

## 🗄️ Setup Database PostgreSQL

### Windows

1. **Install PostgreSQL**
   - Download installer dari postgresql.org
   - Jalankan installer dan ikuti wizard
   - Catat password untuk user `postgres` yang Anda buat

2. **Buat Database**

   ```cmd
   # Buka Command Prompt atau PowerShell
   psql -U postgres

   # Di dalam psql prompt
   CREATE DATABASE finara_db;
   \q
   ```

### Linux/Mac

1. **Install PostgreSQL**

   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # Mac (menggunakan Homebrew)
   brew install postgresql
   brew services start postgresql
   ```

2. **Buat Database**

   ```bash
   # Login sebagai postgres user
   sudo -u postgres psql

   # Di dalam psql prompt
   CREATE DATABASE finara_db;
   \q
   ```

### Menggunakan Docker (Alternative)

```bash
docker run --name finara-postgres \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=finara_db \
  -p 5432:5432 \
  -d postgres:14
```

## ⚙️ Setup Aplikasi

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Buat file `.env` di root project:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:password123@localhost:5432/finara_db?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ganti-dengan-random-string-yang-panjang-dan-aman"

# Logging Configuration (Optional)
# LOG_LEVEL=info # debug, info, warn, error
```

**Penting:**

- Ganti `password123` dengan password PostgreSQL Anda
- Ganti `NEXTAUTH_SECRET` dengan string random yang aman

## 📝 Logging System

Aplikasi ini menggunakan `winston` untuk structured logging.

- **Development:** Log ditampilkan di console dengan warna.
- **Production:** Log disimpan di folder `logs/` dengan rotasi harian.
  - `logs/error-%DATE%.log`: Hanya log error.
  - `logs/combined-%DATE%.log`: Semua log.

Anda dapat mengatur level log melalui environment variable `LOG_LEVEL`.

Untuk generate `NEXTAUTH_SECRET`, gunakan:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Setup Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database
npm run db:push
```

### 4. Seed Database dengan Data Awal

```bash
npm run db:seed
```

Ini akan membuat:

- 4 user dengan role berbeda
- 2 lokasi gudang
- 10 produk sample

### 5. Run Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di: **http://localhost:3000**

## 🔑 Login Credentials

Gunakan salah satu credentials berikut untuk login:

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| admin    | admin123   | Admin   |
| kasir    | kasir123   | Kasir   |
| gudang   | gudang123  | Gudang  |
| manajer  | manajer123 | Manajer |

## 🛠️ Troubleshooting

### Error: "Cannot connect to database"

**Solusi:**

1. Pastikan PostgreSQL service berjalan:

   ```bash
   # Windows
   # Cek Services atau Task Manager

   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql

   # Mac
   brew services list
   brew services start postgresql
   ```

2. Verifikasi connection string di `.env`
3. Test koneksi database:
   ```bash
   psql -U postgres -d finara_db
   ```

### Error: "Prisma Client did not initialize yet"

**Solusi:**

```bash
npm run db:generate
```

### Error: "Port 3000 already in use"

**Solusi:**

```bash
# Gunakan port lain
PORT=3001 npm run dev

# Atau kill process di port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Error saat seed: "User already exists"

**Solusi:**

```bash
# Drop dan buat ulang database
psql -U postgres
DROP DATABASE finara_db;
CREATE DATABASE finara_db;
\q

# Ulangi setup
npm run db:push
npm run db:seed
```

### Error: "Module not found"

**Solusi:**

```bash
# Hapus node_modules dan install ulang
rm -rf node_modules package-lock.json
npm install
```

## 📊 Prisma Studio (Database GUI)

Untuk melihat dan mengedit data database secara visual:

```bash
npm run db:studio
```

Akan membuka Prisma Studio di: **http://localhost:5555**

## 🔄 Reset Database

Jika ingin reset database dan mulai dari awal:

```bash
# Drop semua data dan push schema ulang
npm run db:push -- --force-reset

# Seed ulang
npm run db:seed
```

## 🏗️ Build untuk Production

```bash
# Build aplikasi
npm run build

# Run production server
npm start
```

## 📝 Development Commands

```bash
# Development
npm run dev              # Jalankan dev server
npm run build            # Build untuk production
npm start                # Jalankan production build
npm run lint             # Check linting errors

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema ke database
npm run db:seed          # Seed database
npm run db:studio        # Buka Prisma Studio
```

## 🎯 Next Steps

Setelah aplikasi berjalan:

1. **Login** dengan salah satu user credentials
2. **Explore** setiap modul:
   - Dashboard - Lihat ringkasan statistik
   - Kasir - Coba lakukan transaksi penjualan
   - Inventaris - Tambah/edit barang
   - Transaksi - Catat barang masuk/keluar
3. **Test** role-based access dengan login sebagai user berbeda

## 💡 Tips Development

1. **Hot Reload**: Next.js mendukung hot reload, edit code dan lihat perubahan langsung
2. **TypeScript**: Gunakan type checking untuk menghindari error
3. **Prisma Studio**: Gunakan untuk debug dan inspect data
4. **Browser DevTools**: Gunakan Network tab untuk debug API calls
5. **VSCode Extensions**: Install Prisma extension untuk syntax highlighting

## 🐛 Masalah Umum

### CORS Error

Jika mengalami CORS error, pastikan API dan frontend berjalan di origin yang sama (localhost:3000).

### Session Error

Jika logout otomatis, pastikan `NEXTAUTH_SECRET` sudah diset dengan benar di `.env`.

### Slow Performance

Development mode lebih lambat dari production. Untuk testing performa, gunakan:

```bash
npm run build
npm start
```

## 📞 Butuh Bantuan?

Jika mengalami masalah yang tidak ada di troubleshooting guide:

1. Cek [README.md](README.md) untuk dokumentasi lengkap
2. Cek error message di terminal
3. Cek browser console untuk client-side errors
4. Create issue di repository

---

Selamat coding! 🚀
