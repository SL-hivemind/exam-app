import React, { useEffect } from 'react';
import { SITE_NAME, absoluteUrl, DEFAULT_OG_IMAGE } from '../../utils/site';

/**
 * Drop the fallback tags baked into index.html.
 *
 * React hoists this component's tags into <head>, but it cannot remove the
 * static ones already sitting there — and those come FIRST, which is the copy
 * Google reads. Left in place, every page in the site reports the generic
 * homepage description. They are marked data-default precisely so they can be
 * cleared the moment a real one exists.
 */
function useDropDefaultMeta() {
  useEffect(() => {
    document.head.querySelectorAll('[data-default]').forEach((el) => el.remove());
  }, []);
}

/**
 * Per-route page metadata.
 *
 * Every URL on this site served the same <title> and the same description —
 * "SL EXAMS | Saaradaa Learknowations", on the homepage, the catalog and every
 * course page alike. Search engines had no way to tell the pages apart, and
 * nobody searching for a mock test would ever type that title.
 *
 * No react-helmet. React 19 hoists <title>, <meta> and <link> rendered
 * anywhere in the tree into <head> natively, so the dependency would buy
 * nothing and brings its own React 19 friction.
 *
 * Titles lead with what a stranger would search for and put the brand last.
 * `keywords` is deliberately absent — Google has ignored it for years; the
 * levers that work are title, h1, description and body copy, in that order.
 */
export default function Seo({
  title,
  description,
  path,
  image,
  noindex = false,
  jsonLd,
}) {
  useDropDefaultMeta();

  const fullTitle = title
    ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`)
    : SITE_NAME;
  const canonical = path ? absoluteUrl(path) : undefined;
  // Absolute, always: a relative og:image is silently dropped by every
  // scraper, which is why link previews were showing no picture.
  const ogImage = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </>
  );
}
