import { useState, useEffect, useCallback } from 'react';
import { getChapterList, getMangaDetails } from '../api.js';
import { useReader } from '../hooks/useReader.js';
import Reader from '../components/Reader.jsx';
import {
  downloadChapter,
  getChapterBookmark,
  getOfflineChapterInfo,
  toggleChapterBookmark,
} from '../lib/chapterLibrary.js';

function getReaderMode(source, mangaId) {
  try {
    return localStorage.getItem(`tenjin:reader-mode:${source}:${mangaId}`) === 'webtoon'
      ? 'webtoon'
      : 'page';
  } catch {
    return 'page';
  }
}

export default function ReaderPage({ source, mangaId, chapterId, navigate }) {
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [mangaTitle, setMangaTitle] = useState('');
  const [readerMode, setReaderMode] = useState(() => getReaderMode(source, mangaId));
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [offlineInfo, setOfflineInfo] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [readerError, setReaderError] = useState('');

  useEffect(() => {
    getChapterList(source, mangaId).then(data => {
      setChapters(data.chapters);
    }).catch(console.error);

    getMangaDetails(source, mangaId).then(m => setMangaTitle(m.title)).catch(console.error);
  }, [source, mangaId]);

  useEffect(() => {
    setActiveChapterId(chapterId);
  }, [chapterId]);

  useEffect(() => {
    let active = true;
    setIsBookmarked(false);
    setOfflineInfo(null);
    setDownloadStatus('');
    setReaderError('');
    Promise.all([
      getChapterBookmark(source, mangaId, activeChapterId),
      getOfflineChapterInfo(source, mangaId, activeChapterId),
    ]).then(([bookmark, offline]) => {
      if (!active) return;
      setIsBookmarked(!!bookmark);
      setOfflineInfo(offline);
      if (!mangaTitle && offline?.mangaTitle) setMangaTitle(offline.mangaTitle);
      setDownloadStatus(offline ? 'downloaded' : '');
    }).catch(err => {
      console.error(err);
      if (active) setReaderError(`Could not load saved chapter data: ${err.message}`);
    });
    return () => { active = false; };
  }, [source, mangaId, activeChapterId]);

  const handleChapterChange = useCallback((ch) => {
    setActiveChapterId(ch.id);
    window.location.hash = `#/read/${source}/${encodeURIComponent(mangaId)}/${encodeURIComponent(ch.id)}`;
  }, [source, mangaId]);

  const handleReaderModeChange = useCallback((mode) => {
    setReaderMode(mode);
    try {
      localStorage.setItem(`tenjin:reader-mode:${source}:${mangaId}`, mode);
    } catch {}
  }, [source, mangaId]);

  const reader = useReader({
    source,
    mangaId,
    chapterId: activeChapterId,
    chapters,
    onChapterChange: handleChapterChange,
  });

  const currentChapter = chapters.find(c => c.id === activeChapterId);
  const currentChapterIndex = chapters.findIndex(c => c.id === activeChapterId);
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1;

  async function handleToggleBookmark() {
    try {
      const bookmarked = await toggleChapterBookmark({
        source,
        mangaId,
        chapterId: activeChapterId,
        chapterNum: currentChapter?.chapter || offlineInfo?.chapterNum || '?',
        chapterTitle: currentChapter?.title || offlineInfo?.chapterTitle || '',
        mangaTitle,
      });
      setIsBookmarked(bookmarked);
    } catch (err) {
      console.error(err);
      setReaderError(`Could not update bookmark: ${err.message}`);
    }
  }

  async function handleDownloadChapter() {
    const chapter = currentChapter || (offlineInfo && {
      id: activeChapterId,
      chapter: offlineInfo.chapterNum,
      title: offlineInfo.chapterTitle,
    });
    if (!chapter) {
      setReaderError('Chapter details are unavailable. Open the series page while online, then try again.');
      return;
    }
    setDownloadStatus('downloading');
    setReaderError('');
    try {
      const saved = await downloadChapter({ source, mangaId, chapter, mangaTitle });
      setOfflineInfo(saved);
      setDownloadStatus('downloaded');
    } catch (err) {
      console.error(err);
      setDownloadStatus('');
      setReaderError(`Could not download chapter: ${err.message}`);
    }
  }

  function handleClose() {
    if (offlineInfo) {
      navigate('#/library');
    } else {
      navigate(`#/manga/${source}/${encodeURIComponent(mangaId)}`);
    }
  }

  return (
    <Reader
      {...reader}
      source={source}
      chapterNum={currentChapter?.chapter || offlineInfo?.chapterNum || '?'}
      mangaTitle={mangaTitle}
      hasNextChapter={hasNextChapter}
      isBookmarked={isBookmarked}
      downloadStatus={downloadStatus}
      readerError={readerError}
      onToggleBookmark={handleToggleBookmark}
      onDownloadChapter={handleDownloadChapter}
      readerMode={readerMode}
      onReaderModeChange={handleReaderModeChange}
      onClose={handleClose}
    />
  );
}
