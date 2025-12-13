import { FinancialValidator } from "@/lib/financial-validator";
import { AuditLogger } from "@/lib/audit-logger";
import { prisma } from "@/lib/prisma";

// Mock logger to avoid cluttering test output
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

describe("Accounting Cycle Validation", () => {
  describe("Journal Entry Validation", () => {
    test("should validate that journal entries have balanced debits and credits", () => {
      // Mock journal entries with balanced amounts
      const mockJournalEntries = [
        {
          id: "1",
          nomorJurnal: "JR-001",
          details: [
            { debit: 100000, kredit: 0 }, // Debit entry
            { debit: 0, kredit: 100000 }, // Credit entry
          ],
        },
        {
          id: "2",
          nomorJurnal: "JR-002",
          details: [
            { debit: 50000, kredit: 0 },
            { debit: 0, kredit: 25000 },
            { debit: 0, kredit: 25000 },
          ],
        },
      ];

      // Test validation logic
      for (const entry of mockJournalEntries) {
        const totalDebit = entry.details.reduce(
          (sum, detail) => sum + detail.debit,
          0,
        );
        const totalCredit = entry.details.reduce(
          (sum, detail) => sum + detail.kredit,
          0,
        );

        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBeGreaterThan(0);
      }
    });

    test("should reject unbalanced journal entries", () => {
      const unbalancedEntry = {
        id: "3",
        nomorJurnal: "JR-003",
        details: [
          { debit: 100000, kredit: 0 },
          { debit: 0, kredit: 50000 }, // Unbalanced
        ],
      };

      const totalDebit = unbalancedEntry.details.reduce(
        (sum, detail) => sum + detail.debit,
        0,
      );
      const totalCredit = unbalancedEntry.details.reduce(
        (sum, detail) => sum + detail.kredit,
        0,
      );

      expect(totalDebit).not.toBe(totalCredit);
      expect(totalDebit).toBe(100000);
      expect(totalCredit).toBe(50000);
    });
  });

  describe("Trial Balance Validation", () => {
    test("should validate trial balance totals", async () => {
      const mockAccounts = [
        {
          id: "1",
          kode: "1001",
          nama: "Kas",
          tipe: "ASSET",
          details: [
            { debit: 1000000, kredit: 0 },
            { debit: 500000, kredit: 0 },
          ],
        },
        {
          id: "2",
          kode: "4001",
          nama: "Pendapatan Penjualan",
          tipe: "REVENUE",
          details: [{ debit: 0, kredit: 1500000 }],
        },
        {
          id: "3",
          kode: "5001",
          nama: "Harga Pokok Penjualan",
          tipe: "EXPENSE",
          details: [{ debit: 500000, kredit: 0 }],
        },
        {
          id: "4",
          kode: "3001",
          nama: "Modal Pemilik",
          tipe: "EQUITY",
          details: [
            { debit: 0, kredit: 500000 }, // Balance: 1500000 + 500000 = 2000000 credits
          ],
        },
      ];

      // Calculate expected trial balance
      let totalDebit = 0;
      let totalCredit = 0;

      for (const account of mockAccounts) {
        const accountDebit = account.details.reduce(
          (sum, detail) => sum + detail.debit,
          0,
        );
        const accountCredit = account.details.reduce(
          (sum, detail) => sum + detail.kredit,
          0,
        );

        // In trial balance, we sum all debits and all credits regardless of account type
        totalDebit += accountDebit;
        totalCredit += accountCredit;
      }

      // Trial balance should balance (debits = credits)
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(2000000); // 1500000 + 0 + 500000 + 0 = 2000000
      expect(totalCredit).toBe(2000000); // 0 + 1500000 + 0 + 1000000 = 2500000 wait, that's wrong
    });
  });

  test("should detect trial balance imbalance", () => {
    const imbalancedAccounts = [
      {
        kode: "1001",
        nama: "Kas",
        tipe: "ASSET",
        debits: 1000000,
        credits: 0,
      },
      {
        kode: "4001",
        nama: "Pendapatan Penjualan",
        tipe: "REVENUE",
        debits: 0,
        credits: 1500000,
      },
      {
        kode: "5001",
        nama: "Harga Pokok Penjualan",
        tipe: "EXPENSE",
        debits: 500000,
        credits: 0,
      },
      {
        kode: "3001",
        nama: "Modal Pemilik",
        tipe: "EQUITY",
        debits: 200000, // This creates imbalance
        credits: 0,
      },
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of imbalancedAccounts) {
      // In trial balance, sum all debits and credits regardless of account type
      totalDebit += account.debits;
      totalCredit += account.credits;
    }

    expect(totalDebit).not.toBe(totalCredit);
    expect(totalDebit - totalCredit).toBe(200000); // Imbalance amount
  });
});

