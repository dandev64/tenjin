import { useState, useEffect } from 'react';
import { searchManga, searchAllSources, proxyImageUrl } from '../api.js';
import SearchBar from '../components/SearchBar.jsx';
import { CardGridSkeleton } from '../components/Skeletons.jsx';
import { SourceIcon } from '../components/Icons.jsx';

function AllResultsGrid({ groups, navigate }) {
  if (!groups.length) return null;

  const hasResults = groups.some(g => g.manga.length > 0);
  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg">No results across any source</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(group => {
        if (!group.manga.length) return null;
        return (
          <section key={group.sourceId}>
            <div className="flex items-center gap-2 mb-3">
              <SourceIcon sourceId={group.sourceId} className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-300">{group.sourceName}</h3>
              <span className="text-xs text-zinc-500">{group.manga.length} results</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {group.manga.map(m => (
                <button
                  key={`${group.sourceId}:${m.id}`}
                  onClick={() => navigate(`#/manga/${group.sourceId}/${encodeURIComponent(m.id)}`)}
                  className="group text-left flex flex-col gap-2 w-full"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800">
                    {m.cover ? (
                      <img
                        src={proxyImageUrl(m.cover, group.sourceId)}
                        alt={m.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                        No Cover
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <SourceIcon sourceId={group.sourceId} className="w-3 h-3 text-zinc-300" />
                      <span className="text-[10px] font-medium text-zinc-300">{group.sourceName}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                    {m.title}
                  </p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function SearchPage({ source, query, navigate }) {
  const [results, setResults] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(!!query);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchAll, setSearchAll] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    setResults([]);
    setAllResults([]);
    setPage(1);
    setLoading(true);

    if (searchAll) {
      searchAllSources(query)
        .then(data => setAllResults(data.sources))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      doSearch(1, true);
    }
  }, [source, query, searchAll]);

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
      <SearchBar onSearch={handleSearch} initialQuery={query} autoFocus={!query} />

      {!query ? (
        <p className="text-zinc-500 text-center py-10">Type a title to search across all sources</p>
      ) : (<>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg text-zinc-400 min-w-0 truncate">
          Results for "<span className="text-zinc-100">{query}</span>"
        </h2>
        <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setSearchAll(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              searchAll ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => setSearchAll(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !searchAll ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SourceIcon sourceId={source} className="w-3 h-3" />
            Current
          </button>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : searchAll ? (
        <AllResultsGrid groups={allResults} navigate={navigate} />
      ) : (
        <>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <p className="text-lg">No results found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMangaClick(m)}
                  className="group text-left flex flex-col gap-2 w-full"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800">
                    {m.cover ? (
                      <img
                        src={proxyImageUrl(m.cover, source)}
                        alt={m.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                        No Cover
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                    {m.title}
                  </p>
                </button>
              ))}
            </div>
          )}
          {hasMore && (
            <button
              onClick={() => doSearch(page + 1)}
              disabled={loading}
              className="self-center px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Load More
            </button>
          )}
        </>
      )}
      </>)}
    </div>
  );
}
