import MangaCard from './MangaCard.jsx';

export default function LibraryGrid({ manga, source, onMangaClick, updates = {} }) {
  if (!manga?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg">Nothing here yet</p>
        <p className="text-sm mt-1">Search for manga to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {manga.map(m => (
        <MangaCard
          key={m.id}
          manga={m}
          source={source}
          onClick={onMangaClick}
          updateInfo={updates[m.id]}
        />
      ))}
    </div>
  );
}
