import { useState, useEffect } from 'react';
import { getPopular, getLatest, proxyImageUrl } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import LibraryGrid from '../components/LibraryGrid.jsx';
import { CardGridSkeleton } from '../components/Skeletons.jsx';
import { TrendingIcon, ClockIcon } from '../components/Icons.jsx';
import { getHistory } from '../lib/readingProgress.js';

function HistoryStrip({ history, source, navigate }) {
  if (!history.length) return null;

  const sourceHistory = history.filter(h => h.source === source);
  if (!sourceHistory.length) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Continue Reading</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {sourceHistory.slice(0, 10).map(h => (
          <button
            key={h.mangaId}
            onClick={() => navigate(`#/manga/${source}/${encodeURIComponent(h.mangaId)}`)}
            className="shrink-0 w-28 group text-left"
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 mb-1.5">
              {h.cover ? (
                <img
                  src={proxyImageUrl(h.cover, source)}
                  alt={h.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                  No Cover
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-300 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
              {h.title}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ source, navigate }) {
  const [tab, setTab] = useState('popular');
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getHistory(20).then(setHistory).catch(console.error);
  }, [source]);

  useEffect(() => {
    setManga([]);
    setPage(1);
    setLoading(true);
    loadManga(1, true);
  }, [source, tab]);

  async function loadManga(p, replace = false) {
    setLoading(true);
    try {
      const fetcher = tab === 'popular' ? getPopular : getLatest;
      const result = await fetcher(source, p);
      setManga(prev => replace ? result.manga : [...prev, ...result.manga]);
      setHasMore(result.hasMore);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(query) {
    navigate(`#/search?q=${encodeURIComponent(query)}`);
  }

  function handleMangaClick(m) {
    navigate(`#/manga/${source}/${encodeURIComponent(m.id)}`);
  }

  const tabs = [
    { id: 'popular', label: 'Popular', icon: TrendingIcon },
    { id: 'latest', label: 'Latest', icon: ClockIcon },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SearchBar onSearch={handleSearch} />

      <HistoryStrip history={history} source={source} navigate={navigate} />

      <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 self-start">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && manga.length === 0 ? (
        <CardGridSkeleton />
      ) : (
        <>
          <LibraryGrid manga={manga} source={source} onMangaClick={handleMangaClick} />
          {hasMore && (
            <button
              onClick={() => loadManga(page + 1)}
              disabled={loading}
              className="self-center px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
