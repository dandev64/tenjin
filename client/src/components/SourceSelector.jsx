import { useState, useEffect, useRef } from 'react';
import { getSources } from '../api.js';
import { getActiveSource, setActiveSource } from '../lib/sources.js';
import { SourceIcon, ChevronDownIcon } from './Icons.jsx';

export default function SourceSelector({ onSourceChange }) {
  const [sources, setSources] = useState([]);
  const [active, setActive] = useState(getActiveSource());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    getSources().then(setSources).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleChange(id) {
    setActive(id);
    setActiveSource(id);
    onSourceChange(id);
    setOpen(false);
  }

  const current = sources.find(s => s.id === active);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sm font-medium transition-colors"
      >
        <SourceIcon sourceId={current?.id} className="w-4 h-4 text-zinc-300" />
        <span className="hidden sm:inline">{current?.name || 'Source'}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/40 py-1.5 z-50">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Sources
          </div>
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => handleChange(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                active === s.id
                  ? 'bg-indigo-600/15 text-indigo-300'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <SourceIcon sourceId={s.id} className="w-4.5 h-4.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  {s.nsfw && (
                    <span className="shrink-0 px-1 py-0.5 text-[9px] font-bold leading-none bg-red-500/20 text-red-400 rounded">
                      18+
                    </span>
                  )}
                </div>
              </div>
              {active === s.id && (
                <svg className="w-4 h-4 text-indigo-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
