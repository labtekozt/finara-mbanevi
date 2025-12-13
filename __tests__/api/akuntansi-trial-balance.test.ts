import { GET } from "@/app/api/akuntansi/trial-balance/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    periodeAkuntansi: {
      findUnique: jest.fn(),
    },
    akun: {
      findMany: jest.fn(),
    },
    jurnalDetail: {
      findMany: jest.fn(),
    },
    saldoAwal: {
      findUnique: jest.fn(),
    },
    financialAuditLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

jest.mock("@/lib/financial-validator", () => ({
  FinancialValidator: {
    validateTrialBalance: jest.fn().mockReturnValue({
      isBalanced: true,
      totalDebit: 1000,
      totalCredit: 1000,
      variance: 0,
      message: "Balanced",
    }),
  },
}));

// Mock Decimal
const mockDecimal = (val: number) => new Prisma.Decimal(val);

// Mock Request
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe("API Akuntansi Trial Balance", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "testuser",
    });
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      true,
    );
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/trial-balance",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      false,
    );
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/trial-balance",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("should calculate trial balance correctly", async () => {
    // Mock accounts
    const mockAccounts = [
      {
        id: "acc-asset-1",
        kode: "1001",
        nama: "Cash",
        tipe: "ASSET",
        isActive: true,
      },
      {
        id: "acc-rev-1",
        kode: "4001",
        nama: "Sales",
        tipe: "REVENUE",
        isActive: true,
      },
    ];
    (prisma.akun.findMany as jest.Mock).mockResolvedValue(mockAccounts);

    // Mock journal details
    (prisma.jurnalDetail.findMany as jest.Mock).mockImplementation(
      async ({ where }) => {
        if (where.akunId === "acc-asset-1") {
          // Asset: Debit 1000, Credit 0 -> Balance 1000 (Positive)
          return [{ debit: mockDecimal(1000), kredit: mockDecimal(0) }];
        }
        if (where.akunId === "acc-rev-1") {
          // Revenue: Credit 1000, Debit 0 -> Balance 1000 (Negative in Trial Balance logic)
          return [{ debit: mockDecimal(0), kredit: mockDecimal(1000) }];
        }
        return [];
      },
    );

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/trial-balance",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    // Check Asset
    const assetEntry = data.entries.find((e: any) => e.akun.kode === "1001");
    expect(assetEntry.saldoAkhir).toBe(1000);

    // Check Revenue
    const revEntry = data.entries.find((e: any) => e.akun.kode === "4001");
    expect(revEntry.saldoAkhir).toBe(-1000); // Credit normal is negative

    // Check Total
    expect(data.totalSaldoAkhir).toBe(0); // 1000 + (-1000) = 0
    expect(data.isBalanced).toBe(true);
  });

  it("should include opening balance when period is specified", async () => {
    const mockPeriode = {
      id: "periode-1",
      nama: "Jan 2024",
      tanggalMulai: new Date("2024-01-01"),
      tanggalAkhir: new Date("2024-01-31"),
    };
    (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(
      mockPeriode,
    );

    const mockAccounts = [
      {
        id: "acc-asset-1",
        kode: "1001",
        nama: "Cash",
        tipe: "ASSET",
        isActive: true,
      },
    ];
    (prisma.akun.findMany as jest.Mock).mockResolvedValue(mockAccounts);

    // Mock Opening Balance
    (prisma.saldoAwal.findUnique as jest.Mock).mockResolvedValue({
      saldo: mockDecimal(500),
    });

    // Mock journal details (Mutations)
    (prisma.jurnalDetail.findMany as jest.Mock).mockResolvedValue([
      { debit: mockDecimal(100), kredit: mockDecimal(0) },
    ]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/trial-balance?periodeId=periode-1",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    // Asset = Opening (500) + Mutation (100) = 600
    const assetEntry = data.entries[0];
    expect(assetEntry.saldoAwal).toBe(500);
    expect(assetEntry.saldoAkhir).toBe(600);
  });
});
