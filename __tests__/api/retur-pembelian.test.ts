import { POST, GET } from "@/app/api/retur-pembelian/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForPurchaseReturn } from "@/lib/accounting-utils";
import { generateTransactionNumber } from "@/lib/transaction-number";

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
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    barang: {
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForPurchaseReturn: jest.fn(),
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

describe("Retur Pembelian API", () => {
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
    (generateTransactionNumber as jest.Mock).mockReturnValue("RTP-123");
  });

  describe("POST /api/retur-pembelian", () => {
    it("should create purchase return successfully", async () => {
      const originalTxId = "tx-in-123";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-IN-123",
        barangId: "item-1",
        qty: 100,
        hargaBeli: { toNumber: () => 5000 },
        sumber: "Tunai",
        lokasiId: "loc-1",
        barang: {
          nama: "Item 1",
          satuan: "pcs",
        },
      };

      const returnData = {
        transaksiMasukId: originalTxId,
        qty: 10,
        alasan: "Cacat",
        catatan: "Retur barang cacat",
      };

      (prisma.transaksiMasuk.findUnique as jest.Mock).mockResolvedValue(
        originalTx,
      );
      (prisma.transaksiMasuk.findMany as jest.Mock).mockResolvedValue([]); // No previous returns

      (prisma.transaksiMasuk.create as jest.Mock).mockResolvedValue({
        id: "retur-in-1",
        nomorTransaksi: "RTP-123",
        barang: { nama: "Item 1", satuan: "pcs" },
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-pembelian",
        returnData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify return transaction creation
      expect(prisma.transaksiMasuk.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomorTransaksi: "RTP-123",
          qty: -10, // Negative
          totalNilai: -50000, // -10 * 5000
          keterangan: expect.stringContaining("RETUR TRX-IN-123"),
        }),
        include: expect.anything(),
      });

      // Verify stock update (decrement)
      expect(prisma.barang.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          stok: {
            decrement: 10,
          },
        },
      });

      // Verify journal entry
      expect(createJournalEntryForPurchaseReturn).toHaveBeenCalledWith(
        "RTP-123",
        50000, // Return amount
        true, // isCashPurchase (based on "Tunai")
        mockSession.user.id,
        expect.anything(),
      );
    });

    it("should reject return if quantity exceeds original", async () => {
      const originalTxId = "tx-in-123";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-IN-123",
        qty: 5,
        hargaBeli: { toNumber: () => 5000 },
      };

      const returnData = {
        transaksiMasukId: originalTxId,
        qty: 10, // Exceeds 5
        alasan: "Salah kirim",
      };

      (prisma.transaksiMasuk.findUnique as jest.Mock).mockResolvedValue(
        originalTx,
      );
      (prisma.transaksiMasuk.findMany as jest.Mock).mockResolvedValue([]);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-pembelian",
        returnData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/melebihi sisa/);
    });

    it("should correctly identify credit purchase", async () => {
      const originalTxId = "tx-in-credit";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-IN-CREDIT",
        barangId: "item-1",
        qty: 100,
        hargaBeli: { toNumber: () => 5000 },
        sumber: "Hutang Supplier A", // Not "Tunai" or "Cash"
        lokasiId: "loc-1",
        barang: { nama: "Item 1", satuan: "pcs" },
      };

      const returnData = {
        transaksiMasukId: originalTxId,
        qty: 10,
        alasan: "Retur",
      };

      (prisma.transaksiMasuk.findUnique as jest.Mock).mockResolvedValue(
        originalTx,
      );
      (prisma.transaksiMasuk.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaksiMasuk.create as jest.Mock).mockResolvedValue({
        id: "retur-1",
        nomorTransaksi: "RTP-123",
        barang: { nama: "Item 1" },
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-pembelian",
        returnData,
      );

      await POST(req as any);

      // Verify journal entry uses isCashPurchase = false
      expect(createJournalEntryForPurchaseReturn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        false, // isCashPurchase should be false
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
