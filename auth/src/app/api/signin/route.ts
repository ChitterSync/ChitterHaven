import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

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
      const prefix = options?.prefix || '';
      return {
        objects: Object.keys(store)
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key })),
      };
    },
  };
}

function setCookie(
  res: NextResponse,
  name: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  // Reasonable defaults for a cross-app auth cookie
  cookie += '; SameSite=Lax';
  if (process.env.NODE_ENV === 'production') {
    cookie += '; Secure';
  }
  res.headers.append('Set-Cookie', cookie);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loginId, password } = body || {};
    if (!loginId || !password) {
      return NextResponse.json({ error: 'Missing loginId or password.' }, { status: 400 });
    }

    const r2 = getR2();
    const loginIdKey = `loginId:${loginId}`;
    const loginIdObj = await r2.get(loginIdKey);
    const userId = loginIdObj ? await loginIdObj.text() : null;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const userObj = await r2.get(`user:${userId}`);
    if (!userObj) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    const user = JSON.parse(await userObj.text());

    // NOTE: password is assumed to be encrypted client-side already.
    // Here we just do a raw equality check.
    if (!user.password || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const sessionId = uuidv4();
    const session = {
      sessionId,
      userId,
      createdAt: new Date().toISOString(),
    };
    await r2.put(`session:${sessionId}`, JSON.stringify(session));

    const res = NextResponse.json(
      {
        user: {
          userId: user.userId,
          username: user.username,
          loginId: user.loginId,
          email: user.email,
          phone: user.phone,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
      { status: 200 },
    );

    setCookie(res, 'cs_auth_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

