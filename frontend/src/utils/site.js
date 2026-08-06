// One place that knows what this site is called.
//
// The canonical tag, the sitemap, robots.txt and every transactional email
// each carried their own copy of the domain, and they had drifted apart: the
// SEO tags claimed www.slexams.com, a domain that is not ours, while the app
// actually serves from exams.theslpl.in. A canonical pointing at a foreign
// host does not merely fail to help — it tells Google the real page is
// somewhere else, and suppresses the pages that do exist.

export const SITE_URL = (
  process.env.REACT_APP_SITE_URL || 'https://exams.theslpl.in'
).replace(/\/+$/, '');

export const SITE_NAME = 'SL Exams';
export const ORG_NAME = 'Saaradaa Learknowations Pvt Ltd';

/** Absolute URL for a path. Always canonical-host, never window.location —
 *  the Render hosts serve the identical build and must not self-canonicalise. */
export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const DEFAULT_OG_IMAGE = absoluteUrl('/SLlogo.png');

/** A course's public URL. Prefers the slug; falls back to the id. */
export function courseUrl(course) {
  return `/public/course/${course?.slug || course?.id}`;
}
