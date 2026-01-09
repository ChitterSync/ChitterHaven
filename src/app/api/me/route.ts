import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface R2Bucket {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ objects: { key: string }[] }>;
}

function getR2(): R2Bucket {
  const envUnknown = globalThis as unknown as { env?: { r7105_cs?: R2Bucket } };
  if (envUnknown.env && envUnknown.env.r7105_cs) {
    return envUnknown.env.r7105_cs;
  }
  const globalWithMock = globalThis as unknown as { _mockR2Store?: Record<string, string> };
  if (!globalWithMock._mockR2Store) {
    globalWithMock._mockR2Store = {};
  }
  const store = globalWithMock._mockR2Store;
  return {
    async get(key: string) {
      if (store[key] !== undefined) {
        return {
          async text() {
            return store[key];
          },
        };
      }
      return null;
    },
    async put(key: string, value: string) {
      store[key] = value;
    },
    async delete(key: string) {
      delete store[key];
    },
    async list(options?: { prefix?: string }) {
      const prefix = options?.prefix || "";
      return {
        objects: Object.keys(store)
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key })),
      };
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("cs_auth_session");
    const sessionId = cookie?.value;
    if (!sessionId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const r2 = getR2();
    const sessionObj = await r2.get(`session:${sessionId}`);
    if (!sessionObj) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const session = JSON.parse(await sessionObj.text()) as { userId: string };
    if (!session.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userObj = await r2.get(`user:${session.userId}`);
    if (!userObj) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const user = JSON.parse(await userObj.text());
    delete user.password;
    delete user.passwordHash;
    delete user.passwordSalt;

    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

