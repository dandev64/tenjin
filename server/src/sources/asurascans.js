import * as cheerio from 'cheerio';
import { fetchJSON } from '../lib/http.js';
import cache from '../lib/cache.js';

const API = 'https://api.asurascans.com/api';
const SITE = 'https://asurascans.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

const publicUrlCache = new Map();

function mapSeries(item) {
  if (item.public_url) {
    publicUrlCache.set(item.slug, item.public_url);
  }
  return {
    id: item.slug,
    title: item.title,
    altTitles: item.alt_titles || [],
    description: (item.description || '').replace(/<[^>]*>/g, ''),
    author: item.author || '',
    artist: item.artist || '',
    status: item.status,
    cover: item.cover || null,
    tags: (item.genres || []).map(g => g.name),
    rating: item.rating,
    type: item.type,
  };
}

export class AsuraScansSource {
  id = 'asurascans';
  name = 'Asura Scans';
  icon = '⚔️';

  async search(query, page = 1) {
    const data = await fetchJSON(
      `${API}/search?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': UA } }
    );
    const manga = (data.data || []).map(mapSeries);
    return { manga, hasMore: false, total: manga.length };
  }

  async getPopular(page = 1) {
    const cacheKey = `asura:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/series?page=${page}&order=rating&order_by=desc`,
      { headers: { 'User-Agent': UA } }
    );
    const manga = (data.data || []).map(mapSeries);
    const result = { manga, hasMore: manga.length >= 20, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    const cacheKey = `asura:latest:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/series?page=${page}&order=last_chapter_at&order_by=desc`,
      { headers: { 'User-Agent': UA } }
    );
    const manga = (data.data || []).map(mapSeries);
    const result = { manga, hasMore: manga.length >= 20, total: null };
    cache.set(cacheKey, result);
    return result;
  }

  async getMangaDetails(mangaId) {
    const cacheKey = `asura:manga:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/search?q=${encodeURIComponent(mangaId)}`,
      { headers: { 'User-Agent': UA } }
    );
    const match = (data.data || []).find(s => s.slug === mangaId);
    if (!match) throw new Error(`Series not found: ${mangaId}`);

    const result = mapSeries(match);
    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(mangaId, page = 1) {
    const cacheKey = `asura:chapters:${mangaId}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/series/${mangaId}/chapters?page=${page}&order=asc`,
      { headers: { 'User-Agent': UA } }
    );

    const chapters = (data.data || [])
      .filter(ch => !ch.is_premium || new Date(ch.early_access_until) <= new Date())
      .map(ch => ({
        id: `${mangaId}::${ch.number}`,
        chapter: String(ch.number),
        title: ch.title || '',
        volume: null,
        language: 'en',
        scanlator: 'Asura Scans',
        pages: ch.page_count || null,
        publishedAt: ch.published_at,
      }))
      .sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));

    const result = {
      chapters,
      externalCount: 0,
      hasMore: chapters.length >= 100,
      total: chapters.length,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getPageUrls(chapterId) {
    const cacheKey = `asura:pages:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const [seriesSlug, chapterNum] = chapterId.split('::');

    let publicPath = publicUrlCache.get(seriesSlug);
    if (!publicPath) {
      const searchData = await fetchJSON(
        `${API}/search?q=${encodeURIComponent(seriesSlug.replace(/-/g, ' '))}`,
        { headers: { 'User-Agent': UA } }
      );
      const match = (searchData.data || []).find(s => s.slug === seriesSlug);
      if (!match) throw new Error(`Series not found: ${seriesSlug}`);
      publicPath = match.public_url;
      publicUrlCache.set(seriesSlug, publicPath);
    }
    const chapterUrl = `${SITE}${publicPath}/chapter/${chapterNum}`;

    const html = await fetchHTML(chapterUrl);
    const $ = cheerio.load(html);

    const pages = [];
    $('img[data-page-index]').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('cdn.asurascans.com')) {
        pages.push({
          index: parseInt($(el).attr('data-page-index'), 10),
          url: src,
          headers: { Referer: `${SITE}/` },
        });
      }
    });

    if (pages.length === 0) throw new Error(`No pages found for chapter ${chapterNum}`);

    pages.sort((a, b) => a.index - b.index);
    cache.set(cacheKey, pages, { ttl: 1000 * 60 * 30 });
    return pages;
  }
}
