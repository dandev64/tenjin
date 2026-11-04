import * as cheerio from 'cheerio';
import cache from '../lib/cache.js';

const BASE = 'https://toonily.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html', Referer: `${BASE}/` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function slugFromUrl(url) {
  const m = url.match(/\/serie\/([^/]+)/);
  return m ? m[1] : url;
}

function parseListing(html) {
  const $ = cheerio.load(html);
  const manga = [];
  const seen = new Set();

  $('a[href*="/serie/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug) || href.includes('/chapter-')) return;
    seen.add(slug);

    const title = $(el).attr('title') || $(el).text().trim();
    if (!title) return;

    const img = $(el).find('img').first();
    const parent = $(el).closest('.page-item-detail, .c-tabs-item__content, .row');
    const cover = img.attr('src') || img.attr('data-src')
      || parent.find('img').first().attr('src')
      || null;

    manga.push({ id: slug, title, cover });
  });

  return manga;
}

const GENRES = ['mature', 'romance', 'action', 'fantasy', 'drama', 'comedy'];

async function buildIndex() {
  const cacheKey = 'tn:index';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pages = await Promise.allSettled(
    GENRES.map(g => fetchHTML(`${BASE}/genre/${g}/page/1/`).then(parseListing)),
  );

  const seen = new Set();
  const all = [];
  for (const p of pages) {
    if (p.status !== 'fulfilled') continue;
    for (const m of p.value) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      all.push(m);
    }
  }

  cache.set(cacheKey, all);
  return all;
}

export class ToonilySource {
  id = 'toonily';
  name = 'Toonily';
  icon = '🔞';
  nsfw = true;

  async search(query) {
    const q = query.toLowerCase();
    const index = await buildIndex();
    const manga = index.filter(m => m.title.toLowerCase().includes(q));
    return { manga, hasMore: false, total: manga.length };
  }

  async getPopular(page = 1) {
    const cacheKey = `tn:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/genre/mature/page/${page}/`);
    const manga = parseListing(html);
    const result = { manga, hasMore: manga.length >= 10, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    return this.getPopular(page);
  }

  async getMangaDetails(mangaId) {
    const cacheKey = `tn:manga:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/serie/${mangaId}/`);
    const $ = cheerio.load(html);

    const title = $('div.post-title h1').text().trim()
      || $('h1').first().text().trim();

    const cover = $('div.summary_image img').attr('src')
      || $('img[src*="tnlycdn"]').first().attr('src')
      || null;

    const author = $('div.author-content a').first().text().trim();

    const genres = [];
    $('div.genres-content a').each((_, el) => {
      genres.push($(el).text().trim());
    });

    const statusEl = $('div.post-content_item:contains("Status")');
    const status = statusEl.find('.summary-content').text().trim().toLowerCase() || '';

    const description = $('div.summary__content p').first().text().trim();

    const result = {
      id: mangaId,
      title,
      cover,
      author,
      status,
      description,
      tags: genres,
    };

    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(mangaId) {
    const cacheKey = `tn:chapters:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/serie/${mangaId}/`);
    const $ = cheerio.load(html);

    const chapters = [];
    $('li.wp-manga-chapter a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      const chMatch = text.match(/Chapter\s+([\d.]+)/i);
      if (!chMatch) return;

      const chNum = chMatch[1];
      const chTitle = text.replace(/Chapter\s+[\d.]+\s*[-–]?\s*/i, '').trim();

      chapters.push({
        id: `${mangaId}::${chNum}`,
        chapter: chNum,
        title: chTitle || null,
        volume: null,
        language: 'en',
        scanlator: 'Toonily',
        pages: null,
        publishedAt: null,
      });
    });

    chapters.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));

    const result = { chapters, externalCount: 0, hasMore: false, total: chapters.length };
    cache.set(cacheKey, result);
    return result;
  }

  async getPageUrls(chapterId) {
    const cacheKey = `tn:pages:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const [slug, chNum] = chapterId.split('::');
    const url = `${BASE}/serie/${slug}/chapter-${chNum}/`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const pages = [];
    $('img.wp-manga-chapter-img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (!src || src.includes('999.png') || src.includes('discord')) return;
      pages.push({
        index: pages.length,
        url: src.trim(),
        headers: { Referer: `${BASE}/` },
      });
    });

    cache.set(cacheKey, pages);
    return pages;
  }
}
