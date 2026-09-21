// ============================================
// Homepage — loads a real article list from Supabase
// ============================================
import { supabase } from './supabase-client.js';

const featuredEl = document.getElementById('featured-article');
const gridEl = document.getElementById('article-grid');

async function loadArticles() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, title, standfirst, body, image_url, published_at')
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error loading articles:', error);
    featuredEl.innerHTML = '<p>Could not load articles right now.</p>';
    return;
  }

  if (!articles || articles.length === 0) {
    featuredEl.innerHTML = '<p>No articles yet — add one in Supabase to see it here.</p>';
    return;
  }

  const [latest, ...rest] = articles;

  // ---------- Featured (most recent) article ----------
  featuredEl.innerHTML = `
    <a href="article.html?slug=${encodeURIComponent(latest.slug)}">
      <img src="${latest.image_url || placeholderImage()}" class="featuredImage" alt="${escapeHtml(latest.title)}">
      <h2 class="featuredTitle">${escapeHtml(latest.title)}</h2>
      <p class="featuredExcerpt">${escapeHtml(latest.standfirst || excerpt(stripTags(latest.body)))}</p>
      <span class="featuredDate">${formatDate(latest.published_at)}</span>
    </a>
  `;

  // ---------- Remaining articles as a grid ----------
  if (rest.length === 0) {
    gridEl.innerHTML = '';
    return;
  }

  gridEl.innerHTML = rest.map(article => `
    <article class="articleCard">
      <a href="article.html?slug=${encodeURIComponent(article.slug)}">
        <img src="${article.image_url || placeholderImage()}" class="cardImage" alt="${escapeHtml(article.title)}">
        <h3 class="cardTitle">${escapeHtml(article.title)}</h3>
        <span class="cardDate">${formatDate(article.published_at)}</span>
      </a>
    </article>
  `).join('');
}

function stripTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function excerpt(body, length = 140) {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > length ? flat.slice(0, length).trim() + '…' : flat;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function placeholderImage() {
  return 'https://placehold.co/800x450/1a1a1a/ffffff?text=The+Women%27s+Game';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadArticles();