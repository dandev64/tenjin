import { useState, useEffect, useMemo } from 'react';
import db from '../db.js';
import LibraryGrid from '../components/LibraryGrid.jsx';
import { getAllBookmarks, getAllDownloadedChapters, removeDownloadedChapter } from '../lib/chapterLibrary.js';
import { checkLibraryUpdates } from '../lib/libraryUpdates.js';
import { ChevronRightIcon, XIcon, BookmarkIcon, DownloadIcon, LoaderIcon, SourceIcon } from '../components/Icons.jsx';

function groupByManga(chapters) {
  const map = new Map();
  for (const ch of chapters) {
    const key = `${ch.source}:${ch.mangaId}`;
    if (!map.has(key)) {
      map.set(key, { mangaId: ch.mangaId, mangaTitle: ch.mangaTitle, source: ch.source, chapters: [] });
    }
    map.get(key).chapters.push(ch);
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
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <SourceIcon sourceId={group.source} className="w-3 h-3" />
              {group.source}
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500">
              {group.chapters.length} ch.
            </span>
          </div>
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

function SourceFilter({ sources, active, onChange }) {
  return (
    <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
          active === null ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        All
      </button>
      {sources.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            active === s ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <SourceIcon sourceId={s} className="w-3 h-3" />
          {s}
        </button>
      ))}
    </div>
  );
}

export default function LibraryPage({ navigate }) {
  const [allManga, setAllManga] = useState([]);
  const [allBookmarks, setAllBookmarks] = useState([]);
  const [allDownloads, setAllDownloads] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedBookmarks, setExpandedBookmarks] = useState(new Set());
  const [expandedDownloads, setExpandedDownloads] = useState(new Set());
  const [updates, setUpdates] = useState({});
  const [checking, setChecking] = useState(false);
  const [sourceFilter, setSourceFilter] = useState(null);

  useEffect(() => {
    Promise.all([
      db.library.reverse().sortBy('updatedAt'),
      getAllBookmarks(),
      getAllDownloadedChapters(),
    ])
      .then(([savedManga, savedBookmarks, savedDownloads]) => {
        setAllManga(savedManga);
        setAllBookmarks(savedBookmarks);
        setAllDownloads(savedDownloads);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !allManga.length) return;
    setChecking(true);
    checkLibraryUpdates(null)
      .then(setUpdates)
      .finally(() => setChecking(false));
  }, [loading, allManga.length]);

  const availableSources = useMemo(() => {
    const set = new Set();
    for (const m of allManga) if (m.source) set.add(m.source);
    for (const b of allBookmarks) if (b.source) set.add(b.source);
    for (const d of allDownloads) if (d.source) set.add(d.source);
    return Array.from(set).sort();
  }, [allManga, allBookmarks, allDownloads]);

  const manga = sourceFilter
    ? allManga.filter(m => m.source === sourceFilter)
    : allManga;

  const bookmarks = sourceFilter
    ? allBookmarks.filter(b => b.source === sourceFilter)
    : allBookmarks;

  const downloads = sourceFilter
    ? allDownloads.filter(d => d.source === sourceFilter)
    : allDownloads;

  const bookmarkGroups = useMemo(() => groupByManga(bookmarks), [bookmarks]);
  const downloadGroups = useMemo(() => groupByManga(downloads), [downloads]);

  const showSource = !sourceFilter;

  function handleMangaClick(m) {
    const s = m.source;
    navigate(`#/manga/${s}/${encodeURIComponent(m.id)}`);
  }

  function openChapter(chapter) {
    navigate(`#/read/${chapter.source}/${encodeURIComponent(chapter.mangaId)}/${encodeURIComponent(chapter.chapterId)}`);
  }

  function toggleExpanded(set, setter, key) {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleRemoveDownload(chapter) {
    try {
      await removeDownloadedChapter(chapter.source, chapter.mangaId, chapter.chapterId);
      setAllDownloads(current => current.filter(item =>
        !(item.chapterId === chapter.chapterId && item.mangaId === chapter.mangaId && item.source === chapter.source)
      ));
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

      {availableSources.length > 1 && (
        <SourceFilter sources={availableSources} active={sourceFilter} onChange={setSourceFilter} />
      )}

      {manga.length > 0 ? (
        <LibraryGrid manga={manga} onMangaClick={handleMangaClick} updates={updates} showSource={showSource} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-lg">Nothing here yet</p>
          <p className="text-sm mt-1">Search for manga to get started</p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookmarkIcon className="w-4.5 h-4.5 text-zinc-400" />
          <h3 className="text-lg font-semibold">Bookmarked</h3>
        </div>
        {bookmarkGroups.length ? (
          <div className="flex flex-col gap-2">
            {bookmarkGroups.map(group => {
              const key = `${group.source}:${group.mangaId}`;
              return (
                <MangaGroup
                  key={key}
                  group={group}
                  open={expandedBookmarks.has(key)}
                  onToggle={() => toggleExpanded(expandedBookmarks, setExpandedBookmarks, key)}
                  onChapterClick={openChapter}
                />
              );
            })}
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
            {downloadGroups.map(group => {
              const key = `${group.source}:${group.mangaId}`;
              return (
                <MangaGroup
                  key={key}
                  group={group}
                  open={expandedDownloads.has(key)}
                  onToggle={() => toggleExpanded(expandedDownloads, setExpandedDownloads, key)}
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
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Downloaded chapters will appear here for offline reading.</p>
        )}
      </section>
    </div>
  );
}
