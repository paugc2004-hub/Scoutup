import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Next.js injecta scripts inline per a l'hidratació: sense nonces
 * cal 'unsafe-inline' a script-src (compromís acceptat per a la demo; vegeu docs/SECURITY.md).
 * En desenvolupament, React necessita 'unsafe-eval' per als missatges d'error.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // La carpeta pare pot tenir un altre package-lock.json: fixem l'arrel al projecte.
  outputFileTracingRoot: process.cwd(),
  // node:sqlite és un mòdul natiu de Node (>= 22.13): no s'ha d'empaquetar.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(Array.isArray(config.externals) ? config.externals : []), { "node:sqlite": "commonjs node:sqlite" }];
    }
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // noms antics de les seccions (enllaços desats)
      { source: "/club/ofertes", destination: "/club/oportunitats", permanent: true },
      { source: "/club/ofertes/:path*", destination: "/club/oportunitats/:path*", permanent: true },
      { source: "/club/scouting", destination: "/club/avaluacions", permanent: true },
    ];
  },
};

export default nextConfig;
