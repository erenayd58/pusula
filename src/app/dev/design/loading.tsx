export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[var(--content-max)] animate-pulse px-4 pt-12 md:px-8">
      <div className="h-11 w-80 rounded-md bg-bg-sunken" />
      <div className="mt-4 h-5 w-96 rounded-md bg-bg-sunken" />
      <div className="mt-16 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-bg-sunken" />
        ))}
      </div>
    </main>
  );
}
