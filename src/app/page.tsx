import Link from "next/link";

// Geçici karşılama sayfası; Faz 1'de role göre yönlendirmeye dönecek.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 flex-col items-start justify-center gap-4 px-4 py-12 md:px-8">
      <h1 className="text-display font-semibold tracking-tight lg:text-display-lg">Pusula</h1>
      <p className="max-w-prose text-body text-ink-700">
        LGS çalışma takip ve koçluk platformu. Kurulum tamamlandı; giriş ekranı Faz 1 ile
        gelecek.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <Link href="/dev/design" className="text-body text-ink-700 underline underline-offset-4">
          Tasarım sistemi sayfasını aç
        </Link>
      ) : null}
    </main>
  );
}
