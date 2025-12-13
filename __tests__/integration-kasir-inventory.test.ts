import { POST as createTransaksiMasuk } from "@/app/api/transaksi-masuk/route";
import { POST as createTransaksiKasir } from "@/app/api/transaksi-kasir/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import logger from "@/lib/logger";

// Mock dependencies
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    barang: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaksiMasuk: {
      create: jest.fn(),
    },
    transaksi: {
      create: jest.fn(),
    },
    transaksiKasir: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    itemTransaksi: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    jurnalEntry: {
      create: jest.fn(),
    },
    periodeAkuntansi: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    akun: {
      findFirst: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    hutang: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));

  return { prisma: mockPrisma };
});

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(() =>
    Promise.resolve({
      user: { id: "user-123", name: "Test User", role: "ADMIN" },
    }),
  ),
}));

jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("@/lib/transaction-number", () => ({
  generateMasukNumber: jest.fn(() => "IN-001"),
  generateKasirNumber: jest.fn(() => "TRX-001"),
  generateTransactionNumber: jest.fn(() => "JR-001"),
}));

describe("E2E Integration: Kasir & Inventory with Accounting Cycle", () => {
  const mockUserId = "user-123";
  const mockPeriod = {
    id: "period-1",
    nama: "Periode 2025",
    tanggalMulai: new Date("2025-01-01"),
    tanggalAkhir: new Date("2025-12-31"),
    isActive: true,
    isClosed: false,
  };

  const mockBarang = {
    id: "barang-1",
    nama: "Item A",
    stok: 100,
    hargaBeli: { toNumber: () => 5000 },
    hargaJual: { toNumber: () => 10000 },
    kode: "ITEM-A",
  };

  const mockAccount = (code: string, type: string) => ({
    id: `acc-${code}`,
    kode: code,
    nama: `Account ${code}`,
    tipe: type,
    isActive: true,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(
      mockPeriod,
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: mockUserId,
      username: "testuser",
      role: "ADMIN",
    });
    (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockBarang);
    (prisma.transaksiKasir.findUnique as jest.Mock).mockResolvedValue({
      id: "trx-123",
      nomorTransaksi: "TRX-001",
      total: { toNumber: () => 20000 },
      items: [],
    });

    // Mock Account finding
    (prisma.akun.findFirst as jest.Mock).mockImplementation(({ where }) => {
      if (where.kode) return Promise.resolve(mockAccount(where.kode, "ASSET"));
      return Promise.resolve(mockAccount("0000", "ASSET"));
    });

    // Mock Creations to return input data
    (prisma.transaksiMasuk.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: "tm-1",
        barang: { ...mockBarang, satuan: "pcs" }, // Add mock barang
        lokasi: { id: "loc-1", nama: "Gudang Utama" }, // Add mock lokasi
      }),
    );
    (prisma.transaksiKasir.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: "tx-kasir-1" }),
    );
    (prisma.jurnalEntry.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: "jr-1" }),
    );

    // Mock updateMany for stock check
    (prisma.barang.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  describe("Scenario 1: Procurement (Inventory In) -> Accounting", () => {
    test("Should increase stock and create Purchase Journal Entry", async () => {
      const body = {
        barangId: "barang-1",
        qty: 50,
        hargaBeli: 6000,
        sumber: "Supplier ABC",
        lokasiId: "loc-1",
        reason: "PURCHASE",
        paymentMethod: "CASH",
        keterangan: "Restock",
      };

      const req = {
        nextUrl: new URL("http://localhost/api/transaksi-masuk"),
        json: async () => body,
      } as unknown as NextRequest;

      const res = await createTransaksiMasuk(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.id).toBeDefined();

      // 1. Verify Stock Update
      expect(prisma.barang.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "barang-1" },
          data: { stok: { increment: 50 }, hargaBeli: 6000 },
        }),
      );

      // 2. Verify Transaction Record
      expect(prisma.transaksiMasuk.create).toHaveBeenCalled();

      // 3. Verify Accounting Integration (Purchase Journal)
      // Expect Debit Inventory (1201) and Credit Cash (1001)
      // Amount = 50 * 6000 = 300,000
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipeReferensi: "PURCHASE",
            details: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  debit: 300000,
                  kredit: 0,
                  // Should map to Inventory Account
                }),
                expect.objectContaining({
                  debit: 0,
                  kredit: 300000,
                  // Should map to Cash Account
                }),
              ]),
            },
          }),
        }),
      );
    });
  });

  describe("Scenario 2: Sales (Kasir) -> Accounting", () => {
    test("Should decrease stock, create Transaction, and create Sales + COGS Journals", async () => {
      const body = {
        items: [
          {
            barangId: "barang-1",
            namaBarang: "Item A",
            hargaSatuan: 10000,
            qty: 2,
            subtotal: 20000,
          },
        ],
        subtotal: 20000,
        pajak: 0,
        diskon: 0,
        total: 20000,
        metodePembayaran: "tunai",
        jumlahBayar: 50000,
        kembalian: 30000,
      };

      const req = {
        nextUrl: new URL("http://localhost/api/transaksi-kasir"),
        json: async () => body,
      } as unknown as NextRequest;

      const res = await createTransaksiKasir(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.id).toBeDefined();

      // 1. Verify Stock Update (Decrement)
      expect(prisma.barang.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "barang-1",
            stok: { gte: 2 },
          },
          data: { stok: { decrement: 2 } },
        }),
      );

      // 2. Verify Transaction Record
      expect(prisma.transaksiKasir.create).toHaveBeenCalled();

      // 3. Verify Accounting Integration (Sales Journal)
      // Revenue = 20,000
      // COGS = 2 * 5000 (mockBarang.hargaBeli) = 10,000
      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipeReferensi: "SALE",
            details: {
              create: expect.arrayContaining([
                // Cash vs Revenue
                expect.objectContaining({ debit: 20000, kredit: 0 }), // Cash
                expect.objectContaining({ debit: 0, kredit: 20000 }), // Revenue

                // COGS vs Inventory
                expect.objectContaining({ debit: 10000, kredit: 0 }), // COGS
                expect.objectContaining({ debit: 0, kredit: 10000 }), // Inventory
              ]),
            },
          }),
        }),
      );
    });
  });
});
