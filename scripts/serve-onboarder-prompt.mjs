import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const allowedPrefix = join(root, 'prompts', 'onboarder', 'v1');
const defaultPort = 8767;

const contentTypes = new Map([
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function parsePort(argv) {
  const index = argv.indexOf('--port');
  if (index === -1) return defaultPort;
  const raw = argv[index + 1];
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('--port must be an integer from 1 to 65535');
  }
  return port;
}

function sendCors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', '*');
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const absolutePath = normalize(join(root, pathname));

  if (
    absolutePath !== allowedPrefix &&
    !absolutePath.startsWith(`${allowedPrefix}${sep}`)
  ) {
    return null;
  }

  return absolutePath;
}

const port = parsePort(process.argv.slice(2));
const server = createServer((request, response) => {
  sendCors(response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' });
    response.end('method not allowed');
    return;
  }

  const absolutePath = resolveRequestPath(request.url ?? '/');
  if (!absolutePath || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    response.writeHead(404);
    response.end('not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes.get(extname(absolutePath)) ?? 'application/octet-stream',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(absolutePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(
    `serving onboarder prompt package from ${allowedPrefix} at http://127.0.0.1:${port}/prompts/onboarder/v1/manifest.json`,
  );
});
