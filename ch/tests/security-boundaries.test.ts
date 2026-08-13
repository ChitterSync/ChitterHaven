import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import uploadHandler from "../src/pages/api/upload";
import { proxy } from "../src/proxy";

const createRes = () => ({
  statusCode: 200,
  body: null as any,
  headers: {} as Record<string, unknown>,
  setHeader(name: string, value: unknown) { this.headers[name] = value; },
  status(code: number) { this.statusCode = code; return this; },
  json(body: any) { this.body = body; return this; },
  end(body?: any) { this.body = body; return this; },
});

test("upload rejects unauthenticated requests", async () => {
  const req = { method: "POST", headers: {}, body: { name: "x.txt", type: "text/plain", data: "eA==" }, socket: {} };
  const res = createRes();
  await uploadHandler(req as any, res as any);
  assert.equal(res.statusCode, 401);
});

test("proxy blocks cross-origin API mutations", () => {
  const request = new NextRequest("https://chat.example/api/settings", {
    method: "POST",
    headers: { host: "chat.example", origin: "https://evil.example" },
  });
  const response = proxy(request);
  assert.equal(response.status, 403);
});

test("proxy allows same-origin API mutations", () => {
  const request = new NextRequest("https://chat.example/api/settings", {
    method: "POST",
    headers: { host: "chat.example", origin: "https://chat.example" },
  });
  const response = proxy(request);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});
