import * as cheerio from 'cheerio';
import cache from '../lib/cache.js';

const BASE = 'https://mangapill.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function dedupeTitle(title) {
  const half = Math.floor(title.length / 2);
  const first = title.substring(0, half).trim();
  const second = title.substring(half).trim();
  if (first === second) return first;
  return title;
}

function parseSearchResults(html) {
  const $ = cheerio.load(html);
  const manga = [];
  const seen = new Set();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/^\/manga\/(\d+)\/([\w-]+)/);
    if (!match) return;

    const img = $(el).find('img');
    if (!img.length) return;

    const id = match[1] + '/' + match[2];
    if (seen.has(id)) return;
    seen.add(id);

    manga.push({
      id,
      title: dedupeTitle((img.attr('alt') || '').replace(/\s+/g, ' ').trim()),
      cover: img.attr('src') || img.attr('data-src') || null,
    });
  });

  return manga;
}

export class MangaPillSource {
  id = 'mangapill';
  name = 'MangaPill';
  icon = '💊';

  async search(query, page = 1) {
    const html = await fetchHTML(`${BASE}/search?q=${encodeURIComponent(query)}&page=${page}`);
    const manga = parseSearchResults(html);
    return { manga, hasMore: manga.length >= 20, total: null };
  }

  async getPopular(page = 1) {
    const cacheKey = `mp:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/`);
    const result = { manga: parseSearchResults(html), hasMore: false, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    return this.getPopular(page);
  }

  async getMangaDetails(mangaId) {
    const cacheKey = `mp:manga:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/manga/${mangaId}`);
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim();
    const coverImg = $('img').filter((_, el) => {
      const src = $(el).attr('src') || '';
      return src.includes('mangap') || src.includes('cover');
    }).first();

    const genres = [];
    $('a[href*="/search?genre"]').each((_, el) => {
      genres.push($(el).text().trim());
    });

    const result = {
      id: mangaId,
      title,
      description: $('div.limit-html p').text().trim() || $('p.text-sm').text().trim(),
      author: $('a[href*="/search?author"]').first().text().trim(),
      status: $('label:contains("Status")').next().text().trim().toLowerCase() ||
              $('div:contains("Status")').find('a, span').last().text().trim().toLowerCase(),
      cover: coverImg.attr('src') || null,
      tags: genres,
    };

    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(mangaId) {
    const cacheKey = `mp:chapters:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/manga/${mangaId}`);
    const $ = cheerio.load(html);

    const chapters = [];
    $('a[href*="/chapters/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      const chNum = text.match(/Chapter\s+([\d.]+)/i)?.[1] || '';

      chapters.push({
        id: href.replace(/^\/chapters\//, ''),
        chapter: chNum,
        title: text,
        volume: null,
        language: 'en',
        scanlator: 'MangaPill',
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
    const cacheKey = `mp:pages:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/chapters/${chapterId}`);
    const $ = cheerio.load(html);

    const pages = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src.includes('mangap') || src.includes('cdn.read')) {
        pages.push({
          index: pages.length,
          url: src,
          headers: { Referer: `${BASE}/` },
        });
      }
    });

    cache.set(cacheKey, pages);
    return pages;
  }
}
