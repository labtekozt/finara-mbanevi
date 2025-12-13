import { GET, POST } from "@/app/api/transaksi-masuk/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForStockAddition } from "@/lib/accounting-utils";
import { generateMasukNumber } from "@/lib/transaction-number";

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
    transaksiMasuk: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    barang: {
      update: jest.fn(),
    },
    hutang: {
      create: jest.fn(),
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
  createJournalEntryForStockAddition: jest.fn(),
}));

jest.mock("@/lib/transaction-number", () => ({
  generateMasukNumber: jest.fn(),
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

describe("Transaksi Masuk API", () => {
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
    (generateMasukNumber as jest.Mock).mockReturnValue("TRX-IN-123");
  });

  describe("POST /api/transaksi-masuk", () => {
    it("should create purchase transaction (CASH) successfully", async () => {
      const txData = {
        barangId: "item-1",
        qty: 100,
        hargaBeli: 5000,
        sumber: "Supplier A",
        lokasiId: "loc-1",
        keterangan: "Restock",
        reason: "PURCHASE",
        paymentMethod: "CASH",
      };

      (prisma.transaksiMasuk.create as jest.Mock).mockResolvedValue({
        id: "tx-in-1",
        nomorTransaksi: "TRX-IN-123",
        ...txData,
        barang: { nama: "Item 1", satuan: "pcs" },
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-masuk",
        txData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify transaction creation
      expect(prisma.transaksiMasuk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomorTransaksi: "TRX-IN-123",
          qty: 100,
          totalNilai: 500000, // 100 * 5000
        }),
        include: expect.anything(),
      });

      // Verify stock update
      expect(prisma.barang.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          stok: { increment: 100 },
          hargaBeli: 5000,
        },
      });

      // Verify NO hutang created for CASH
      expect(prisma.hutang.create).not.toHaveBeenCalled();

      // Verify journal entry
      expect(createJournalEntryForStockAddition).toHaveBeenCalledWith(
        "tx-in-1",
        500000,
        "PURCHASE",
        mockSession.user.id,
        "CASH",
        expect.anything(),
      );
    });

    it("should create purchase transaction (CREDIT) and Hutang successfully", async () => {
      const txData = {
        barangId: "item-1",
        qty: 100,
        hargaBeli: 5000,
        sumber: "Supplier A",
        lokasiId: "loc-1",
        reason: "PURCHASE",
        paymentMethod: "CREDIT",
      };

      (prisma.transaksiMasuk.create as jest.Mock).mockResolvedValue({
        id: "tx-in-1",
        nomorTransaksi: "TRX-IN-123",
        ...txData,
        barang: { nama: "Item 1", satuan: "pcs" },
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-masuk",
        txData,
      );

      const response = await POST(req as any);

      expect(response.status).toBe(201);

      // Verify Hutang creation
      expect(prisma.hutang.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transaksiMasukId: "tx-in-1",
          totalHutang: 500000,
          sisaHutang: 500000,
          status: "BELUM_LUNAS",
        }),
      });

      // Verify journal entry
      expect(createJournalEntryForStockAddition).toHaveBeenCalledWith(
        "tx-in-1",
        500000,
        "PURCHASE",
        mockSession.user.id,
        "CREDIT",
        expect.anything(),
      );
    });

    it("should validate required fields", async () => {
      const invalidData = {
        barangId: "item-1",
        // Missing qty, hargaBeli, etc.
      };

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/transaksi-masuk",
        invalidData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });
  });
});
