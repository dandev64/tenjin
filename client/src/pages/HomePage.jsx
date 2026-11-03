import { useState, useEffect } from 'react';
import { getPopular, getLatest } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import LibraryGrid from '../components/LibraryGrid.jsx';
import { CardGridSkeleton } from '../components/Skeletons.jsx';

export default function HomePage({ source, navigate }) {
  const [tab, setTab] = useState('popular');
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
      <SearchBar onSearch={handleSearch} />

      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 self-start">
        {['popular', 'latest'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t}
          </button>
        ))}
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
