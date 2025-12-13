import { GET } from "@/app/api/akuntansi/laporan/neraca/route";
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

// Mock Decimal
const mockDecimal = (val: number) => new Prisma.Decimal(val);

// Mock Request
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe("API Akuntansi Laporan Neraca", () => {
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
      "http://localhost:3000/api/akuntansi/laporan/neraca",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      false,
    );
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/neraca",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("should calculate balance sheet correctly without period (current state)", async () => {
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
        id: "acc-liab-1",
        kode: "2001",
        nama: "Debt",
        tipe: "LIABILITY",
        isActive: true,
      },
      {
        id: "acc-equity-1",
        kode: "3001",
        nama: "Capital",
        tipe: "EQUITY",
        isActive: true,
      },
    ];
    (prisma.akun.findMany as jest.Mock).mockResolvedValue(mockAccounts);

    // Mock journal details
    (prisma.jurnalDetail.findMany as jest.Mock).mockImplementation(
      async ({ where }) => {
        if (where.akunId === "acc-asset-1") {
          // Asset: Debit 1000, Credit 200 -> Balance 800
          return [{ debit: mockDecimal(1000), kredit: mockDecimal(200) }];
        }
        if (where.akunId === "acc-liab-1") {
          // Liability: Credit 500, Debit 100 -> Balance 400
          return [{ debit: mockDecimal(100), kredit: mockDecimal(500) }];
        }
        if (where.akunId === "acc-equity-1") {
          // Equity: Credit 1000, Debit 0 -> Balance 1000
          return [{ debit: mockDecimal(0), kredit: mockDecimal(1000) }];
        }
        return [];
      },
    );

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/neraca",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    // Check Assets
    expect(data.assets.total).toBe(800);
    expect(data.assets.entries[0].saldo).toBe(800);

    // Check Liabilities
    expect(data.liabilities.total).toBe(400);
    expect(data.liabilities.entries[0].saldo).toBe(400);

    // Check Equity
    expect(data.equity.total).toBe(1000);
    expect(data.equity.entries[0].saldo).toBe(1000);
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

    // Mock journal details (Mutations during period)
    (prisma.jurnalDetail.findMany as jest.Mock).mockResolvedValue([
      { debit: mockDecimal(100), kredit: mockDecimal(0) }, // +100
    ]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/neraca?periodeId=periode-1",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    // Asset = Opening (500) + Mutation (100) = 600
    expect(data.assets.total).toBe(600);
    expect(prisma.saldoAwal.findUnique).toHaveBeenCalled();
  });
});
