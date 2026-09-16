import { notFound } from "next/navigation";

/**
 * /dev altındaki her şey sadece geliştirme ortamında açılır. Kontrol layout'ta yapılır;
 * sayfada yapılsaydı loading.tsx yüzünden kabuk 200 ile akmaya başlar, 404 durum kodu kaybolurdu.
 */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return children;
}
