import { useState, useEffect } from 'react';
import { getMangaDetails, getChapterList, proxyImageUrl } from '../api.js';
import ChapterList from '../components/ChapterList.jsx';
import { DetailSkeleton } from '../components/Skeletons.jsx';
import { getProgress, addToHistory } from '../lib/readingProgress.js';
import db from '../db.js';

export default function MangaPage({ source, mangaId, navigate }) {
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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
    ]).then(([m, ch, prog, lib]) => {
      setManga(m);
      setChapters(ch.chapters);
      setHasMore(ch.hasMore);
      setProgress(prog);
      setInLibrary(!!lib);
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
          <div className="flex gap-3 mt-2">
            <button
              onClick={toggleLibrary}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inLibrary
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {inLibrary ? 'In Library' : 'Add to Library'}
            </button>
            {progress && (
              <button
                onClick={() => navigate(`#/read/${source}/${encodeURIComponent(mangaId)}/${encodeURIComponent(progress.chapterId)}`)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Continue Ch. {progress.chapterNum}
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{chapters.length} Chapters</h2>
        <ChapterList chapters={chapters} onSelect={openChapter} currentChapterId={progress?.chapterId} />
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
