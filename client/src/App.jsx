import { useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute.js';
import { getActiveSource, setActiveSource } from './lib/sources.js';
import SourceSelector from './components/SourceSelector.jsx';
import { LibraryIcon, ExternalLinkIcon } from './components/Icons.jsx';
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import MangaPage from './pages/MangaPage.jsx';
import ReaderPage from './pages/ReaderPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';

export default function App() {
  const { path, params, segments, navigate } = useHashRoute();
  const [source, setSource] = useState(getActiveSource());

  function handleSourceChange(s) {
    setSource(s);
    setActiveSource(s);
    navigate('#/');
  }

  const isReader = segments[0] === 'read';

  function renderPage() {
    switch (segments[0]) {
      case 'search':
        return (
          <SearchPage
            source={source}
            query={params.get('q') || ''}
            navigate={navigate}
          />
        );

      case 'manga':
        return (
          <MangaPage
            source={segments[1] || source}
            mangaId={decodeURIComponent(segments[2] || '')}
            navigate={navigate}
          />
        );

      case 'read':
        return (
          <ReaderPage
            key={`${segments[1] || source}:${decodeURIComponent(segments[2] || '')}`}
            source={segments[1] || source}
            mangaId={decodeURIComponent(segments[2] || '')}
            chapterId={decodeURIComponent(segments[3] || '')}
            navigate={navigate}
          />
        );

      case 'library':
        return <LibraryPage source={source} navigate={navigate} />;

      default:
        return <HomePage source={source} navigate={navigate} />;
    }
  }

  return (
    <>
      {!isReader && (
        <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate('#/')} className="text-xl font-bold tracking-tight hover:text-indigo-400 transition-colors">
              Tenjin
            </button>
            <nav className="flex items-center gap-1">
              <a
                href="https://open-animation-hls.vercel.app/#"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anime</span>
              </a>
              <button
                onClick={() => navigate('#/library')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  segments[0] === 'library'
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <LibraryIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Library</span>
              </button>
              <SourceSelector onSourceChange={handleSourceChange} />
            </nav>
          </div>
        </header>
      )}
      <main className={isReader ? '' : 'max-w-6xl mx-auto px-4 py-6'}>
        {renderPage()}
      </main>
    </>
  );
}
