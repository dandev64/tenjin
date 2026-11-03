import Dexie from 'dexie';

const db = new Dexie('tenjin');

db.version(1).stores({
  library: 'id, source, title, updatedAt',
  readingProgress: '[mangaId+source], mangaId',
  history: '++id, mangaId, source, timestamp',
});

export default db;
