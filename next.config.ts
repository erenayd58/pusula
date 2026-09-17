import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes kapalı: modül manifestlerindeki href'ler düz string (02-mimari karar #14).
  // Geliştirme göstergesi ve hata bildirimi varsayılan olarak sol altta, öğrenci rayındaki
  // çıkış düğmesinin üstüne biniyor ve e2e tıklamalarını kesiyordu (React dev "performance
  // tracks" uyarısı bildirim açıyor). Sağ altta kalıcı bir düğme yok (karar #26).
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
