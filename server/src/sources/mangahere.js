import * as cheerio from 'cheerio';
import cache from '../lib/cache.js';

const BASE = 'https://www.mangahere.cc';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function unpackEncode(c, a) {
  return (c < a ? '' : unpackEncode(Math.floor(c / a), a)) +
    ((c % a) > 35 ? String.fromCharCode((c % a) + 29) : (c % a).toString(36));
}

function unpackJS(packed) {
  const m = packed.match(/}\('(.+)',(\d+),(\d+),'([^']+)'\.split/s);
  if (!m) return '';
  const [, p, a, c, k] = m;
  const base = parseInt(a);
  let count = parseInt(c);
  const words = k.split('|');
  const dict = {};
  while (count--) {
    dict[unpackEncode(count, base)] = words[count] || unpackEncode(count, base);
  }
  return p.replace(/\b\w+\b/g, tok => dict[tok] !== undefined ? dict[tok] : tok);
}

function getImageUrl(decoded) {
  const pixMatch = decoded.match(/\bpix="([^"]+)"/);
  const pathsMatch = decoded.match(/\bpvalue\s*=\s*(\[[^\]]*\])/);
  if (!pixMatch || !pathsMatch) return null;

  const [imagePath] = JSON.parse(pathsMatch[1]);
  if (typeof imagePath !== 'string') return null;

  if (imagePath.startsWith('//')) return `https:${imagePath}`;

  const base = new URL(`https:${pixMatch[1].replace(/\/+$/, '')}/`);
  const imageUrl = new URL(imagePath.replace(/^\/+/, ''), base);
  if (/\/images\/war\.jpg$/i.test(imageUrl.pathname)) return null;
  return imageUrl.href;
}

function parseCatalog(html) {
  const $ = cheerio.load(html);
  const manga = [];
  const seen = new Set();

  $('.manga-list-1-list > li, .manga-list-4-list > li').each((_, el) => {
    const item = $(el);
    const anchor = item.find('a[href^="/manga/"]').filter((__, link) => {
      return /^\/manga\/[^/]+\/?$/.test($(link).attr('href') || '');
    }).first();
    const href = anchor.attr('href') || '';
    const slug = href.match(/^\/manga\/([^/]+)/)?.[1];
    if (!slug || seen.has(slug)) return;

    const title = anchor.attr('title') || anchor.text().trim();
    if (!title || title === 'Ongoing' || title === 'Completed') return;

    seen.add(slug);
    manga.push({
      id: slug,
      title,
      cover: item.find('img').first().attr('src')
        || item.find('img').first().attr('data-src')
        || null,
    });
  });

  return manga;
}

export class MangaHereSource {
  id = 'mangahere';
  name = 'MangaHere';
  icon = '📕';
  nsfw = true;

  async search(query, page = 1) {
    const html = await fetchHTML(`${BASE}/search?title=${encodeURIComponent(query)}&page=${page}`);
    const $ = cheerio.load(html);
    const manga = [];

    $('.manga-list-4-list > li').each((_, el) => {
      const a = $(el).find('a[href^="/manga/"]').first();
      const href = a.attr('href') || '';
      const slug = href.match(/^\/manga\/([^/]+)/)?.[1];
      if (!slug) return;

      const title = a.attr('title') || a.text().trim();
      if (!title || title === 'Ongoing' || title === 'Completed') return;

      const cover = $(el).find('img').first().attr('src') || null;
      manga.push({ id: slug, title, cover });
    });

    return { manga, hasMore: manga.length >= 20, total: null };
  }

