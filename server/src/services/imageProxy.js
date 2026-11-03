import { Readable } from 'stream';
import { fetchStream } from '../lib/http.js';

const SOURCE_HEADERS = {
  mangadex: { Referer: 'https://mangadex.org/' },
  mangafire: { Referer: 'https://mangapill.com/' },
};

export async function proxyImage(req, res) {
  const { url, source } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const headers = SOURCE_HEADERS[source] || {};
    const upstream = await fetchStream(url, headers);

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = upstream.body.getReader();
    const stream = new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      },
    });
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch image' });
    }
  }
}
