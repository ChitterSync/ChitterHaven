import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const scriptSourcePolicy = process.env.NODE_ENV === "production" ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src ${scriptSourcePolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` },
      ],
    }];
  },
};

export default nextConfig;
