import db from '../db.js';

export async function saveProgress(source, mangaId, chapterId, chapterNum, page) {
  await db.readingProgress.put({
    mangaId,
    source,
    chapterId,
    chapterNum,
    page,
    updatedAt: Date.now(),
  });
}

export async function getProgress(source, mangaId) {
  return db.readingProgress.get({ mangaId, source });
}

export async function addToHistory(source, mangaId, title, cover) {
  const existing = await db.history
    .where({ mangaId, source })
    .first();
  if (existing) {
    await db.history.update(existing.id, { timestamp: Date.now() });
  } else {
    await db.history.add({ mangaId, source, title, cover, timestamp: Date.now() });
  }
}

export async function getHistory(limit = 20) {
  return db.history.orderBy('timestamp').reverse().limit(limit).toArray();
}
