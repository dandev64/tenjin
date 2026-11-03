export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="aspect-[3/4] rounded-lg bg-zinc-800" />
      <div className="h-4 bg-zinc-800 rounded w-3/4" />
    </div>
  );
}

export function CardGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse flex flex-col md:flex-row gap-6">
      <div className="w-48 aspect-[3/4] bg-zinc-800 rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col gap-3">
        <div className="h-8 bg-zinc-800 rounded w-2/3" />
        <div className="h-4 bg-zinc-800 rounded w-1/3" />
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-5/6" />
      </div>
    </div>
  );
}
