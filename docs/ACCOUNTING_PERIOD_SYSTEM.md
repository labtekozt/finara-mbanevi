# Sistem Periode Akuntansi Otomatis

## 📚 Konsep Dasar

### 1. Jenis Akun dalam Akuntansi

#### Akun Permanen (Balance Sheet / Neraca)

**Sifat:** Saldo **TIDAK DIRESET** setiap akhir periode, dibawa ke periode berikutnya

- **Asset (Aset)** - Harta perusahaan
  - Kas, Bank, Piutang, Inventaris, Aset Tetap
  - Normal Balance: **DEBIT**
- **Liability (Kewajiban/Hutang)** - Hutang perusahaan
  - Hutang Usaha, Hutang Bank, Hutang Pajak
  - Normal Balance: **KREDIT**
- **Equity (Ekuitas/Modal)** - Modal pemilik
  - Modal Pemilik, Laba Ditahan (Retained Earnings)
  - Normal Balance: **KREDIT**

#### Akun Temporer (Income Statement / Laba Rugi)

**Sifat:** Saldo **DIRESET ke 0** setiap akhir periode

- **Revenue (Pendapatan)** - Pemasukan dari penjualan
  - Penjualan, Pendapatan Jasa, Pendapatan Lain
  - Normal Balance: **KREDIT**
- **Expense (Beban)** - Biaya operasional
  - Beban Gaji, Beban Sewa, Beban Listrik, HPP (Cost of Goods Sold)
  - Normal Balance: **DEBIT**

---

## 🔄 Siklus Akuntansi (Accounting Cycle)

### Periode Berjalan (Active Period)

```
Transaksi Harian → Jurnal Entry → Buku Besar
```

- Semua transaksi dicatat dalam periode aktif
- Akun-akun bertambah/berkurang sesuai transaksi
- Balance Sheet dan Income Statement dapat dilihat kapan saja

### Penutupan Periode (Period Closing)

**Dilakukan OTOMATIS oleh sistem saat:**

1. Tahun berganti (misal: dari 2024 ke 2025)
2. Ada transaksi baru dengan tanggal di luar periode aktif

**Proses Otomatis:**

#### Step 1: Hitung Laba Bersih (Net Income)

```
Laba Bersih = Total Pendapatan - Total Beban
```

#### Step 2: Transfer ke Laba Ditahan

```
Jurnal Penutupan:
┌──────────────────────────────────────────┐
│ Debit: Semua Akun Pendapatan             │
│ Kredit: Laba Ditahan (Retained Earnings) │
├──────────────────────────────────────────┤
│ Debit: Laba Ditahan (Retained Earnings)  │
│ Kredit: Semua Akun Beban                 │
└──────────────────────────────────────────┘
```

#### Step 3: Reset Akun Temporer

- Semua akun **Pendapatan** → 0
- Semua akun **Beban** → 0
- Laba Bersih sudah masuk ke **Laba Ditahan**

#### Step 4: Carry Forward Akun Permanen

- Saldo **Asset** → Dibawa ke periode baru sebagai Saldo Awal
- Saldo **Liability** → Dibawa ke periode baru sebagai Saldo Awal
- Saldo **Equity** (termasuk Laba Ditahan) → Dibawa ke periode baru

#### Step 5: Buat Periode Baru

- Nama: "Tahun Buku [Tahun]"
- Tanggal Mulai: 1 Januari [Tahun]
- Tanggal Akhir: 31 Desember [Tahun]
- Status: Aktif

---

## 🤖 Sistem Otomatis

### User TIDAK Perlu Melakukan Apa-apa!

Sistem akan **otomatis**:

✅ **Menutup periode lama** saat tahun berganti
✅ **Membuat periode baru** untuk tahun berjalan
✅ **Menghitung dan transfer laba bersih** ke Laba Ditahan
✅ **Copy saldo awal** dari periode lama (hanya Balance Sheet)
✅ **Reset akun Revenue & Expense** ke 0

### Kapan Auto-Closing Terjadi?

