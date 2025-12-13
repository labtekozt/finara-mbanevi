import { GET } from "@/app/api/dashboard/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaksiKasir: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    barang: {
      count: jest.fn(),
      findMany: jest.fn(),
      fields: {
        stokMinimum: "stokMinimum",
      },
    },
    transaksiMasuk: {
      count: jest.fn(),
    },
    transaksiKeluar: {
      count: jest.fn(),
    },
    itemTransaksi: {
      groupBy: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
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

describe("API Dashboard", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest("http://localhost:3000/api/dashboard");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return dashboard data for default period (today)", async () => {
    (prisma.transaksiKasir.aggregate as jest.Mock).mockResolvedValue({
      _sum: { total: mockDecimal(100000) },
      _count: 10,
    });
    (prisma.barang.count as jest.Mock).mockResolvedValue(5);
    (prisma.transaksiMasuk.count as jest.Mock).mockResolvedValue(2);
    (prisma.transaksiKeluar.count as jest.Mock).mockResolvedValue(3);
    (prisma.transaksiKasir.findMany as jest.Mock).mockResolvedValue([]); // Recent transactions
    (prisma.barang.findMany as jest.Mock).mockResolvedValue([]); // Low stock & Top selling details
    (prisma.itemTransaksi.groupBy as jest.Mock).mockResolvedValue([]); // Top selling
    (prisma.transaksiKasir.groupBy as jest.Mock).mockResolvedValue([]); // Daily revenue

    const req = new MockNextRequest("http://localhost:3000/api/dashboard");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.totalPenjualan).toBe(100000);
    expect(data.stats.totalTransaksi).toBe(10);
    expect(data.stats.barangStokRendah).toBe(5);
    expect(data.stats.totalBarangMasuk).toBe(2);
    expect(data.stats.totalBarangKeluar).toBe(3);
  });

  it("should return dashboard data for custom date range", async () => {
    (prisma.transaksiKasir.aggregate as jest.Mock).mockResolvedValue({
      _sum: { total: mockDecimal(50000) },
      _count: 5,
    });
    (prisma.barang.count as jest.Mock).mockResolvedValue(5);
    (prisma.transaksiMasuk.count as jest.Mock).mockResolvedValue(1);
    (prisma.transaksiKeluar.count as jest.Mock).mockResolvedValue(1);
    (prisma.transaksiKasir.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.barang.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.itemTransaksi.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.transaksiKasir.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/dashboard?startDate=2024-01-01&endDate=2024-01-31",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.totalPenjualan).toBe(50000);
    expect(prisma.transaksiKasir.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tanggal: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});
