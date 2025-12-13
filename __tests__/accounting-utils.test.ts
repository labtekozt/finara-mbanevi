import {
  getActiveAccountingPeriod,
  closeAccountingPeriod,
  ACCOUNT_CODES,
} from "@/lib/accounting-utils";
import { prisma } from "@/lib/prisma";
import { startOfYear, endOfYear } from "date-fns";

// Mock logger to avoid cluttering test output
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

describe("Accounting Cycle Unit Tests", () => {
  const mockUserId = "user-123";
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getActiveAccountingPeriod", () => {
    test("should return existing active period if valid", async () => {
      const mockPeriod = {
        id: "period-1",
        nama: `Periode Tahun ${currentYear}`,
        tanggalMulai: startOfYear(new Date()),
        tanggalAkhir: endOfYear(new Date()),
        isActive: true,
        isClosed: false,
      };

      (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(
        mockPeriod,
      );

      const result = await getActiveAccountingPeriod(undefined, mockUserId);

      expect(result).toEqual(mockPeriod);
      expect(prisma.periodeAkuntansi.findFirst).toHaveBeenCalledTimes(1);
    });

    test("should create new period if no active period exists", async () => {
      // Mock no active period found
      (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(null);
      // Mock no past open periods
      (prisma.periodeAkuntansi.findMany as jest.Mock).mockResolvedValue([]);

      const newPeriod = {
        id: "new-period",
        nama: `Periode Tahun ${currentYear}`,
        tanggalMulai: startOfYear(new Date()),
        tanggalAkhir: endOfYear(new Date()),
        isActive: true,
        isClosed: false,
      };

      (prisma.periodeAkuntansi.create as jest.Mock).mockResolvedValue(
        newPeriod,
      );

      const result = await getActiveAccountingPeriod(undefined, mockUserId);

      expect(result).toEqual(newPeriod);
      expect(prisma.periodeAkuntansi.create).toHaveBeenCalled();
    });

    test("should close expired active period and create new one", async () => {
      const lastYear = currentYear - 1;
      const expiredPeriod = {
        id: "expired-period",
        nama: `Periode Tahun ${lastYear}`,
        tanggalMulai: new Date(`${lastYear}-01-01`),
        tanggalAkhir: new Date(`${lastYear}-12-31`), // Expired
        isActive: true,
        isClosed: false,
      };

      // First call returns expired period
      (prisma.periodeAkuntansi.findFirst as jest.Mock)
        .mockResolvedValueOnce(expiredPeriod) // 1. Check active
        .mockResolvedValueOnce(null); // 2. Check current date coverage (none)

      // Mock finding period by ID for closing
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(
        expiredPeriod,
      );

      // Mock account finding for closing
      (prisma.akun.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.akun.findFirst as jest.Mock).mockResolvedValue({
        id: "retained-earnings",
      });

      // Mock creating new period
      const newPeriod = {
        id: "new-period",
        nama: `Periode Tahun ${currentYear}`,
        tanggalMulai: startOfYear(new Date()),
        tanggalAkhir: endOfYear(new Date()),
        isActive: true,
        isClosed: false,
      };
      (prisma.periodeAkuntansi.create as jest.Mock).mockResolvedValue(
        newPeriod,
      );

      await getActiveAccountingPeriod(undefined, mockUserId);

      // Should have called update to close the old period
      expect(prisma.periodeAkuntansi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expiredPeriod.id },
          data: expect.objectContaining({
            isActive: false,
            isClosed: true,
          }),
        }),
      );

      // Should have created new period
      expect(prisma.periodeAkuntansi.create).toHaveBeenCalled();
    });
  });

  describe("closeAccountingPeriod", () => {
    test("should calculate balances and create closing entries", async () => {
      const periodId = "period-to-close";
      const mockPeriod = {
        id: periodId,
        nama: "Periode 2024",
        tanggalAkhir: new Date("2024-12-31"),
        isClosed: false,
      };

      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(
        mockPeriod,
      );

      // Mock accounts
      const revenueAccount = { id: "rev-1", nama: "Sales", tipe: "REVENUE" };
      const expenseAccount = { id: "exp-1", nama: "Cost", tipe: "EXPENSE" };
      const retainedEarnings = {
        id: "re-1",
        nama: "Retained Earnings",
        tipe: "EQUITY",
      };

      (prisma.akun.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.tipe === "REVENUE") return Promise.resolve([revenueAccount]);
        if (where.tipe === "EXPENSE") return Promise.resolve([expenseAccount]);
        return Promise.resolve([]);
      });

      (prisma.akun.findFirst as jest.Mock).mockResolvedValue(retainedEarnings);

      // Mock journal details for balances
      // Revenue: Credit 1000
      // Expense: Debit 600
      (prisma.jurnalDetail.findMany as jest.Mock).mockImplementation(
        ({ where }) => {
          if (where.akunId === revenueAccount.id) {
            return Promise.resolve([
              { debit: { toNumber: () => 0 }, kredit: { toNumber: () => 1000 } },
            ]);
          }
          if (where.akunId === expenseAccount.id) {
            return Promise.resolve([
              { debit: { toNumber: () => 600 }, kredit: { toNumber: () => 0 } },
            ]);
          }
          return Promise.resolve([]);
        },
      );

      await closeAccountingPeriod(periodId, mockUserId);

      // Should create closing journal for Revenue
      // Debit Revenue 1000, Credit Retained Earnings 1000
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deskripsi: expect.stringContaining("Penutupan akun pendapatan"),
            details: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  akunId: retainedEarnings.id,
                  kredit: 1000,
                }),
                expect.objectContaining({
                  akunId: revenueAccount.id,
                  debit: 1000,
                }),
              ]),
            },
          }),
        }),
      );

      // Should create closing journal for Expense
      // Credit Expense 600, Debit Retained Earnings 600
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deskripsi: expect.stringContaining("Penutupan akun beban"),
            details: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  akunId: retainedEarnings.id,
                  debit: 600,
                }),
                expect.objectContaining({
                  akunId: expenseAccount.id,
                  kredit: 600,
                }),
              ]),
            },
          }),
        }),
      );

      // Should mark period as closed
      expect(prisma.periodeAkuntansi.update).toHaveBeenCalledWith({
        where: { id: periodId },
        data: { isActive: false, isClosed: true },
      });
    });
  });
});