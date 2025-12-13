import { POST, GET } from "@/app/api/pengeluaran/route";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForExpense } from "@/lib/accounting-utils";
import { hasPermission } from "@/lib/permissions";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    pengeluaran: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForExpense: jest.fn(),
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

  constructor(method: string, url: string, body: any = {}) {
    this.method = method;
    this.url = url;
    this.body = body;
  }

  async json() {
    return this.body;
  }
}

describe("Pengeluaran API", () => {
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
    (hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("POST /api/pengeluaran", () => {
    it("should create expense successfully", async () => {
      const expenseData = {
        tanggal: "2023-10-27T00:00:00.000Z",
        kategori: "OPERASIONAL",
        deskripsi: "Beli ATK",
        jumlah: 50000,
        penerima: "Toko Buku",
        metodePembayaran: "tunai",
        catatan: "Nota terlampir",
      };

      (prisma.pengeluaran.create as jest.Mock).mockResolvedValue({
        id: "exp-1",
        ...expenseData,
        userId: mockSession.user.id,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/pengeluaran",
        expenseData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(prisma.pengeluaran.create).toHaveBeenCalledWith({
        data: {
          tanggal: new Date(expenseData.tanggal),
          kategori: expenseData.kategori,
          deskripsi: expenseData.deskripsi,
          jumlah: expenseData.jumlah,
          penerima: expenseData.penerima,
          metodePembayaran: expenseData.metodePembayaran,
          catatan: expenseData.catatan,
          userId: mockSession.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              username: true,
            },
          },
        },
      });

      expect(createJournalEntryForExpense).toHaveBeenCalledWith(
        expect.anything(), // transaction client
        expect.objectContaining({
          id: "exp-1",
          jumlah: expenseData.jumlah,
          kategori: expenseData.kategori,
          deskripsi: expenseData.deskripsi,
        }),
        mockSession.user.id,
      );
    });

    it("should return 400 if required fields are missing", async () => {
      const expenseData = {
        // Missing fields
        jumlah: 50000,
      };

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/pengeluaran",
        expenseData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      expect(prisma.pengeluaran.create).not.toHaveBeenCalled();
    });

    it("should return 403 if user has no permission", async () => {
      (hasPermission as jest.Mock).mockReturnValue(false);

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/pengeluaran",
        {},
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("GET /api/pengeluaran", () => {
    it("should list expenses with filters", async () => {
      const mockExpenses = [
        { id: "exp-1", deskripsi: "Expense 1", jumlah: 100000 },
        { id: "exp-2", deskripsi: "Expense 2", jumlah: 200000 },
      ];

      (prisma.pengeluaran.findMany as jest.Mock).mockResolvedValue(
        mockExpenses,
      );

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/pengeluaran?startDate=2023-01-01&endDate=2023-01-31&kategori=OPERASIONAL",
      );

      const response = await GET(req as any);
      const data = await response.json();

      expect(prisma.pengeluaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tanggal: {
              gte: new Date("2023-01-01"),
              lte: new Date("2023-01-31"),
            },
            kategori: "OPERASIONAL",
          }),
        }),
      );
      expect(data).toEqual(mockExpenses);
    });

    it("should return 403 if user has no permission", async () => {
      (hasPermission as jest.Mock).mockReturnValue(false);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/pengeluaran",
      );

      const response = await GET(req as any);

      expect(response.status).toBe(403);
    });
  });
});
