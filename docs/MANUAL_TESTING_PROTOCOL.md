# Manual Testing Protocol: Accounting Period Management

## 🎯 Tujuan Testing

Memverifikasi sistem automatic period management bekerja dengan baik pada:

1. **Year-end transition** (31 Des → 1 Jan)
2. **Dashboard notifications** untuk period closing
3. **Financial reports accuracy** setelah period closing

---

## 📋 Pre-Testing Checklist

### 1. Database Backup

```bash
# Backup database sebelum testing
docker exec finara-postgres pg_dump -U postgres finara > backup_before_period_test_$(date +%Y%m%d).sql
```

### 2. Check Current Period

```sql
-- Login ke Prisma Studio atau psql
SELECT * FROM "PeriodeAkuntansi" WHERE "isActive" = true;

-- Expected result: Active period untuk tahun berjalan
-- Contoh: "Tahun Buku 2024" dengan tanggalAkhir = 2024-12-31
```

### 3. Verify Test Data Exists

```sql
-- Check jumlah transaksi di periode aktif
SELECT
  COUNT(*) as total_transaksi,
  SUM("total") as total_penjualan
FROM "TransaksiKasir"
WHERE EXTRACT(YEAR FROM "tanggal") = 2024;

-- Check pengeluaran
SELECT
  COUNT(*) as total_pengeluaran,
  SUM("jumlah") as total_biaya
FROM "Pengeluaran"
WHERE EXTRACT(YEAR FROM "tanggal") = 2024;

-- Expected: Ada beberapa transaksi untuk test
-- Jika tidak ada, buat dummy transactions dulu
```

---

## 🧪 Test Case 1: Year-End Transition (CRITICAL)

### Objective

Verifikasi auto-closing period saat transaksi pertama di tahun baru

### Prerequisites

- Database memiliki periode aktif tahun 2024
- Ada transaksi di tahun 2024 (revenue & expenses)
- System time atau transaction date support manual setting

### Test Steps

#### Step 1: Create Last Transaction of 2024

```
1. Login sebagai Admin/Kasir
2. Buka menu Kasir (POS)
3. Create sale transaction:
   - Tanggal: 31 Desember 2024, 23:59
   - Item: Pilih produk yang ada stok
   - Quantity: 1
   - Metode Pembayaran: Tunai
   - Total: (misal) Rp 100,000
4. Submit transaction

Expected Result:
✅ Transaction berhasil disimpan
✅ Periode masih "Tahun Buku 2024"
✅ No auto-close trigger
✅ Toast success: "Transaksi berhasil disimpan"
```

#### Step 2: Verify Period Status (Before Closing)

```sql
-- Check period masih aktif
SELECT id, nama, "isActive", "isClosed"
FROM "PeriodeAkuntansi"
WHERE nama = 'Tahun Buku 2024';

Expected:
isActive: true
isClosed: false
```

#### Step 3: Create First Transaction of 2025 (TRIGGER POINT)

```
1. Masih di menu Kasir
2. Create new sale transaction:
   - Tanggal: 1 Januari 2025, 00:01
   - Item: Pilih produk yang ada stok
   - Quantity: 1
   - Metode Pembayaran: Tunai
   - Total: (misal) Rp 150,000
3. Submit transaction

Expected Result:
⏳ Processing time: 2-5 detik (auto-close berjalan)
✅ Transaction berhasil disimpan
✅ Toast success: "Transaksi berhasil disimpan"
⚠️ [OPTIONAL] Toast notification: "Periode Tahun Buku 2024 telah ditutup otomatis"
```

#### Step 4: Verify Period Closure (Database)

```sql
-- Check period 2024 closed
SELECT id, nama, "isActive", "isClosed", "tanggalPenutupan"
FROM "PeriodeAkuntansi"
WHERE nama = 'Tahun Buku 2024';

Expected Result:
✅ isActive: false
✅ isClosed: true
✅ tanggalPenutupan: (timestamp saat closing terjadi)

-- Check period 2025 created
SELECT id, nama, "isActive", "isClosed", "tanggalMulai", "tanggalAkhir"
FROM "PeriodeAkuntansi"
WHERE nama = 'Tahun Buku 2025';

Expected Result:
✅ Record exists
✅ isActive: true
✅ isClosed: false
✅ tanggalMulai: 2025-01-01
✅ tanggalAkhir: 2025-12-31

-- Check closing journal entry created
SELECT * FROM "JurnalEntry"
WHERE "keterangan" LIKE '%Penutupan%' OR "keterangan" LIKE '%Closing%'
ORDER BY "tanggal" DESC
LIMIT 1;

Expected Result:
✅ Entry exists
✅ Tanggal = tanggal penutupan
✅ Details include transfer to Laba Ditahan
```

#### Step 5: Verify Opening Balances Created

```sql
-- Check opening balances untuk 2025
SELECT sa.*, a.nama as akun_nama, a.tipe
FROM "SaldoAwal" sa
JOIN "Akun" a ON sa."akunId" = a.id
WHERE sa."periodeId" = (
  SELECT id FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2025'
);

Expected Result:
✅ Multiple records (Balance Sheet accounts only)
✅ Akun tipe: ASSET, LIABILITY, EQUITY only
✅ No REVENUE or EXPENSE accounts
✅ Saldo values match ending balances dari 2024
```

#### Step 6: Verify Activity Log

```sql
SELECT * FROM "ActivityLog"
WHERE "action" LIKE '%period%' OR "action" LIKE '%closing%'
ORDER BY "createdAt" DESC
LIMIT 5;

Expected Result:
✅ Log entry untuk period closing
✅ userId = user yang create transaksi pertama 2025
✅ Timestamp matches closing time
```

### Pass/Fail Criteria

- ✅ **PASS** if all expected results met
- ❌ **FAIL** if any of these occur:
  - Period 2024 tidak close
  - Period 2025 tidak dibuat
  - Transaksi error/gagal
  - Opening balances tidak dibuat
  - Include REVENUE/EXPENSE accounts di opening balances

---

## 📊 Test Case 2: Financial Reports Accuracy

### Objective

Verifikasi laporan keuangan menunjukkan data yang akurat setelah period closing

### Test Steps

#### Step 1: Income Statement (Laba Rugi) - Period 2024

````
1. Login sebagai Admin/Manajer
2. Navigate to: Akuntansi > Laporan > Laba Rugi
3. Set filter:
   - Periode: Tahun 2024
   - Atau: Tanggal Mulai: 01 Jan 2024, Tanggal Akhir: 31 Des 2024
4. Click "Tampilkan Laporan"

Expected Result:
✅ Report displays successfully
✅ Pendapatan section shows all revenue accounts with totals
✅ Beban section shows all expense accounts with totals
✅ Laba Bersih = Total Pendapatan - Total Beban
✅ Laba Bersih matches amount transferred to Laba Ditahan

Manual Verification:
```sql
-- Calculate expected net income
WITH revenue AS (
  SELECT SUM(jd.kredit - jd.debit) as total
  FROM "JurnalDetail" jd
  JOIN "Akun" a ON jd."akunId" = a.id
  JOIN "JurnalEntry" je ON jd."jurnalId" = je.id
  WHERE a.tipe = 'REVENUE'
    AND EXTRACT(YEAR FROM je.tanggal) = 2024
),
expenses AS (
  SELECT SUM(jd.debit - jd.kredit) as total
  FROM "JurnalDetail" jd
  JOIN "Akun" a ON jd."akunId" = a.id
  JOIN "JurnalEntry" je ON jd."jurnalId" = je.id
  WHERE a.tipe = 'EXPENSE'
    AND EXTRACT(YEAR FROM je.tanggal) = 2024
)
SELECT
  revenue.total as total_revenue,
  expenses.total as total_expenses,
  (revenue.total - expenses.total) as net_income
FROM revenue, expenses;

-- Compare dengan Laba Bersih di report
````

#### Step 2: Balance Sheet (Neraca) - As of Dec 31, 2024

```
1. Navigate to: Akuntansi > Laporan > Neraca
2. Set filter:
   - Tanggal: 31 Desember 2024
