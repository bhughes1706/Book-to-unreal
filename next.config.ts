import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep local-development assets separate from production builds. Running
  // `pnpm build` while the editor is open must not invalidate its CSS bundle.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
