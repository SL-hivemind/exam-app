/**
 * Build-time sitemap generation.
 *
 * The sitemap listed seven hardcoded URLs and no course pages at all, so the
 * entire catalog — the only content that grows, and the only content anyone
 * searches for — was invisible to search engines.
 *
 * Generated at build time rather than served from Flask. Flask never serves
 * the SPA (no static_folder, no catch-all; production is waitress serving the
 * API only), so a /sitemap.xml route would land on the API origin. Google
 * requires the sitemap to sit on the same host as the URLs it lists.
 *
 * FAILS SOFT. If the API is unreachable the existing files are left exactly
 * as they are. Shipping an empty sitemap is far worse than shipping a stale
 * one: it actively tells Google the site has no pages.
 *
 * Run automatically by `npm run build` via the prebuild hook.
 */
const fs = require('fs');
const path = require('path');

const { SITE_URL, STATIC_ROUTES, fetchCourses, coursePath } = require('./publicRoutes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const escapeXml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const isoDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

function urlset(entries) {
  const body = entries.map(({ loc, lastmod, changefreq, priority }) => [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority.toFixed(1)}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function sitemapIndex(files, lastmod) {
  const body = files.map((f) => [
    '  <sitemap>',
    `    <loc>${SITE_URL}/${f}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '  </sitemap>',
  ].join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const courses = await fetchCourses();
  if (courses === null) {
    console.warn('[seo] sitemap NOT regenerated — leaving the existing files in place.');
    console.warn('[seo] an empty sitemap would tell Google this site has no pages.');
    return;
  }

  const staticEntries = STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    lastmod: today,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  const courseEntries = courses.map((c) => ({
    loc: `${SITE_URL}${coursePath(c)}`,
    // A real timestamp or none at all. An invented lastmod teaches crawlers
    // to ignore the field across the whole file.
    lastmod: isoDate(c.updated_at) || isoDate(c.created_at),
    changefreq: 'weekly',
    priority: 0.8,
  }));

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-static.xml'), urlset(staticEntries));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-courses.xml'), urlset(courseEntries));
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'sitemap.xml'),
    sitemapIndex(['sitemap-static.xml', 'sitemap-courses.xml'], today),
  );

  const withoutSlug = courses.filter((c) => !c.slug).length;
  if (withoutSlug) {
    console.warn(`[seo] ${withoutSlug} course(s) still have no slug and fell back to numeric URLs.`);
    console.warn('[seo] run backend/migrate_add_course_slugs.py against this database.');
  }

  console.log(`[seo] sitemap written: ${staticEntries.length} static + ${courseEntries.length} course URLs`);
  console.log(`[seo] host: ${SITE_URL}`);
}

main().catch((err) => {
  // Still soft: a sitemap problem must not block a deploy that is otherwise
  // fine. The prerender step, by contrast, fails the build — a half-rendered
  // page gets served to real people, whereas a stale sitemap does not.
  console.warn(`[seo] sitemap generation failed: ${err.message}`);
});
