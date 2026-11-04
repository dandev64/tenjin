import { proxyImageUrl } from '../api.js';
import { SourceIcon } from './Icons.jsx';

export default function MangaCard({ manga, source, onClick, updateInfo, showSource }) {
  const cardSource = manga.source || source;
  const coverSrc = manga.cover
    ? proxyImageUrl(manga.cover, cardSource)
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
        {updateInfo && (
          <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow">
            {updateInfo.newChapters > 99 ? '99+' : updateInfo.newChapters}
          </span>
        )}
        {showSource && cardSource && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <SourceIcon sourceId={cardSource} className="w-3 h-3 text-zinc-300" />
            <span className="text-[10px] font-medium text-zinc-300">{manga.sourceName || cardSource}</span>
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
