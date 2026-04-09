import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["postgres", "drizzle-orm"],
};

export default nextConfig;
