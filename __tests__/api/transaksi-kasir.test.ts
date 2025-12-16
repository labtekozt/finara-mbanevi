import { POST } from "@/app/api/transaksi-kasir/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { createJournalEntryForCompleteSale } from "@/lib/accounting-utils";

// Mock Next.js server components
jest.mock("next/server", () => {
  return {
    NextRequest: class {
      url: string;
      method: string;
      body: any;
      nextUrl: URL;
      constructor(url: string, init: any) {
        this.url = url;
        this.method = init?.method || "GET";
        this.body = init?.body;
        this.nextUrl = new URL(url);
      }
      json() {
        return Promise.resolve(JSON.parse(this.body));
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => ({
        json: () => Promise.resolve(body),
        status: init?.status || 200,
      }),
    },
  };
});

// Mock auth options to avoid loading real dependencies
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    transaksiKasir: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    barang: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    itemTransaksi: {
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    piutang: {
      create: jest.fn(),
    },
    periodeAkuntansi: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForCompleteSale: jest.fn(),
  getActiveAccountingPeriod: jest.fn(),
}));

jest.mock("@/lib/transaction-number", () => ({
  generateKasirNumber: jest.fn(() => "TRX-MOCK-001"),
}));

jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe("API: /api/transaksi-kasir", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      username: "testuser",
    });

    // Mock active period for auto period management
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue({
      id: "period-2024",
      nama: "Tahun Buku 2024",
      tanggalMulai: new Date("2024-01-01"),
      tanggalAkhir: new Date("2024-12-31"),
      isActive: true,
      isClosed: false,
    });
  });

  describe("POST Transaction Validation", () => {
    test("should reject unauthorized requests", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    test("should validate required fields", async () => {
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing items and totals
            metodePembayaran: "cash",
          }),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation error");
    });

    test("should reject empty items array", async () => {
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify({
            items: [],
            subtotal: 1000,
            total: 1000,
            metodePembayaran: "cash",
            jumlahBayar: 1000,
            kembalian: 0,
          }),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    test("should reject negative quantities", async () => {
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                barangId: "b1",
                namaBarang: "Item 1",
                hargaSatuan: 1000,
                qty: -1, // Negative
                subtotal: -1000,
              },
            ],
            subtotal: -1000,
            total: -1000,
            metodePembayaran: "cash",
            jumlahBayar: 0,
            kembalian: 0,
          }),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST Transaction Logic", () => {
    const validPayload = {
      items: [
        {
          barangId: "b1",
          namaBarang: "Item 1",
          hargaSatuan: 10000,
          qty: 2,
          subtotal: 20000,
        },
      ],
      subtotal: 20000,
      pajak: 0,
      diskon: 0,
      total: 20000,
      metodePembayaran: "cash",
      jumlahBayar: 50000,
      kembalian: 30000,
      tanggal: "2024-06-15T10:00:00.000Z",
    };

    test("should process valid transaction successfully", async () => {
      // Mock successful stock update
      (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Mock transaction creation
      (prisma.transaksiKasir.create as jest.Mock).mockResolvedValue({
        id: "trx-1",
        nomorTransaksi: "TRX-MOCK-001",
      });

      // Mock finding barang for COGS
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue({
        id: "b1",
        hargaBeli: { toNumber: () => 5000 },
      });

      // Mock finding complete transaction for response
      (prisma.transaksiKasir.findUnique as jest.Mock).mockResolvedValue({
        id: "trx-1",
        nomorTransaksi: "TRX-MOCK-001",
        total: { toNumber: () => 20000 },
        // ... other fields
      });

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify(validPayload),
        },
      );

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(prisma.barang.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "b1",
            stok: { gte: 2 }, // Atomic check
          },
          data: {
            stok: { decrement: 2 },
          },
        }),
      );
      expect(createJournalEntryForCompleteSale).toHaveBeenCalled();
    });

    test("should fail if stock is insufficient", async () => {
      // Mock failed stock update (count: 0)
      (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Mock finding barang to show current stock
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue({
        id: "b1",
        stok: 1,
        satuan: "pcs",
      });

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify(validPayload),
        },
      );

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Stok");
    });

    test("should create Piutang for credit payments", async () => {
      const creditPayload = {
        ...validPayload,
        metodePembayaran: "kredit",
        namaPelanggan: "John Doe",
      };

      (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.transaksiKasir.create as jest.Mock).mockResolvedValue({
        id: "trx-1",
      });
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue({
        id: "b1",
        hargaBeli: { toNumber: () => 5000 },
      });
      (prisma.transaksiKasir.findUnique as jest.Mock).mockResolvedValue({});

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/transaksi-kasir",
        {
          method: "POST",
          body: JSON.stringify(creditPayload),
        },
      );

      await POST(req);

      expect(prisma.piutang.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transaksiKasirId: "trx-1",
            status: "BELUM_LUNAS",
            totalPiutang: 20000,
          }),
        }),
      );
    });
  });
});
