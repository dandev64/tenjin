import db from '../db.js';
import { getPageUrls, proxyImageUrl } from '../api.js';

export async function getChapterBookmark(source, mangaId, chapterId) {
  return db.bookmarks.get([source, mangaId, chapterId]);
}

export async function getMangaBookmarks(source, mangaId) {
  const bookmarks = await db.bookmarks.where('source').equals(source).toArray();
  return bookmarks.filter(bookmark => bookmark.mangaId === mangaId);
}

export async function getBookmarks(source) {
  const bookmarks = await db.bookmarks.where('source').equals(source).toArray();
  return bookmarks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function toggleChapterBookmark(bookmark) {
  const key = [bookmark.source, bookmark.mangaId, bookmark.chapterId];
  if (await db.bookmarks.get(key)) {
    await db.bookmarks.delete(key);
    return false;
  }
  await db.bookmarks.put({ ...bookmark, updatedAt: Date.now() });
  return true;
}

export async function getOfflineChapter(source, mangaId, chapterId) {
  const chapter = await db.offlineChapters.get([source, mangaId, chapterId]);
  if (!chapter) return null;

  return {
    ...chapter,
    pages: await db.offlinePages
      .where('[source+mangaId+chapterId]')
      .equals([source, mangaId, chapterId])
      .sortBy('pageIndex'),
  };
}

export function getOfflineChapterInfo(source, mangaId, chapterId) {
  return db.offlineChapters.get([source, mangaId, chapterId]);
}

export async function getDownloadedChapters(source) {
  const chapters = await db.offlineChapters.where('source').equals(source).toArray();
  return chapters.sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function downloadChapter({ source, mangaId, chapter, mangaTitle, onProgress }) {
  const key = [source, mangaId, chapter.id];
  await db.offlinePages
    .where('[source+mangaId+chapterId]')
    .equals([source, mangaId, chapter.id])
    .delete();
  await db.offlineChapters.delete(key);

  try {
    const pageList = await getPageUrls(source, chapter.id);
    if (!pageList.length) throw new Error('No pages are available to download.');

    for (let index = 0; index < pageList.length; index++) {
      const response = await fetch(proxyImageUrl(pageList[index].url, source));
      if (!response.ok) throw new Error(`Could not download page ${index + 1} (HTTP ${response.status}).`);
      const blob = await response.blob();
      await db.offlinePages.put({
        source,
        mangaId,
        chapterId: chapter.id,
        pageIndex: index,
        url: pageList[index].url,
        blob,
      });
      onProgress?.(index + 1, pageList.length);
    }

    const savedChapter = {
      source,
      mangaId,
      chapterId: chapter.id,
      chapterNum: chapter.chapter || '?',
      chapterTitle: chapter.title || '',
      mangaTitle,
      pageCount: pageList.length,
      downloadedAt: Date.now(),
    };
    await db.offlineChapters.put(savedChapter);
    return savedChapter;
  } catch (error) {
    await db.offlinePages
      .where('[source+mangaId+chapterId]')
      .equals([source, mangaId, chapter.id])
      .delete();
    throw error;
  }
}

export async function removeDownloadedChapter(source, mangaId, chapterId) {
  await db.offlinePages
    .where('[source+mangaId+chapterId]')
    .equals([source, mangaId, chapterId])
    .delete();
  await db.offlineChapters.delete([source, mangaId, chapterId]);
}
