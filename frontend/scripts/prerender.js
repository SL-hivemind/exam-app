/**
 * Build-time prerendering for the public pages.
 *
 * This is a client-rendered CRA app whose every route is lazy()-loaded behind
 * a full-screen splash overlay. The raw HTML a crawler receives is that
 * overlay and an empty #root — the per-route <title> and description added in
 * Seo.jsx only exist after React has mounted. Google will run the JS
 * eventually, but "eventually, if we have budget" is a materially worse
 * position than serving the words in the first response.
 *
 * Renders each public route with headless Chrome and writes the resulting DOM
 * to build/<route>/index.html, which a static host serves directly.
 *
 * Not react-snap: unmaintained since ~2020, pins an old Puppeteer, and its
 * ReactDOM.hydrate assumption predates React 18.
 *
 * FAILS THE BUILD on error, unlike the sitemap step. A half-prerendered
 * deploy serves broken pages to real people; a stale sitemap does not.
 * Set PRERENDER=false to skip (useful for a quick local build).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const { STATIC_ROUTES, fetchCourses, coursePath, API_URL } = require('./publicRoutes');

const BUILD_DIR = path.join(__dirname, '..', 'build');
// 3000 on purpose. Course pages fetch from the API while rendering, and the
// backend's CORS allowlist contains http://127.0.0.1:3000 — on any other port
// the browser blocks the request, the course data never arrives, and the page
// would be snapshotted as an empty shell. Override with PRERENDER_PORT only if
// you have also allowlisted that origin.
const PORT = Number(process.env.PRERENDER_PORT || 3000);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary',
  '.tflite': 'application/octet-stream', '.xml': 'application/xml',
};

/**
 * Any Chrome already sitting in the puppeteer cache.
 *
 * puppeteer pins one exact build and refuses to start if that download was
 * interrupted, even when a perfectly good newer Chrome is right beside it.
 * Prerendering does not care about the version.
 */
function findCachedChrome() {
  const cache = path.join(
    process.env.PUPPETEER_CACHE_DIR
      || path.join(process.env.HOME || process.env.USERPROFILE || '', '.cache', 'puppeteer'),
    'chrome',
  );
  if (!fs.existsSync(cache)) return null;

  const candidates = fs.readdirSync(cache)
    .map((dir) => [
      path.join(cache, dir, 'chrome-win64', 'chrome.exe'),
      path.join(cache, dir, 'chrome-linux64', 'chrome'),
      path.join(cache, dir, 'chrome-mac-x64', 'Google Chrome for Testing.app',
        'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(cache, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app',
        'Contents', 'MacOS', 'Google Chrome for Testing'),
    ])
    .flat()
    .filter((p) => fs.existsSync(p))
    .sort();

  return candidates.length ? candidates[candidates.length - 1] : null;
}

/**
 * Static server whose SPA fallback is always the PRISTINE shell.
 *
 * Not the evolving build/index.html. Once the homepage has been prerendered,
 * that file is the homepage snapshot — serve it as the shell for /public and
 * React hydrates the catalog onto homepage markup, inheriting its canonical
 * and its og:url. Every subsequent page then carries two conflicting
 * canonicals, which makes Google discard both.
 *
 * Holding the original in memory also makes the run order irrelevant.
 */
function serve(shellHtml) {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(BUILD_DIR, urlPath);

    if (!filePath.startsWith(BUILD_DIR)) {
      res.writeHead(403).end();
      return;
    }

    const isFile = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    if (!isFile) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(shellHtml);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  }).listen(PORT);
}

