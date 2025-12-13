import { POST } from "@/app/api/hutang/[id]/bayar/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForDebtPayment } from "@/lib/accounting-utils";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    hutang: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pembayaranHutang: {
      create: jest.fn(),
    },
  };

  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));

  return { prisma: mockPrisma };
});

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForDebtPayment: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock NextRequest/NextResponse
class MockNextRequest {
  method: string;
  url: string;
  body: any;

  constructor(method: string, url: string, body: any = {}) {
    this.method = method;
    this.url = url;
    this.body = body;
  }

  async json() {
    return this.body;
  }
}

describe("Hutang Payment API", () => {
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
      username: "admin",
      role: "ADMIN",
    });
  });

  it("should process payment successfully", async () => {
    const hutangId = "hutang-123";
    const mockHutang = {
      id: hutangId,
      totalHutang: 1000000,
      totalBayar: 0,
      sisaHutang: 1000000,
      status: "BELUM_LUNAS",
    };

    const paymentData = {
      jumlahBayar: 500000,
      metodePembayaran: "tunai",
      catatan: "Cicilan pertama",
    };

    (prisma.hutang.findUnique as jest.Mock).mockResolvedValue(mockHutang);
    (prisma.pembayaranHutang.create as jest.Mock).mockResolvedValue({
      id: "pay-1",
      ...paymentData,
    });
    (prisma.hutang.update as jest.Mock).mockResolvedValue({
      ...mockHutang,
      totalBayar: 500000,
      sisaHutang: 500000,
    });

    const req = new MockNextRequest(
      "POST",
      `http://localhost:3000/api/hutang/${hutangId}/bayar`,
      paymentData,
    );

    const params = Promise.resolve({ id: hutangId });
    const response = await POST(req as any, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.hutang.findUnique).toHaveBeenCalledWith({
      where: { id: hutangId },
    });
    expect(prisma.pembayaranHutang.create).toHaveBeenCalledWith({
      data: {
        hutangId: hutangId,
        jumlahBayar: paymentData.jumlahBayar,
        metodePembayaran: paymentData.metodePembayaran,
        catatan: paymentData.catatan,
      },
    });
    expect(prisma.hutang.update).toHaveBeenCalledWith({
      where: { id: hutangId },
      data: {
        totalBayar: 500000,
        sisaHutang: 500000,
        status: "BELUM_LUNAS",
      },
    });
    expect(createJournalEntryForDebtPayment).toHaveBeenCalledWith(
      hutangId,
      paymentData.jumlahBayar,
      mockSession.user.id,
      paymentData.metodePembayaran,
      expect.anything(),
    );
  });

  it("should update status to LUNAS when fully paid", async () => {
    const hutangId = "hutang-123";
    const mockHutang = {
      id: hutangId,
      totalHutang: 1000000,
      totalBayar: 500000,
      sisaHutang: 500000,
      status: "BELUM_LUNAS",
    };

    const paymentData = {
      jumlahBayar: 500000,
      metodePembayaran: "transfer",
    };

    (prisma.hutang.findUnique as jest.Mock).mockResolvedValue(mockHutang);
    (prisma.hutang.update as jest.Mock).mockResolvedValue({
      ...mockHutang,
      totalBayar: 1000000,
      sisaHutang: 0,
      status: "LUNAS",
    });

    const req = new MockNextRequest(
      "POST",
      `http://localhost:3000/api/hutang/${hutangId}/bayar`,
      paymentData,
    );

    const params = Promise.resolve({ id: hutangId });
    const response = await POST(req as any, { params });

    expect(response.status).toBe(200);
    expect(prisma.hutang.update).toHaveBeenCalledWith({
      where: { id: hutangId },
      data: {
        totalBayar: 1000000,
        sisaHutang: 0,
        status: "LUNAS",
      },
    });
  });

  it("should reject payment exceeding remaining debt", async () => {
    const hutangId = "hutang-123";
    const mockHutang = {
      id: hutangId,
      totalHutang: 1000000,
      totalBayar: 0,
      sisaHutang: 1000000,
      status: "BELUM_LUNAS",
    };

    const paymentData = {
      jumlahBayar: 1500000, // Exceeds debt
    };

    (prisma.hutang.findUnique as jest.Mock).mockResolvedValue(mockHutang);

    const req = new MockNextRequest(
      "POST",
      `http://localhost:3000/api/hutang/${hutangId}/bayar`,
      paymentData,
    );

    const params = Promise.resolve({ id: hutangId });
    const response = await POST(req as any, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Jumlah bayar melebihi sisa hutang");
    expect(prisma.pembayaranHutang.create).not.toHaveBeenCalled();
  });

  it("should reject invalid payment amount", async () => {
    const hutangId = "hutang-123";
    const paymentData = {
      jumlahBayar: -50000,
    };

    const req = new MockNextRequest(
      "POST",
      `http://localhost:3000/api/hutang/${hutangId}/bayar`,
      paymentData,
    );

    const params = Promise.resolve({ id: hutangId });
    const response = await POST(req as any, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Jumlah bayar harus lebih dari 0");
  });

  it("should return 404 if hutang not found", async () => {
    const hutangId = "non-existent";
    const paymentData = {
      jumlahBayar: 100000,
    };

    (prisma.hutang.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new MockNextRequest(
      "POST",
      `http://localhost:3000/api/hutang/${hutangId}/bayar`,
      paymentData,
    );

    const params = Promise.resolve({ id: hutangId });
    const response = await POST(req as any, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Hutang tidak ditemukan");
  });

  it("should return 401 if not authenticated", async () => {
    (require("next-auth").getServerSession as jest.Mock).mockResolvedValue(
      null,
    );

    const req = new MockNextRequest(
      "POST",
      "http://localhost:3000/api/hutang/123/bayar",
      {},
    );

    const params = Promise.resolve({ id: "123" });
    const response = await POST(req as any, { params });

    expect(response.status).toBe(401);
  });
});
