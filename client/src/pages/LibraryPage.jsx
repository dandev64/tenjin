import { useState, useEffect } from 'react';
import db from '../db.js';
import LibraryGrid from '../components/LibraryGrid.jsx';

export default function LibraryPage({ source, navigate }) {
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.library
      .where('source').equals(source)
      .reverse()
      .sortBy('updatedAt')
      .then(setManga)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [source]);

  function handleMangaClick(m) {
    navigate(`#/manga/${source}/${encodeURIComponent(m.id)}`);
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-zinc-900 rounded-lg" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Library</h2>
      <LibraryGrid manga={manga} source={source} onMangaClick={handleMangaClick} />
    </div>
  );
}
