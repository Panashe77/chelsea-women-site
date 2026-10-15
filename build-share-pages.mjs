// ============================================
// Builds one tiny "share page" per article at  a/<slug>/index.html
//
// Why: article.html fills itself in with JavaScript, but the bots that make
// link previews (Reddit, WhatsApp, X, Discord) don't run JavaScript, so every
// article link would show the same generic card. These pages have the
// article's own title, description and image in plain HTML for those bots,
// and send real visitors straight on to the article.
//
// Share links like  https://<site>/a/<slug>/  instead of article.html?slug=...
//
// Runs in GitHub Actions (see build-share-pages.yml). Needs Node 18+.
// ============================================
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://panashe77.github.io/chelsea-women-site').replace(/\/+$/, '');
const OUT_DIR = process.env.OUT_DIR || 'a';
const SITE_NAME = 'Chelsea Women';
const DEFAULT_IMAGE = `${SITE_URL}/share-default.png`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).trim() + '…';
}

export function isSafeSlug(slug) {
  return typeof slug === 'string' && /^[A-Za-z0-9_-]+$/.test(slug);
}

export function renderSharePage(article) {
  const slug = encodeURIComponent(article.slug);
  const shareUrl = `${SITE_URL}/a/${slug}/`;
  const articleUrl = `${SITE_URL}/article.html?slug=${slug}`;

  const title = article.title || SITE_NAME;
  const description = truncate(stripTags(article.standfirst) || stripTags(article.body) || `Read this on ${SITE_NAME}.`);
  const image = /^https:\/\//i.test(article.image_url || '') ? article.image_url : DEFAULT_IMAGE;
  const published = article.published_at ? new Date(article.published_at).toISOString() : '';

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const su = escapeHtml(shareUrl);
  const au = escapeHtml(articleUrl);
  // JSON string, with "<" escaped so it can never close the script tag
  const auJs = JSON.stringify(articleUrl).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} | ${SITE_NAME}</title>
<meta name="description" content="${d}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${su}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="article">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${su}">
<meta property="og:image" content="${img}">
${published ? `<meta property="article:published_time" content="${escapeHtml(published)}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<script>location.replace(${auJs});</script>
</head>
<body>
<p><a href="${au}">${t}</a></p>
<noscript><p>Open the article on ${SITE_NAME}: <a href="${au}">${t}</a></p></noscript>
</body>
</html>
`;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set.');
  }

  const url = `${SUPABASE_URL}/rest/v1/articles?select=slug,title,standfirst,body,image_url,published_at&order=published_at.desc`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY } });

  if (!res.ok) {
    throw new Error(`Supabase returned ${res.status}: ${await res.text()}`);
  }

  const articles = await res.json();

  // Only wipe the old pages once we know the fetch worked
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  for (const article of articles) {
    if (!isSafeSlug(article.slug)) {
      console.warn(`Skipping slug with unsupported characters: ${JSON.stringify(article.slug)}`);
      continue;
    }
    await mkdir(`${OUT_DIR}/${article.slug}`, { recursive: true });
    await writeFile(`${OUT_DIR}/${article.slug}/index.html`, renderSharePage(article));
    written++;
  }

  console.log(`Wrote ${written} share page(s) to ${OUT_DIR}/`);
}

// Only run when executed directly (not when imported by a test)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
