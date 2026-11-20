// A pocket static server for previewing the guide locally.
//
//   node serve.ts              serves app/ at http://localhost:8080
//   node serve.ts --port 9090  serves it on another port
//
// It exists so the app can be tried without any tooling: it answers with the
// file under app/ that the URL names (index.html for a folder), with a content
// type a browser understands, and it will not serve anything outside app/.
// Development convenience only — the guide itself needs no server at all.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const argv = process.argv.slice(2);
const flagAt = argv.indexOf('--port');
const wanted = flagAt === -1 ? 8080 : Number(argv[flagAt + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    send(res, 400, 'bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';

  const target = resolve(join(appRoot, normalize(path)));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    send(res, 403, 'forbidden');
    return;
  }

  let length;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('directory');
    length = info.size;
  } catch {
    send(res, 404, 'not found');
    return;
  }

  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Trophy Guide is open at http://localhost:${port}`);
});
