// ============================================
// Comments — load approved comments, post new ones
// ============================================
// Call initComments(articleId) once you know which article you're on.
// (Previously this read the id from a data-article-id attribute at load
// time; now the article id comes from Supabase after a slug lookup, so
// the caller passes it in directly instead.)

import { supabase } from './supabase-client.js';

export function initComments(articleId) {
  const listEl = document.getElementById('comments-list');
  const formEl = document.getElementById('comment-form');
  const statusEl = document.getElementById('comment-status');

  // ---------- Load and render approved comments ----------
  async function loadComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('author_name, body, created_at')
      .eq('article_id', articleId)
      .eq('approved', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      listEl.innerHTML = '<p>Could not load comments right now.</p>';
      return;
    }

    if (data.length === 0) {
      listEl.innerHTML = '<p>No comments yet — be the first!</p>';
      return;
    }

    listEl.innerHTML = data.map(comment => `
      <div class="comment">
        <strong>${escapeHtml(comment.author_name)}</strong>
        <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
        <p>${escapeHtml(comment.body)}</p>
      </div>
    `).join('');
  }

  // ---------- Handle new comment submission ----------
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const authorName = formEl.author_name.value.trim();
    const body = formEl.body.value.trim();
    const honeypot = formEl.website.value; // hidden field, real users leave it blank

    if (honeypot) {
      formEl.reset();
      return;
    }

    if (!authorName || !body) {
      statusEl.textContent = 'Please fill in both your name and a comment.';
      return;
    }

    if (body.length > 1000) {
      statusEl.textContent = 'Comments are limited to 1000 characters.';
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert({ article_id: articleId, author_name: authorName, body });

    if (error) {
      console.error('Error posting comment:', error);
      statusEl.textContent = 'Something went wrong posting your comment.';
      return;
    }

    statusEl.textContent = 'Thanks! Your comment will appear once it\'s approved.';
    formEl.reset();
  });

  loadComments();
}

// ---------- Basic HTML escaping to prevent injected markup ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}