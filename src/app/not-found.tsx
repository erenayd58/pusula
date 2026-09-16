import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 flex-col items-start justify-center gap-4 px-4 py-12 md:px-8">
      <h1 className="text-title font-semibold lg:text-title-lg">Bu sayfa yok</h1>
      <p className="max-w-prose text-body text-ink-700">
        Aradığın sayfa taşınmış ya da hiç olmamış olabilir.
      </p>
      <Link href="/" className="text-body text-ink-700 underline underline-offset-4">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
