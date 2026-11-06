import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/analytics.json');

const MAX_EVENTS = 5000;
let events = [];

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    ensureDir();
    if (fs.existsSync(DATA_FILE)) {
      events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    events = [];
  }
}

function persist() {
  try {
    ensureDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(events));
  } catch (err) {
    console.error('[analytics] persist failed:', err.message);
  }
}

load();

let dirty = false;
setInterval(() => {
  if (dirty) {
    persist();
    dirty = false;
  }
}, 30_000);

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function parseRoute(path) {
  const match = path.match(/^\/api\/([^/]+)\/(.+)/);
  if (!match) return null;
  const source = match[1];
  const rest = match[2];
  if (rest.startsWith('manga')) return { source, type: 'manga_view' };
  if (rest.startsWith('chapter')) return { source, type: 'chapter_read' };
  if (rest.startsWith('search')) return { source, type: 'search' };
  if (rest.startsWith('popular') || rest.startsWith('latest')) return { source, type: 'browse' };
  return { source, type: 'other' };
}

export function trackRequest(req) {
  const route = parseRoute(req.path);
  if (!route) return;

  const event = {
    ts: Date.now(),
    ip: getClientIp(req),
    ua: req.headers['user-agent'] || '',
    path: req.path,
    query: { ...req.query },
    source: route.source,
    type: route.type,
  };

  events.push(event);
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }
  dirty = true;
}

export function getEvents({ since, limit = 200 } = {}) {
  let filtered = events;
  if (since) filtered = filtered.filter(e => e.ts >= since);
  return filtered.slice(-limit).reverse();
}

export function getStats() {
  const now = Date.now();
  const hour = now - 3600_000;
  const day = now - 86400_000;
  const week = now - 7 * 86400_000;

  const uniqueIps = new Set(events.map(e => e.ip));
  const ipsLastDay = new Set(events.filter(e => e.ts >= day).map(e => e.ip));
  const ipsLastHour = new Set(events.filter(e => e.ts >= hour).map(e => e.ip));

  const mangaReads = {};
  const sourceUsage = {};
  const hourlyBuckets = {};

  for (const e of events) {
    if (e.ts < week) continue;

    sourceUsage[e.source] = (sourceUsage[e.source] || 0) + 1;

    if (e.type === 'chapter_read' || e.type === 'manga_view') {
      const id = e.query?.id || e.path.split('/').pop();
      const key = `${e.source}:${id}`;
      if (!mangaReads[key]) mangaReads[key] = { source: e.source, id, count: 0, lastSeen: 0 };
      mangaReads[key].count++;
      mangaReads[key].lastSeen = Math.max(mangaReads[key].lastSeen, e.ts);
    }

    const bucketHour = new Date(e.ts);
    bucketHour.setMinutes(0, 0, 0);
    const key = bucketHour.toISOString();
    hourlyBuckets[key] = (hourlyBuckets[key] || 0) + 1;
  }

  const topManga = Object.values(mangaReads)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalEvents: events.length,
    uniqueVisitors: uniqueIps.size,
    visitorsLastDay: ipsLastDay.size,
    visitorsLastHour: ipsLastHour.size,
    sourceUsage,
    topManga,
    hourlyActivity: Object.entries(hourlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-168)
      .map(([hour, count]) => ({ hour, count })),
    oldestEvent: events[0]?.ts || null,
    newestEvent: events[events.length - 1]?.ts || null,
  };
}

export function getVisitors() {
  const visitors = {};
  for (const e of events) {
    if (!visitors[e.ip]) {
      visitors[e.ip] = {
        ip: e.ip,
        firstSeen: e.ts,
        lastSeen: e.ts,
        requests: 0,
        ua: e.ua,
        sources: new Set(),
        types: new Set(),
      };
    }
    const v = visitors[e.ip];
    v.lastSeen = Math.max(v.lastSeen, e.ts);
    v.requests++;
    v.sources.add(e.source);
    v.types.add(e.type);
  }

  return Object.values(visitors)
    .map(v => ({
      ...v,
      sources: [...v.sources],
      types: [...v.types],
    }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}
