import { fetchJSON } from '../lib/http.js';
import cache from '../lib/cache.js';

const API = process.env.COMICK_API || 'https://api.comick.io';

function mapManga(item) {
  const md = item.md_comics || item.md_comic || item;
  return {
    id: item.slug || md.slug || item.hid,
    title: md.title || item.title || 'Untitled',
    description: md.desc || item.desc || '',
    author: (item.md_authors || item.authors || []).map(a => a.name || a.title).join(', '),
    status: mapStatus(md.status),
    year: md.year,
    tags: (item.md_comic_md_genres || item.genres || []).map(g => g.md_genres?.name || g.name).filter(Boolean),
    cover: item.md_covers?.[0]?.b2key
      ? `https://meo.comick.pictures/${item.md_covers[0].b2key}`
      : md.cover_url || null,
    contentRating: md.content_rating,
    demographic: md.demographic,
    hid: item.hid || md.hid,
    slug: item.slug || md.slug,
  };
}

function mapStatus(status) {
  const map = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' };
  return map[status] || 'unknown';
}

export class ComickSource {
  id = 'comick';
  name = 'Comick';
  icon = '📚';

  async search(query, page = 1) {
    const data = await fetchJSON(
      `${API}/v1.0/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`
    );
    return {
      manga: (data || []).map(mapManga),
      hasMore: (data || []).length === 20,
      total: null,
    };
  }

  async getPopular(page = 1) {
    const cacheKey = `comick:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/v1.0/search?sort=follow&page=${page}&limit=20`
    );
    const result = {
      manga: (data || []).map(mapManga),
      hasMore: (data || []).length === 20,
      total: null,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    const cacheKey = `comick:latest:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/v1.0/search?sort=uploaded&page=${page}&limit=20`
    );
    const result = {
      manga: (data || []).map(mapManga),
      hasMore: (data || []).length === 20,
      total: null,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getMangaDetails(slug) {
    const cacheKey = `comick:manga:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(`${API}/comic/${slug}`);
    const comic = data.comic;
    const result = {
      id: comic.slug,
      title: comic.title,
      description: comic.desc || '',
      author: (data.authors || []).map(a => a.name).join(', '),
      status: mapStatus(comic.status),
      year: comic.year,
      tags: (data.genres || []).map(g => g.name || g.group).filter(Boolean),
      cover: comic.cover_url || (comic.md_covers?.[0]?.b2key
        ? `https://meo.comick.pictures/${comic.md_covers[0].b2key}`
        : null),
      contentRating: comic.content_rating,
      demographic: comic.demographic,
      hid: comic.hid,
      slug: comic.slug,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(slug, page = 1) {
    const limit = 100;
    const data = await fetchJSON(
      `${API}/comic/${slug}/chapters?lang=en&page=${page}&limit=${limit}`
    );
    return {
      chapters: (data.chapters || []).map(ch => ({
        id: ch.hid,
        chapter: ch.chap,
        title: ch.title || '',
        volume: ch.vol,
        language: ch.lang,
        scanlator: ch.group_name?.join(', ') || ch.md_groups?.map(g => g.title).join(', ') || 'Unknown',
        pages: null,
        publishedAt: ch.created_at || ch.updated_at,
      })),
      hasMore: (data.chapters || []).length === limit,
      total: data.total || null,
    };
  }

  async getPageUrls(chapterId) {
    const cacheKey = `comick:pages:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(`${API}/chapter/${chapterId}`);
    const pages = (data.chapter?.md_images || data.chapter?.images || []).map((img, i) => ({
      index: i,
      url: img.b2key
        ? `https://meo.comick.pictures/${img.b2key}`
        : img.url,
      headers: { Referer: 'https://comick.fun/' },
    }));

    cache.set(cacheKey, pages);
    return pages;
  }
}
