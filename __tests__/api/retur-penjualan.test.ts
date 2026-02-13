import { POST, GET } from "@/app/api/retur-penjualan/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForSalesReturn } from "@/lib/accounting-utils";
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
    transaksiKasir: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    itemTransaksi: {
      create: jest.fn(),
    },
    barang: {
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
  createJournalEntryForSalesReturn: jest.fn(),
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

describe("Retur Penjualan API", () => {
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
      tanggalMulai: new Date("2024-01-01"),
      tanggalAkhir: new Date("2024-12-31"),
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
    (generateTransactionNumber as jest.Mock).mockReturnValue("RTPJ-123");
    (createJournalEntryForSalesReturn as jest.Mock).mockResolvedValue({
      id: "journal-1",
      nomorJurnal: "JR-001",
    });
  });

  describe("POST /api/retur-penjualan", () => {
    it("should create sales return successfully", async () => {
      const originalTxId = "tx-123";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-123",
        metodePembayaran: "tunai",
        itemTransaksi: [
          {
            barangId: "item-1",
            namaBarang: "Item 1",
            qty: { toNumber: () => 10 },
            hargaSatuan: { toNumber: () => 10000 },
            barang: {
              hargaBeli: { toNumber: () => 8000 },
            },
          },
        ],
      };

      const returnData = {
        transaksiKasirId: originalTxId,
        items: [
          {
            barangId: "item-1",
            qty: 2,
          },
        ],
        alasan: "Rusak",
        catatan: "Retur barang rusak",
      };

      (prisma.transaksiKasir.findUnique as jest.Mock)
        .mockResolvedValueOnce(originalTx) // First call for original transaction
        .mockResolvedValueOnce({ id: "retur-1", ...returnData }); // Second call for complete return

      (prisma.transaksiKasir.findMany as jest.Mock).mockResolvedValue([]); // No previous returns

      (prisma.transaksiKasir.create as jest.Mock).mockResolvedValue({
        id: "retur-1",
        nomorTransaksi: "RTPJ-123",
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-penjualan",
        returnData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify return transaction creation
      expect(prisma.transaksiKasir.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nomorTransaksi: "RTPJ-123",
          subtotal: -20000, // 2 * 10000
          total: -20000,
          catatan: expect.stringContaining("RETUR TRX-123"),
        }),
      });

      // Verify stock update (increment)
      expect(prisma.barang.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          stok: {
            increment: 2,
          },
        },
      });

      // Verify journal entry
      expect(createJournalEntryForSalesReturn).toHaveBeenCalledWith(
        "RTPJ-123",
        20000, // Revenue returned
        16000, // COGS returned (2 * 8000)
        "tunai",
        mockSession.user.id,
        expect.anything(),
      );
    });

    it("should reject return if quantity exceeds original", async () => {
      const originalTxId = "tx-123";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-123",
        itemTransaksi: [
          {
            barangId: "item-1",
            namaBarang: "Item 1",
            qty: { toNumber: () => 5 },
            hargaSatuan: { toNumber: () => 10000 },
            barang: {
              hargaBeli: { toNumber: () => 8000 },
            },
          },
        ],
      };

      const returnData = {
        transaksiKasirId: originalTxId,
        items: [
          {
            barangId: "item-1",
            qty: 10, // Exceeds 5
          },
        ],
        alasan: "Salah beli",
      };

      (prisma.transaksiKasir.findUnique as jest.Mock).mockResolvedValue(
        originalTx,
      );
      (prisma.transaksiKasir.findMany as jest.Mock).mockResolvedValue([]);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-penjualan",
        returnData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/melebihi sisa/);
    });

    it("should reject return if item not found in original transaction", async () => {
      const originalTxId = "tx-123";
      const originalTx = {
        id: originalTxId,
        nomorTransaksi: "TRX-123",
        itemTransaksi: [], // Empty items
      };

      const returnData = {
        transaksiKasirId: originalTxId,
        items: [
          {
            barangId: "item-1",
            qty: 1,
          },
        ],
        alasan: "Salah beli",
      };

      (prisma.transaksiKasir.findUnique as jest.Mock).mockResolvedValue(
        originalTx,
      );
      (prisma.transaksiKasir.findMany as jest.Mock).mockResolvedValue([]);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/retur-penjualan",
        returnData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/tidak ditemukan dalam transaksi asli/);
    });
  });
});