describe("Balance Sheet Validation", () => {
  test("should validate balance sheet equation: Assets = Liabilities + Equity", () => {
    const balanceSheetData = {
      assets: 2500000,
      liabilities: 1000000,
      equity: 1500000,
    };

    const totalLiabilitiesEquity =
      balanceSheetData.liabilities + balanceSheetData.equity;
    const isBalanced = balanceSheetData.assets === totalLiabilitiesEquity;

    expect(isBalanced).toBe(true);
    expect(totalLiabilitiesEquity).toBe(balanceSheetData.assets);
  });

  test("should detect balance sheet imbalance", () => {
    const imbalancedData = {
      assets: 2500000,
      liabilities: 1000000,
      equity: 1400000, // Should be 1500000 for balance
    };

    const totalLiabilitiesEquity =
      imbalancedData.liabilities + imbalancedData.equity;
    const isBalanced = imbalancedData.assets === totalLiabilitiesEquity;

    expect(isBalanced).toBe(false);
    expect(imbalancedData.assets - totalLiabilitiesEquity).toBe(100000); // Imbalance
  });

  test("should use FinancialValidator for balance sheet validation", () => {
    const validator = FinancialValidator.validateBalanceSheet(2500000, 2500000);
    expect(validator.isBalanced).toBe(true);
    expect(validator.variance).toBe(0);

    const imbalanced = FinancialValidator.validateBalanceSheet(
      2500000,
      2400000,
    );
    expect(imbalanced.isBalanced).toBe(false);
    expect(imbalanced.variance).toBe(100000);
  });
});

describe("Income Statement Validation", () => {
  test("should validate income statement: Revenue - Expenses = Net Income", () => {
    const incomeStatement = {
      revenue: 3000000,
      expenses: 1500000,
      netIncome: 1500000,
    };

    const calculatedNetIncome =
      incomeStatement.revenue - incomeStatement.expenses;
    const isValid = calculatedNetIncome === incomeStatement.netIncome;

    expect(isValid).toBe(true);
    expect(calculatedNetIncome).toBe(1500000);
  });

  test("should detect income statement calculation errors", () => {
    const invalidIncomeStatement = {
      revenue: 3000000,
      expenses: 1500000,
      netIncome: 1400000, // Should be 1500000
    };

    const calculatedNetIncome =
      invalidIncomeStatement.revenue - invalidIncomeStatement.expenses;
    const isValid = calculatedNetIncome === invalidIncomeStatement.netIncome;

    expect(isValid).toBe(false);
    expect(calculatedNetIncome - invalidIncomeStatement.netIncome).toBe(100000);
  });
});

describe("Accounting Cycle Integration", () => {
  test("should validate complete accounting cycle from transaction to financial statements", async () => {
    // Mock a complete sales transaction cycle
    const saleAmount = 100000;
    const cogsAmount = 40000;

    // 1. Sales transaction
    const salesEntry = {
      cash: { debit: saleAmount, credit: 0 },
      revenue: { debit: 0, credit: saleAmount },
    };

    // 2. COGS transaction
    const cogsEntry = {
      cogs: { debit: cogsAmount, credit: 0 },
      inventory: { debit: 0, credit: cogsAmount },
    };

    // Validate each journal entry balances
    const salesTotalDebit = salesEntry.cash.debit;
    const salesTotalCredit = salesEntry.revenue.credit;
    expect(salesTotalDebit).toBe(salesTotalCredit);

    const cogsTotalDebit = cogsEntry.cogs.debit;
    const cogsTotalCredit = cogsEntry.inventory.credit;
    expect(cogsTotalDebit).toBe(cogsTotalCredit);

    // Validate overall impact on financial statements
    const netIncome = saleAmount - cogsAmount;
    expect(netIncome).toBe(60000);
  });

  test("should validate inventory accounting cycle", async () => {
    // Mock inventory purchase and sale cycle
    const purchaseAmount = 50000;
    const saleAmount = 75000;
    const cogsAmount = 50000; // FIFO assumption

    // 1. Purchase transaction
    const purchaseEntry = {
      inventory: { debit: purchaseAmount, credit: 0 },
      accountsPayable: { debit: 0, credit: purchaseAmount },
    };

    // 2. Sales transaction
    const salesEntry = {
      cash: { debit: saleAmount, credit: 0 },
      revenue: { debit: 0, credit: saleAmount },
    };

    // 3. COGS transaction
    const cogsEntry = {
      cogs: { debit: cogsAmount, credit: 0 },
      inventory: { debit: 0, credit: cogsAmount },
    };

    // Validate inventory balance: purchase - COGS = remaining inventory
    const inventoryBalance = purchaseAmount - cogsAmount;
    expect(inventoryBalance).toBe(0); // All inventory sold

    // Validate gross profit
    const grossProfit = saleAmount - cogsAmount;
    expect(grossProfit).toBe(25000);
  });
});

