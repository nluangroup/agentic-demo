import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'star-catcher',
  'browser',
);
const screenshotsIndex = process.argv.indexOf('--screenshots');
const screenshotsDir = screenshotsIndex === -1 ? null : resolve(process.argv[screenshotsIndex + 1]);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

async function readAsset(urlPath) {
  const file = normalize(join(root, decodeURIComponent(urlPath)));
  if (file !== root && !file.startsWith(root + sep)) {
    return null;
  }
  try {
    return { file, body: await readFile(file) };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  const asset =
    (extname(urlPath) ? await readAsset(urlPath) : null) ?? (await readAsset('/index.html'));
  if (!asset) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(asset.file)] ?? 'application/octet-stream' });
  res.end(asset.body);
});

function fail(message) {
  console.error(`smoke: ${message}`);
  return 1;
}

async function run() {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}/`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    if (/Executable doesn't exist/i.test(String(error?.message))) {
      console.error('smoke: Playwright Chromium is not installed');
      return 2;
    }
    throw error;
  }

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(url);

    const score = page.locator('[data-testid=score]');
    try {
      await score.waitFor({ timeout: 10_000 });
    } catch {
      return fail(
        `[data-testid=score] never appeared. Page errors: ${pageErrors.join('; ') || 'none'}`,
      );
    }
    const text = (await score.textContent())?.trim();
    if (text !== 'Score: 0') {
      return fail(`expected score text "Score: 0", got "${text}"`);
    }

    const hasDrawnPixel = () =>
      page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
          return false;
        }
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bg = [0x0b, 0x10, 0x20];
        for (let i = 0; i < data.length; i += 4) {
          const painted = data[i + 3] > 0;
          if (
            painted &&
            (Math.abs(data[i] - bg[0]) > 16 ||
              Math.abs(data[i + 1] - bg[1]) > 16 ||
              Math.abs(data[i + 2] - bg[2]) > 16)
          ) {
            return true;
          }
        }
        return false;
      });
    let drawn = false;
    for (let attempt = 0; attempt < 10 && !drawn; attempt++) {
      drawn = await hasDrawnPixel();
      if (!drawn) {
        await page.waitForTimeout(200);
      }
    }
    if (!drawn) {
      return fail('canvas only contains the background colour (nothing was drawn)');
    }

    if (screenshotsDir) {
      await page.screenshot({ path: join(screenshotsDir, 'start.png') });
      await page.keyboard.press('Space');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(screenshotsDir, 'playing.png') });
    }
    return 0;
  } finally {
    await browser.close();
  }
}

let code;
try {
  code = await run();
} catch (error) {
  code = fail(error?.stack ?? String(error));
}
server.close();
process.exit(code);