3. Click "Tampilkan Laporan"

Expected Result:
✅ Report displays successfully
✅ Aset section: All ASSET accounts with balances
✅ Kewajiban section: All LIABILITY accounts with balances
✅ Ekuitas section: All EQUITY accounts including Laba Ditahan
✅ Total Aset = Total Kewajiban + Total Ekuitas (accounting equation)

Key Checks:
- Laba Ditahan should include net income from 2024
- Kas balance = Opening kas + Net income (if no other transactions)
```

#### Step 3: Balance Sheet (Neraca) - As of Jan 1, 2025

```
1. Navigate to: Akuntansi > Laporan > Neraca
2. Set filter:
   - Tanggal: 1 Januari 2025
3. Click "Tampilkan Laporan"

Expected Result:
✅ Report displays successfully
✅ Balances match ending balances dari 31 Des 2024
✅ Revenue accounts = 0 (reset)
✅ Expense accounts = 0 (reset)
✅ Retained earnings includes 2024 net income
```

#### Step 4: Cash Flow Report - Year 2024

```
1. Navigate to: Akuntansi > Laporan > Arus Kas
2. Set filter:
   - Tahun: 2024
3. Click "Tampilkan Laporan"

Expected Result:
✅ Report displays successfully
✅ Penerimaan section:
   - Penjualan Tunai (exclude kredit)
   - Pembayaran Piutang
✅ Pengeluaran section:
   - Pembelian Tunai (exclude kredit)
   - Pembayaran Hutang
   - Pengeluaran Operasional
✅ Arus Kas Bersih = Total Penerimaan - Total Pengeluaran
✅ NO Saldo Awal (as per recent fix)
```

#### Step 5: Trial Balance - Period 2025

```
1. Navigate to: Akuntansi > Trial Balance
2. Set filter:
   - Periode: Tahun Buku 2025
3. Click "Tampilkan Laporan"

