import { useState, useEffect } from 'react';
import { getMangaDetails, getChapterList, proxyImageUrl } from '../api.js';
import ChapterList from '../components/ChapterList.jsx';
import { DetailSkeleton } from '../components/Skeletons.jsx';
import { getProgress, addToHistory } from '../lib/readingProgress.js';
import {
  downloadChapter as saveChapterOffline,
  getDownloadedChapters,
  getMangaBookmarks,
  toggleChapterBookmark,
} from '../lib/chapterLibrary.js';
import db from '../db.js';

export default function MangaPage({ source, mangaId, navigate }) {
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [externalCount, setExternalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [downloads, setDownloads] = useState({});
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    setLoading(true);
    setChaptersLoading(true);
    setChapters([]);
    setPage(1);

    Promise.all([
      getMangaDetails(source, mangaId),
      getChapterList(source, mangaId, 1),
      getProgress(source, mangaId),
      db.library.get(mangaId),
      getMangaBookmarks(source, mangaId),
      getDownloadedChapters(source),
    ]).then(([m, ch, prog, lib, savedBookmarks, savedDownloads]) => {
      setManga(m);
      setChapters(ch.chapters);
      setExternalCount(ch.externalCount || 0);
      setHasMore(ch.hasMore);
      setProgress(prog);
      setInLibrary(!!lib);
      setBookmarks(savedBookmarks);
      setDownloads(Object.fromEntries(
        savedDownloads
          .filter(download => download.mangaId === mangaId)
          .map(download => [download.chapterId, { status: 'downloaded' }]),
      ));
      setLoading(false);
      setChaptersLoading(false);
      addToHistory(source, mangaId, m.title, m.cover);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      setChaptersLoading(false);
    });
  }, [source, mangaId]);

  async function loadMoreChapters() {
    setChaptersLoading(true);
    try {
      const next = page + 1;
      const ch = await getChapterList(source, mangaId, next);
      setChapters(prev => [...prev, ...ch.chapters]);
      setHasMore(ch.hasMore);
      setPage(next);
    } catch (err) {
      console.error(err);
    } finally {
      setChaptersLoading(false);
    }
  }

  function openChapter(ch) {
    navigate(`#/read/${source}/${encodeURIComponent(mangaId)}/${encodeURIComponent(ch.id)}`);
  }

  async function handleToggleBookmark(chapter) {
    try {
      const isBookmarked = await toggleChapterBookmark({
        source,
        mangaId,
        chapterId: chapter.id,
        chapterNum: chapter.chapter || '?',
        chapterTitle: chapter.title || '',
        mangaTitle: manga.title,
      });
      setBookmarks(previous => isBookmarked
        ? [...previous, { chapterId: chapter.id }]
        : previous.filter(bookmark => bookmark.chapterId !== chapter.id));
    } catch (err) {
      console.error(err);
      setDownloadError(`Could not update bookmark: ${err.message}`);
    }
  }

  async function handleDownload(chapter) {
    setDownloadError('');
    setDownloads(previous => ({
      ...previous,
      [chapter.id]: { status: 'downloading', done: 0, total: 0 },
    }));
    try {
      await saveChapterOffline({
        source,
        mangaId,
        chapter,
        mangaTitle: manga.title,
        onProgress: (done, total) => {
          setDownloads(previous => ({
            ...previous,
            [chapter.id]: { status: 'downloading', done, total },
          }));
        },
      });
      setDownloads(previous => ({
        ...previous,
        [chapter.id]: { status: 'downloaded' },
      }));
    } catch (err) {
      console.error(err);
      setDownloads(previous => {
        const next = { ...previous };
        delete next[chapter.id];
        return next;
      });
      setDownloadError(`Could not download chapter ${chapter.chapter || '?'}: ${err.message}`);
    }
  }

  async function toggleLibrary() {
    if (inLibrary) {
      await db.library.delete(mangaId);
      setInLibrary(false);
    } else {
      await db.library.put({
        id: mangaId,
        source,
        title: manga.title,
        cover: manga.cover,
        author: manga.author,
        updatedAt: Date.now(),
      });
      setInLibrary(true);
    }
  }

  const firstChapter = chapters.length > 0
    ? chapters.reduce((min, ch) => (parseFloat(ch.chapter) || Infinity) < (parseFloat(min.chapter) || Infinity) ? ch : min)
    : null;

  const sortedChapters = sortNewestFirst
    ? [...chapters].sort((a, b) => (parseFloat(b.chapter) || 0) - (parseFloat(a.chapter) || 0))
    : [...chapters].sort((a, b) => (parseFloat(a.chapter) || 0) - (parseFloat(b.chapter) || 0));

  if (loading) {
    return (
      <div className="px-4">
        <DetailSkeleton />
      </div>
    );
  }

  if (!manga) {
    return <p className="text-zinc-500 text-center py-10">Manga not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('#/')} className="text-zinc-500 hover:text-zinc-300 text-sm self-start transition-colors">
        ← Back
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-48 shrink-0 self-start">
          {manga.cover && (
            <img
              src={proxyImageUrl(manga.coverFull || manga.cover, source)}
              alt={manga.title}
              className="w-full rounded-lg"
            />
          )}
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <h1 className="text-2xl font-bold">{manga.title}</h1>
          {manga.author && <p className="text-zinc-400">{manga.author}</p>}
          <div className="flex gap-2 flex-wrap">
            {manga.status && (
              <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400 capitalize">
                {manga.status}
              </span>
            )}
            {manga.year && (
              <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                {manga.year}
              </span>
            )}
            {(manga.tags || []).slice(0, 6).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
          {manga.description && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
              {manga.description}
            </p>
          )}
          <div className="flex gap-3 mt-2 flex-wrap">
            {firstChapter && (
              <button
                onClick={() => openChapter(firstChapter)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Read Ch. {firstChapter.chapter || '1'}
              </button>
            )}
            {progress && (
              <button
                onClick={() => navigate(`#/read/${source}/${encodeURIComponent(mangaId)}/${encodeURIComponent(progress.chapterId)}`)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue Ch. {progress.chapterNum}
              </button>
            )}
            <button
              onClick={toggleLibrary}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inLibrary
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {inLibrary ? 'In Library' : 'Add to Library'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{chapters.length} Chapters</h2>
          {chapters.length > 1 && (
            <button
              onClick={() => setSortNewestFirst(prev => !prev)}
              className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              {sortNewestFirst ? 'Newest first' : 'Oldest first'}
            </button>
          )}
        </div>
        {downloadError && (
          <p role="alert" className="mb-3 rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {downloadError}
          </p>
        )}
        <ChapterList
          chapters={sortedChapters}
          externalCount={externalCount}
          onSelect={openChapter}
          currentChapterId={progress?.chapterId}
          bookmarks={bookmarks}
          downloads={downloads}
          onToggleBookmark={handleToggleBookmark}
          onDownload={handleDownload}
        />
        {hasMore && (
          <button
            onClick={loadMoreChapters}
            disabled={chaptersLoading}
            className="mt-3 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {chaptersLoading ? 'Loading...' : 'Load More Chapters'}
          </button>
        )}
      </div>
    </div>
  );
}
