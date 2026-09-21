// ============================================
// All Articles page — lists every article, no featured/latest split
// ============================================
import { supabase } from './supabase-client.js';

const listEl = document.getElementById('all-articles');

async function loadAllArticles() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, title, standfirst, image_url, published_at')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error loading articles:', error);
    listEl.innerHTML = '<p>Could not load articles right now.</p>';
    return;
  }

  if (!articles || articles.length === 0) {
    listEl.innerHTML = '<p>No articles yet.</p>';
    return;
  }

  listEl.innerHTML = articles.map(article => `
    <article class="articleCard">
      <a href="article.html?slug=${encodeURIComponent(article.slug)}">
        <img src="${article.image_url || placeholderImage()}" class="cardImage" alt="${escapeHtml(article.title)}">
        <h3 class="cardTitle">${escapeHtml(article.title)}</h3>
        ${article.standfirst ? `<p class="cardExcerpt">${escapeHtml(article.standfirst)}</p>` : ''}
        <span class="cardDate">${formatDate(article.published_at)}</span>
      </a>
    </article>
  `).join('');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function placeholderImage() {
  return 'https://placehold.co/800x450/034694/ffffff?text=Chelsea+Women';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadAllArticles();