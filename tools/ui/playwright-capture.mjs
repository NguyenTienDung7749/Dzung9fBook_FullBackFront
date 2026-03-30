import { mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const DEFAULT_PORT = 4173;
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const DEFAULT_WAIT_MS = 300;
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

const parseArgs = function (argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith('--')) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = argv[index + 1];

    if (!nextValue || nextValue.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = nextValue;
    index += 1;
  }

  return options;
};

const parseViewport = function (value) {
  if (!value) {
    return DEFAULT_VIEWPORT;
  }

  const match = String(value).trim().match(/^(\d+)x(\d+)$/i);

  if (!match) {
    throw new Error(`Viewport không hợp lệ: ${value}. Dùng dạng 1920x1080.`);
  }

  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
};

const normalizePathname = function (value) {
  if (!value) {
    return '/index.html';
  }

  const pathname = String(value).trim();
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const startStaticServer = async function (preferredPort) {
  const preferredRoot = path.resolve(process.cwd(), 'public');
  const rootDir = await stat(preferredRoot)
    .then((stats) => (stats.isDirectory() ? preferredRoot : process.cwd()))
    .catch(() => process.cwd());
  const createStaticServer = function (activePort) {
    return createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${activePort}`);
        const normalizedPath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
        const filePath = path.resolve(rootDir, `.${normalizedPath}`);

        if (!filePath.startsWith(rootDir)) {
          response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Forbidden');
          return;
        }

        try {
          const fileStats = await stat(filePath);

          if (!fileStats.isFile()) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Not found');
            return;
          }
        } catch (error) {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES.get(extension) || 'application/octet-stream';

        response.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store'
        });

        createReadStream(filePath).pipe(response);
      } catch (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Server error');
      }
    });
  };

  for (let port = preferredPort; port < preferredPort + 15; port += 1) {
    const server = createStaticServer(port);

    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
      });

      return { server, port };
    } catch (error) {
      await new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });

      if (error?.code !== 'EADDRINUSE') {
        throw error;
      }
    }
  }

  throw new Error(`Không tìm được cổng trống trong dải ${preferredPort}-${preferredPort + 14}.`);
};

const stopStaticServer = async function (serverProcess) {
  if (!serverProcess) {
    return;
  }

  await new Promise((resolve) => {
    serverProcess.close(() => {
      resolve();
    });
  });
};

const main = async function () {
  const options = parseArgs(process.argv.slice(2));
  const port = Number(options.port || DEFAULT_PORT);
  const viewport = parseViewport(options.viewport);
  const pathname = normalizePathname(options.path);
  const outputPath = path.resolve(options.output || '.playwright-artifacts/capture.png');
  const selector = typeof options.selector === 'string' ? options.selector.trim() : '';
  const waitMs = Number(options.wait || DEFAULT_WAIT_MS);
  const headed = Boolean(options.headed);
  const fullPage = Boolean(options['full-page']);

  await mkdir(path.dirname(outputPath), { recursive: true });

  let serverProcess;
  let browser;

  try {
    const serverState = await startStaticServer(port);
    serverProcess = serverState.server;
    const activePort = serverState.port;
    const activeBaseUrl = `http://127.0.0.1:${activePort}`;
    const activeTargetUrl = typeof options.url === 'string' ? options.url.trim() : `${activeBaseUrl}${pathname}`;
    browser = await chromium.launch({ headless: !headed });

    const page = await browser.newPage({ viewport });
    await page.goto(activeTargetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(waitMs);

    if (selector) {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible' });
      await locator.screenshot({ path: outputPath });
    } else {
      await page.screenshot({
        path: outputPath,
        fullPage
      });
    }

    console.log(`Captured: ${outputPath}`);
    console.log(`Source: ${activeTargetUrl}`);
    console.log(`Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`Port: ${activePort}`);
    if (selector) {
      console.log(`Selector: ${selector}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }

    await stopStaticServer(serverProcess);
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
