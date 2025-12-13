import { GET, POST, DELETE } from "@/app/api/akuntansi/saldo-awal/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    saldoAwal: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    periodeAkuntansi: {
      findUnique: jest.fn(),
    },
    akun: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

// Mock Request
class MockNextRequest {
  url: string;
  method: string;
  body: any;

  constructor(url: string, method: string = "GET", body: any = null) {
    this.url = url;
    this.method = method;
    this.body = body;
  }

  async json() {
    return this.body;
  }
}

describe("API Akuntansi Saldo Awal", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      true,
    );
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
      );
      const res = await GET(req as any);
      expect(res.status).toBe(401);
    });

    it("should return 400 if periodeId is missing", async () => {
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
      );
      const res = await GET(req as any);
      expect(res.status).toBe(400);
    });

    it("should return opening balances", async () => {
      (prisma.saldoAwal.findMany as jest.Mock).mockResolvedValue([]);
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal?periodeId=p1",
      );
      const res = await GET(req as any);
      expect(res.status).toBe(200);
      expect(prisma.saldoAwal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { periodeId: "p1" },
        }),
      );
    });
  });

  describe("POST", () => {
    const validBody = {
      periodeId: "p1",
      akunId: "acc1",
      saldo: 1000,
    };

    it("should return 400 if fields are missing", async () => {
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "POST",
        {},
      );
      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });

    it("should return 404 if period not found", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(null);
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "POST",
        validBody,
      );
      const res = await POST(req as any);
      expect(res.status).toBe(404);
    });

    it("should return 400 if period is closed", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        isClosed: true,
      });
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "POST",
        validBody,
      );
      const res = await POST(req as any);
      expect(res.status).toBe(400);
    });

    it("should return 404 if account not found", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        isClosed: false,
      });
      (prisma.akun.findUnique as jest.Mock).mockResolvedValue(null);
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "POST",
        validBody,
      );
      const res = await POST(req as any);
      expect(res.status).toBe(404);
    });

    it("should upsert opening balance", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        isClosed: false,
      });
      (prisma.akun.findUnique as jest.Mock).mockResolvedValue({ id: "acc1" });
      (prisma.saldoAwal.upsert as jest.Mock).mockResolvedValue({
        id: "sa1",
        ...validBody,
      });

      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "POST",
        validBody,
      );
      const res = await POST(req as any);
      expect(res.status).toBe(200);
      expect(prisma.saldoAwal.upsert).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should return 400 if fields are missing", async () => {
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal",
        "DELETE",
      );
      const res = await DELETE(req as any);
      expect(res.status).toBe(400);
    });

    it("should return 400 if period is closed", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        isClosed: true,
      });
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal?periodeId=p1&akunId=acc1",
        "DELETE",
      );
      const res = await DELETE(req as any);
      expect(res.status).toBe(400);
    });

    it("should delete opening balance", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        isClosed: false,
      });
      const req = new MockNextRequest(
        "http://localhost:3000/api/akuntansi/saldo-awal?periodeId=p1&akunId=acc1",
        "DELETE",
      );
      const res = await DELETE(req as any);
      expect(res.status).toBe(200);
      expect(prisma.saldoAwal.delete).toHaveBeenCalled();
    });
  });
});
