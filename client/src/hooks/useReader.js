import { useState, useEffect, useCallback, useRef } from 'react';
import { getPageUrls } from '../api.js';
import { proxyImageUrl } from '../api.js';
import { saveProgress } from '../lib/readingProgress.js';
import { getOfflineChapter } from '../lib/chapterLibrary.js';

export function useReader({ source, mangaId, chapterId, chapters, onChapterChange }) {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showControls, setShowControls] = useState(false);
  const preloadedRef = useRef(new Set());

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    setCurrentPage(0);
    setPages([]);
    preloadedRef.current = new Set();

    let active = true;
    let offlineUrls = [];

    async function loadPages() {
      try {
        const downloaded = await getOfflineChapter(source, mangaId, chapterId);
        if (!active) return;
        if (downloaded && downloaded.pages.length === downloaded.pageCount) {
          offlineUrls = downloaded.pages.map(page => URL.createObjectURL(page.blob));
          if (active) {
            setPages(downloaded.pages.map((page, index) => ({
              url: page.url,
              offlineUrl: offlineUrls[index],
            })));
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.error('Could not read offline chapter data:', err);
      }

      if (!active) return;
      try {
        const remotePages = await getPageUrls(source, chapterId);
        if (active) setPages(remotePages);
      } catch (err) {
        console.error(err);
        if (active) setLoadError(`Could not load this chapter. Connect to the internet or download it first. (${err.message})`);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPages();
    return () => {
      active = false;
      offlineUrls.forEach(url => URL.revokeObjectURL(url));
    };
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
      if (pages[i].offlineUrl) continue;
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
    loadError,
    showControls,
    totalPages: pages.length,
    goNext,
    goPrev,
    goToPage,
    toggleControls,
    setShowControls,
  };
}