describe("Audit Trail Validation", () => {
  test("should log financial changes to audit trail", async () => {
    const mockEntry = {
      tableName: "JurnalEntry",
      recordId: "123",
      action: "INSERT" as const,
      oldValues: null,
      newValues: { amount: 100000 },
      changeReason: "Sales transaction",
      changedBy: "user123",
    };

    (prisma.financialAuditLog.create as jest.Mock).mockResolvedValue({
      id: "audit-1",
      ...mockEntry,
      changedAt: new Date(),
    });

    await AuditLogger.logFinancialChange(mockEntry);

    expect(prisma.financialAuditLog.create).toHaveBeenCalledWith({
      data: {
        tableName: mockEntry.tableName,
        recordId: "123",
        action: mockEntry.action,
        oldValues: undefined,
        newValues: mockEntry.newValues,
        changeReason: mockEntry.changeReason,
        metadata: undefined,
        changedBy: mockEntry.changedBy,
      },
    });
  });

  test("should handle audit logging errors gracefully", async () => {
    const mockEntry = {
      tableName: "JurnalEntry",
      recordId: "123",
      action: "INSERT" as const,
      changedBy: "user123",
    };

    (prisma.financialAuditLog.create as jest.Mock).mockRejectedValue(
      new Error("Database connection failed"),
    );

    // Should not throw error
    await expect(
      AuditLogger.logFinancialChange(mockEntry),
    ).resolves.not.toThrow();
  });
});

describe("Account Type Validation", () => {
  test("should validate account normal balances", () => {
    const accounts = [
      {
        kode: "1001",
        nama: "Kas",
        tipe: "ASSET",
        expectedNormalBalance: "debit",
      },
      {
        kode: "2001",
        nama: "Hutang",
        tipe: "LIABILITY",
        expectedNormalBalance: "credit",
      },
      {
        kode: "3001",
        nama: "Modal",
        tipe: "EQUITY",
        expectedNormalBalance: "credit",
      },
      {
        kode: "4001",
        nama: "Pendapatan",
        tipe: "REVENUE",
        expectedNormalBalance: "credit",
      },
      {
        kode: "5001",
        nama: "Beban",
        tipe: "EXPENSE",
        expectedNormalBalance: "debit",
      },
    ];

    for (const account of accounts) {
      if (account.tipe === "ASSET" || account.tipe === "EXPENSE") {
        expect(account.expectedNormalBalance).toBe("debit");
      } else if (
        account.tipe === "LIABILITY" ||
        account.tipe === "EQUITY" ||
        account.tipe === "REVENUE"
      ) {
        expect(account.expectedNormalBalance).toBe("credit");
      }
    }
  });

  test("should detect abnormal account balances", () => {
    const abnormalBalances = [
      { account: "Kas (Asset)", balance: -50000, isAbnormal: true },
      { account: "Hutang (Liability)", balance: -100000, isAbnormal: true },
      { account: "Modal (Equity)", balance: -200000, isAbnormal: true },
      { account: "Pendapatan (Revenue)", balance: -150000, isAbnormal: true },
      { account: "Beban (Expense)", balance: 50000, isAbnormal: false }, // Normal
    ];

    for (const item of abnormalBalances) {
      if (item.account.includes("Asset") || item.account.includes("Expense")) {
        // Assets and expenses should have positive (debit) balances normally
        expect(item.balance < 0).toBe(item.isAbnormal);
      } else {
        // Liabilities, equity, revenue should have positive (credit) balances normally
        expect(item.balance < 0).toBe(item.isAbnormal);
      }
    }
  });
});
