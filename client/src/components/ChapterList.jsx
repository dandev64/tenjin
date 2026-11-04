export default function ChapterList({
  chapters,
  externalCount,
  onSelect,
  currentChapterId,
  bookmarks = [],
  downloads = {},
  onToggleBookmark,
  onDownload,
}) {
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
      {chapters.map(ch => {
        const isBookmarked = bookmarks.some(bookmark => bookmark.chapterId === ch.id);
        const download = downloads[ch.id];
        return (
          <div
            key={ch.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              ch.id === currentChapterId
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <button
              onClick={() => onSelect(ch)}
              className="flex-1 min-w-0 py-1 text-left"
            >
              <span className="font-medium">Ch. {ch.chapter || '?'}</span>
              {ch.title && <span className="text-zinc-500 ml-2 truncate">{ch.title}</span>}
              {isBookmarked && <span className="text-amber-400 ml-2" aria-label="Bookmarked">★</span>}
            </button>
            <button
              onClick={() => onToggleBookmark(ch)}
              className={`shrink-0 rounded px-2 py-1 text-xs ${
                isBookmarked ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
              }`}
              aria-label={`${isBookmarked ? 'Remove bookmark for' : 'Bookmark'} chapter ${ch.chapter || '?'}`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark chapter'}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
            <button
              onClick={() => onDownload(ch)}
              disabled={download?.status === 'downloading' || download?.status === 'downloaded'}
              className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
              aria-label={download?.status === 'downloaded' ? 'Downloaded' : `Download chapter ${ch.chapter || '?'}`}
              title={download?.status === 'downloaded' ? 'Downloaded for offline reading' : 'Download for offline reading'}
            >
              {download?.status === 'downloading'
                ? `${download.done}/${download.total}`
                : download?.status === 'downloaded' ? 'Saved' : '↓'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
