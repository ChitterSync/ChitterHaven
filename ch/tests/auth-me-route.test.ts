import test from "node:test";
import assert from "node:assert/strict";
import handler from "../src/pages/api/auth/me";
import { createSessionPayload, setSessionCookie } from "../src/lib/auth/session";

type MockRes = {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: any;
  getHeader(name: string): string | string[] | undefined;
  setHeader(name: string, value: string | string[]): void;
  status(code: number): MockRes;
  json(payload: any): MockRes;
};

const createRes = (): MockRes => {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    getHeader(name) {
      return this.headers[name];
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

const extractCookieValue = (setCookie: string | string[]) => {
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookie.split(";")[0];
};

test("auth/me returns unauthenticated without a session", async () => {
  const req = { method: "GET", headers: {} };
  const res = createRes();
  await handler(req as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.authenticated, false);
});

test("auth/me returns user from session cookie", async () => {
  const session = createSessionPayload({ id: "u1", username: "neo" });
  const cookieRes = createRes();
  setSessionCookie(cookieRes as any, session);
  const cookieHeader = cookieRes.headers["Set-Cookie"];
  const req = {
    method: "GET",
    headers: { cookie: extractCookieValue(cookieHeader) },
  };
  const res = createRes();
  await handler(req as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.authenticated, true);
  assert.equal(res.body.user.username, "neo");
});
