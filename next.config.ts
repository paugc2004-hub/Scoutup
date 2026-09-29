import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite és un mòdul natiu de Node (>= 22.13): no s'ha d'empaquetar.
  serverExternalPackages: [],
  devIndicators: false,
  // La carpeta pare també té un package-lock.json: fixem l'arrel al projecte de la demo.
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(Array.isArray(config.externals) ? config.externals : []), { "node:sqlite": "commonjs node:sqlite" }];
    }
    return config;
  },
};

export default nextConfig;
