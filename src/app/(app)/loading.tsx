// Skeleton while a dashboard or document loads (cold serverless start included).
export default function Loading() {
  return (
    <main aria-busy className="mx-auto w-full max-w-[880px] px-4 pt-12 sm:px-6">
      <div className="h-7 w-48 animate-pulse rounded bg-panel" />
      <div className="mt-8 flex flex-col gap-4">
        {[70, 55, 62].map((w) => (
          <div key={w} className="h-12 animate-pulse rounded bg-panel" style={{ width: `${w}%` }} />
        ))}
      </div>
    </main>
  );
}
