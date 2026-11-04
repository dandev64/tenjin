import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors({
    origin: config.corsOrigins.length > 0
      ? config.corsOrigins
      : true,
  }));

  app.use((req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const apiPath = url.searchParams.get('__path');
    if (apiPath) {
      url.searchParams.delete('__path');
      req.url = `/api${apiPath}${url.search}`;
    }
    next();
  });

  app.use('/api', apiRouter);

  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
