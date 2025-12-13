import { GET } from "@/app/api/akuntansi/laporan/laba-rugi/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

// Mock Decimal
const mockDecimal = (val: number) => ({
  toNumber: () => val,
  toString: () => val.toString(),
});

// Mock Request
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe("API Akuntansi Laporan Laba Rugi", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      true,
    );
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/laba-rugi",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      false,
    );
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/laba-rugi",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("should calculate income statement correctly", async () => {
    // Mock accounts
    const mockAccounts = [
      {
        id: "acc-rev-1",
        kode: "4001",
        nama: "Sales",
        tipe: "REVENUE",
        isActive: true,
      },
      {
        id: "acc-exp-1",
        kode: "5001",
        nama: "COGS",
        tipe: "EXPENSE",
        isActive: true,
      },
    ];
    (prisma.akun.findMany as jest.Mock).mockResolvedValue(mockAccounts);

    // Mock journal details for Revenue (Credit balance)
    // Sales: Credit 1000, Debit 0 -> Balance 1000
    (prisma.jurnalDetail.findMany as jest.Mock).mockImplementation(
      async ({ where }) => {
        if (where.akunId === "acc-rev-1") {
          return [{ debit: mockDecimal(0), kredit: mockDecimal(1000) }];
        }
        if (where.akunId === "acc-exp-1") {
          // Expense: Debit 500, Credit 0 -> Balance 500
          return [{ debit: mockDecimal(500), kredit: mockDecimal(0) }];
        }
        return [];
      },
    );

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/laba-rugi",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    // Check Revenue
    expect(data.revenue.total).toBe(1000);
    expect(data.revenue.entries).toHaveLength(1);
    expect(data.revenue.entries[0].akun.kode).toBe("4001");
    expect(data.revenue.entries[0].saldo).toBe(1000);

    // Check Expenses
    expect(data.expenses.total).toBe(500);
    expect(data.expenses.entries).toHaveLength(1);
    expect(data.expenses.entries[0].akun.kode).toBe("5001");
    expect(data.expenses.entries[0].saldo).toBe(500);

    // Check Net Income (Revenue - Expense)
    expect(data.netIncome).toBe(500); // 1000 - 500
  });

  it("should filter by period if provided", async () => {
    const mockPeriode = {
      id: "periode-1",
      nama: "Jan 2024",
      tanggalMulai: new Date("2024-01-01"),
      tanggalAkhir: new Date("2024-01-31"),
    };
    (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(
      mockPeriode,
    );
    (prisma.akun.findMany as jest.Mock).mockResolvedValue([]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/laporan/laba-rugi?periodeId=periode-1",
    );
    await GET(req as any);

    expect(prisma.periodeAkuntansi.findUnique).toHaveBeenCalledWith({
      where: { id: "periode-1" },
    });
  });
});
