# Migration Guide: Decimal Quantity Support

## 📋 Overview
Fitur ini mengubah sistem quantity dari integer menjadi decimal untuk mendukung penjualan produk dalam pecahan (contoh: 0.5 kg, 0.25 kg, 1.5 liter).

## 🔄 Database Changes

### Schema Changes
Berikut adalah field yang diubah dari `Int` ke `Decimal(10, 3)`:

1. **ItemTransaksi.qty** - Quantity dalam transaksi kasir
2. **TransaksiMasuk.qty** - Quantity barang masuk  
3. **TransaksiKeluar.qty** - Quantity barang keluar

**Note:** 
- `Decimal(10, 3)` = maksimal 9.999.999,999 dengan 3 digit desimal
- Stok tetap menggunakan `Int` karena sistem menggunakan unit terkecil

## 🚀 Migration Steps

### 1. Backup Database
```bash
# Backup database sebelum migrasi
docker exec finara-postgres pg_dump -U postgres finara > backup_$(date +%Y%m%d).sql
```

### 2. Generate Prisma Client
```bash
npm run db:generate
```

### 3. Push Schema Changes
```bash
npm run db:push
```

### 4. Verify Migration
```bash
npm run db:studio
# Periksa tabel ItemTransaksi, TransaksiMasuk, TransaksiKeluar
```

## 💻 Code Changes

### Frontend Changes
- Input quantity di kasir sekarang mendukung decimal dengan `step={0.25}`
- Validasi minimum quantity: 0.25
- Menggunakan `parseFloat()` untuk parsing input

### Backend Changes  
- Zod validation: `z.number().positive()` (menghapus `.int()`)
- Semua API sudah mendukung decimal qty
- Database akan otomatis menyimpan sebagai Decimal

## 📝 Usage Example

### Kasir Page
```typescript
// User dapat input:
qty: 0.25  // 1/4 kg
qty: 0.5   // 1/2 kg  
qty: 0.75  // 3/4 kg
qty: 1.5   // 1.5 kg
qty: 2.25  // 2 1/4 kg
```

### Calculation
```typescript
// Contoh: Beras Rp 15.000/kg, beli 0.5 kg
hargaSatuan: 15000
qty: 0.5
subtotal: 15000 * 0.5 = 7500
```

## ⚠️ Important Notes

1. **Stok Barang**: Stok tetap integer. Jika menjual 0.5 kg, stok akan berkurang 1 (unit terkecil).

2. **Atomic Updates**: Validasi stok menggunakan `where: { stok: { gte: qty } }` untuk mencegah overselling.

3. **Receipt Printing**: Receipt printer sudah mendukung decimal qty display.

4. **Accounting**: Journal entries sudah menggunakan `Prisma.Decimal` untuk perhitungan akurat.

## 🧪 Testing

### Manual Test Checklist
- [ ] Tambah produk ke cart dengan qty 0.5
- [ ] Tambah produk ke cart dengan qty 0.25  
- [ ] Tambah produk ke cart dengan qty 1.75
- [ ] Proses checkout dan verifikasi subtotal benar
- [ ] Cek receipt tercetak dengan format qty yang benar
- [ ] Verifikasi jurnal akuntansi tercatat dengan nilai yang tepat
- [ ] Cek transaksi masuk dengan qty decimal
- [ ] Cek transaksi keluar dengan qty decimal

### Automated Tests
```bash
npm test -- api-transaksi-kasir
npm test -- integration-kasir-inventory
```

## 🔙 Rollback Plan

Jika terjadi masalah:

```bash
# 1. Restore backup
docker exec -i finara-postgres psql -U postgres finara < backup_YYYYMMDD.sql

# 2. Revert schema changes
git revert <commit-hash>

# 3. Regenerate Prisma client
npm run db:generate
```

## 📚 Related Files

- `prisma/schema.prisma` - Schema definitions
- `app/(dashboard)/kasir/page.tsx` - Kasir UI
- `app/api/transaksi-kasir/route.ts` - Kasir API
- `app/api/transaksi-masuk/route.ts` - Transaksi Masuk API
- `app/api/transaksi-keluar/route.ts` - Transaksi Keluar API
- `types/index.ts` - TypeScript types
- `lib/receipt-printer.ts` - Receipt formatting

## ✅ Post-Migration Checklist

- [ ] Database migrasi berhasil
- [ ] Prisma client regenerated
- [ ] Dev server running tanpa error
- [ ] Manual testing passed
- [ ] Automated tests passed
- [ ] Receipt printing works correctly
- [ ] Accounting entries correct
- [ ] Documentation updated
