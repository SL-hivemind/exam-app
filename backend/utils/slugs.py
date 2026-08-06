"""URL slugs for public content.

Course pages were reachable only as /public/course/3. An opaque integer
carries no keywords, so the page had nothing to rank on beyond its body text —
a hard ceiling on how well the catalog could ever be found. A slug puts the
subject in the URL itself.

Slugs are generated once and then treated as stable. Changing one breaks every
inbound link and discards whatever ranking the old URL had earned, so the
detail route keeps resolving IDs forever rather than redirecting them away.
"""
import re
import unicodedata

MAX_SLUG_LENGTH = 200


def slugify(text, fallback='course'):
    """A lowercase, hyphenated, ASCII-only slug.

    Transliterates rather than strips accents, so 'Física' becomes 'fisica'
    and not 'fsica'.
    """
    if not text:
        return fallback

    value = unicodedata.normalize('NFKD', str(text))
    value = value.encode('ascii', 'ignore').decode('ascii')
    value = value.lower()
    value = re.sub(r'[^a-z0-9]+', '-', value).strip('-')
    value = re.sub(r'-{2,}', '-', value)

    if len(value) > MAX_SLUG_LENGTH:
        # Cut at a word boundary; a slug ending mid-word reads like a bug.
        value = value[:MAX_SLUG_LENGTH].rsplit('-', 1)[0]

    return value or fallback


def unique_slug(base, exists):
    """Append -2, -3 ... until `exists(candidate)` is False."""
    candidate = base
    suffix = 2
    while exists(candidate):
        candidate = f'{base}-{suffix}'
        suffix += 1
    return candidate


def looks_like_id(value):
    """Is this path segment a bare integer rather than a slug?"""
    return bool(re.fullmatch(r'\d+', str(value or '')))
