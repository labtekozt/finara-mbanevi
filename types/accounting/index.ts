export interface PeriodeAkuntansi {
  id: string;
  nama: string;
  tanggalMulai: string | Date;
  tanggalAkhir: string | Date;
  isActive: boolean;
  isClosed: boolean;
}

export interface DashboardStats {
  totalAkun: number;
  totalJurnal: number;
  periodeAktif: string;
  isBalanced: boolean;
}

export interface Akun {
  id: string;
  kode: string;
  nama: string;
  tipe: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  kategori: string;
  parentId?: string | null;
  level: number;
  isActive: boolean;
  deskripsi?: string | null;
  parent?: Akun;
  children?: Akun[];
  _count?: {
    jurnalEntries: number;
  };
}

export interface AkunFormData {
  kode: string;
  nama: string;
  tipe: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  kategori: string;
  parentId?: string;
  deskripsi?: string;
}

export interface JurnalEntry {
  id: string;
  nomorJurnal: string;
  tanggal: string | Date;
  deskripsi: string;
  referensi?: string | null;
  tipeReferensi?: string | null;
  periodeId: string;
  userId: string;
  isPosted: boolean;
  periode: PeriodeAkuntansi;
  user: {
    id: string;
    nama: string;
    username: string;
  };
  details: JurnalDetail[];
}

export interface JurnalDetail {
  id: string;
  jurnalId: string;
  akunId: string;
  debit: number;
  kredit: number;
  deskripsi?: string | null;
  akun: Akun;
}

export interface JurnalFormData {
  nomorJurnal: string;
  tanggal: string;
  deskripsi: string;
  referensi: string;
  tipeReferensi: string;
  periodeId: string;
  details: JurnalDetailForm[];
}

export interface JurnalDetailForm {
  akunId?: string;
  debit: number;
  kredit: number;
  deskripsi: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  penerima: string;
  metodePembayaran: string;
  catatan?: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
}

export interface PengeluaranFormData {
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  penerima: string;
  metodePembayaran: string;
  catatan: string;
}

export interface AccumulationData {
  period: string;
  totalDebit: number;
  totalKredit: number;
  transactionCount: number;
  isBalanced: boolean;
}

export interface GeneralLedgerEntry {
  id: string;
  tanggal: string;
  nomorJurnal: string;
  deskripsi: string;
  referensi?: string;
  debit: number;
  kredit: number;
  saldo: number;
  jurnalId: string;
  jurnalEntry: {
    id: string;
    nomorJurnal: string;
    tanggal: string;
    deskripsi: string;
  };
}

export interface GeneralLedgerData {
  akun: Akun;
  entries: GeneralLedgerEntry[];
  saldoAwal: number;
  saldoAkhir: number;
  totalDebit: number;
  totalKredit: number;
}

export interface TrialBalanceEntry {
  akun: Akun;
  saldoAwal: number;
  mutasiDebit: number;
  mutasiKredit: number;
  saldoAkhir: number;
}

export interface TrialBalanceData {
  periodeId?: string;
  periode?: PeriodeAkuntansi;
  entries: TrialBalanceEntry[];
  totalSaldoAwal: number;
  totalMutasiDebit: number;
  totalMutasiKredit: number;
  totalSaldoAkhir: number;
  isBalanced: boolean;
  validation?: {
    totalDebit: number;
    totalCredit: number;
    variance: number;
    message?: string;
  };
}

export interface FinancialStatementEntry {
  akun: Akun;
  saldo: number;
}

export interface FinancialStatementSection {
  title: string;
  entries: FinancialStatementEntry[];
  total: number;
}

export interface BalanceSheetData {
  periodeId?: string;
  periode?: PeriodeAkuntansi;
  assets: FinancialStatementSection;
  liabilities: FinancialStatementSection;
  equity: FinancialStatementSection;
  netIncome: number;
  totalAssets: number;
  totalLiabilitiesEquity: number;
  isBalanced: boolean;
  validation?: {
    totalDebit: number;
    totalCredit: number;
    variance: number;
    message?: string;
  };
}

export interface IncomeStatementData {
  periodeId?: string;
  periode?: PeriodeAkuntansi;
  revenue: FinancialStatementSection;
  expenses: FinancialStatementSection;
  netIncome: number;
}

export interface PeriodClosingData {
  periodeId: string;
  periode: PeriodeAkuntansi;
  closingEntries: JurnalEntry[];
  openingBalances: SaldoAwal[];
  netIncome: number;
  status: "pending" | "completed" | "failed";
  closedAt?: string;
}

export interface SaldoAwal {
  id: string;
  periodeId: string;
  akunId: string;
  saldo: number;
  akun: Akun;
  periode: PeriodeAkuntansi;
}

export interface CashFlowEntry {
  tanggal: string;
  deskripsi: string;
  kategori: string;
  referensi?: string;
  tipe: "in" | "out";
  jumlah: number;
  saldo: number;
}

export interface CashFlowData {
  startDate: string;
  endDate: string;
  saldoAkhir: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  netCashFlow: number;
  entries: CashFlowEntry[];
  summary: {
    pemasukan: {
      penjualan: number;
      pembayaranPiutang: number;
      lainnya: number;
      total: number;
    };
    pengeluaran: {
      pembelian: number;
      pembayaranHutang: number;
      operasional: number;
      gaji: number;
      lainnya: number;
      total: number;
    };
  };
}

export type AccumulationPeriod = "daily" | "monthly" | "yearly";
export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";
export type ExpenseCategory =
  | "GAJI_KARYAWAN"
  | "UTILITAS"
  | "SEWA"
  | "PERLENGKAPAN_KANTOR"
  | "TRANSPORTASI"
  | "PERBAIKAN"
  | "IKLAN_PROMOSI"
  | "PAJAK"
  | "ASURANSI"
  | "LAINNYA";
export type PaymentMethod = "tunai" | "transfer" | "cek" | "kartu_kredit";
