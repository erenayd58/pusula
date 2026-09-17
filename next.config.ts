import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes kapalı: modül manifestlerindeki href'ler düz string (02-mimari karar #14).
  // Geliştirme rozeti kapalı (karar #26): her köşede bir kabuğun dokunma hedefi var (sol alt:
  // öğrenci rayı çıkışı, sağ alt: alt menü "Ben", sağ üst: veli çıkışı, sol üst: koç menüsü) ve
  // rozet e2e tıklamalarını kesiyordu. Derleme/çalışma hataları yine tam ekran katmanla gösterilir.
  devIndicators: false,
};

export default nextConfig;
