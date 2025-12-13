import { GET, POST } from "@/app/api/lokasi/route";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    lokasi: {
      findMany: jest.fn(),
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

describe("Lokasi API", () => {
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
  });

  describe("GET /api/lokasi", () => {
    it("should list locations", async () => {
      const mockLokasi = [
        { id: "loc-1", namaLokasi: "Gudang Utama" },
        { id: "loc-2", namaLokasi: "Toko Cabang" },
      ];

      (prisma.lokasi.findMany as jest.Mock).mockResolvedValue(mockLokasi);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/lokasi",
      );

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockLokasi);
    });
  });

  describe("POST /api/lokasi", () => {
    it("should create location successfully", async () => {
      const lokasiData = {
        namaLokasi: "Gudang Baru",
        alamat: "Jl. Test No. 1",
      };

      (prisma.lokasi.create as jest.Mock).mockResolvedValue({
        id: "loc-new",
        ...lokasiData,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/lokasi",
        lokasiData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.lokasi.create).toHaveBeenCalledWith({
        data: lokasiData,
      });
    });

    it("should validate required fields", async () => {
      const invalidData = {
        alamat: "Jl. Test No. 1",
        // Missing namaLokasi
      };

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/lokasi",
        invalidData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Nama lokasi harus diisi");
    });
  });
});
