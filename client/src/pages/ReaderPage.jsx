import { useState, useEffect, useCallback } from 'react';
import { getChapterList } from '../api.js';
import { useReader } from '../hooks/useReader.js';
import Reader from '../components/Reader.jsx';

export default function ReaderPage({ source, mangaId, chapterId, navigate }) {
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [mangaTitle, setMangaTitle] = useState('');

  useEffect(() => {
    getChapterList(source, mangaId).then(data => {
      setChapters(data.chapters);
    }).catch(console.error);

    import('../api.js').then(({ getMangaDetails }) => {
      getMangaDetails(source, mangaId).then(m => setMangaTitle(m.title));
    });
  }, [source, mangaId]);

  const handleChapterChange = useCallback((ch) => {
    setActiveChapterId(ch.id);
    window.location.hash = `#/read/${source}/${encodeURIComponent(mangaId)}/${encodeURIComponent(ch.id)}`;
  }, [source, mangaId]);

  const reader = useReader({
    source,
    mangaId,
    chapterId: activeChapterId,
    chapters,
    onChapterChange: handleChapterChange,
  });

  const currentChapter = chapters.find(c => c.id === activeChapterId);

  function handleClose() {
    navigate(`#/manga/${source}/${encodeURIComponent(mangaId)}`);
  }

  return (
    <Reader
      {...reader}
      source={source}
      chapterNum={currentChapter?.chapter || '?'}
      mangaTitle={mangaTitle}
      onClose={handleClose}
    />
  );
}