Sistem melakukan pengecekan setiap kali ada transaksi baru:

```typescript
// Contoh: Saat create transaksi kasir
1. User input transaksi dengan tanggal 5 Januari 2025
2. Sistem cek: Apakah periode aktif masih valid?
3. Jika periode aktif = "Tahun Buku 2024" (1 Jan - 31 Des 2024)
4. Transaksi tanggal 5 Jan 2025 > 31 Des 2024
5. TRIGGER AUTO-CLOSING:
   a. Tutup periode 2024
   b. Hitung laba bersih 2024
   c. Transfer ke Laba Ditahan
   d. Reset Revenue & Expense
   e. Buat periode baru "Tahun Buku 2025"
   f. Copy saldo awal (Asset, Liability, Equity)
6. Transaksi dicatat dalam periode 2025
```

---

## 📊 Contoh Skenario

### Skenario 1: Tutup Buku Tahun 2024

#### Kondisi Akhir Tahun 2024:

```
Balance Sheet (Neraca):
- Kas: Rp 50.000.000
- Piutang: Rp 20.000.000
- Inventaris: Rp 100.000.000
- Hutang: Rp 30.000.000
- Modal Pemilik: Rp 100.000.000
- Laba Ditahan: Rp 40.000.000 (dari tahun sebelumnya)

Income Statement (Laba Rugi) 2024:
- Pendapatan Penjualan: Rp 500.000.000
- Beban Gaji: Rp 200.000.000
- Beban Sewa: Rp 50.000.000
- Beban Lainnya: Rp 150.000.000
────────────────────────────────────
Laba Bersih 2024: Rp 100.000.000
```

#### Proses Auto-Closing (31 Desember 2024):

**Step 1: Jurnal Penutupan Revenue**

```
[AUTO] Penutupan akun pendapatan periode Tahun Buku 2024
Debit: Pendapatan Penjualan    Rp 500.000.000
Kredit: Laba Ditahan            Rp 500.000.000
```

**Step 2: Jurnal Penutupan Expense**

```
[AUTO] Penutupan akun beban periode Tahun Buku 2024
Debit: Laba Ditahan             Rp 400.000.000
Kredit: Beban Gaji              Rp 200.000.000
Kredit: Beban Sewa              Rp  50.000.000
Kredit: Beban Lainnya           Rp 150.000.000
```

**Step 3: Reset Akun Temporer**

```
Setelah closing:
- Pendapatan Penjualan: Rp 0
- Beban Gaji: Rp 0
- Beban Sewa: Rp 0
- Beban Lainnya: Rp 0
```

**Step 4: Update Laba Ditahan**

```
Laba Ditahan (Opening):  Rp  40.000.000
+ Laba Bersih 2024:      Rp 100.000.000
────────────────────────────────────────
Laba Ditahan (Closing):  Rp 140.000.000
```

#### Saldo Awal Periode 2025:

```
Balance Sheet (1 Januari 2025):
- Kas: Rp 50.000.000           ← Carry forward
- Piutang: Rp 20.000.000        ← Carry forward
- Inventaris: Rp 100.000.000    ← Carry forward
- Hutang: Rp 30.000.000         ← Carry forward
- Modal Pemilik: Rp 100.000.000 ← Carry forward
- Laba Ditahan: Rp 140.000.000  ← Updated (termasuk laba 2024)

Income Statement (1 Januari 2025):
- Pendapatan Penjualan: Rp 0    ← Reset
- Beban Gaji: Rp 0              ← Reset
- Beban Sewa: Rp 0              ← Reset
- Beban Lainnya: Rp 0           ← Reset
```

### Skenario 2: Transaksi di Tahun Baru

#### Tanggal: 5 Januari 2025

User input transaksi penjualan Rp 10.000.000

**Yang Terjadi di Backend:**

