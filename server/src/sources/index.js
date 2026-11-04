import { MangaPillSource } from './mangapill.js';
import { MangaDexSource } from './mangadex.js';
import { AsuraScansSource } from './asurascans.js';
import { ToonilySource } from './toonily.js';

const sources = new Map();

function register(source) {
  sources.set(source.id, source);
}

register(new MangaPillSource());
register(new MangaDexSource());
register(new AsuraScansSource());
register(new ToonilySource());
// Toonily may get blocked by Cloudflare on some server IPs — it's registered
// but will return errors if the server IP is flagged.

export function getSource(id) {
  return sources.get(id);
}

export function getAllSources() {
  return Array.from(sources.values()).map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    nsfw: s.nsfw || false,
  }));
}
