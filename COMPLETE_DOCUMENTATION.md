# 📚 DOKUMENTASI LENGKAP SISTEM FINARA

**FINARA - Sistem Manajemen Ritel & Gudang Terpadu dengan Akuntansi Terintegrasi**

Version: 0.1.0  
Last Updated: 2 Januari 2026

---

## 📋 Daftar Isi

1. [Ringkasan Sistem](#ringkasan-sistem)
2. [Fitur-Fitur yang Telah Dikembangkan](#fitur-fitur-yang-telah-dikembangkan)
3. [Arsitektur Sistem](#arsitektur-sistem)
4. [Teknologi Stack](#teknologi-stack)
5. [Integrasi GitHub Actions](#integrasi-github-actions)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Role-Based Access Control](#role-based-access-control)
9. [Instalasi dan Setup](#instalasi-dan-setup)
10. [Testing](#testing)
11. [Deployment](#deployment)

---

## 🎯 Ringkasan Sistem

FINARA adalah sistem manajemen terpadu yang menggabungkan operasional retail (Point of Sale), manajemen inventaris gudang, dan sistem akuntansi lengkap dalam satu platform terintegrasi. Sistem ini dibangun dengan Next.js 15, React 19, dan PostgreSQL dengan Prisma ORM.

### Tujuan Utama
- Menyederhanakan operasional retail dan gudang
- Otomasi pencatatan akuntansi dari transaksi bisnis
- Menyediakan laporan keuangan real-time
- Manajemen hutang-piutang terintegrasi
- Tracking inventaris multi-lokasi

---

## ✨ Fitur-Fitur yang Telah Dikembangkan

### 1. **Modul Kasir (Point of Sale)**

#### Fitur Utama:
- ✅ **Transaksi Penjualan Real-time**
  - Interface kasir yang responsif dan cepat
  - Pencarian produk dengan filter kategori dan lokasi
  - Keranjang belanja interaktif
  - Perhitungan otomatis subtotal, pajak, dan diskon
  
- ✅ **Multiple Metode Pembayaran**
  - Tunai (Cash)
  - Kartu Debit/Kredit
  - Transfer Bank
  - Kredit (dengan pencatatan piutang otomatis)
  
- ✅ **Pending Pickup (Barang Belum Diambil)**
  - Tandai transaksi untuk barang yang belum diambil pelanggan
  - Simpan data pelanggan (nama, nomor HP, alamat)
  - Filter dan tracking barang pending pickup
  
- ✅ **Cetak Struk Otomatis**
  - Generate struk dalam format PDF
  - Customizable dengan logo dan informasi toko
  - Nomor transaksi unik otomatis
  
- ✅ **Update Stok Otomatis**
  - Pengurangan stok real-time saat transaksi
  - Validasi ketersediaan stok sebelum checkout
  - Notifikasi stok rendah

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/kasir/page.tsx`
- **API**: `/app/api/transaksi-kasir/route.ts`
- **Database Model**: `TransaksiKasir`, `ItemTransaksi`

---

### 2. **Modul Inventaris (Inventory Management)**

#### Fitur Utama:
- ✅ **CRUD Barang Lengkap**
  - Create: Tambah produk baru dengan detail lengkap
  - Read: Daftar produk dengan pagination dan filter
  - Update: Edit informasi produk
  - Delete: Hapus produk (dengan validasi)
  
- ✅ **Informasi Produk Komprehensif**
  - Nama produk
  - SKU (Stock Keeping Unit) unik
  - Kategori produk
  - Stok tersedia
  - Stok minimum (untuk alert)
  - Harga beli dan harga jual
  - Satuan (pcs, box, kg, dll)
  - Deskripsi produk
  - Lokasi gudang
  
- ✅ **Filter dan Pencarian**
  - Filter berdasarkan kategori
  - Filter berdasarkan lokasi gudang
  - Pencarian by nama atau SKU
  - Sorting multi-kolom
  
- ✅ **Notifikasi Stok Rendah**
  - Alert otomatis untuk produk dengan stok < stok minimum
  - Dashboard widget untuk monitoring
  - Visual indicator di tabel inventaris
  
- ✅ **Multi-Lokasi Gudang**
  - Manajemen produk di berbagai lokasi
  - Transfer antar lokasi (via transaksi keluar/masuk)
  - Tracking stok per lokasi

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/inventaris/`
- **API**: `/app/api/barang/`, `/app/api/lokasi/`
- **Database Model**: `Barang`, `Lokasi`

---

### 3. **Modul Transaksi Barang (Warehouse Transactions)**

#### A. Barang Masuk (Incoming Goods)

##### Fitur:
- ✅ **Pencatatan Barang Masuk**
  - Pilih produk dari master data
  - Input quantity masuk
  - Harga beli per unit
  - Pilih supplier (opsional)
  - Pilih lokasi tujuan
  - Keterangan tambahan
  
- ✅ **Update Stok Otomatis**
  - Increment stok produk
  - Update harga beli terakhir
  - Perhitungan total nilai barang masuk
  
- ✅ **Integrasi Supplier**
  - Link transaksi dengan supplier
  - Tracking pembelian per supplier
  - Basis untuk pencatatan hutang
  
- ✅ **Nomor Transaksi Unik**
  - Format: `TM-YYYYMMDD-XXXX`
  - Auto-increment per hari
  - Unique constraint di database

#### B. Barang Keluar (Outgoing Goods)

##### Fitur:
- ✅ **Pencatatan Barang Keluar**
  - Pilih produk
  - Input quantity keluar
  - Harga barang (untuk valuasi)
  - Tujuan pengiriman
  - Pilih lokasi asal
  - Keterangan
  
- ✅ **Validasi Stok**
  - Cek ketersediaan sebelum approve
  - Prevent negative stock
  - Real-time stock checking
  
- ✅ **Update Stok Otomatis**
  - Decrement stok produk
  - Perhitungan total nilai barang keluar
  
- ✅ **Nomor Transaksi Unik**
  - Format: `TK-YYYYMMDD-XXXX`
  - Auto-increment per hari

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/transaksi/page.tsx`
- **API**: `/app/api/transaksi-masuk/`, `/app/api/transaksi-keluar/`
- **Database Model**: `TransaksiMasuk`, `TransaksiKeluar`

---

### 4. **Modul Supplier (Vendor Management)**

#### Fitur Utama:
- ✅ **CRUD Supplier**
  - Tambah, edit, hapus supplier
  - Kode supplier unik
  - Informasi kontak lengkap
  
- ✅ **Informasi Supplier**
  - Kode supplier
  - Nama supplier
  - Alamat
  - Nomor telepon
  - Email
  - Nama kontak person
  - Kategori (Distributor, Manufacturer, dll)
  - Status aktif/non-aktif
  - Keterangan
  
- ✅ **Integrasi dengan Transaksi**
  - Link dengan transaksi barang masuk
  - Tracking pembelian per supplier
  - Basis untuk hutang dagang
  
- ✅ **Filter dan Pencarian**
  - Cari by nama atau kode
  - Filter by status aktif
  - Filter by kategori

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/supplier/`
- **API**: `/app/api/supplier/`
- **Database Model**: `Supplier`

---

### 5. **Modul Hutang-Piutang (Accounts Payable & Receivable)**

#### A. Manajemen Hutang (Accounts Payable)

##### Fitur:
- ✅ **Pencatatan Hutang**
  - Manual entry hutang
  - Auto-create dari transaksi pembelian
  - Link dengan supplier
  - Link dengan transaksi barang masuk
  
- ✅ **Informasi Hutang**
  - Nomor hutang unik
  - Tanggal hutang
  - Supplier terkait
  - Deskripsi
  - Total hutang
  - Total yang sudah dibayar
  - Sisa hutang
  - Status (Belum Lunas, Lunas, Jatuh Tempo)
  - Tanggal jatuh tempo
  - Catatan
  
- ✅ **Pembayaran Hutang**
  - Cicilan/partial payment
  - Multiple metode pembayaran
  - Auto-update sisa hutang
  - Auto-update status
  - History pembayaran lengkap
  
- ✅ **Tracking dan Monitoring**
  - Daftar hutang aktif
  - Filter by status
  - Filter by supplier
  - Alert jatuh tempo
  - Total hutang outstanding

#### B. Manajemen Piutang (Accounts Receivable)

##### Fitur:
- ✅ **Pencatatan Piutang**
  - Manual entry piutang
  - Auto-create dari transaksi kasir (kredit)
  - Data pelanggan lengkap
  - Link dengan transaksi penjualan
  
- ✅ **Informasi Piutang**
  - Nomor piutang unik
  - Tanggal piutang
  - Nama pelanggan
  - Nomor HP & alamat
  - Deskripsi
  - Total piutang
  - Total yang sudah dibayar
  - Sisa piutang
  - Status (Belum Lunas, Lunas, Jatuh Tempo)
  - Tanggal jatuh tempo
  - Catatan
  
- ✅ **Pembayaran Piutang**
  - Terima pembayaran cicilan
  - Multiple metode pembayaran
  - Auto-update sisa piutang
  - Auto-update status
  - History pembayaran lengkap
  
- ✅ **Tracking dan Monitoring**
  - Daftar piutang aktif
  - Filter by status
  - Filter by pelanggan
  - Alert jatuh tempo
  - Total piutang outstanding

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/hutang-piutang/`
- **API**: `/app/api/hutang/`, `/app/api/piutang/`
- **Database Model**: `Hutang`, `Piutang`, `PembayaranHutang`, `PembayaranPiutang`

---

### 6. **Modul Akuntansi (Accounting System)**

#### A. Chart of Accounts (Bagan Akun)

##### Fitur:
- ✅ **Struktur Akun Hierarkis**
  - Parent-child relationship
  - Multi-level hierarchy
  - Kode akun unik
  
- ✅ **Tipe Akun**
  - ASSET (Aset)
  - LIABILITY (Kewajiban)
  - EQUITY (Ekuitas)
  - REVENUE (Pendapatan)
  - EXPENSE (Beban)
  
- ✅ **Kategori Akun**
  - Current Asset (Aset Lancar)
  - Fixed Asset (Aset Tetap)
  - Current Liability (Kewajiban Lancar)
  - Long-term Liability (Kewajiban Jangka Panjang)
  - Owner Equity (Ekuitas Pemilik)
  - Retained Earnings (Laba Ditahan)
  - Operating Revenue (Pendapatan Operasional)
  - Other Revenue (Pendapatan Lain)
  - Operating Expense (Beban Operasional)
  - Other Expense (Beban Lain)
  
- ✅ **CRUD Akun**
  - Tambah akun baru
  - Edit akun existing
  - Aktifkan/nonaktifkan akun
  - Validasi kode unik

#### B. Jurnal Umum (General Journal)

##### Fitur:
- ✅ **Entry Jurnal**
  - Manual journal entry
  - Auto-generated dari transaksi
  - Nomor jurnal unik
  - Tanggal transaksi
  - Deskripsi
  - Referensi (invoice, receipt, dll)
  - Tipe referensi (SALE, PURCHASE, ADJUSTMENT)
  
- ✅ **Detail Jurnal (Debit/Credit)**
  - Multiple line items
  - Pilih akun
  - Debit amount
  - Credit amount
  - Deskripsi per line
  - Validasi balanced entry (Debit = Credit)
  
- ✅ **Posting Jurnal**
  - Status: Draft / Posted
  - Lock posted entries
  - Prevent edit after posting
  
- ✅ **Periode Akuntansi**
  - Link dengan periode aktif
  - Validasi periode closed
  - Multi-period support

#### C. Periode Akuntansi (Accounting Period)

##### Fitur:
- ✅ **Manajemen Periode**
  - Create periode baru
  - Set tanggal mulai dan akhir
  - Aktifkan/nonaktifkan periode
  - Close periode (lock entries)
  
- ✅ **Saldo Awal (Opening Balance)**
  - Set saldo awal per akun per periode
  - Import dari periode sebelumnya
  - Validasi balanced opening
  
- ✅ **Periode Aktif**
  - Hanya satu periode aktif
  - Semua transaksi masuk ke periode aktif
  - Prevent transaction in closed period
  
- ✅ **Closing Process**
  - Close periode lama
  - Transfer saldo ke periode baru
  - Lock all entries in closed period

#### D. Laporan Keuangan (Financial Reports)

##### Fitur:
- ✅ **Neraca (Balance Sheet)**
  - Aset = Kewajiban + Ekuitas
  - Per periode akuntansi
  - Drill-down ke detail akun
  - Export to PDF/Excel
  
- ✅ **Laporan Laba Rugi (Income Statement)**
  - Pendapatan - Beban = Laba/Rugi
  - Per periode akuntansi
  - Breakdown per kategori
  - Comparison dengan periode sebelumnya
  
- ✅ **Arus Kas (Cash Flow)**
  - Operating activities
  - Investing activities
  - Financing activities
  - Net cash flow
  
- ✅ **Neraca Saldo (Trial Balance)**
  - Daftar semua akun
  - Saldo debit dan kredit
  - Validasi balanced
  - Per periode

#### E. Pengeluaran (Expense Tracking)

##### Fitur:
- ✅ **Pencatatan Pengeluaran**
  - Tanggal pengeluaran
  - Kategori pengeluaran
  - Deskripsi
  - Jumlah
  - Penerima
  - Metode pembayaran
  - Catatan
  
- ✅ **Kategori Pengeluaran**
  - Gaji Karyawan
  - Utilitas (Listrik, Air, Telepon)
  - Sewa Tempat Usaha
  - Perlengkapan Kantor
  - Transportasi
  - Perbaikan dan Pemeliharaan
  - Iklan dan Promosi
  - Pajak dan Retribusi
  - Asuransi
  - Lainnya
  
- ✅ **Integrasi Akuntansi**
  - Auto-create journal entry
  - Link dengan akun beban
  - Affect income statement
  
- ✅ **Reporting**
  - Pengeluaran per kategori
  - Pengeluaran per periode
  - Trend analysis
  - Budget vs actual

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/akuntansi/`
- **API**: `/app/api/akuntansi/`
- **Database Model**: `Akun`, `JurnalEntry`, `JurnalDetail`, `PeriodeAkuntansi`, `SaldoAwal`, `LaporanKeuangan`, `Pengeluaran`

---

### 7. **Modul Dashboard & Reporting**

#### Fitur Utama:
- ✅ **Statistik Penjualan**
  - Total penjualan hari ini
  - Total transaksi
  - Rata-rata nilai transaksi
  - Grafik penjualan
  
- ✅ **Monitoring Stok**
  - Total produk
  - Produk stok rendah
  - Nilai inventaris
  - Alert stok minimum
  
- ✅ **Transaksi Barang**
  - Barang masuk hari ini
  - Barang keluar hari ini
  - Nilai transaksi
  
- ✅ **Ringkasan Keuangan**
  - Hutang outstanding
  - Piutang outstanding
  - Pengeluaran bulan ini
  - Laba/rugi periode berjalan
  
- ✅ **Aktivitas Terkini**
  - Log transaksi terakhir
  - Aktivitas user
  - Audit trail

#### Lokasi File:
- **Frontend**: `/app/(dashboard)/dashboard/page.tsx`
- **API**: `/app/api/dashboard/`

---

### 8. **Modul User Management & RBAC**

#### Fitur Utama:
- ✅ **Role-Based Access Control**
  - 4 Role: ADMIN, KASIR, GUDANG, MANAJER
  - Permission-based access
  - Route protection
  - UI element hiding
  
- ✅ **User Management**
  - CRUD users (Admin only)
  - Assign roles
  - Active/inactive status
  - Password management
  
- ✅ **Authentication**
  - NextAuth.js integration
  - Credential-based login
  - Session management
  - Secure password hashing (bcrypt)
  
- ✅ **Activity Logging**
  - Audit trail lengkap
  - Track user actions
  - Entity changes
  - Timestamp dan user info

#### Lokasi File:
- **Auth Config**: `/lib/auth-options.ts`
- **Permissions**: `/lib/permissions.ts`
- **Middleware**: `/middleware.ts`
- **Database Model**: `User`, `ActivityLog`

---

### 9. **Fitur Tambahan**

#### A. Settings Toko (Store Settings)

##### Fitur:
- ✅ **Informasi Toko**
  - Nama toko
  - Alamat
  - Nomor telepon
  - Email
  - Website
  - Tagline/motto
  
- ✅ **Konfigurasi Struk**
  - Footer text
  - Logo toko
  - Show/hide logo
  
- ✅ **Konfigurasi Pajak**
  - Persentase pajak
  - Include/exclude pajak
  - Auto-calculate in POS

#### B. Stock Opname

##### Fitur:
- ✅ **Pencatatan Stock Opname**
  - Physical count vs system
  - Adjustment quantity
  - Reason for difference
  - Auto-update stock
  
- ✅ **Reporting**
  - Stock opname history
  - Variance analysis
  - Shrinkage tracking

#### C. Retur Penjualan & Pembelian

##### Fitur:
- ✅ **Retur Penjualan**
  - Return dari customer
  - Refund processing
  - Stock adjustment
  - Journal entry reversal
  
- ✅ **Retur Pembelian**
  - Return ke supplier
  - Adjustment hutang
  - Stock adjustment
  - Journal entry reversal

#### D. Kalkulator Rabat (Discount Calculator)

##### Fitur:
- ✅ **Perhitungan Rabat**
  - Multiple discount tiers
  - Percentage or fixed amount
  - Net price calculation
  - Profit margin analysis

#### Lokasi File:
- **Settings**: `/app/(dashboard)/settings/`
- **Stock Opname**: `/app/api/stock-opname/`
- **Retur**: `/app/api/retur-penjualan/`, `/app/api/retur-pembelian/`
- **Kalkulator**: `/app/(dashboard)/kalkulator-rabat/`

---

### 10. **Progressive Web App (PWA)**

#### Fitur:
- ✅ **Installable**
  - Add to home screen
  - Standalone mode
  - App-like experience
  
- ✅ **Offline Support**
  - Service worker
  - Cache strategies
  - Offline fallback
  
- ✅ **Manifest**
  - App icons
  - Theme colors
  - Display mode
  - Orientation

#### Konfigurasi:
- **Package**: `@ducanh2912/next-pwa`
- **Config**: `next.config.ts`
- **Manifest**: Auto-generated

---

## 🏗️ Arsitektur Sistem

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  Browser (Desktop/Mobile) → React UI Components                 │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Frontend (Next.js App Router + React 19)                   ││
│  │  - Pages & Layouts                                          ││
│  │  - UI Components (shadcn/ui)                                ││
│  │  - Client State Management (React Hooks)                    ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Middleware & Auth (NextAuth.js + RBAC)                     ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  API Routes (Next.js API)                                   ││
│  │  - Input Validation (Zod)                                   ││
│  │  - Business Logic                                           ││
│  │  - Error Handling                                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  Prisma ORM → PostgreSQL Database                               │
└─────────────────────────────────────────────────────────────────┘
```

### Komponen Utama

1. **Frontend Components**
   - Pages: `/app/(dashboard)/*/page.tsx`
   - Shared Components: `/components/`
   - UI Library: `/components/ui/` (shadcn/ui)

2. **Backend API**
   - API Routes: `/app/api/*/route.ts`
   - Business Logic: Embedded in API routes
   - Validation: Zod schemas

3. **Database**
   - ORM: Prisma
   - Database: PostgreSQL
   - Schema: `/prisma/schema.prisma`

4. **Authentication & Authorization**
   - Auth Provider: NextAuth.js
   - Session: JWT-based
   - RBAC: Custom permission system

---

## 🛠️ Teknologi Stack

### Frontend
- **Framework**: Next.js 15.5.9 (App Router)
- **UI Library**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 4.0.0
- **Component Library**: shadcn/ui (Radix UI)
- **Form Handling**: React Hook Form 7.54.2
- **Validation**: Zod 3.24.1
- **Charts**: Chart.js 4.5.1, Recharts 2.15.0
- **Date Handling**: date-fns 4.1.0
- **Icons**: Lucide React 0.552.0
- **Notifications**: Sonner 1.7.3
- **PDF Generation**: jsPDF 3.0.3

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **ORM**: Prisma 6.1.0
- **Database**: PostgreSQL 14+
- **Authentication**: NextAuth.js 4.24.11
- **Password Hashing**: bcryptjs 2.4.3
- **Logging**: Winston 3.19.0

### DevOps & Tools
- **Package Manager**: npm
- **Testing**: Jest 29.7.0, Testing Library
- **Linting**: ESLint 8.57.0
- **Type Checking**: TypeScript
- **CI/CD**: GitHub Actions
- **Process Manager**: PM2 (production)
- **PWA**: @ducanh2912/next-pwa 10.2.9

---

## 🔄 Integrasi GitHub Actions

### 1. **Workflow Deploy to VPS**

**File**: `.github/workflows/deploy.yml`

#### Trigger:
- Push ke branch `main`

#### Jobs:

##### A. Test Job
```yaml
- Checkout code
- Setup Node.js 20
- Install dependencies (npm ci)
- Generate Prisma Client
- Run tests (npm test)
```

**Tujuan**: Memastikan semua test pass sebelum deploy

##### B. Deploy Job
```yaml
- Checkout code
- SSH ke VPS
- Pull latest changes
- Install dependencies
- Generate Prisma Client
- Build application (npm run build:prod)
- Restart PM2 process
```

**Tujuan**: Deploy otomatis ke VPS setelah test berhasil

#### Secrets Required:
- `VPS_HOST`: IP address atau hostname VPS
- `VPS_USERNAME`: Username SSH
- `VPS_SSH_KEY`: Private SSH key
- `VPS_PORT`: SSH port (default: 22)
- `PROJECT_PATH`: Path project di VPS
- `PM2_APP_NAME`: Nama aplikasi di PM2 (default: finara)

#### Optimizations:
- **Timeout**: 30 menit untuk deploy
- **Memory**: 4GB untuk build process
- **Cache**: npm cache untuk faster install
- **Skip**: Type checking dan linting di production build (sudah di test job)

#### Flow Diagram:
```
Push to main
    ↓
Run Tests (GitHub Runner)
    ↓ (if pass)
SSH to VPS
    ↓
Pull Code
    ↓
Install Dependencies
    ↓
Build App
    ↓
Restart PM2
    ↓
✅ Deployment Success
```

---

### 2. **Workflow Database Backup**

**File**: `.github/workflows/backup-db.yml`

#### Trigger:
- **Schedule**: Cron `0 17 * * *` (17:00 UTC = 00:00 WIB)
- **Manual**: workflow_dispatch

#### Jobs:

##### Backup Job
```yaml
- Setup SSH Key
- Generate Backup on VPS (pg_dump)
- Download Backup to GitHub Runner
- Cleanup Remote Backup
- Upload Backup as Artifact
```

**Tujuan**: Backup database otomatis setiap hari

#### Secrets Required:
- `VPS_HOST`: IP address VPS
- `VPS_USERNAME`: Username SSH
- `VPS_SSH_KEY`: Private SSH key
- `DB_PASSWORD`: Password database PostgreSQL

#### Backup Details:
- **Format**: SQL dump (gzipped)
- **Filename**: `finara_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`
- **Storage**: GitHub Artifacts
- **Retention**: 30 hari
- **Compression**: gzip untuk menghemat space

#### Restore Process:
```bash
# Download artifact dari GitHub Actions
# Extract dan restore
gunzip finara_backup_2026-01-02_00-00-00.sql.gz
psql -U finara_user -d finara < finara_backup_2026-01-02_00-00-00.sql
```

#### Flow Diagram:
```
Scheduled Trigger (Daily 00:00 WIB)
    ↓
Setup SSH Connection
    ↓
Run pg_dump on VPS
    ↓
Download backup file
    ↓
Upload to GitHub Artifacts
    ↓
Cleanup temp files
    ↓
✅ Backup Complete (Stored 30 days)
```

---

### 3. **Benefits of CI/CD Integration**

#### Automated Testing
- ✅ Run test suite on every push
- ✅ Prevent broken code from deploying
- ✅ Fast feedback loop

#### Automated Deployment
- ✅ Zero-downtime deployment
- ✅ Consistent deployment process
- ✅ Rollback capability via git

#### Database Protection
- ✅ Daily automated backups
- ✅ 30-day retention
- ✅ Easy restore process
- ✅ Manual trigger available

#### Developer Experience
- ✅ Push to deploy
- ✅ No manual SSH needed
- ✅ Deployment history in GitHub
- ✅ Notification on failure

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
User (1) ─────< (N) TransaksiKasir
                        │
                        └─< (N) ItemTransaksi >─ (1) Barang
                        │
                        └─< (1) Piutang
                                    │
                                    └─< (N) PembayaranPiutang

Supplier (1) ─────< (N) TransaksiMasuk >─ (1) Barang
                        │
                        └─< (1) Hutang
                                    │
                                    └─< (N) PembayaranHutang

Lokasi (1) ─────< (N) Barang
            │
            ├─< (N) TransaksiMasuk
            │
            └─< (N) TransaksiKeluar

Akun (1) ─────< (N) JurnalDetail >─ (1) JurnalEntry
    │                                       │
    └─< (N) SaldoAwal                      └─ (1) PeriodeAkuntansi
                                                    │
                                                    └─< (N) LaporanKeuangan

User (1) ─────< (N) Pengeluaran
```

### Tabel Utama

#### 1. User
- Autentikasi dan otorisasi
- Role-based access
- Link ke transaksi dan aktivitas

#### 2. Barang (Products)
- Master data produk
- Multi-lokasi
- Tracking stok

#### 3. Lokasi (Locations)
- Warehouse/store locations
- Multi-location support

#### 4. TransaksiKasir (Sales)
- Point of sale transactions
- Payment methods
- Customer data

#### 5. ItemTransaksi (Sale Items)
- Line items per transaction
- Product details snapshot

#### 6. TransaksiMasuk (Incoming Goods)
- Purchase transactions
- Supplier link
- Stock increment

#### 7. TransaksiKeluar (Outgoing Goods)
- Outbound transactions
- Stock decrement

#### 8. Supplier
- Vendor management
- Contact information
- Purchase tracking

#### 9. Hutang (Accounts Payable)
- Debt to suppliers
- Payment tracking
- Due date management

#### 10. Piutang (Accounts Receivable)
- Customer receivables
- Payment tracking
- Due date management

#### 11. Akun (Chart of Accounts)
- Hierarchical structure
- Account types and categories

#### 12. JurnalEntry (Journal Entries)
- General journal
- Posting status
- Period link

#### 13. JurnalDetail (Journal Lines)
- Debit/credit entries
- Account link

#### 14. PeriodeAkuntansi (Accounting Periods)
- Period management
- Active/closed status

#### 15. SaldoAwal (Opening Balances)
- Beginning balances
- Per account per period

#### 16. LaporanKeuangan (Financial Reports)
- Stored reports
- JSON data format

#### 17. Pengeluaran (Expenses)
- Expense tracking
- Category-based

#### 18. ActivityLog
- Audit trail
- User actions tracking

#### 19. SettingsToko (Store Settings)
- Store configuration
- Receipt customization

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/signin          - Login
POST   /api/auth/signout         - Logout
GET    /api/auth/session         - Get session
```

### Inventory (Barang)
```
GET    /api/barang               - List all products
POST   /api/barang               - Create product
GET    /api/barang/[id]          - Get product detail
PUT    /api/barang/[id]          - Update product
DELETE /api/barang/[id]          - Delete product
```

### Locations (Lokasi)
```
GET    /api/lokasi               - List all locations
POST   /api/lokasi               - Create location
GET    /api/lokasi/[id]          - Get location detail
PUT    /api/lokasi/[id]          - Update location
DELETE /api/lokasi/[id]          - Delete location
```

### Cashier Transactions
```
GET    /api/transaksi-kasir      - List transactions
POST   /api/transaksi-kasir      - Create transaction
GET    /api/transaksi-kasir/[id] - Get transaction detail
PUT    /api/transaksi-kasir/[id] - Update transaction (pending pickup)
```

### Incoming Goods
```
GET    /api/transaksi-masuk      - List incoming transactions
POST   /api/transaksi-masuk      - Create incoming transaction
GET    /api/transaksi-masuk/[id] - Get detail
```

### Outgoing Goods
```
GET    /api/transaksi-keluar     - List outgoing transactions
POST   /api/transaksi-keluar     - Create outgoing transaction
GET    /api/transaksi-keluar/[id]- Get detail
```

### Suppliers
```
GET    /api/supplier             - List all suppliers
POST   /api/supplier             - Create supplier
GET    /api/supplier/[id]        - Get supplier detail
PUT    /api/supplier/[id]        - Update supplier
DELETE /api/supplier/[id]        - Delete supplier
```

### Hutang (Accounts Payable)
```
GET    /api/hutang               - List all debts
POST   /api/hutang               - Create debt
GET    /api/hutang/[id]          - Get debt detail
PUT    /api/hutang/[id]          - Update debt
DELETE /api/hutang/[id]          - Delete debt
POST   /api/hutang/[id]/bayar    - Record payment
```

### Piutang (Accounts Receivable)
```
GET    /api/piutang              - List all receivables
POST   /api/piutang              - Create receivable
GET    /api/piutang/[id]         - Get receivable detail
PUT    /api/piutang/[id]         - Update receivable
DELETE /api/piutang/[id]         - Delete receivable
POST   /api/piutang/[id]/bayar   - Record payment
```

### Accounting
```
GET    /api/akuntansi/akun                    - List accounts
POST   /api/akuntansi/akun                    - Create account
GET    /api/akuntansi/jurnal                  - List journal entries
POST   /api/akuntansi/jurnal                  - Create journal entry
POST   /api/akuntansi/jurnal/[id]/post        - Post journal entry
GET    /api/akuntansi/periode                 - List periods
POST   /api/akuntansi/periode                 - Create period
POST   /api/akuntansi/periode/[id]/close      - Close period
GET    /api/akuntansi/laporan/neraca          - Balance sheet
GET    /api/akuntansi/laporan/laba-rugi       - Income statement
GET    /api/akuntansi/laporan/arus-kas        - Cash flow
GET    /api/akuntansi/laporan/neraca-saldo    - Trial balance
```

### Expenses
```
GET    /api/pengeluaran          - List expenses
POST   /api/pengeluaran          - Create expense
GET    /api/pengeluaran/[id]     - Get expense detail
PUT    /api/pengeluaran/[id]     - Update expense
DELETE /api/pengeluaran/[id]     - Delete expense
```

### Dashboard
```
GET    /api/dashboard            - Dashboard statistics
```

### Settings
```
GET    /api/settings             - Get store settings
PUT    /api/settings             - Update store settings
```

### Stock Opname
```
GET    /api/stock-opname         - List stock opname records
POST   /api/stock-opname         - Create stock opname
```

### Retur
```
GET    /api/retur-penjualan      - List sales returns
POST   /api/retur-penjualan      - Create sales return
GET    /api/retur-pembelian      - List purchase returns
POST   /api/retur-pembelian      - Create purchase return
```

### Hutang-Piutang Summary
```
GET    /api/hutang-piutang       - Summary of AP & AR
```

---

## 🔐 Role-Based Access Control

### Role Permissions Matrix

| Feature                  | ADMIN | KASIR | GUDANG | MANAJER |
|--------------------------|-------|-------|--------|---------|
| Dashboard                | ✅ RW | ✅ R  | ✅ R   | ✅ R    |
| Kasir (POS)              | ✅ RW | ✅ RW | ❌     | ✅ R    |
| Inventaris               | ✅ RW | ❌    | ✅ RW  | ✅ R    |
| Transaksi Barang         | ✅ RW | ❌    | ✅ RW  | ✅ R    |
| Supplier                 | ✅ RW | ❌    | ✅ RW  | ✅ R    |
| Hutang-Piutang           | ✅ RW | ❌    | ❌     | ✅ R    |
| Akuntansi                | ✅ RW | ❌    | ❌     | ✅ R    |
| Pengeluaran              | ✅ RW | ❌    | ❌     | ✅ R    |
| Settings                 | ✅ RW | ❌    | ❌     | ❌      |
| User Management          | ✅ RW | ❌    | ❌     | ❌      |
| Reports                  | ✅ RW | ✅ R  | ✅ R   | ✅ RW   |

**Legend**: 
- ✅ RW = Read & Write (Full Access)
- ✅ R = Read Only (View Only)
- ❌ = No Access

### Role Descriptions

#### ADMIN
- **Full system access**
- Manage users and roles
- Configure system settings
- Access all modules
- Financial management
- Accounting operations

#### KASIR (Cashier)
- **POS operations**
- Process sales transactions
- View dashboard
- View reports
- Limited to sales module

#### GUDANG (Warehouse)
- **Inventory management**
- Incoming/outgoing goods
- Stock management
- Supplier management
- View dashboard

#### MANAJER (Manager)
- **View-only access**
- All reports and dashboards
- Monitor operations
- No data modification
- Generate reports

---

## 📦 Instalasi dan Setup

### Prerequisites
```bash
- Node.js 18 atau lebih tinggi
- PostgreSQL 14 atau lebih tinggi
- npm atau yarn
- Git
```

### Step-by-Step Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd finara-mbanevi
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/finara_db?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/finara_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
```

#### 4. Setup Database
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

#### 5. Run Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | admin    | admin123   |
| Kasir   | kasir    | kasir123   |
| Gudang  | gudang   | gudang123  |
| Manajer | manajer  | manajer123 |

---

## 🧪 Testing

### Test Suite

#### Unit Tests
- Component testing
- Utility function testing
- Business logic testing

#### Integration Tests
- API route testing
- Database operations
- Authentication flow

#### E2E Tests
- User workflows
- Critical paths
- Multi-step processes

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Current coverage areas:
- ✅ Authentication & Authorization
- ✅ Inventory CRUD operations
- ✅ Transaction processing
- ✅ Accounting calculations
- ✅ Permission checks
- ✅ Validation schemas

### Test Documentation

Detailed test documentation available in:
- `/docs/TEST_COVERAGE_REPORT.md`
- `/docs/TEST_COVERAGE_PERIOD_MANAGEMENT.md`
- `/docs/E2E_TEST_PERIOD_MANAGEMENT.md`
- `/docs/MANUAL_TESTING_PROTOCOL.md`

---

## 🚀 Deployment

### Production Build

```bash
# Type check
npm run check-types

# Lint
npm run lint

# Build
npm run build

# Start production server
npm start
```

### VPS Deployment with PM2

#### 1. Setup PM2
```bash
npm install -g pm2
```

#### 2. Create PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'finara',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

#### 3. Start Application
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### GitHub Actions Auto-Deploy

Push ke branch `main` akan otomatis:
1. Run tests
2. Build application
3. Deploy ke VPS
4. Restart PM2

### Environment Variables (Production)

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<strong-random-secret>"
NODE_ENV="production"
```

### Security Checklist

- ✅ Change default passwords
- ✅ Use strong NEXTAUTH_SECRET
- ✅ Enable HTTPS
- ✅ Configure firewall
- ✅ Regular database backups
- ✅ Monitor logs
- ✅ Update dependencies
- ✅ Implement rate limiting

---

## 📚 Dokumentasi Tambahan

### File Dokumentasi Tersedia

1. **[README.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/README.md)** - Overview dan quick start
2. **[ARCHITECTURE.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/ARCHITECTURE.md)** - Arsitektur sistem detail
3. **[QUICK-REFERENCE.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/QUICK-REFERENCE.md)** - Panduan cepat development
4. **[ACCOUNTING_PERIOD_SYSTEM.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/ACCOUNTING_PERIOD_SYSTEM.md)** - Sistem periode akuntansi
5. **[PERIOD_MANAGEMENT_SYSTEM.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/PERIOD_MANAGEMENT_SYSTEM.md)** - Manajemen periode
6. **[CASH_FLOW_LOGIC.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/CASH_FLOW_LOGIC.md)** - Logika arus kas
7. **[PWA_INSTALLATION_GUIDE.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/PWA_INSTALLATION_GUIDE.md)** - Panduan instalasi PWA
8. **[TEST_COVERAGE_REPORT.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/TEST_COVERAGE_REPORT.md)** - Laporan test coverage
9. **[MANUAL_TESTING_PROTOCOL.md](file:///media/hdd3/Programming/nextjs/finara-mbanevi/docs/MANUAL_TESTING_PROTOCOL.md)** - Protokol testing manual

---

## 🎯 Roadmap & Future Enhancements

### Planned Features

#### Short Term (1-3 bulan)
- [ ] Multi-store/multi-warehouse support
- [ ] Barcode scanning integration
- [ ] Advanced reporting with charts
- [ ] Export to Excel/PDF enhancement
- [ ] Email notifications
- [ ] Batch operations

#### Medium Term (3-6 bulan)
- [ ] Digital payment integration (QRIS, E-wallet)
- [ ] Customer loyalty program
- [ ] Inventory forecasting
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] API for third-party integration

#### Long Term (6-12 bulan)
- [ ] Stock forecasting with ML
- [ ] Multi-currency support
- [ ] E-commerce integration
- [ ] Warehouse management system (WMS)
- [ ] Manufacturing module
- [ ] HR & Payroll integration

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Printer Integration**
   - Requires additional setup for thermal printers
   - Browser print dialog for receipts

2. **Bulk Operations**
   - Excel import not yet implemented
   - Manual entry required for bulk data

3. **Reporting**
   - Advanced analytics in development
   - Limited export formats

4. **Mobile Experience**
   - Optimized for tablet and desktop
   - Some features limited on mobile

### Workarounds

- Use PWA for better mobile experience
- Export data via API for bulk operations
- Use Prisma Studio for database management
- Manual CSV export for reporting

---

## 💡 Best Practices

### Development

1. **Always run tests before commit**
   ```bash
   npm test
   ```

2. **Type check regularly**
   ```bash
   npm run check-types
   ```

3. **Follow naming conventions**
   - Components: PascalCase
   - Functions: camelCase
   - Files: kebab-case
   - Database: snake_case

4. **Use TypeScript strictly**
   - No `any` types
   - Define interfaces
   - Use type inference

### Database

1. **Always use transactions for multi-step operations**
2. **Validate data before database operations**
3. **Use Prisma migrations in production**
4. **Regular backups (automated via GitHub Actions)**

### Security

1. **Never commit `.env` file**
2. **Use strong passwords**
3. **Implement rate limiting**
4. **Sanitize user inputs**
5. **Regular security updates**

---

## 📞 Support & Contact

### Getting Help

1. **Documentation**: Check docs folder
2. **Issues**: Create GitHub issue
3. **Questions**: Use GitHub Discussions

### Contributing

Contributions are welcome! Please:
1. Fork repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

---

## 📄 License

This project is for educational/demonstration purposes.

---

## 🙏 Acknowledgments

### Technologies Used

- **Next.js** - React framework
- **Prisma** - Database ORM
- **shadcn/ui** - UI components
- **NextAuth.js** - Authentication
- **Tailwind CSS** - Styling
- **PostgreSQL** - Database

### Built With ❤️

Developed by Eggi Satria  
2025-2026

---

## 📊 Project Statistics

- **Total Lines of Code**: ~50,000+
- **Total Files**: 200+
- **Database Tables**: 19
- **API Endpoints**: 50+
- **UI Components**: 100+
- **Test Cases**: 150+
- **Documentation Pages**: 10+

---

## 🔄 Version History

### v0.1.0 (Current)
- ✅ Initial release
- ✅ Core POS functionality
- ✅ Inventory management
- ✅ Warehouse transactions
- ✅ Accounting system
- ✅ Debt/receivables management
- ✅ Supplier management
- ✅ Expense tracking
- ✅ Financial reporting
- ✅ GitHub Actions CI/CD
- ✅ Automated database backup
- ✅ PWA support
- ✅ RBAC system

---

**End of Documentation**

Untuk informasi lebih detail, silakan lihat file dokumentasi spesifik di folder `/docs` atau hubungi tim development.