Expected Result:
✅ Report displays successfully
✅ All Balance Sheet accounts listed with opening balances
✅ Revenue accounts = 0
✅ Expense accounts = 0
✅ Total Debit = Total Kredit (balanced)
✅ Balances match SaldoAwal records
```

### Verification Queries

```sql
-- Compare report data with database
-- 1. Opening balances match
SELECT a.nama, a.tipe, sa.saldo
FROM "SaldoAwal" sa
JOIN "Akun" a ON sa."akunId" = a.id
WHERE sa."periodeId" = (SELECT id FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2025')
ORDER BY a.kode;

-- 2. Revenue/Expense accounts are zero in 2025
SELECT a.nama, a.tipe, COALESCE(SUM(jd.debit - jd.kredit), 0) as saldo
FROM "Akun" a
LEFT JOIN "JurnalDetail" jd ON a.id = jd."akunId"
LEFT JOIN "JurnalEntry" je ON jd."jurnalId" = je.id
WHERE a.tipe IN ('REVENUE', 'EXPENSE')
  AND (je.id IS NULL OR EXTRACT(YEAR FROM je.tanggal) = 2025)
GROUP BY a.id, a.nama, a.tipe
ORDER BY a.kode;
```

### Pass/Fail Criteria

- ✅ **PASS** if:
  - All reports display without errors
  - Financial data is accurate and reconciles
  - Accounting equation balanced
  - Opening balances match previous closing balances
- ❌ **FAIL** if:
  - Reports show incorrect totals
  - Accounting equation not balanced
  - Revenue/Expense not reset in new period
  - Missing opening balances

---

## 🔔 Test Case 3: Dashboard Notifications (OPTIONAL)

### Objective

Verify user is notified when automatic period closing occurs

### Prerequisites

- Notification system implemented (if any)
- User has permissions to see notifications

### Test Steps

#### Step 1: Check Notification Display

```
After triggering period closing (Test Case 1, Step 3):

1. Look for toast notification or alert
2. Check dashboard for notification badge
3. Navigate to notification center (if exists)

Expected Result:
✅ Notification shown: "Periode [Nama Period] telah ditutup otomatis"
✅ Notification includes:
   - Period name (e.g., "Tahun Buku 2024")
   - Net income amount
   - Closing timestamp
✅ User can dismiss notification
```

#### Step 2: Verify Notification in Activity Log

```sql
SELECT * FROM "ActivityLog"
WHERE "action" LIKE '%period%closing%'
ORDER BY "createdAt" DESC
LIMIT 1;

Expected:
✅ Record exists
✅ Contains period name and net income
✅ userId = user yang trigger closing
```

### Pass/Fail Criteria

- ✅ **PASS** if notification shown (even if UI pending)
- ⚠️ **SKIP** if notification feature not yet implemented
- ❌ **FAIL** if system crashes or errors

---

## 🚨 Error Scenarios to Test

### Scenario 1: Backdated Transaction After Period Close

```
Setup:
- Period 2024 already closed
- Period 2025 active

Test:
1. Try to create transaction with tanggal = 2024-12-15
2. Submit transaction

Expected Result:
✅ Transaction created successfully
✅ Uses active period (2025)
⚠️ Warning logged: "Backdated transaction detected"
✅ No attempt to re-close 2024
```

### Scenario 2: Multiple Concurrent Transactions

```
Setup:
- Period 2024 active
- 2+ users logged in

Test:
1. User A creates transaction dated 2025-01-01 00:00:01
2. User B creates transaction dated 2025-01-01 00:00:02
   (simultaneously, within same second)

Expected Result:
✅ Both transactions succeed
✅ Only ONE period closing occurs
✅ Both transactions use period 2025
✅ No duplicate closing entries
```

### Scenario 3: Transaction on Period Boundary

```
Test transactions on exact boundary dates:
- 2024-12-31 23:59:59 → Should use period 2024
- 2025-01-01 00:00:00 → Should trigger closing
- 2025-01-01 00:00:01 → Should use period 2025
```

---

## 📝 Test Results Template

### Test Execution Log

**Date**: ******\_\_\_\_******  
**Tester**: ******\_\_\_\_******  
**Environment**: [ ] Development [ ] Staging [ ] Production  
**Database**: finara @ localhost:5433

### Results Summary

| Test Case                     | Status   | Notes |
| ----------------------------- | -------- | ----- |
| 1.1 Last transaction 2024     | ✅ ❌    |       |
| 1.2 Period status before      | ✅ ❌    |       |
| 1.3 First transaction 2025    | ✅ ❌    |       |
| 1.4 Period closure verified   | ✅ ❌    |       |
| 1.5 Opening balances created  | ✅ ❌    |       |
| 1.6 Activity log recorded     | ✅ ❌    |       |
| 2.1 Income Statement accuracy | ✅ ❌    |       |
| 2.2 Balance Sheet (Dec 31)    | ✅ ❌    |       |
| 2.3 Balance Sheet (Jan 1)     | ✅ ❌    |       |
| 2.4 Cash Flow Report          | ✅ ❌    |       |
| 2.5 Trial Balance             | ✅ ❌    |       |
| 3.1 Notification display      | ✅ ❌ ⏭️ |       |
| 3.2 Activity log entry        | ✅ ❌    |       |

### Detailed Findings

#### Issues Found

1.
2.
3.

#### Screenshots

- Attach relevant screenshots
- Include SQL query results
- Dashboard screenshots

### Performance Metrics

| Metric                 | Target | Actual  | Status |
| ---------------------- | ------ | ------- | ------ |
| Period close duration  | < 5s   | \_\_\_s | ✅ ❌  |
| Transaction processing | < 2s   | \_\_\_s | ✅ ❌  |
| Report generation      | < 3s   | \_\_\_s | ✅ ❌  |

### Sign-Off

**Overall Result**: [ ] PASS [ ] FAIL [ ] PARTIAL

**Tester Signature**: ******\_\_\_\_******  
**Date**: ******\_\_\_\_******

**Reviewer**: ******\_\_\_\_******  
**Date**: ******\_\_\_\_******

**Approval for Production**: [ ] APPROVED [ ] REJECTED  
**Date**: ******\_\_\_\_******

---

## 🛠️ Troubleshooting Guide

### Issue 1: Period Not Closing

**Symptoms**: Transaction created in 2025 but period 2024 still active

**Check**:

```sql
-- Verify transaction date
SELECT * FROM "TransaksiKasir"
WHERE EXTRACT(YEAR FROM tanggal) = 2025
ORDER BY tanggal DESC LIMIT 1;

-- Check period dates
SELECT * FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2024';
```

**Possible Causes**:

- Transaction date still in 2024 (check timezone)
- Period end date modified
- ensureActivePeriod() not called

**Fix**: Verify transaction date and timezone settings

### Issue 2: Missing Opening Balances

**Symptoms**: SaldoAwal records not created for 2025

**Check**:

```sql
SELECT COUNT(*) FROM "SaldoAwal"
WHERE "periodeId" = (SELECT id FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2025');
```

**Possible Causes**:

- copyOpeningBalances() failed
- Transaction rollback
- Zero balances filtered out (expected behavior)

**Fix**: Check logs, verify Balance Sheet accounts have non-zero balances

### Issue 3: Incorrect Net Income

**Symptoms**: Net income transferred to Laba Ditahan doesn't match report

**Check**:

```sql
-- Manual calculation
WITH revenue AS (
  SELECT SUM(jd.kredit - jd.debit) as total
  FROM "JurnalDetail" jd
  JOIN "Akun" a ON jd."akunId" = a.id
  JOIN "JurnalEntry" je ON jd."jurnalId" = je.id
  WHERE a.tipe = 'REVENUE'
    AND je."periodeId" = (SELECT id FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2024')
),
expenses AS (
  SELECT SUM(jd.debit - jd.kredit) as total
  FROM "JurnalDetail" jd
  JOIN "Akun" a ON jd."akunId" = a.id
  JOIN "JurnalEntry" je ON jd."jurnalId" = je.id
  WHERE a.tipe = 'EXPENSE'
    AND je."periodeId" = (SELECT id FROM "PeriodeAkuntansi" WHERE nama = 'Tahun Buku 2024')
)
SELECT
  revenue.total as total_revenue,
  expenses.total as total_expenses,
  (revenue.total - expenses.total) as net_income
FROM revenue, expenses;

-- Compare dengan closing entry
SELECT * FROM "JurnalEntry"
WHERE "keterangan" LIKE '%Penutupan%'
ORDER BY tanggal DESC LIMIT 1;
```

**Fix**: Verify all revenue/expense accounts included in calculation

---

## 📞 Support & Escalation

### When to Escalate

- Period closure causes system crash
- Data loss or corruption detected
- Financial reports show incorrect data
- Unable to complete any test case

### Contact

- **Developer**: [Your Name]
- **Tech Lead**: [Lead Name]
- **Emergency**: [Contact Info]

### Rollback Procedure

```bash
# If testing fails, restore from backup
docker exec -i finara-postgres psql -U postgres finara < backup_before_period_test_YYYYMMDD.sql

# Verify restoration
docker exec -it finara-postgres psql -U postgres finara -c "SELECT COUNT(*) FROM \"PeriodeAkuntansi\";"
```

---

**Protocol Version**: 1.0  
**Last Updated**: December 16, 2025  
**Status**: READY FOR EXECUTION ✅
