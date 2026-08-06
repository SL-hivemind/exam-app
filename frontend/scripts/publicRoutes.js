/**
 * The public URL surface, in one place.
 *
 * Shared by the sitemap generator and the prerenderer so the two can never
 * disagree — a URL in the sitemap that was never prerendered is served as an
 * empty shell to a crawler, and a prerendered page missing from the sitemap
 * is one Google has to stumble across.
 */

const path = require('path');

// Load the same .env files CRA does, so these scripts see the same API URL
// that got compiled into the bundle. Without this Node falls back to the
// production API while the built page calls localhost, and the prerenderer
// waits forever for data the browser was never going to fetch.
for (const file of ['.env.local', '.env']) {
  require('dotenv').config({ path: path.join(__dirname, '..', file) });
}

const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://exams.theslpl.in')
  .replace(/\/+$/, '');

const API_URL = (process.env.REACT_APP_SITEMAP_API_URL
  || process.env.REACT_APP_API_URL
  || 'https://sl-exams.onrender.com').replace(/\/+$/, '');

// Hand-maintained pages. Login and register are listed at low priority: they
// are legitimate destinations for someone searching the brand, but they must
// never outrank the content pages.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0, prerender: true },
  { path: '/public', changefreq: 'daily', priority: 0.9, prerender: true },
  { path: '/thinklets', changefreq: 'weekly', priority: 0.8, prerender: true },
  { path: '/quick', changefreq: 'monthly', priority: 0.5, prerender: true },
  { path: '/public/login', changefreq: 'yearly', priority: 0.3, prerender: false },
  { path: '/public/register', changefreq: 'yearly', priority: 0.3, prerender: false },
  { path: '/login', changefreq: 'yearly', priority: 0.3, prerender: false },
];

/** Published courses, or null when the API cannot be reached. */
async function fetchCourses() {
  const url = `${API_URL}/public/courses`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return Array.isArray(body.courses) ? body.courses : [];
  } catch (err) {
    console.warn(`[seo] could not reach ${url}: ${err.message}`);
    return null;
  }
}

/** A course's public path. Prefers the slug; the id keeps working forever. */
function coursePath(course) {
  return `/public/course/${course.slug || course.id}`;
}

module.exports = { SITE_URL, API_URL, STATIC_ROUTES, fetchCourses, coursePath };
