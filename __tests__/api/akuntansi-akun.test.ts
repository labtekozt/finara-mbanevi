import { GET, POST } from "@/app/api/akuntansi/akun/route";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { mapDisplayCategoryToEnum } from "@/lib/accounting-mappings";

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

jest.mock("@/lib/accounting-mappings", () => ({
  mapDisplayCategoryToEnum: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    akun: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
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

describe("Akuntansi Akun API", () => {
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
    (mapDisplayCategoryToEnum as jest.Mock).mockImplementation((val) => val);
  });

  describe("GET /api/akuntansi/akun", () => {
    it("should list accounts", async () => {
      const mockAkun = [{ id: "acc-1", kode: "1001", nama: "Kas" }];
      (prisma.akun.findMany as jest.Mock).mockResolvedValue(mockAkun);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/akuntansi/akun",
      );

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAkun);
    });

    it("should filter by category", async () => {
      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/akuntansi/akun?kategori=ASSET",
      );

      await GET(req as any);

      expect(prisma.akun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            kategori: "ASSET",
          }),
        }),
      );
    });
  });

  describe("POST /api/akuntansi/akun", () => {
    it("should create account successfully", async () => {
      const accountData = {
        kode: "1001",
        nama: "Kas",
        tipe: "DEBIT",
        kategori: "ASSET",
        deskripsi: "Kas Utama",
      };

      (prisma.akun.findUnique as jest.Mock).mockResolvedValue(null); // No duplicate
      (prisma.akun.create as jest.Mock).mockResolvedValue({
        id: "acc-new",
        ...accountData,
        level: 1,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/akun",
        accountData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.akun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kode: "1001",
          level: 1,
        }),
        include: expect.anything(),
      });
    });

    it("should calculate level from parent", async () => {
      const accountData = {
        kode: "1001.1",
        nama: "Kas Kecil",
        tipe: "DEBIT",
        kategori: "ASSET",
        parentId: "acc-parent",
      };

      (prisma.akun.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // No duplicate
        .mockResolvedValueOnce({ id: "acc-parent", level: 1 }); // Parent found

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/akun",
        accountData,
      );

      await POST(req as any);

      expect(prisma.akun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: 2, // Parent level + 1
        }),
        include: expect.anything(),
      });
    });

    it("should reject duplicate code", async () => {
      const accountData = {
        kode: "1001",
        nama: "Kas",
        tipe: "DEBIT",
        kategori: "ASSET",
      };

      (prisma.akun.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/akun",
        accountData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Account code already exists");
    });
  });
});