async function main() {
  if (process.env.PRERENDER === 'false') {
    console.log('[seo] PRERENDER=false — skipping.');
    return;
  }
  const rootIndex = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(rootIndex)) {
    throw new Error('build/index.html missing — run the build first.');
  }

  // Refuse to prerender a build that has already been prerendered. The server
  // below would serve last run's snapshot as the shell, React would hydrate
  // onto stale markup, and the old canonical and title would survive into the
  // new snapshot. `react-scripts build` wipes build/ first, so this only ever
  // trips when prerender.js is re-run by hand.
  if (fs.readFileSync(rootIndex, 'utf8').includes('data-prerendered')) {
    throw new Error(
      'build/ has already been prerendered. Re-run `npm run build` for a clean build first.',
    );
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    throw new Error('puppeteer is not installed. Run: npm i -D puppeteer');
  }

  // Honour an explicitly supplied browser. CI images usually ship Chrome
  // already, and puppeteer's bundled-version download is the single most
  // fragile step in this script — it pins one exact build and fails outright
  // if that download is interrupted.
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || findCachedChrome();

  const courses = await fetchCourses();
  if (courses === null) {
    console.warn('[seo] API unreachable — prerendering static routes only.');
  }

  // Static routes are REQUIRED: they render from the bundle alone, so a
  // failure there means the build itself is broken and must not ship.
  //
  // Course pages are best-effort. They depend on a live API call completing
  // inside the build container, and that can fail for reasons that have
  // nothing to do with this build — a cold API instance, a slow network, a
  // transient 5xx. A course page that is not prerendered simply behaves the
  // way the whole site did before prerendering existed: it renders client
  // side. Failing the deploy over that is out of proportion to the harm.
  const routes = [
    ...STATIC_ROUTES.filter((r) => r.prerender).map((r) => ({ path: r.path, required: true })),
    ...(courses || []).map((c) => ({ path: coursePath(c), required: false })),
  ];

  console.log(`[seo] API for page data: ${API_URL}`);

  // Wake the API before the browser needs it. Render spins idle services
  // down, and the first request can take the better part of a minute — paid
  // by whichever course page happens to render first, which then looks like
  // a prerender bug rather than a cold start.
  if (routes.some((r) => !r.required)) {
    const started = Date.now();
    try {
      const res = await fetch(`${API_URL}/public/courses`);
      console.log(`[seo] API warm-up: HTTP ${res.status} in ${Date.now() - started}ms`);
    } catch (err) {
      console.warn(`[seo] API warm-up failed after ${Date.now() - started}ms: ${err.message}`);
    }
  }

  // Captured before anything is written over it.
  const shellHtml = fs.readFileSync(rootIndex, 'utf8');
  const server = serve(shellHtml);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(executablePath && { executablePath }),
  });

  let written = 0;
  const skipped = [];
  try {
    for (const { path: route, required } of routes) {
      // One retry. A cold API instance frequently answers the second time.
      const attempts = 2;
      let lastError = null;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          await renderRoute(browser, route, attempt);
          written += 1;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            console.warn(`[seo] ${route} attempt ${attempt} failed (${err.message}) — retrying`);
          }
        }
      }

      if (lastError) {
        if (required) {
          throw new Error(`required route ${route} could not be prerendered: ${lastError.message}`);
        }
        console.warn(`[seo] SKIPPED ${route}: ${lastError.message}`);
        console.warn('[seo]   it will render client-side, as it did before prerendering.');
        skipped.push(route);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (skipped.length) {
    console.warn(`[seo] ${skipped.length} course page(s) not prerendered: ${skipped.join(', ')}`);
  }
  console.log(`[seo] prerendered ${written}/${routes.length} public routes`);
}

/** Render one route and write its snapshot. Throws on failure. */
async function renderRoute(browser, route, attempt) {
  const page = await browser.newPage();
  // A crawler's viewport, so anything gated on a media query renders the way
  // a crawler would see it.
  await page.setViewport({ width: 1280, height: 900 });

  // Collected so a failure says WHY rather than just "timed out". A course
  // page that never finishes has almost always had its API call refused,
  // blocked by CORS, or answered with a 5xx.
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('requestfailed', (r) => {
    failedRequests.push(`${r.failure()?.errorText || 'failed'} ${r.url().slice(0, 120)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`);
  });

  try {
    {
      await page.goto(`http://127.0.0.1:${PORT}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

        // Wait for THIS route's own metadata, not merely for React to mount.
        //
        // A course page renders a loading skeleton immediately, at which point
        // #root has children and document.title still holds the static
        // fallback from index.html — snapshotting there captured the homepage
        // title on every course page. The canonical link is emitted by <Seo>
        // and carries the route, so it only appears once the real page (and,
        // for a course, its fetched data) has rendered.
        await page.waitForFunction(
          (expected) => {
            const root = document.getElementById('root');
            if (!root || root.childElementCount === 0) return false;
            const canonical = document.querySelector('link[rel="canonical"]');
            if (!canonical) return false;
            try {
              return new URL(canonical.href).pathname.replace(/\/$/, '')
                === expected.replace(/\/$/, '');
            } catch {
              return false;
            }
          },
          { timeout: 35000 },
          route,
        );

        const html = await page.evaluate(() => {
          // The loading overlay is the first thing in the source and would
          // otherwise be the first thing a crawler reads.
          document.getElementById('sl-splash')?.remove();
          // Belt and braces. Seo.jsx clears these on mount, but a route that
          // renders no <Seo> would otherwise ship a snapshot with the generic
          // fallback metadata still ahead of nothing at all.
          document.head.querySelectorAll('[data-default]').forEach((el) => el.remove());
          // Mark the document so index.js knows to hydrate rather than
          // discard and re-render this markup.
          document.documentElement.setAttribute('data-prerendered', 'true');
          return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
        });

      const outDir = route === '/' ? BUILD_DIR : path.join(BUILD_DIR, route);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html);

      const title = await page.title();
      console.log(`[seo] ${route}  →  ${title.slice(0, 70)}`);
    }
  } catch (err) {
    // Say why. "Waiting failed: 25000ms exceeded" on its own sends whoever
    // reads the build log hunting through this script instead of at the
    // request that actually failed.
    if (failedRequests.length) {
      console.warn(`[seo]   failed requests on ${route}:`);
      [...new Set(failedRequests)].slice(0, 5).forEach((r) => console.warn(`[seo]     ${r}`));
    }
    if (consoleErrors.length) {
      console.warn(`[seo]   console errors on ${route}:`);
      [...new Set(consoleErrors)].slice(0, 3).forEach((e) => console.warn(`[seo]     ${e}`));
    }
    if (!failedRequests.length && !consoleErrors.length && attempt >= 2) {
      console.warn(`[seo]   no failed requests — the page rendered but never produced`);
      console.warn(`[seo]   a <link rel="canonical"> for ${route}.`);
    }
    throw err;
  } finally {
    await page.close();
  }
}

main().catch((err) => {
  console.error(`[seo] prerender failed: ${err.message}`);
  process.exit(1);
});
