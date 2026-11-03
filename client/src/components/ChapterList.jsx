export default function ChapterList({ chapters, externalCount, onSelect, currentChapterId }) {
  if (!chapters?.length) {
    return (
      <div className="py-6 text-center">
        <p className="text-zinc-400">No readable chapters on this source.</p>
        {externalCount > 0 && (
          <p className="text-zinc-500 text-sm mt-2">
            {externalCount} chapter{externalCount !== 1 ? 's' : ''} available on external sites only (licensed content).
            Try searching on a different source.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {chapters.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch)}
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
            ch.id === currentChapterId
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'hover:bg-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium">
              Ch. {ch.chapter || '?'}
            </span>
            {ch.title && (
              <span className="text-zinc-500 ml-2 truncate">{ch.title}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 ml-2 shrink-0">
            {ch.scanlator}
          </span>
        </button>
      ))}
    </div>
  );
}
