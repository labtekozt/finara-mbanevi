import { GET, POST } from "@/app/api/stock-opname/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForStockAdjustment } from "@/lib/accounting-utils";
import { generateTransactionNumber } from "@/lib/transaction-number";
import { Prisma } from "@prisma/client";

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
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    periodeAkuntansi: {
      findFirst: jest.fn(),
    },
    akun: {
      findFirst: jest.fn(),
    },
    jurnalEntry: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForStockAdjustment: jest.fn(),
}));

jest.mock("@/lib/transaction-number", () => ({
  generateTransactionNumber: jest.fn(),
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

describe("Stock Opname API", () => {
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
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue({
      id: "period-2024",
      nama: "Tahun Buku 2024",
      isActive: true,
      isClosed: false,
    });
    (prisma.akun.findFirst as jest.Mock).mockResolvedValue({
      id: "akun-1",
      kode: "1001",
      nama: "Kas",
    });
    (prisma.jurnalEntry.create as jest.Mock).mockResolvedValue({
      id: "journal-1",
      nomorJurnal: "JR-001",
    });
    (generateTransactionNumber as jest.Mock).mockReturnValue("OPN-123");
    (createJournalEntryForStockAdjustment as jest.Mock).mockResolvedValue({
      id: "journal-1",
      nomorJurnal: "JR-001",
    });
  });

  describe("POST /api/stock-opname", () => {
    it("should create stock adjustment (Increase) successfully", async () => {
      const opnameData = {
        barangId: "item-1",
        stokSistem: 10,
        stokFisik: 12, // Increase by 2
        lokasiId: "loc-1",
        keterangan: "Found extra items",
      };

      const mockBarang = {
        id: "item-1",
        nama: "Item 1",
        stok: { toNumber: () => 10 },
        hargaBeli: {
          toNumber: () => 5000,
          times: (n: number) => ({ toNumber: () => 5000 * n }),
        },
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);
      (prisma.transaksiKeluar.create as jest.Mock).mockResolvedValue({
        id: "opn-1",
        nomorTransaksi: "OPN-123",
        barang: mockBarang,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/stock-opname",
        opnameData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify stock update
      expect(prisma.barang.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          stok: 12,
        },
      });

      // Verify journal entry
      expect(createJournalEntryForStockAdjustment).toHaveBeenCalledWith(
        "OPN-123",
        10000, // 2 * 5000
        true, // isIncrease
        mockSession.user.id,
      );
    });

    it("should create stock adjustment (Decrease) successfully", async () => {
      const opnameData = {
        barangId: "item-1",
        stokSistem: 10,
        stokFisik: 8, // Decrease by 2
        lokasiId: "loc-1",
        keterangan: "Missing items",
      };

      const mockBarang = {
        id: "item-1",
        nama: "Item 1",
        stok: { toNumber: () => 10 },
        hargaBeli: {
          toNumber: () => 5000,
          times: (n: number) => ({ toNumber: () => 5000 * n }),
        },
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);
      (prisma.transaksiKeluar.create as jest.Mock).mockResolvedValue({
        id: "opn-1",
        nomorTransaksi: "OPN-123",
        barang: mockBarang,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/stock-opname",
        opnameData,
      );

      const response = await POST(req as any);

      expect(response.status).toBe(201);

      // Verify stock update
      expect(prisma.barang.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          stok: 8,
        },
      });

      // Verify journal entry
      expect(createJournalEntryForStockAdjustment).toHaveBeenCalledWith(
        "OPN-123",
        10000, // 2 * 5000
        false, // isIncrease (false because decrease)
        mockSession.user.id,
      );
    });

    it("should reject if system stock mismatch", async () => {
      const opnameData = {
        barangId: "item-1",
        stokSistem: 10, // User thinks it's 10
        stokFisik: 12,
        lokasiId: "loc-1",
        keterangan: "Mismatch",
      };

      const mockBarang = {
        id: "item-1",
        stok: { toNumber: () => 15 }, // Actual system stock is 15
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/stock-opname",
        opnameData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/Stok sistem tidak sesuai/);
    });
  });
});
