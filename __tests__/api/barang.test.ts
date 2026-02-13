import { GET as GET_LIST, POST } from "@/app/api/barang/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/barang/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  createJournalEntryForStockAddition,
  createJournalEntryForStockAdjustment,
} from "@/lib/accounting-utils";

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
    barang: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaksiMasuk: {
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
  createJournalEntryForStockAdjustment: jest.fn(),
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

describe("Barang API", () => {
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
  });

  describe("GET /api/barang", () => {
    it("should list items with filters", async () => {
      const mockItems = [
        { id: "item-1", nama: "Item 1", kategori: "CAT1" },
        { id: "item-2", nama: "Item 2", kategori: "CAT1" },
      ];

      (prisma.barang.findMany as jest.Mock).mockResolvedValue(mockItems);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/barang?kategori=CAT1",
      );

      const response = await GET_LIST(req as any);
      const data = await response.json();

      expect(prisma.barang.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            kategori: "CAT1",
          }),
        }),
      );
      expect(data).toEqual(mockItems);
    });
  });

  describe("POST /api/barang", () => {
    it("should create item and initial stock journal", async () => {
      const newItem = {
        nama: "New Item",
        kategori: "General",
        stok: 10,
        stokMinimum: 5,
        hargaBeli: 5000,
        hargaJual: 10000,
        satuan: "pcs",
        lokasiId: "loc-1",
      };

      (prisma.barang.create as jest.Mock).mockResolvedValue({
        id: "item-new",
        ...newItem,
      });

      (prisma.transaksiMasuk.create as jest.Mock).mockResolvedValue({
        id: "tm-1",
        nomorTransaksi: "MSK-123",
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/barang",
        newItem,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.barang.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newItem,
          sku: expect.any(String),
        }),
        include: { lokasi: true },
      });

      // Verify journal for initial stock
      expect(createJournalEntryForStockAddition).toHaveBeenCalledWith(
        "tm-1",
        50000, // 10 * 5000
        "INTERNAL_ADJUSTMENT",
        mockSession.user.id,
        undefined,
        expect.anything(),
      );
    });

    it("should validate required fields", async () => {
      const invalidItem = {
        nama: "", // Empty name
      };

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/barang",
        invalidItem,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });
  });

  describe("GET /api/barang/[id]", () => {
    it("should return item details", async () => {
      const mockItem = { id: "item-1", nama: "Item 1" };
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockItem);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/barang/item-1",
      );
      const params = Promise.resolve({ id: "item-1" });

      const response = await GET_ONE(req as any, { params });
      const data = await response.json();

      expect(data).toEqual(mockItem);
    });

    it("should return 404 if item not found", async () => {
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/barang/unknown",
      );
      const params = Promise.resolve({ id: "unknown" });

      const response = await GET_ONE(req as any, { params });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/barang/[id]", () => {
    it("should update item and create adjustment journal if stock changes", async () => {
      const currentItem = {
        id: "item-1",
        nama: "Item 1",
        stok: { toNumber: () => 10 },
        hargaBeli: { toNumber: () => 5000 },
        lokasiId: "loc-1",
      };

      const updateData = {
        nama: "Item 1 Updated",
        kategori: "General",
        stok: 15, // Increased by 5
        stokMinimum: 5,
        hargaBeli: 5000,
        hargaJual: 10000,
        satuan: "pcs",
        lokasiId: "loc-1",
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(currentItem);
      (prisma.barang.update as jest.Mock).mockResolvedValue({
        ...currentItem,
        ...updateData,
      });

      const req = new MockNextRequest(
        "PUT",
        "http://localhost:3000/api/barang/item-1",
        updateData,
      );
      const params = Promise.resolve({ id: "item-1" });

      const response = await PUT(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.barang.update).toHaveBeenCalled();

      // Verify stock adjustment journal
      expect(createJournalEntryForStockAdjustment).toHaveBeenCalledWith(
        expect.stringContaining("ADJ-item-1"),
        25000, // 5 * 5000
        true, // isIncrease
        mockSession.user.id,
        expect.anything(),
      );
    });

    it("should not create journal if stock doesn't change", async () => {
      const currentItem = {
        id: "item-1",
        nama: "Item 1",
        stok: { toNumber: () => 10 },
        hargaBeli: { toNumber: () => 5000 },
        lokasiId: "loc-1",
      };

      const updateData = {
        nama: "Item 1 Updated",
        kategori: "General",
        stok: 10, // No change
        stokMinimum: 5,
        hargaBeli: 5000,
        hargaJual: 10000,
        satuan: "pcs",
        lokasiId: "loc-1",
      };

      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(currentItem);
      (prisma.barang.update as jest.Mock).mockResolvedValue({
        ...currentItem,
        ...updateData,
      });

      const req = new MockNextRequest(
        "PUT",
        "http://localhost:3000/api/barang/item-1",
        updateData,
      );
      const params = Promise.resolve({ id: "item-1" });

      await PUT(req as any, { params });

      expect(createJournalEntryForStockAdjustment).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/barang/[id]", () => {
    it("should delete item", async () => {
      const mockItem = { id: "item-1", nama: "Item 1" };
      (prisma.barang.findUnique as jest.Mock).mockResolvedValue(mockItem);

      const req = new MockNextRequest(
        "DELETE",
        "http://localhost:3000/api/barang/item-1",
      );
      const params = Promise.resolve({ id: "item-1" });

      const response = await DELETE(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.barang.delete).toHaveBeenCalledWith({
        where: { id: "item-1" },
      });
    });
  });
});
