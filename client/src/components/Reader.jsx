import { useEffect, useRef } from 'react';
import { proxyImageUrl } from '../api.js';

export default function Reader({
  pages,
  currentPage,
  totalPages,
  loading,
  showControls,
  source,
  chapterNum,
  mangaTitle,
  goNext,
  goPrev,
  goToPage,
  toggleControls,
  onClose,
}) {
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  function handleTap(e) {
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
  const imgSrc = currentPageData ? proxyImageUrl(currentPageData.url, source) : null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col z-50 select-none"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="text-white/80 hover:text-white text-sm"
          >
            ← Back
          </button>
          <span className="text-white/60 text-sm truncate mx-4">
            {mangaTitle} — Ch. {chapterNum}
          </span>
          <span className="text-white/60 text-sm">
            {currentPage + 1}/{totalPages}
          </span>
        </div>
      </div>

      {/* Page image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {imgSrc && (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={`Page ${currentPage + 1}`}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-white/60 text-xs w-8 text-right">{currentPage + 1}</span>
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            value={currentPage}
            onChange={e => { e.stopPropagation(); goToPage(parseInt(e.target.value)); }}
            onClick={e => e.stopPropagation()}
            className="flex-1 accent-indigo-500 h-1"
          />
          <span className="text-white/60 text-xs w-8">{totalPages}</span>
        </div>
      </div>
    </div>
  );
}
