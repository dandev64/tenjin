const BASE = '';

async function request(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function getSources() {
  return request('/api/sources');
}

export function getPopular(source, page = 1) {
  return request(`/api/${source}/popular?page=${page}`);
}

export function getLatest(source, page = 1) {
  return request(`/api/${source}/latest?page=${page}`);
}

export function searchManga(source, query, page = 1) {
  return request(`/api/${source}/search?q=${encodeURIComponent(query)}&page=${page}`);
}

export function getMangaDetails(source, id) {
  return request(`/api/${source}/manga/${encodeURIComponent(id)}`);
}

export function getChapterList(source, mangaId, page = 1) {
  return request(`/api/${source}/manga/${encodeURIComponent(mangaId)}/chapters?page=${page}`);
}

export function getPageUrls(source, chapterId) {
  return request(`/api/${source}/chapter/${encodeURIComponent(chapterId)}/pages`);
}

export function proxyImageUrl(url, source) {
  return `/api/proxy/image?url=${encodeURIComponent(url)}&source=${source}`;
}
