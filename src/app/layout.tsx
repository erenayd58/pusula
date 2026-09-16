import type { Metadata } from "next";
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
