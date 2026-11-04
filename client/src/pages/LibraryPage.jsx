import { useState, useEffect, useMemo } from 'react';
import db from '../db.js';
import LibraryGrid from '../components/LibraryGrid.jsx';
import { getBookmarks, getDownloadedChapters, removeDownloadedChapter } from '../lib/chapterLibrary.js';
import { checkLibraryUpdates } from '../lib/libraryUpdates.js';
import { ChevronRightIcon, XIcon, BookmarkIcon, DownloadIcon, LoaderIcon } from '../components/Icons.jsx';

function groupByManga(chapters) {
  const map = new Map();
  for (const ch of chapters) {
    if (!map.has(ch.mangaId)) {
      map.set(ch.mangaId, { mangaId: ch.mangaId, mangaTitle: ch.mangaTitle, chapters: [] });
    }
    map.get(ch.mangaId).chapters.push(ch);
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.chapters.sort((a, b) => (parseFloat(a.chapterNum) || 0) - (parseFloat(b.chapterNum) || 0));
  }
  return groups;
}

function MangaGroup({ group, open, onToggle, onChapterClick, renderActions }) {
  return (
    <div className="rounded-xl bg-zinc-900/80 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium">{group.mangaTitle}</span>
          <span className="text-xs text-zinc-500">
            {group.chapters.length} chapter{group.chapters.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronRightIcon className={`w-4 h-4 text-zinc-500 ml-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-zinc-800 flex flex-col">
          {group.chapters.map(ch => (
            <div
              key={ch.chapterId}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
            >
              <button
                onClick={() => onChapterClick(ch)}
                className="min-w-0 flex-1 text-left text-sm hover:text-indigo-300 transition-colors"
              >
                <span className="font-medium">Ch. {ch.chapterNum || '?'}</span>
                {ch.chapterTitle && !ch.chapterTitle.startsWith('Chapter') && (
                  <span className="text-zinc-500 ml-2">{ch.chapterTitle}</span>
                )}
              </button>
              {renderActions?.(ch)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage({ source, navigate }) {
  const [manga, setManga] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedBookmarks, setExpandedBookmarks] = useState(new Set());
  const [expandedDownloads, setExpandedDownloads] = useState(new Set());
  const [updates, setUpdates] = useState({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    Promise.all([
      db.library.where('source').equals(source).reverse().sortBy('updatedAt'),
      getBookmarks(source),
      getDownloadedChapters(source),
    ])
      .then(([savedManga, savedBookmarks, savedDownloads]) => {
        setManga(savedManga);
        setBookmarks(savedBookmarks);
        setDownloads(savedDownloads);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [source]);

  useEffect(() => {
    if (loading || !manga.length) return;
    setChecking(true);
    checkLibraryUpdates(source)
      .then(setUpdates)
      .finally(() => setChecking(false));
  }, [source, loading, manga.length]);

  const bookmarkGroups = useMemo(() => groupByManga(bookmarks), [bookmarks]);
  const downloadGroups = useMemo(() => groupByManga(downloads), [downloads]);

  function handleMangaClick(m) {
    navigate(`#/manga/${source}/${encodeURIComponent(m.id)}`);
  }

  function openChapter(chapter) {
    navigate(`#/read/${source}/${encodeURIComponent(chapter.mangaId)}/${encodeURIComponent(chapter.chapterId)}`);
  }

  function toggleExpanded(set, setter, mangaId) {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(mangaId)) next.delete(mangaId);
      else next.add(mangaId);
      return next;
    });
  }

  async function handleRemoveDownload(chapter) {
    try {
      await removeDownloadedChapter(source, chapter.mangaId, chapter.chapterId);
      setDownloads(current => current.filter(item => item.chapterId !== chapter.chapterId || item.mangaId !== chapter.mangaId));
    } catch (err) {
      console.error(err);
      setError(`Could not remove offline chapter: ${err.message}`);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-zinc-900 rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Library</h2>
        {checking && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <LoaderIcon className="w-3 h-3" />
            Checking for updates
          </span>
        )}
        {!checking && Object.keys(updates).length > 0 && (
          <span className="text-xs text-indigo-400">
            {Object.keys(updates).length} series with new chapters
          </span>
        )}
      </div>
      {manga.length > 0 && <LibraryGrid manga={manga} source={source} onMangaClick={handleMangaClick} updates={updates} />}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookmarkIcon className="w-4.5 h-4.5 text-zinc-400" />
          <h3 className="text-lg font-semibold">Bookmarked</h3>
        </div>
        {bookmarkGroups.length ? (
          <div className="flex flex-col gap-2">
            {bookmarkGroups.map(group => (
              <MangaGroup
                key={group.mangaId}
                group={group}
                open={expandedBookmarks.has(group.mangaId)}
                onToggle={() => toggleExpanded(expandedBookmarks, setExpandedBookmarks, group.mangaId)}
                onChapterClick={openChapter}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Bookmarked chapters will appear here.</p>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <DownloadIcon className="w-4.5 h-4.5 text-zinc-400" />
          <h3 className="text-lg font-semibold">Downloaded</h3>
        </div>
        {downloadGroups.length ? (
          <div className="flex flex-col gap-2">
            {downloadGroups.map(group => (
              <MangaGroup
                key={group.mangaId}
                group={group}
                open={expandedDownloads.has(group.mangaId)}
                onToggle={() => toggleExpanded(expandedDownloads, setExpandedDownloads, group.mangaId)}
                onChapterClick={openChapter}
                renderActions={(ch) => (
                  <>
                    <span className="text-xs text-zinc-600">{ch.pageCount}p</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveDownload(ch); }}
                      className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove chapter ${ch.chapterNum} download`}
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Downloaded chapters will appear here for offline reading.</p>
        )}
      </section>
    </div>
  );
}
