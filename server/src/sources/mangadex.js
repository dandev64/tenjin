import { fetchJSON } from '../lib/http.js';
import cache from '../lib/cache.js';

const API = 'https://api.mangadex.org';

function extractRelationship(relationships, type) {
  return relationships?.find(r => r.type === type);
}

function mapManga(item) {
  const attrs = item.attributes;
  const coverRel = extractRelationship(item.relationships, 'cover_art');
  const authorRel = extractRelationship(item.relationships, 'author');
  const coverFile = coverRel?.attributes?.fileName;

  return {
    id: item.id,
    title: attrs.title?.en || attrs.title?.ja || Object.values(attrs.title || {})[0] || 'Untitled',
    altTitles: attrs.altTitles,
    description: attrs.description?.en || '',
    author: authorRel?.attributes?.name || '',
    status: attrs.status,
    year: attrs.year,
    tags: (attrs.tags || []).map(t => t.attributes?.name?.en).filter(Boolean),
    cover: coverFile
      ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}.256.jpg`
      : null,
    coverFull: coverFile
      ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}`
      : null,
    contentRating: attrs.contentRating,
    demographic: attrs.publicationDemographic,
  };
}

export class MangaDexSource {
  id = 'mangadex';
  name = 'MangaDex';
  icon = '📖';

  async search(query, page = 1) {
    const limit = 20;
    const offset = (page - 1) * limit;
    const data = await fetchJSON(
      `${API}/manga?title=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[relevance]=desc`
    );
    return {
      manga: data.data.map(mapManga),
      hasMore: offset + limit < data.total,
      total: data.total,
    };
  }

  async getPopular(page = 1) {
    const limit = 20;
    const offset = (page - 1) * limit;
    const cacheKey = `mdx:popular:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[followedCount]=desc`
    );
    const result = {
      manga: data.data.map(mapManga),
      hasMore: offset + limit < data.total,
      total: data.total,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getLatest(page = 1) {
    const limit = 20;
    const offset = (page - 1) * limit;
    const cacheKey = `mdx:latest:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[latestUploadedChapter]=desc`
    );
    const result = {
      manga: data.data.map(mapManga),
      hasMore: offset + limit < data.total,
      total: data.total,
    };
    cache.set(cacheKey, result);
    return result;
  }

  async getMangaDetails(mangaId) {
    const cacheKey = `mdx:manga:${mangaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(
      `${API}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`
    );
    const result = mapManga(data.data);
    cache.set(cacheKey, result);
    return result;
  }

  async getChapterList(mangaId, page = 1) {
    const limit = 100;
    const offset = (page - 1) * limit;
    const data = await fetchJSON(
      `${API}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&translatedLanguage[]=en&order[chapter]=asc&includes[]=scanlation_group`
    );
    const allChapters = data.data.map(ch => {
      const group = extractRelationship(ch.relationships, 'scanlation_group');
      return {
        id: ch.id,
        chapter: ch.attributes.chapter,
        title: ch.attributes.title || '',
        volume: ch.attributes.volume,
        language: ch.attributes.translatedLanguage,
        scanlator: group?.attributes?.name || 'Unknown',
        pages: ch.attributes.pages,
        externalUrl: ch.attributes.externalUrl || null,
        publishedAt: ch.attributes.publishAt,
      };
    });

    const readable = allChapters.filter(ch => ch.pages > 0);
    const externalCount = allChapters.filter(ch => ch.externalUrl).length;

    return {
      chapters: readable,
      externalCount,
      hasMore: offset + limit < data.total,
      total: data.total,
    };
  }

  async getPageUrls(chapterId) {
    // MD@Home URLs expire quickly, use short TTL
    const cacheKey = `mdx:pages:${chapterId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await fetchJSON(`${API}/at-home/server/${chapterId}`);
    const base = data.baseUrl;
    const hash = data.chapter.hash;

    const pages = data.chapter.data.map((filename, i) => ({
      index: i,
      url: `${base}/data/${hash}/${filename}`,
      headers: { Referer: 'https://mangadex.org/' },
    }));

    cache.set(cacheKey, pages, { ttl: 1000 * 60 * 10 });
    return pages;
  }
}
