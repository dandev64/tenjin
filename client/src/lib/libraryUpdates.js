import db from '../db.js';
import { getChapterList } from '../api.js';

const CHECK_INTERVAL = 1000 * 60 * 30; // 30 minutes

function highestChapter(chapters) {
  let max = 0;
  for (const ch of chapters) {
    const num = parseFloat(ch.chapter);
    if (num > max) max = num;
  }
  return max;
}

export async function checkLibraryUpdates(source) {
  const entries = await db.library.where('source').equals(source).toArray();
  if (!entries.length) return {};

  const updates = {};

  await Promise.allSettled(
    entries.map(async entry => {
      if (entry.lastCheckedAt && Date.now() - entry.lastCheckedAt < CHECK_INTERVAL) {
        if (entry.latestChapter > (entry.lastKnownChapter || 0)) {
          updates[entry.id] = {
            newChapters: entry.latestChapter - (entry.lastKnownChapter || 0),
            latestChapter: entry.latestChapter,
          };
        }
        return;
      }

      try {
        const data = await getChapterList(source, entry.id, 1);
        const latest = highestChapter(data.chapters);

        await db.library.update(entry.id, {
          latestChapter: latest,
          lastCheckedAt: Date.now(),
        });

        if (latest > (entry.lastKnownChapter || 0)) {
          updates[entry.id] = {
            newChapters: latest - (entry.lastKnownChapter || 0),
            latestChapter: latest,
          };
        }
      } catch (err) {
        console.warn(`Update check failed for ${entry.title}:`, err.message);
      }
    })
  );

  return updates;
}

export async function markAsSeen(mangaId) {
  const entry = await db.library.get(mangaId);
  if (entry?.latestChapter) {
    await db.library.update(mangaId, {
      lastKnownChapter: entry.latestChapter,
    });
  }
}

export async function setLastKnownChapter(mangaId, chapterNum) {
  const current = await db.library.get(mangaId);
  if (!current) return;
  const num = parseFloat(chapterNum);
  if (!num) return;
  if (!current.lastKnownChapter || num > current.lastKnownChapter) {
    await db.library.update(mangaId, { lastKnownChapter: num });
  }
}
