import { GET, POST } from "@/app/api/transaksi-keluar/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForOutgoingTransaction } from "@/lib/accounting-utils";
import { generateKeluarNumber } from "@/lib/transaction-number";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    transaksiKeluar: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    barang: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForOutgoingTransaction: jest.fn(),
}));

jest.mock("@/lib/transaction-number", () => ({
  generateKeluarNumber: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock NextRequest
class MockNextRequest {
  method: string;
  url: string;
  body: any;
  nextUrl: { searchParams: URLSearchParams };

  constructor(method: string, url: string, body: any = {}) {
    this.method = method;
    this.url = url;
    this.body = body;
    this.nextUrl = {
      searchParams: new URLSearchParams(url.split("?")[1] || ""),
    };
  }

  async json() {
    return this.body;
  }
}

describe("Transaksi Keluar API", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require("next-auth").getServerSession as jest.Mock).mockResolvedValue(
      mockSession,
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      username: "testuser",
    });
    (generateKeluarNumber as jest.Mock).mockReturnValue("TRX-OUT-123");
  });

  describe("POST /api/transaksi-keluar", () => {
    it("should create outgoing transaction successfully", async () => {
      const txData = {
        barangId: "item-1",
        qty: 10,
        tujuan: "Produksi",
        lokasiId: "loc-1",
        keterangan: "Bahan baku",
      };

      const mockBarang = {
        id: "item-1",
        nama: "Item 1",
        stok: 100,
        satuan: "pcs",
        hargaBeli: { toNumber: () => 5000 },
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);
      (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // Successful update
      (prisma.transaksiKeluar.create as jest.Mock).mockResolvedValue({
        id: "tx-out-1",
        nomorTransaksi: "TRX-OUT-123",
        ...txData,
        barang: mockBarang,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-keluar",
        txData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify stock check
      expect(prisma.barang.findUnique).toHaveBeenCalledWith({
        where: { id: "item-1" },
      });

      // Verify atomic stock update
      expect(prisma.barang.updateMany).toHaveBeenCalledWith({
        where: {
          id: "item-1",
          stok: { gte: 10 },
        },
        data: {
          stok: { decrement: 10 },
        },
      });

      // Verify transaction creation
      expect(prisma.transaksiKeluar.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomorTransaksi: "TRX-OUT-123",
          qty: 10,
          totalNilai: 50000, // 10 * 5000
        }),
        include: expect.anything(),
      });

      // Verify journal entry
      expect(createJournalEntryForOutgoingTransaction).toHaveBeenCalledWith(
        "tx-out-1",
        50000,
        "Produksi",
        mockSession.user.id,
        expect.anything(),
      );
    });

    it("should reject if stock is insufficient (pre-check)", async () => {
      const txData = {
        barangId: "item-1",
        qty: 100,
        tujuan: "Produksi",
        lokasiId: "loc-1",
      };

      const mockBarang = {
        id: "item-1",
        nama: "Item 1",
        stok: 50, // Less than 100
        satuan: "pcs",
        hargaBeli: { toNumber: () => 5000 },
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-keluar",
        txData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/Stok .* tidak cukup/);
      expect(prisma.barang.updateMany).not.toHaveBeenCalled();
    });

    it("should reject if atomic update fails (race condition)", async () => {
      const txData = {
        barangId: "item-1",
        qty: 10,
        tujuan: "Produksi",
        lokasiId: "loc-1",
      };

      const mockBarang = {
        id: "item-1",
        nama: "Item 1",
        stok: 100, // Looks enough initially
        satuan: "pcs",
        hargaBeli: { toNumber: () => 5000 },
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);
      (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 0 }); // Update failed (likely changed by another tx)

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-keluar",
        txData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/Stok .* tidak cukup/);
    });
  });
});
