import { proxyImageUrl } from '../api.js';

export default function MangaCard({ manga, source, onClick }) {
  const coverSrc = manga.cover
    ? proxyImageUrl(manga.cover, source)
    : null;

  return (
    <button
      onClick={() => onClick(manga)}
      className="group text-left flex flex-col gap-2 w-full"
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={manga.title}
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
        {manga.title}
      </p>
    </button>
  );
}
