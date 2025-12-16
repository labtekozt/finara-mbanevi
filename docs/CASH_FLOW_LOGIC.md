# Logika Cash Flow (Arus Kas)

## Prinsip Dasar

Cash Flow (Arus Kas) hanya mencatat **transaksi kas yang benar-benar melibatkan pergerakan uang tunai**, bukan transaksi berbasis akrual (piutang/hutang).

## Kategori Pemasukan (Inflow)

### 1. Penjualan Tunai

- **Sumber:** `TransaksiKasir` dengan `metodePembayaran != 'KREDIT'`
- **Kriteria:** Hanya transaksi penjualan yang dibayar tunai/langsung
- **Mengapa:** Uang langsung masuk ke kas perusahaan

### 2. Pembayaran Piutang

- **Sumber:** `PembayaranPiutang`
- **Kriteria:** Ketika pelanggan membayar piutangnya
- **Mengapa:** Piutang adalah aset, bukan kas. Kas baru bertambah saat piutang dibayar

### 3. Lainnya

- **Sumber:** Pemasukan lain yang akan ditambahkan di masa depan
- **Contoh:** Pendapatan bunga, penjualan aset, dll

## Kategori Pengeluaran (Outflow)

### 1. Pembelian Tunai

- **Sumber:** `TransaksiMasuk` yang **tidak** menghasilkan `Hutang`
- **Kriteria:** Pembelian barang yang dibayar langsung
- **Mengapa:** Kas langsung keluar untuk pembelian

### 2. Pembayaran Hutang

- **Sumber:** `PembayaranHutang`
- **Kriteria:** Ketika perusahaan membayar hutang ke supplier
- **Mengapa:** Hutang adalah kewajiban, bukan pengeluaran kas. Kas baru berkurang saat hutang dibayar

### 3. Operasional

- **Sumber:** `Pengeluaran` dengan kategori: `UTILITAS`, `SEWA`, `PERLENGKAPAN_KANTOR`, `TRANSPORTASI`
- **Kriteria:** Biaya operasional sehari-hari
- **Mengapa:** Pengeluaran ini langsung mengurangi kas

### 4. Gaji

- **Sumber:** `Pengeluaran` dengan kategori: `GAJI_KARYAWAN`
- **Kriteria:** Pembayaran gaji karyawan
- **Mengapa:** Kas keluar untuk membayar gaji

### 5. Lainnya

- **Sumber:** `Pengeluaran` dengan kategori lainnya
- **Contoh:** Perbaikan, iklan, asuransi, dll

## Transaksi yang TIDAK Masuk Cash Flow

### ❌ Penjualan Kredit (Piutang)

```typescript
// TransaksiKasir dengan metodePembayaran = 'KREDIT'
// TIDAK langsung menambah cash flow
// Baru masuk cash flow saat PembayaranPiutang dibuat
```

**Alasan:** Piutang adalah aset, bukan kas. Perusahaan belum menerima uang tunai.

### ❌ Pembelian Kredit (Hutang)

```typescript
// TransaksiMasuk yang menghasilkan Hutang
// TIDAK langsung mengurangi cash flow
// Baru mengurangi cash flow saat PembayaranHutang dibuat
```

**Alasan:** Hutang adalah kewajiban, bukan pengeluaran kas. Perusahaan belum mengeluarkan uang tunai.

## Implementasi di Kode

### Query untuk Penjualan Tunai

```typescript
const transaksiKasir = await prisma.transaksiKasir.findMany({
  where: {
    tanggal: { gte: startDate, lte: endDate },
    metodePembayaran: { not: "KREDIT" }, // ✅ Hanya tunai
  },
});
```

### Query untuk Pembelian Tunai

```typescript
const transaksiMasuk = await prisma.transaksiMasuk.findMany({
  where: {
    tanggal: { gte: startDate, lte: endDate },
    hutang: { is: null }, // ✅ Hanya yang tidak punya hutang (tunai)
  },
});
```

### Query untuk Pembayaran Piutang

```typescript
const pembayaranPiutang = await prisma.pembayaranPiutang.findMany({
  where: {
    tanggalBayar: { gte: startDate, lte: endDate },
  },
});
```

### Query untuk Pembayaran Hutang

```typescript
const pembayaranHutang = await prisma.pembayaranHutang.findMany({
  where: {
    tanggalBayar: { gte: startDate, lte: endDate },
  },
});
```

## Contoh Skenario

### Skenario 1: Penjualan Kredit

1. **Hari 1:** Penjualan Rp 1.000.000 dengan metode KREDIT
   - ❌ Cash Flow: **TIDAK berubah**
   - ✅ Piutang: **+Rp 1.000.000**

2. **Hari 5:** Pelanggan membayar Rp 500.000
   - ✅ Cash Flow: **+Rp 500.000** (Pembayaran Piutang)
   - ✅ Piutang: **-Rp 500.000**

3. **Hari 10:** Pelanggan melunasi Rp 500.000
   - ✅ Cash Flow: **+Rp 500.000** (Pembayaran Piutang)
   - ✅ Piutang: **-Rp 500.000** (Lunas)

### Skenario 2: Pembelian Kredit

1. **Hari 1:** Pembelian barang Rp 2.000.000 dengan metode KREDIT
   - ❌ Cash Flow: **TIDAK berubah**
   - ✅ Hutang: **+Rp 2.000.000**
   - ✅ Inventaris: **+stok**

2. **Hari 7:** Membayar hutang Rp 1.000.000
   - ✅ Cash Flow: **-Rp 1.000.000** (Pembayaran Hutang)
   - ✅ Hutang: **-Rp 1.000.000**

3. **Hari 14:** Melunasi hutang Rp 1.000.000
   - ✅ Cash Flow: **-Rp 1.000.000** (Pembayaran Hutang)
   - ✅ Hutang: **-Rp 1.000.000** (Lunas)

## Kesimpulan

**Cash Flow = Actual Cash Movement**

- ✅ Penjualan Tunai → Kas masuk
- ✅ Pembayaran Piutang → Kas masuk
- ✅ Pembelian Tunai → Kas keluar
- ✅ Pembayaran Hutang → Kas keluar
- ✅ Pengeluaran Operasional → Kas keluar

**Bukan Cash Flow:**

- ❌ Penjualan Kredit (hanya aset piutang bertambah)
- ❌ Pembelian Kredit (hanya hutang bertambah, inventaris bertambah)

Dengan logika ini, laporan cash flow akan menunjukkan **kondisi kas yang sebenarnya** (actual cash on hand), bukan berdasarkan akrual.
