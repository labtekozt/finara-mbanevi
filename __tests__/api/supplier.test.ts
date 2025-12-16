import { GET, POST } from "@/app/api/supplier/route";
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/supplier/[id]/route";
import { GET as GET_STATS } from "@/app/api/supplier/[id]/stats/route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    hutang: {
      findMany: jest.fn(),
    },
    transaksiMasuk: {
      groupBy: jest.fn(),
    },
  },
}));

describe("/api/supplier", () => {
  const mockSession = {
    user: { id: "user-123", name: "Test User", role: "ADMIN" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      username: "test",
    });
  });

  describe("GET /api/supplier", () => {
    it("should return all suppliers", async () => {
      const mockSuppliers = [
        {
          id: "sup-1",
          kode: "SUP-001",
          nama: "Supplier A",
          alamat: "Jakarta",
          nomorTelepon: "08123456789",
          email: "supplier@test.com",
          namaKontak: "John Doe",
          kategori: "Distributor",
          keterangan: "Test",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            transaksiMasuk: 5,
            hutang: 2,
          },
        },
      ];

      (prisma.supplier.findMany as jest.Mock).mockResolvedValue(mockSuppliers);

      const request = new NextRequest("http://localhost:3000/api/supplier");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].kode).toBe("SUP-001");
      expect(data[0]._count.transaksiMasuk).toBe(5);
    });

    it("should filter suppliers by search term", async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/supplier?search=Test",
      );
      await GET(request);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { nama: { contains: "Test", mode: "insensitive" } },
            { kode: { contains: "Test", mode: "insensitive" } },
            { alamat: { contains: "Test", mode: "insensitive" } },
          ],
        },
        orderBy: { nama: "asc" },
        include: {
          _count: {
            select: {
              transaksiMasuk: true,
              hutang: {
                where: {
                  status: {
                    in: ["BELUM_LUNAS", "JATUH_TEMPO"],
                  },
                },
              },
            },
          },
        },
      });
    });

    it("should filter by isActive status", async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/supplier?isActive=true",
      );
      await GET(request);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
          },
        }),
      );
    });

    it("should return 401 if not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/supplier");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/supplier", () => {
    it("should create a new supplier with generated code", async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
        kode: "SUP-005",
      });

      const mockCreatedSupplier = {
        id: "sup-new",
        kode: "SUP-006",
        nama: "New Supplier",
        alamat: "Jakarta",
        nomorTelepon: "08123456789",
        email: "new@test.com",
        namaKontak: "Jane Doe",
        kategori: "Supplier",
        keterangan: "New",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          transaksiMasuk: 0,
          hutang: 0,
        },
      };

      (prisma.supplier.create as jest.Mock).mockResolvedValue(
        mockCreatedSupplier,
      );

      const request = new NextRequest("http://localhost:3000/api/supplier", {
        method: "POST",
        body: JSON.stringify({
          nama: "New Supplier",
          alamat: "Jakarta",
          nomorTelepon: "08123456789",
          email: "new@test.com",
          namaKontak: "Jane Doe",
          kategori: "Supplier",
          keterangan: "New",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.kode).toBe("SUP-006");
      expect(data.nama).toBe("New Supplier");
      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kode: "SUP-006",
          nama: "New Supplier",
        }),
        include: expect.any(Object),
      });
    });

    it("should generate SUP-001 if no suppliers exist", async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supplier.create as jest.Mock).mockResolvedValue({
        id: "sup-first",
        kode: "SUP-001",
        nama: "First Supplier",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { transaksiMasuk: 0, hutang: 0 },
      });

      const request = new NextRequest("http://localhost:3000/api/supplier", {
        method: "POST",
        body: JSON.stringify({
          nama: "First Supplier",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.kode).toBe("SUP-001");
    });

    it("should return 400 on validation error", async () => {
      const request = new NextRequest("http://localhost:3000/api/supplier", {
        method: "POST",
        body: JSON.stringify({
          nama: "", // Empty name should fail
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/supplier/[id]", () => {
    it("should return supplier with detailed information", async () => {
      const mockSupplier = {
        id: "sup-1",
        kode: "SUP-001",
        nama: "Supplier A",
        alamat: "Jakarta",
        nomorTelepon: "08123456789",
        email: "supplier@test.com",
        namaKontak: "John Doe",
        kategori: "Distributor",
        keterangan: "Test",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        transaksiMasuk: [
          {
            id: "trx-1",
            nomorTransaksi: "TRX-001",
            barang: { id: "brg-1", nama: "Barang 1" },
            lokasi: { id: "lok-1", namaLokasi: "Gudang" },
            tanggal: new Date(),
            qty: 10,
            totalNilai: new Prisma.Decimal(100000),
          },
        ],
        hutang: [
          {
            id: "hut-1",
            sisaHutang: new Prisma.Decimal(50000),
            status: "BELUM_LUNAS",
          },
        ],
        _count: {
          transaksiMasuk: 1,
          hutang: 1,
        },
      };

      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/sup-1",
      );
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: "sup-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.kode).toBe("SUP-001");
      expect(data.totalHutang).toBe(50000);
      expect(data.transaksiMasuk).toHaveLength(1);
    });

    it("should return 404 if supplier not found", async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/invalid",
      );
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: "invalid" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/supplier/[id]", () => {
    it("should update supplier information", async () => {
      const mockUpdatedSupplier = {
        id: "sup-1",
        kode: "SUP-001",
        nama: "Updated Supplier",
        alamat: "Bandung",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          transaksiMasuk: 5,
          hutang: 2,
        },
      };

      (prisma.supplier.update as jest.Mock).mockResolvedValue(
        mockUpdatedSupplier,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/sup-1",
        {
          method: "PUT",
          body: JSON.stringify({
            nama: "Updated Supplier",
            alamat: "Bandung",
          }),
        },
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "sup-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nama).toBe("Updated Supplier");
      expect(data.alamat).toBe("Bandung");
    });
  });

  describe("DELETE /api/supplier/[id]", () => {
    it("should soft delete supplier if has transactions", async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue({
        id: "sup-1",
        _count: {
          transaksiMasuk: 5,
          hutang: 2,
        },
      });

      (prisma.supplier.update as jest.Mock).mockResolvedValue({
        id: "sup-1",
        isActive: false,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/sup-1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "sup-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.softDeleted).toBe(true);
      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: "sup-1" },
        data: { isActive: false },
      });
    });

    it("should hard delete supplier if no transactions", async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue({
        id: "sup-1",
        _count: {
          transaksiMasuk: 0,
          hutang: 0,
        },
      });

      (prisma.supplier.delete as jest.Mock).mockResolvedValue({
        id: "sup-1",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/sup-1",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "sup-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hardDeleted).toBe(true);
      expect(prisma.supplier.delete).toHaveBeenCalledWith({
        where: { id: "sup-1" },
      });
    });
  });

  describe("GET /api/supplier/[id]/stats", () => {
    it("should return supplier statistics", async () => {
      const mockSupplier = {
        id: "sup-1",
        kode: "SUP-001",
        nama: "Supplier A",
        transaksiMasuk: [
          {
            barangId: "brg-1",
            barang: { nama: "Barang 1" },
            qty: 10,
            totalNilai: new Prisma.Decimal(100000),
          },
          {
            barangId: "brg-1",
            barang: { nama: "Barang 1" },
            qty: 5,
            totalNilai: new Prisma.Decimal(50000),
          },
        ],
        hutang: [
          {
            sisaHutang: new Prisma.Decimal(30000),
            status: "BELUM_LUNAS",
          },
        ],
      };

      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);
      (prisma.hutang.findMany as jest.Mock).mockResolvedValue([
        {
          totalHutang: new Prisma.Decimal(50000),
        },
      ]);
      (prisma.transaksiMasuk.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/supplier/sup-1/stats",
      );
      const response = await GET_STATS(request, {
        params: Promise.resolve({ id: "sup-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statistics.totalTransactions).toBe(2);
      expect(data.statistics.totalValue).toBe(150000);
      expect(data.statistics.totalHutang).toBe(50000);
      expect(data.statistics.totalHutangBelumLunas).toBe(30000);
      expect(data.topProducts).toHaveLength(1);
      expect(data.topProducts[0].totalQty).toBe(15);
    });
  });
});
