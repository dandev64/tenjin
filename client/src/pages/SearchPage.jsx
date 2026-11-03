import { useState, useEffect } from 'react';
import { searchManga } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import LibraryGrid from '../components/LibraryGrid.jsx';
import { CardGridSkeleton } from '../components/Skeletons.jsx';

export default function SearchPage({ source, query, navigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!query) return;
    setResults([]);
    setPage(1);
    setLoading(true);
    doSearch(1, true);
  }, [source, query]);

  async function doSearch(p, replace = false) {
    setLoading(true);
    try {
      const result = await searchManga(source, query, p);
      setResults(prev => replace ? result.manga : [...prev, ...result.manga]);
      setHasMore(result.hasMore);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(q) {
    navigate(`#/search?q=${encodeURIComponent(q)}`);
  }

  function handleMangaClick(m) {
    navigate(`#/manga/${source}/${encodeURIComponent(m.id)}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchBar onSearch={handleSearch} initialQuery={query} />

      <h2 className="text-lg text-zinc-400">
        Results for "<span className="text-zinc-100">{query}</span>"
      </h2>

      {loading && results.length === 0 ? (
        <CardGridSkeleton />
      ) : (
        <>
          <LibraryGrid manga={results} source={source} onMangaClick={handleMangaClick} />
          {hasMore && (
            <button
              onClick={() => doSearch(page + 1)}
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
