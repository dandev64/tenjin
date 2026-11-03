import { useState, useEffect } from 'react';
import { getSources } from '../api.js';
import { getActiveSource, setActiveSource } from '../lib/sources.js';

export default function SourceSelector({ onSourceChange }) {
  const [sources, setSources] = useState([]);
  const [active, setActive] = useState(getActiveSource());

  useEffect(() => {
    getSources().then(setSources).catch(() => {});
  }, []);

  function handleChange(id) {
    setActive(id);
    setActiveSource(id);
    onSourceChange(id);
  }

  return (
    <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
      {sources.map(s => (
        <button
          key={s.id}
          onClick={() => handleChange(s.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === s.id
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {s.icon} {s.name}
        </button>
      ))}
    </div>
  );
}
