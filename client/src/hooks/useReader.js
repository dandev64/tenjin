import { useState, useEffect, useCallback, useRef } from 'react';
import { getPageUrls } from '../api.js';
import { proxyImageUrl } from '../api.js';
import { saveProgress } from '../lib/readingProgress.js';

export function useReader({ source, mangaId, chapterId, chapters, onChapterChange }) {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const preloadedRef = useRef(new Set());

  useEffect(() => {
    setLoading(true);
    setCurrentPage(0);
    setPages([]);
    preloadedRef.current = new Set();

    getPageUrls(source, chapterId)
      .then(p => {
        setPages(p);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [source, chapterId]);

  useEffect(() => {
    if (pages.length === 0) return;
    preloadAhead(currentPage);
    saveProgress(source, mangaId, chapterId, getChapterNum(), currentPage);
  }, [currentPage, pages]);

  function getChapterNum() {
    const ch = chapters?.find(c => c.id === chapterId);
    return ch?.chapter || '?';
  }

  function preloadAhead(from) {
    for (let i = from + 1; i <= Math.min(from + 3, pages.length - 1); i++) {
      if (preloadedRef.current.has(i)) continue;
      preloadedRef.current.add(i);
      const img = new Image();
      img.src = proxyImageUrl(pages[i].url, source);
    }
  }

  const goNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(p => p + 1);
    } else if (onChapterChange) {
      const idx = chapters?.findIndex(c => c.id === chapterId);
      if (idx !== undefined && idx < (chapters?.length || 0) - 1) {
        onChapterChange(chapters[idx + 1]);
      }
    }
  }, [currentPage, pages.length, chapterId, chapters, onChapterChange]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
    } else if (onChapterChange) {
      const idx = chapters?.findIndex(c => c.id === chapterId);
      if (idx !== undefined && idx > 0) {
        onChapterChange(chapters[idx - 1]);
      }
    }
  }, [currentPage, chapterId, chapters, onChapterChange]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const goToPage = useCallback((p) => {
    setCurrentPage(Math.max(0, Math.min(p, pages.length - 1)));
  }, [pages.length]);

  return {
    pages,
    currentPage,
    loading,
    showControls,
    totalPages: pages.length,
    goNext,
    goPrev,
    goToPage,
    toggleControls,
    setShowControls,
  };
}
