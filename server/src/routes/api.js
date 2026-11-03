import { Router } from 'express';
import { getSource, getAllSources } from '../sources/index.js';
import { proxyImage } from '../services/imageProxy.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
  });
});

router.get('/sources', (req, res) => {
  res.json(getAllSources());
});

router.get('/proxy/image', proxyImage);

function withSource(handler) {
  return async (req, res, next) => {
    const source = getSource(req.params.source);
    if (!source) {
      return res.status(404).json({ error: `Unknown source: ${req.params.source}` });
    }
    req.source = source;
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error(`[${req.params.source}] ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  };
}

router.get('/:source/popular', withSource(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await req.source.getPopular(page);
  res.json(result);
}));

router.get('/:source/latest', withSource(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await req.source.getLatest(page);
  res.json(result);
}));

router.get('/:source/search', withSource(async (req, res) => {
  const { q, page } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
  const result = await req.source.search(q, parseInt(page) || 1);
  res.json(result);
}));

router.get('/:source/manga/:id', withSource(async (req, res) => {
  const result = await req.source.getMangaDetails(req.params.id);
  res.json(result);
}));

router.get('/:source/manga/:id/chapters', withSource(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const result = await req.source.getChapterList(req.params.id, page);
  res.json(result);
}));

router.get('/:source/chapter/:id/pages', withSource(async (req, res) => {
  const result = await req.source.getPageUrls(req.params.id);
  res.json(result);
}));

export default router;
