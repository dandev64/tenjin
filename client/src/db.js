import Dexie from 'dexie';

const db = new Dexie('tenjin');

db.version(1).stores({
  library: 'id, source, title, updatedAt',
  readingProgress: '[mangaId+source], mangaId',
  history: '++id, mangaId, source, timestamp',
});

db.version(2).stores({
  library: 'id, source, title, updatedAt',
  readingProgress: '[mangaId+source], mangaId',
  history: '++id, mangaId, source, timestamp',
  bookmarks: '&[source+mangaId+chapterId], source, mangaId, updatedAt',
  offlineChapters: '&[source+mangaId+chapterId], source, mangaId, downloadedAt',
  offlinePages: '&[source+mangaId+chapterId+pageIndex], [source+mangaId+chapterId], source, mangaId, chapterId',
});

export default db;
