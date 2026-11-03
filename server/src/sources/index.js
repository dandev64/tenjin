import { MangaDexSource } from './mangadex.js';
import { ComickSource } from './comick.js';

const sources = new Map();

function register(source) {
  sources.set(source.id, source);
}

register(new MangaDexSource());
register(new ComickSource());

export function getSource(id) {
  return sources.get(id);
}

export function getAllSources() {
  return Array.from(sources.values()).map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
  }));
}
