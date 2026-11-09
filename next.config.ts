import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.15", "192.168.100.146"],
  reactCompiler: true
};

export default nextConfig;
