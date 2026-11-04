import { BookmarkIcon, DownloadIcon, CheckCircleIcon, LoaderIcon } from './Icons.jsx';

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
    <div className="flex flex-col gap-0.5">
      {chapters.map(ch => {
        const isBookmarked = bookmarks.some(bookmark => bookmark.chapterId === ch.id);
        const download = downloads[ch.id];
        return (
          <div
            key={ch.id}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
              ch.id === currentChapterId
                ? 'bg-indigo-600/15 text-indigo-300'
                : 'hover:bg-zinc-800/70 text-zinc-300'
            }`}
          >
            <button
              onClick={() => onSelect(ch)}
              className="flex-1 min-w-0 py-0.5 text-left"
            >
              <span className="font-medium">Ch. {ch.chapter || '?'}</span>
              {ch.title && <span className="text-zinc-500 ml-2 truncate">{ch.title}</span>}
            </button>
            <button
              onClick={() => onToggleBookmark(ch)}
              className={`shrink-0 p-1.5 rounded-md transition-colors ${
                isBookmarked ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'
              }`}
              aria-label={`${isBookmarked ? 'Remove bookmark for' : 'Bookmark'} chapter ${ch.chapter || '?'}`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark chapter'}
            >
              <BookmarkIcon className="w-4 h-4" filled={isBookmarked} />
            </button>
            <button
              onClick={() => onDownload(ch)}
              disabled={download?.status === 'downloading' || download?.status === 'downloaded'}
              className="shrink-0 p-1.5 rounded-md text-zinc-600 hover:text-white disabled:hover:text-zinc-600 transition-colors"
              aria-label={download?.status === 'downloaded' ? 'Downloaded' : `Download chapter ${ch.chapter || '?'}`}
              title={download?.status === 'downloaded' ? 'Downloaded for offline reading' : 'Download for offline reading'}
            >
              {download?.status === 'downloading'
                ? <LoaderIcon className="w-4 h-4" />
                : download?.status === 'downloaded'
                  ? <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  : <DownloadIcon className="w-4 h-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
