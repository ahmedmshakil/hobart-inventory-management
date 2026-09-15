import type { NextConfig } from "next";

/**
 * Set STATIC_EXPORT=true to produce a fully static `out/` folder
 * (handy for Cloudflare Pages / any static host on inventory.shakilahmed.tech).
 * Default build is a normal Next.js server build (Vercel / node).
 */
const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === "true"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  reactStrictMode: true,
};

export default nextConfig;
