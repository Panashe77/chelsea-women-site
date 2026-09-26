// ============================================
// Article loader — reads ?slug=... from the URL, fetches from Supabase
// ============================================
import { supabase } from './supabase-client.js';
import { initComments } from './comments.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

const titleEl = document.getElementById('article-title');
const standfirstEl = document.getElementById('article-standfirst');
const bodyEl = document.getElementById('article-body');
const imageEl = document.getElementById('article-image');
const bylineEl = document.getElementById('article-byline');
const likeBtn = document.getElementById('like-button');
const likeCountEl = document.getElementById('like-count');

async function loadArticle() {
  if (!slug) {
    titleEl.textContent = 'No article specified';
    bodyEl.innerHTML = '<p>Add ?slug=your-article-slug to the URL to load an article.</p>';
    return;
  }

  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, standfirst, body, image_url, published_at, likes')
    .eq('slug', slug)
    .single();

  if (error || !article) {
    console.error('Error loading article:', error);
    titleEl.textContent = 'Article not found';
    bodyEl.innerHTML = `<p>No article exists with the slug "${escapeHtml(slug)}".</p>`;
    return;
  }

  document.title = `${article.title} — Chelsea Women`;
  titleEl.textContent = article.title;

  if (article.standfirst) {
    standfirstEl.textContent = article.standfirst;
    standfirstEl.style.display = '';
  } else {
    standfirstEl.style.display = 'none';
  }

  bylineEl.textContent = new Date(article.published_at).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  if (article.image_url) {
    imageEl.src = article.image_url;
    imageEl.alt = article.title;
    imageEl.style.display = '';
  } else {
    imageEl.style.display = 'none';
  }

  // Body is now written as HTML directly in Supabase — wrap paragraphs in
  // <p> tags yourself, and drop an <img> tag wherever you want a picture.
  bodyEl.innerHTML = article.body;

  // ---------- Likes ----------
  likeCountEl.textContent = article.likes ?? 0;

  const likedKey = `liked-${slug}`;
  if (localStorage.getItem(likedKey)) {
    likeBtn.disabled = true;
    likeBtn.classList.add('is-liked');
  }

  likeBtn.addEventListener('click', async () => {
    if (localStorage.getItem(likedKey)) return;

    likeBtn.disabled = true;
    const { data, error } = await supabase.rpc('increment_article_likes', { input_slug: slug });

    if (error) {
      console.error('Error liking article:', error);
      likeBtn.disabled = false;
      return;
    }

    likeCountEl.textContent = data;
    likeBtn.classList.add('is-liked');
    localStorage.setItem(likedKey, 'true');
  });

  // Now that we know the article's real id, start loading its comments
  initComments(article.id);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadArticle();
