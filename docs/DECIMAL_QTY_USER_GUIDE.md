# 🛒 Decimal Quantity Feature - Quick Guide

## Apa yang Berubah?

Sekarang di kasir, Anda bisa menjual produk dalam **pecahan** (bukan hanya angka bulat):
- ✅ 0.5 kg beras
- ✅ 0.25 kg gula
- ✅ 1.5 liter minyak
- ✅ 2.75 meter kain

## Cara Menggunakan

### 1. Di Halaman Kasir
1. Tambah produk ke keranjang seperti biasa
2. Klik pada input **quantity** 
3. Ketik angka decimal langsung: `0.5`, `0.25`, `1.75`, dll
4. Atau gunakan tombol atas/bawah (increment 0.25)
5. Subtotal akan otomatis terhitung

### 2. Contoh Praktis

**Contoh: Jual Beras Rp 15.000/kg**

| Quantity | Subtotal |
|----------|----------|
| 0.25 kg  | Rp 3.750 |
| 0.5 kg   | Rp 7.500 |
| 0.75 kg  | Rp 11.250 |
| 1 kg     | Rp 15.000 |
| 1.5 kg   | Rp 22.500 |
| 2.25 kg  | Rp 33.750 |

### 3. Minimum Quantity
- Minimum pembelian: **0.25** (1/4 unit)
- Increment: **0.25** (saat tekan tombol atas/bawah)
- Jika input di bawah 0.25, otomatis akan di-set ke 0.25

## Screenshots

### Input Decimal di Kasir
```
┌────────────────────────────────┐
│ Beras Premium                  │
│ Rp 15.000 / 1.5x              │
│ Rp 22.500                      │
│                                │
│  [  1.5  ] 🗑                 │
│  ↑ ↓      (step 0.25)          │
└────────────────────────────────┘
```

## Technical Info

### Database
- Quantity disimpan sebagai `Decimal(10, 3)` 
- Max value: 9,999,999.999
- Precision: 3 digit desimal

### Frontend Validation
- Min: 0.25
- Step: 0.25
- Input type: number with float support
- Auto-correction saat blur

### API Changes
- Semua API sudah support decimal
- Validation menggunakan Zod: `z.number().positive()`

## FAQ

**Q: Bagaimana dengan stok barang?**  
A: Stok tetap menggunakan **integer** (unit terkecil). Jika jual 0.5 kg, stok berkurang 1.

**Q: Apakah struk kasir menampilkan decimal?**  
A: Ya, struk akan menampilkan quantity sesuai input (contoh: 0.5 kg, 1.25 kg).

**Q: Apakah akuntansi tercatat dengan benar?**  
A: Ya, menggunakan `Prisma.Decimal` untuk perhitungan akurat tanpa floating point error.

**Q: Bisa input lebih presisi dari 0.25?**  
A: Bisa! Ketik manual: 0.125, 0.333, 0.666, dst. Step 0.25 hanya untuk tombol increment.

**Q: Bagaimana untuk produk yang tidak dijual per kg?**  
A: Tetap bisa pakai decimal. Contoh: 0.5 meter kain, 1.5 liter minyak, 2.25 box, dll.

## Troubleshooting

### Input tidak bisa decimal?
- Pastikan browser support input type="number" dengan decimal
- Clear cache browser: Ctrl + Shift + R (Chrome)
- Restart dev server: `npm run dev`

### Subtotal salah?
- Cek apakah qty sudah ter-parse dengan benar (lihat di console)
- Verify calculation: `qty × hargaJual`

### Error saat checkout?
- Cek API logs di terminal
- Pastikan database sudah di-migrate: `npm run db:push`
- Verify Prisma client: `npm run db:generate`

## Migration Checklist

Jika baru pull dari git, jalankan:
```bash
# 1. Install dependencies (jika ada perubahan)
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema changes
npm run db:push

# 4. Check types
npm run check-types

# 5. Start dev server
npm run dev
```

## Documentation

Untuk informasi lebih detail:
- 📘 [Migration Guide](./DECIMAL_QTY_MIGRATION.md)
- 📋 [Complete Summary](./DECIMAL_QTY_SUMMARY.md)

## Support

Jika ada issue atau pertanyaan:
1. Check dokumentasi di folder `docs/`
2. Run tests: `npm test`
3. Check logs di terminal
4. Contact developer

---
**Last Updated:** 2026-02-11  
**Feature Status:** ✅ Production Ready
