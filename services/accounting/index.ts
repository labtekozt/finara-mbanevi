import {
  PeriodeAkuntansi,
  DashboardStats,
  Akun,
  AkunFormData,
  JurnalEntry,
  JurnalFormData,
  Pengeluaran,
  PengeluaranFormData,
  AccumulationData,
  AccumulationPeriod,
  GeneralLedgerData,
  TrialBalanceData,
  BalanceSheetData,
  IncomeStatementData,
  PeriodClosingData,
} from "@/types/accounting";

export class AccountingService {
  private static readonly BASE_URL = "/api/akuntansi";

  // Dashboard
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${this.BASE_URL}/dashboard`);
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }
    return response.json();
  }

  // Accounting Periods
  static async getPeriods(): Promise<PeriodeAkuntansi[]> {
    const response = await fetch(`${this.BASE_URL}/periode`);
    if (!response.ok) {
      throw new Error("Failed to fetch periods");
    }
    return response.json();
  }

  static async createPeriod(
    data: Omit<PeriodeAkuntansi, "id">,
  ): Promise<PeriodeAkuntansi> {
    const response = await fetch(`${this.BASE_URL}/periode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create period");
    }
    return response.json();
  }

  static async updatePeriod(
    id: string,
    data: Partial<PeriodeAkuntansi>,
  ): Promise<PeriodeAkuntansi> {
    const response = await fetch(`${this.BASE_URL}/periode/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update period");
    }
    return response.json();
  }

  // Accounts
  static async getAccounts(params?: {
    tipe?: string;
    kategori?: string;
    search?: string;
  }): Promise<Akun[]> {
    const searchParams = new URLSearchParams();
    if (params?.tipe) searchParams.set("tipe", params.tipe);
    if (params?.kategori) searchParams.set("kategori", params.kategori);
    if (params?.search) searchParams.set("search", params.search);

    const response = await fetch(`${this.BASE_URL}/akun?${searchParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch accounts");
    }
    return response.json();
  }

  static async createAccount(data: AkunFormData): Promise<Akun> {
    const response = await fetch(`${this.BASE_URL}/akun`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create account");
    }
    return response.json();
  }

  static async updateAccount(
    id: string,
    data: Partial<AkunFormData>,
  ): Promise<Akun> {
    const response = await fetch(`${this.BASE_URL}/akun/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update account");
    }
    return response.json();
  }

  static async deleteAccount(id: string): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/akun/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete account");
    }
  }

  // Opening Balances
  static async getOpeningBalances(periodeId: string): Promise<any[]> {
    const response = await fetch(
      `${this.BASE_URL}/saldo-awal?periodeId=${periodeId}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch opening balances");
    }
    return response.json();
  }

  static async createOpeningBalance(data: {
    periodeId: string;
    akunId: string;
    saldo: number;
  }): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/saldo-awal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create opening balance");
    }
    return response.json();
  }

  static async updateOpeningBalance(
    akunId: string,
    periodeId: string,
    saldo: number,
  ): Promise<any> {
    const response = await fetch(
      `${this.BASE_URL}/saldo-awal/${akunId}/${periodeId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo }),
      },
    );
    if (!response.ok) {
      throw new Error("Failed to update opening balance");
    }
    return response.json();
  }

  static async deleteOpeningBalance(
    akunId: string,
    periodeId: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.BASE_URL}/saldo-awal/${akunId}/${periodeId}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) {
      throw new Error("Failed to delete opening balance");
    }
  }

  // Journal Entries
  static async getJournalEntries(params?: {
    periodeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<JurnalEntry[]> {
    const searchParams = new URLSearchParams();
    if (params?.periodeId) searchParams.set("periodeId", params.periodeId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.search) searchParams.set("search", params.search);

    const response = await fetch(`${this.BASE_URL}/jurnal?${searchParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch journal entries");
    }
    const result = await response.json();
    return result.entries || [];
  }

  static async createJournalEntry(data: JurnalFormData): Promise<JurnalEntry> {
    const response = await fetch(`${this.BASE_URL}/jurnal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create journal entry");
    }
    return response.json();
  }

  static async updateJournalEntry(
    id: string,
    data: Partial<JurnalFormData>,
  ): Promise<JurnalEntry> {
    const response = await fetch(`${this.BASE_URL}/jurnal/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update journal entry");
    }
    return response.json();
  }

  static async deleteJournalEntry(id: string): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/jurnal/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete journal entry");
    }
  }

  // Expenses
  static async getExpenses(params?: {
    startDate?: string;
    endDate?: string;
    kategori?: string;
    search?: string;
  }): Promise<Pengeluaran[]> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.kategori) searchParams.set("kategori", params.kategori);
    if (params?.search) searchParams.set("search", params.search);

    const response = await fetch(`/api/pengeluaran?${searchParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
    }
    return response.json();
  }

  static async createExpense(data: PengeluaranFormData): Promise<Pengeluaran> {
    const response = await fetch(`/api/pengeluaran`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create expense");
    }
    return response.json();
  }

  static async updateExpense(
    id: string,
    data: Partial<PengeluaranFormData>,
  ): Promise<Pengeluaran> {
    const response = await fetch(`/api/pengeluaran/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update expense");
    }
    return response.json();
  }

  static async deleteExpense(id: string): Promise<void> {
    const response = await fetch(`/api/pengeluaran/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete expense");
    }
  }

  // Accumulation/Aggregation
  static async getAccumulationData(
    entries: JurnalEntry[],
    period: AccumulationPeriod,
  ): Promise<AccumulationData[]> {
    // This would typically be done on the server side for performance
    // but for now, we'll implement client-side aggregation
    const grouped = entries.reduce(
      (acc, entry) => {
        const date = new Date(entry.tanggal);
        let key: string;

        switch (period) {
          case "daily":
            key = date.toISOString().split("T")[0];
            break;
          case "monthly":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
          case "yearly":
            key = String(date.getFullYear());
            break;
        }

        if (!acc[key]) {
          acc[key] = {
            period: key,
            totalDebit: 0,
            totalKredit: 0,
            transactionCount: 0,
            isBalanced: true,
          };
        }

        const entryDebit = entry.details.reduce(
          (sum, detail) => sum + Number(detail.debit),
          0,
        );
        const entryKredit = entry.details.reduce(
          (sum, detail) => sum + Number(detail.kredit),
          0,
        );

        acc[key].totalDebit += entryDebit;
        acc[key].totalKredit += entryKredit;
        acc[key].transactionCount += 1;
        acc[key].isBalanced = acc[key].isBalanced && entryDebit === entryKredit;

        return acc;
      },
      {} as Record<string, AccumulationData>,
    );

    return Object.values(grouped).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  // General Ledger
  static async getGeneralLedger(
    akunId: string,
    periodeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GeneralLedgerData> {
    const searchParams = new URLSearchParams();
    searchParams.set("akunId", akunId);
    if (periodeId) searchParams.set("periodeId", periodeId);
    if (startDate) searchParams.set("startDate", startDate);
    if (endDate) searchParams.set("endDate", endDate);

    const response = await fetch(`${this.BASE_URL}/buku-besar?${searchParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch general ledger");
    }
    return response.json();
  }

  // Trial Balance
  static async getTrialBalance(periodeId?: string): Promise<TrialBalanceData> {
    const searchParams = new URLSearchParams();
    if (periodeId) searchParams.set("periodeId", periodeId);

    const response = await fetch(
      `${this.BASE_URL}/trial-balance?${searchParams}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch trial balance");
    }
    return response.json();
  }

  // Balance Sheet
  static async getBalanceSheet(
    periodeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BalanceSheetData> {
    const searchParams = new URLSearchParams();
    if (periodeId) searchParams.set("periodeId", periodeId);
    if (startDate) searchParams.set("startDate", startDate);
    if (endDate) searchParams.set("endDate", endDate);

    const response = await fetch(
      `${this.BASE_URL}/laporan/neraca?${searchParams}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch balance sheet");
    }
    return response.json();
  }

  // Income Statement
  static async getIncomeStatement(
    periodeId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatementData> {
    const searchParams = new URLSearchParams();
    if (periodeId) searchParams.set("periodeId", periodeId);
    if (startDate) searchParams.set("startDate", startDate);
    if (endDate) searchParams.set("endDate", endDate);

    const response = await fetch(
      `${this.BASE_URL}/laporan/laba-rugi?${searchParams}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch income statement");
    }
    return response.json();
  }

  // Period Closing
  static async calculateInitialCapital(): Promise<{
    totalInventoryValue: number;
    capitalAccountId: string;
    inventoryAccountId: string;
  }> {
    const response = await fetch(
      `${this.BASE_URL}/periode/calculate-initial-capital`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to calculate initial capital");
    }
    return response.json();
  }

  static async closePeriod(periodeId: string): Promise<PeriodClosingData> {
    const response = await fetch(
      `${this.BASE_URL}/periode/${periodeId}/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to close period");
    }
    return response.json();
  }

  static async getPeriodClosingStatus(
    periodeId: string,
  ): Promise<PeriodClosingData | null> {
    const response = await fetch(
      `${this.BASE_URL}/periode/${periodeId}/closing-status`,
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch period closing status");
    }
    return response.json();
  }
}
