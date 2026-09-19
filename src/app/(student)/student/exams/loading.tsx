export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 rounded-md bg-bg-sunken" />
      <div className="mt-3 h-8 w-64 rounded-md bg-bg-sunken" />
      <div className="mt-6 h-5 w-96 max-w-full rounded-md bg-bg-sunken" />
    </div>
  );
}
