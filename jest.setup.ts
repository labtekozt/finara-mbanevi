import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

Object.assign(global, { TextDecoder, TextEncoder });

// Polyfill Request/Response for Next.js API routes
if (typeof global.Request === "undefined") {
  // @ts-ignore
  global.Request = class Request {
    constructor(input: any, init: any) {
      this.url = input;
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
    url: string;
    method: string;
    headers: Headers;
    body: any;
    async json() {
      return JSON.parse(this.body);
    }
  };
}

if (typeof global.Response === "undefined") {
  // @ts-ignore
  global.Response = class Response {
    constructor(body: any, init: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }
    body: any;
    status: number;
    headers: Headers;
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    static json(data: any, init?: any) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          ...init?.headers,
          "content-type": "application/json",
        },
      });
    }
  };
}

if (typeof global.Headers === "undefined") {
  // @ts-ignore
  global.Headers = class Headers {
    private map = new Map<string, string>();
    constructor(init?: any) {
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.map.set(key, value as string);
        });
      }
    }
    get(key: string) {
      return this.map.get(key) || null;
    }
    set(key: string, value: string) {
      this.map.set(key, value);
    }
  };
}

// Polyfill setImmediate for Prisma/Jest compatibility
if (typeof setImmediate === "undefined") {
  (global as any).setImmediate = (callback: (...args: any[]) => void) =>
    setTimeout(callback, 0);
}

// Mock Prisma client
jest.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    financialAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    periodeAkuntansi: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    akun: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    jurnalEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    jurnalDetail: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((arg) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === "function") {
        return arg(mockPrisma);
      }
      return Promise.resolve(arg);
    }),
  };
  return { prisma: mockPrisma };
});

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Global test setup
beforeAll(() => {
  // Setup global test environment
});

afterAll(() => {
  // Cleanup after all tests
});