  async getPopular(page = 1) {
    const cacheKey = `mh:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const path = page > 1 ? `/ranking/${page}.htm` : '/ranking/';
    const html = await fetchHTML(`${BASE}${path}`);
    const manga = parseCatalog(html);

    const result = { manga, hasMore: manga.length >= 20, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    const cacheKey = `mh:latest:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const path = page > 1 ? `/latest/${page}.htm` : '/latest/';
    const html = await fetchHTML(`${BASE}${path}`);
    const manga = parseCatalog(html);
    const result = { manga, hasMore: manga.length >= 20, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getMangaDetails(mangaId) {
    const cacheKey = `mh:manga:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/manga/${mangaId}/`);
    const $ = cheerio.load(html);

    const title = $('span.detail-info-right-title-font').text().trim()
      || $('title').text().replace(/ Manga.*/, '').trim();

    const cover = $('img.detail-info-cover-img').attr('src') || null;
    const author = $('p.detail-info-right-say a').first().text().trim();

    const genres = [];
    $('a[href^="/directory/"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    const statusText = $('span.detail-info-right-title-tip').text().trim().toLowerCase();
    const description = $('p.fullcontent').text().trim()
      || $('p.detail-info-right-content').text().trim();

    const result = {
      id: mangaId,
      title,
      cover,
      author,
      status: statusText.includes('ongoing') ? 'ongoing' : statusText.includes('completed') ? 'completed' : statusText,
      description,
      tags: genres,
    };

    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(mangaId) {
    const cacheKey = `mh:chapters:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const html = await fetchHTML(`${BASE}/manga/${mangaId}/`);
    const $ = cheerio.load(html);

    const chapters = [];
    const seen = new Set();
    $('a[href*="/1.html"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      let pathname;
      try {
        pathname = new URL(href, BASE).pathname;
      } catch {
        return;
      }
      const chMatch = pathname.match(/^\/manga\/([^/]+)\/c(\d+(?:\.\d+)?)\/1\.html$/);
      if (!chMatch || chMatch[1] !== mangaId) return;
      const chNum = chMatch[2];
      if (seen.has(chNum)) return;
      seen.add(chNum);

      const titleText = $(el).attr('title') || $(el).text().trim();
      const chTitle = titleText.replace(/.*Ch\.\d+(?:\.\d+)?\s*/i, '').trim();

      chapters.push({
        id: `${mangaId}::c${chNum}`,
        chapter: chNum.replace(/^0+/, '') || '0',
        title: chTitle || null,
        volume: null,
        language: 'en',
        scanlator: 'MangaHere',
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
    const cacheKey = `mh:pages:v2:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const [slug, chCode] = chapterId.split('::');
    const chapterUrl = `${BASE}/manga/${slug}/${chCode}/1.html`;
    const html = await fetchHTML(chapterUrl);

    const cidMatch = html.match(/chapterid\s*=\s*(\d+)/);
    const countMatch = html.match(/imagecount\s*=\s*(\d+)/);
    if (!cidMatch || !countMatch) {
      throw new Error(`Could not read MangaHere chapter metadata: ${chapterUrl}`);
    }

    const cid = cidMatch[1];
    const pageCount = parseInt(countMatch[1]);
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new Error(`Invalid MangaHere page count for chapter ${chapterId}`);
    }

    const pages = [];
    for (let firstPage = 1; firstPage <= pageCount; firstPage += 2) {
      const batchSize = Math.min(2, pageCount - firstPage + 1);
      const batch = await Promise.all(Array.from({ length: batchSize }, async (_, offset) => {
        const pageNumber = firstPage + offset;
        const ashxRes = await fetch(
          `${BASE}/manga/${slug}/chapterfun.ashx?cid=${cid}&page=${pageNumber}&key=`,
          { headers: { 'User-Agent': UA, Referer: chapterUrl } },
        );
        if (!ashxRes.ok) {
          throw new Error(`HTTP ${ashxRes.status} fetching MangaHere page ${pageNumber}`);
        }

        const imageUrl = getImageUrl(unpackJS(await ashxRes.text()));
        if (!imageUrl) {
          throw new Error(`Could not resolve MangaHere image URL for page ${pageNumber}`);
        }

        return {
          index: pageNumber - 1,
          url: imageUrl,
          headers: { Referer: `${BASE}/` },
        };
      }));
      pages.push(...batch);
    }

    cache.set(cacheKey, pages);
    return pages;
  }
}
