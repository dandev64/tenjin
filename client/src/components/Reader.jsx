import { useEffect, useRef } from 'react';
import { proxyImageUrl } from '../api.js';

export default function Reader({
  pages,
  currentPage,
  totalPages,
  loading,
  loadError,
  showControls,
  source,
  chapterNum,
  mangaTitle,
  hasNextChapter,
  isBookmarked,
  downloadStatus,
  readerError,
  goNext,
  goPrev,
  goToPage,
  toggleControls,
  onToggleBookmark,
  onDownloadChapter,
  readerMode,
  onReaderModeChange,
  onClose,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pageRefs = useRef([]);
  const touchStartRef = useRef(null);
  const isWebtoon = readerMode === 'webtoon';

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (!isWebtoon && (e.key === 'ArrowRight' || e.key === ' ')) {
        e.preventDefault();
        goNext();
      } else if (!isWebtoon && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, isWebtoon, onClose]);

  useEffect(() => {
    if (!isWebtoon || loading) return;
    pageRefs.current[currentPage]?.scrollIntoView({ block: 'start' });
  }, [isWebtoon, loading]);

  function handleVerticalScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;

    const marker = container.getBoundingClientRect().top + container.clientHeight * 0.4;
    let activePage = 0;
    for (let i = 0; i < pages.length; i++) {
      const bounds = pageRefs.current[i]?.getBoundingClientRect();
      if (!bounds) continue;
      if (bounds.top <= marker) activePage = i;
      if (bounds.top <= marker && bounds.bottom > marker) {
        activePage = i;
        break;
      }
      if (bounds.top > marker) break;
    }
    if (activePage !== currentPage) goToPage(activePage);
  }

  function scrollToPage(page) {
    goToPage(page);
    pageRefs.current[page]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleTap(e) {
    if (isWebtoon) {
      toggleControls();
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      goPrev();
    } else if (x > third * 2) {
      goNext();
    } else {
      toggleControls();
    }
  }

  function handleTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -50) goNext();
      else if (dx > 50) goPrev();
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPageData = pages[currentPage];

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 bg-black flex flex-col z-50 ${isWebtoon ? '' : 'select-none'}`}
      onClick={handleTap}
      onTouchStart={isWebtoon ? undefined : handleTouchStart}
      onTouchEnd={isWebtoon ? undefined : handleTouchEnd}
    >
      <div
        className={`absolute top-0 left-0 right-0 z-10 bg-black/85 px-4 py-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="text-white/80 hover:text-white text-sm"
          >
            ← Back
          </button>
          <span className="text-white/60 text-sm truncate mx-4">
            {mangaTitle} — Ch. {chapterNum}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-white/60 text-sm">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
              className={`text-sm ${isBookmarked ? 'text-amber-400' : 'text-white/70 hover:text-amber-300'}`}
              aria-label={isBookmarked ? 'Remove chapter bookmark' : 'Bookmark chapter'}
              title={isBookmarked ? 'Remove chapter bookmark' : 'Bookmark chapter'}
            >
              {isBookmarked ? '★' : '☆'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDownloadChapter(); }}
              disabled={downloadStatus === 'downloading' || downloadStatus === 'downloaded'}
              className="text-xs text-white/70 hover:text-white disabled:opacity-60"
              aria-label={downloadStatus === 'downloaded' ? 'Chapter saved offline' : 'Download chapter for offline reading'}
            >
              {downloadStatus === 'downloaded' ? 'Saved' : downloadStatus === 'downloading' ? 'Saving…' : '↓'}
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onReaderModeChange(isWebtoon ? 'page' : 'webtoon');
              }}
              className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white"
              aria-label={`Switch to ${isWebtoon ? 'page-by-page' : 'Webtoon scroll'} reader`}
            >
              {isWebtoon ? 'Page' : 'Webtoon'}
            </button>
          </div>
        </div>
      </div>

      {(readerError || loadError) && (
        <p role="alert" className="absolute top-16 left-1/2 z-20 max-w-[90vw] -translate-x-1/2 rounded-lg bg-red-950/90 px-4 py-2 text-sm text-red-200">
          {readerError || loadError}
        </p>
      )}

      {isWebtoon ? (
        <div
          ref={scrollContainerRef}
          onScroll={handleVerticalScroll}
          className={`flex-1 overflow-y-auto overscroll-contain ${showControls ? 'pt-14 pb-28' : ''}`}
        >
          <div className="mx-auto max-w-[900px]">
            {pages.map((page, index) => (
              <div
                key={`${page.url}-${index}`}
                ref={element => { pageRefs.current[index] = element; }}
              >
                <img
                  src={page.offlineUrl || proxyImageUrl(page.url, source)}
                  alt={`Page ${index + 1}`}
                  className="block h-auto w-full"
                  draggable={false}
                  onLoad={handleVerticalScroll}
                />
              </div>
            ))}
            {hasNextChapter && (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <p className="text-sm text-white/50">End of chapter</p>
                <button
                  onClick={e => { e.stopPropagation(); goNext(); }}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Next chapter
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {currentPageData && (
            <img
              key={currentPageData.offlineUrl || proxyImageUrl(currentPageData.url, source)}
              src={currentPageData.offlineUrl || proxyImageUrl(currentPageData.url, source)}
              alt={`Page ${currentPage + 1}`}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          )}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-10 bg-black/85 px-4 py-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-white/60 text-xs w-8 text-right">{currentPage + 1}</span>
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            value={currentPage}
            onChange={e => {
              e.stopPropagation();
              if (isWebtoon) scrollToPage(parseInt(e.target.value));
              else goToPage(parseInt(e.target.value));
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 accent-indigo-500 h-1"
          />
          <span className="text-white/60 text-xs w-8">{totalPages}</span>
        </div>
      </div>
    </div>
  );
}
