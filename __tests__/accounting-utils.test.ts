import {
  getActiveAccountingPeriod,
  closeAccountingPeriod,
  getAccountByCode,
  createJournalEntryForSale,
  createJournalEntryForPurchase,
  createJournalEntryForCompleteSale,
  createJournalEntryForCOGS,
  createJournalEntryForSalary,
  createJournalEntryForInventoryAdjustment,
  reverseJournalEntry,
  createJournalEntryForExpense,
  createJournalEntryForOutgoingTransaction,
  createJournalEntryForPurchaseReturn,
  createJournalEntryForSalesReturn,
  createJournalEntryForStockAdjustment,
  createJournalEntryForStockAddition,
  createJournalEntryForDebtPayment,
  createJournalEntryForReceivablePayment,
  ACCOUNT_CODES,
} from "@/lib/accounting-utils";
import { prisma } from "@/lib/prisma";
import { startOfYear, endOfYear } from "date-fns";

// Mock logger
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

// Mock transaction number generator
jest.mock("@/lib/transaction-number", () => ({
  generateTransactionNumber: jest.fn(() => "JR-MOCK-001"),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    periodeAkuntansi: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    akun: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    jurnalEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    jurnalDetail: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe("Accounting Utils Comprehensive Tests", () => {
  const mockUserId = "user-123";
  // Use a future date to prevent auto-closing logic in getActiveAccountingPeriod
  const mockPeriod = {
    id: "period-1",
    nama: "Periode 2030",
    tanggalMulai: new Date("2030-01-01"),
    tanggalAkhir: new Date("2030-12-31"),
    isActive: true,
    isClosed: false,
  };

  const mockAccount = (id: string, code: string, type: string = "ASSET") => ({
    id,
    kode: code,
    nama: `Account ${code}`,
    tipe: type,
    isActive: true,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default behavior: Active period exists
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(mockPeriod);
    (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(mockPeriod);
    
    // Default behavior: Account found
    (prisma.akun.findFirst as jest.Mock).mockImplementation(({ where }) => {
      if (where.kode) {
        return Promise.resolve(mockAccount(`acc-${where.kode}`, where.kode));
      }
      return Promise.resolve(mockAccount("acc-generic", "0000"));
    });
    // Default behavior: Create returns the input data with an ID
    (prisma.jurnalEntry.create as jest.Mock).mockImplementation(({ data }) => {
      return Promise.resolve({ ...data, id: "journal-1" });
    });
  });

  describe("Period Management", () => {
    test("getActiveAccountingPeriod should return existing active period", async () => {
      const result = await getActiveAccountingPeriod(undefined, mockUserId);
      expect(result).toEqual(mockPeriod);
    });

    test("getActiveAccountingPeriod should create new period if none exists", async () => {
      (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.periodeAkuntansi.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.periodeAkuntansi.create as jest.Mock).mockResolvedValue(mockPeriod);

      const result = await getActiveAccountingPeriod(undefined, mockUserId);
      expect(prisma.periodeAkuntansi.create).toHaveBeenCalled();
      expect(result).toEqual(mockPeriod);
    });

    test("closeAccountingPeriod should create closing entries", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(mockPeriod);
      
      // Mock Revenue and Expense accounts
      const revAccount = mockAccount("rev-1", "4001", "REVENUE");
      const expAccount = mockAccount("exp-1", "5001", "EXPENSE");
      
      (prisma.akun.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.tipe === "REVENUE") return Promise.resolve([revAccount]);
        if (where.tipe === "EXPENSE") return Promise.resolve([expAccount]);
        return Promise.resolve([]);
      });

      // Mock Journal Details (Balances)
      // Revenue: Credit 1000 (Balance = 1000)
      // Expense: Debit 500 (Balance = 500)
      (prisma.jurnalDetail.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.akunId === "rev-1") return Promise.resolve([{ debit: { toNumber: () => 0 }, kredit: { toNumber: () => 1000 } }]);
        if (where.akunId === "exp-1") return Promise.resolve([{ debit: { toNumber: () => 500 }, kredit: { toNumber: () => 0 } }]);
        return Promise.resolve([]);
      });

      // Mock Retained Earnings Account
      (prisma.akun.findFirst as jest.Mock).mockResolvedValue(mockAccount("equity-1", "3002", "EQUITY"));

      await closeAccountingPeriod("period-1", mockUserId);

      // Should create 2 closing entries (Revenue -> RE, RE -> Expense)
      expect(prisma.jurnalEntry.create).toHaveBeenCalledTimes(2);
      expect(prisma.periodeAkuntansi.update).toHaveBeenCalledWith({
        where: { id: "period-1" },
        data: { isActive: false, isClosed: true },
      });
    });
  });

  describe("Helper Functions", () => {
    test("getAccountByCode should return account", async () => {
      const result = await getAccountByCode("1001");
      expect(result).toBeDefined();
      expect(result?.kode).toBe("1001");
    });
  });

  describe("Journal Entry Creation - Sales & Revenue", () => {
    test("createJournalEntryForSale should create entry", async () => {
      await createJournalEntryForSale("tx-1", 1000, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "SALE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // Cash
              expect.objectContaining({ debit: 0, kredit: 1000 }), // Revenue
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForCompleteSale (Cash) should create entry with COGS", async () => {
      const items = [{ barangId: "b1", qty: 2, costPrice: 100 }]; // Total COGS 200
      await createJournalEntryForCompleteSale("tx-1", 500, items, mockUserId, "tunai");
      
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "SALE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 500, kredit: 0 }), // Cash
              expect.objectContaining({ debit: 200, kredit: 0 }), // COGS
              expect.objectContaining({ debit: 0, kredit: 500 }), // Revenue
              expect.objectContaining({ debit: 0, kredit: 200 }), // Inventory
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForCompleteSale (Credit) should use AR", async () => {
      const items = [{ barangId: "b1", qty: 1, costPrice: 100 }];
      await createJournalEntryForCompleteSale("tx-1", 500, items, mockUserId, "kredit");
      
      // Verify AR account is fetched
      expect(prisma.akun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ 
        where: expect.objectContaining({ kode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE }) 
      }));
    });

    test("createJournalEntryForSalesReturn should create reversal entry", async () => {
      await createJournalEntryForSalesReturn("ret-1", 500, 200, "tunai", mockUserId);
      
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "SALES_RETURN",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 500, kredit: 0 }), // Revenue (Debit to decrease)
              expect.objectContaining({ debit: 200, kredit: 0 }), // Inventory (Debit to increase)
              expect.objectContaining({ debit: 0, kredit: 500 }), // Cash (Credit to refund)
              expect.objectContaining({ debit: 0, kredit: 200 }), // COGS (Credit to reverse)
            ]),
          },
        })
      }));
    });
  });

  describe("Journal Entry Creation - Purchases & Inventory", () => {
    test("createJournalEntryForPurchase should create entry", async () => {
      await createJournalEntryForPurchase("tx-in-1", 1000, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "PURCHASE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // Inventory
              expect.objectContaining({ debit: 0, kredit: 1000 }), // AP
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForCOGS should create entry", async () => {
      await createJournalEntryForCOGS("b1", 5, 100, mockUserId); // Total 500
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "COGS",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 500, kredit: 0 }), // COGS
              expect.objectContaining({ debit: 0, kredit: 500 }), // Inventory
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForInventoryAdjustment should create entry", async () => {
      await createJournalEntryForInventoryAdjustment("tx-out-1", 100, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "ADJUSTMENT",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 100, kredit: 0 }), // Expense
              expect.objectContaining({ debit: 0, kredit: 100 }), // Inventory
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForPurchaseReturn (Cash) should create entry", async () => {
      await createJournalEntryForPurchaseReturn("ret-in-1", 1000, true, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "PURCHASE_RETURN",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // Sales Revenue (Correction) - Wait, logic check in implementation
              expect.objectContaining({ debit: 0, kredit: 1000 }), // Cash
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForStockAdjustment (Increase) should create entry", async () => {
      await createJournalEntryForStockAdjustment("adj-1", 100, true, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "STOCK_ADJUSTMENT",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 100, kredit: 0 }), // Inventory
              expect.objectContaining({ debit: 0, kredit: 100 }), // Other Revenue
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForStockAdjustment (Decrease) should create entry", async () => {
      await createJournalEntryForStockAdjustment("adj-1", -100, false, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "STOCK_ADJUSTMENT",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 100, kredit: 0 }), // Other Expense
              expect.objectContaining({ debit: 0, kredit: 100 }), // Inventory
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForStockAddition (PURCHASE) should create entry", async () => {
      await createJournalEntryForStockAddition("tx-in-1", 1000, "PURCHASE", mockUserId, "CASH");
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "PURCHASE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // Inventory
              expect.objectContaining({ debit: 0, kredit: 1000 }), // Cash
            ]),
          },
        })
      }));
    });
  });

  describe("Expenses & Payments", () => {
    test("createJournalEntryForSalary should create entry", async () => {
      await createJournalEntryForSalary("John Doe", 5000, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "EXPENSE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 5000, kredit: 0 }), // Salary Expense
              expect.objectContaining({ debit: 0, kredit: 5000 }), // Cash
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForExpense should create entry", async () => {
      const expense = { id: "exp-1", kategori: "UTILITAS", jumlah: 200, deskripsi: "Listrik", tanggal: new Date(), penerima: "PLN" };
      await createJournalEntryForExpense(prisma, expense, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "EXPENSE",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 200, kredit: 0 }), // Utility Expense
              expect.objectContaining({ debit: 0, kredit: 200 }), // Cash
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForDebtPayment should create entry", async () => {
      await createJournalEntryForDebtPayment("debt-1", 1000, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "DEBT_PAYMENT",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // AP
              expect.objectContaining({ debit: 0, kredit: 1000 }), // Cash
            ]),
          },
        })
      }));
    });

    test("createJournalEntryForReceivablePayment should create entry", async () => {
      await createJournalEntryForReceivablePayment("rec-1", 1000, mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "RECEIVABLE_PAYMENT",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 1000, kredit: 0 }), // Cash
              expect.objectContaining({ debit: 0, kredit: 1000 }), // AR
            ]),
          },
        })
      }));
    });
  });

  describe("Other Transactions", () => {
    test("createJournalEntryForOutgoingTransaction (Sale) should create entry", async () => {
      await createJournalEntryForOutgoingTransaction("out-1", 1000, "Penjualan ke Customer", mockUserId);
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "SALE",
        })
      }));
    });

    test("createJournalEntryForOutgoingTransaction (Transfer) should NOT create entry", async () => {
      const result = await createJournalEntryForOutgoingTransaction("out-1", 1000, "Transfer Gudang", mockUserId);
      expect(result).toBeNull();
      expect(prisma.jurnalEntry.create).not.toHaveBeenCalled();
    });

    test("reverseJournalEntry should create reversal entry", async () => {
      (prisma.jurnalEntry.findUnique as jest.Mock).mockResolvedValue({
        id: "orig-1",
        deskripsi: "Original",
        periodeId: "p1",
        details: [
          { akunId: "acc-1", debit: 100, kredit: 0, deskripsi: "D1" },
          { akunId: "acc-2", debit: 0, kredit: 100, deskripsi: "D2" },
        ],
      });

      await reverseJournalEntry(prisma, "orig-1", mockUserId);

      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tipeReferensi: "REVERSAL",
          details: {
            create: expect.arrayContaining([
              expect.objectContaining({ debit: 0, kredit: 100 }), // Swapped
              expect.objectContaining({ debit: 100, kredit: 0 }), // Swapped
            ]),
          },
        })
      }));
    });
  });
});