```typescript
1. System cek periode aktif: "Tahun Buku 2024" (expired)
2. System execute auto-closing:
   - Close periode 2024
   - Transfer laba bersih 2024 ke Laba Ditahan
   - Create periode "Tahun Buku 2025"
   - Copy opening balances
3. Transaksi penjualan dicatat dalam periode 2025
4. Log activity: "[AUTO] Created new accounting period: Tahun Buku 2025"
```

**Hasil:**

```
Periode 2024: Closed ✓
Periode 2025: Active ✓
Laba Ditahan: Rp 140.000.000 (sudah include laba 2024)
Pendapatan Penjualan 2025: Rp 10.000.000
```

---

## ⚙️ Konfigurasi Technical

### File Terkait:

- `/lib/period-management.ts` - Auto-closing logic
- `/lib/accounting-utils.ts` - Accounting helper functions
- `/app/api/akuntansi/periode/` - Manual period management API

### Fungsi Utama:

```typescript
// Dipanggil setiap kali ada transaksi baru
await ensureActivePeriod(transactionDate, userId);

// Fungsi ini akan:
// 1. Cek apakah periode aktif masih valid
// 2. Jika expired, auto-close dan create new period
// 3. Return ID periode yang sesuai untuk transaksi
```

### Database Schema:

```prisma
model PeriodeAkuntansi {
  id            String   @id @default(cuid())
  nama          String   // "Tahun Buku 2024"
  tanggalMulai  DateTime // 2024-01-01
  tanggalAkhir  DateTime // 2024-12-31
  isActive      Boolean  // true = periode aktif
  isClosed      Boolean  // true = sudah ditutup
}

model SaldoAwal {
  id         String   @id @default(cuid())
  periodeId  String   // FK ke PeriodeAkuntansi
  akunId     String   // FK ke Akun
  saldo      Decimal  // Saldo awal untuk periode ini
}
```

---

## 🎯 Best Practices

### 1. **Jangan Khawatir tentang Penutupan Manual**

- Sistem otomatis menangani semua closing
- User fokus pada transaksi harian saja

### 2. **Laba Ditahan = Akumulasi Laba**

- Laba Ditahan akan terus bertambah setiap periode
- Menunjukkan total profit sejak perusahaan berdiri

### 3. **Backdated Transactions**

- Jika input transaksi dengan tanggal lama (sebelum periode aktif)
- Sistem akan tetap gunakan periode aktif
- Untuk koreksi data historis, sebaiknya manual adjustment

### 4. **Multi-Year Data**

- Data semua periode tersimpan permanent
- Dapat view laporan tahun-tahun sebelumnya
- Tidak ada data yang hilang saat closing

---

## 🔍 Monitoring & Troubleshooting

### Check Current Active Period:

```
GET /api/akuntansi/periode?isActive=true
```

### View Closed Periods:

```
GET /api/akuntansi/periode?isClosed=true
```

### Activity Log:

Semua auto-closing dicatat di `ActivityLog`:

```
[AUTO] Penutupan akun pendapatan periode Tahun Buku 2024
[AUTO] Penutupan akun beban periode Tahun Buku 2024
[AUTO] Created new accounting period: Tahun Buku 2025
```

### Manual Override (Admin Only):

Jika diperlukan manual closing:

```
POST /api/akuntansi/periode/{periodeId}/close
```

---

## 📝 Summary

| Aspek               | Behavior                                                   |
| ------------------- | ---------------------------------------------------------- |
| **Akun Permanen**   | Carry forward ke periode baru (Asset, Liability, Equity)   |
| **Akun Temporer**   | Reset ke 0 setiap periode baru (Revenue, Expense)          |
| **Laba Bersih**     | Transfer ke Laba Ditahan saat closing                      |
| **Closing Trigger** | Otomatis saat ada transaksi dengan tanggal > periode aktif |
| **User Action**     | TIDAK PERLU melakukan apa-apa                              |
| **Periode**         | 1 tahun (1 Jan - 31 Des)                                   |
| **Opening Balance** | Otomatis di-copy dari closing balance periode sebelumnya   |

**Kesimpulan:** Sistem fully automated, user hanya fokus input transaksi harian! 🎉
