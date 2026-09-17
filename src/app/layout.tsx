import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pusula",
    template: "%s · Pusula",
  },
  description: "LGS çalışma takip ve koçluk platformu",
};

// Sanal klavye açılınca yerleşim alanı küçülsün: alt panelde yapışık "Kaydet" klavyenin
// üstünde kalır (Android Chrome; iOS yalnızca görsel alanı küçültür).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// Kök layout data-surface koymaz; her rolün layout'u SurfaceRoot ile sarar.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${lexend.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
