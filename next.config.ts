import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes kapalı: modül manifestlerindeki href'ler düz string (02-mimari karar #14).
};

export default nextConfig;
