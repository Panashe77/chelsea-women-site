// ============================================
// "Play today's Chelsea Wordle" box for article pages
// Add to article.html with:  <script src="wordle-promo.js"></script>
// It adds its own styling, so style.css doesn't need changing.
// ============================================
(function () {
  if (document.querySelector('.wordle-promo')) return;   // never add it twice

  // Same UTC day the game itself uses
  const todayKey = new Date().toISOString().slice(0, 10);

  // What has this reader done today? Read from the game's own saved progress.
  function todaysProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem('chelsea-wordle') || 'null');
      if (!saved || saved.date !== todayKey) return { state: 'new' };
      if (saved.gameOver) return { state: 'done' };
      const used = Array.isArray(saved.guesses) ? saved.guesses.length : 0;
      return used > 0 ? { state: 'partway', used } : { state: 'new' };
    } catch {
      return { state: 'new' };
    }
  }

  const progress = todaysProgress();

  const copy = {
    new: {
      title: 'Think you know your Chelsea?',
      text: 'Today’s Chelsea Wordle is waiting: one football word, six guesses, the same word for every fan.',
      button: 'Play today’s Wordle',
    },
    partway: {
      title: 'You’re partway through today’s Wordle',
      text: `You’ve used ${progress.used} of 6 guesses. Pick up where you left off.`,
      button: 'Finish today’s Wordle',
    },
    done: {
      title: 'You’ve played today’s Wordle',
      text: 'Share your result, or come back tomorrow for a new word.',
      button: 'See your result',
    },
  }[progress.state];

  const style = document.createElement('style');
  style.textContent = `
    .wordle-promo{
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
      margin: 2rem 0; padding: 1.25rem 1.5rem;
      background: #e8f0fb; border-radius: 8px;
    }
    .wordle-promo-title{
      font-size: 1.0625rem; font-weight: 700; color: #034694; margin-bottom: .25rem;
    }
    .wordle-promo-text{
      font-size: .9375rem; font-weight: 400; line-height: 1.4; color: #2d2d2d;
      max-width: 28rem;
    }
    .wordle-promo a.wordle-promo-btn:link,
    .wordle-promo a.wordle-promo-btn:visited{
      display: inline-block; white-space: nowrap;
      padding: .7rem 1.4rem; border-radius: 999px;
      background: #034694; color: #ffffff;
      font-size: .9375rem; font-weight: 700;
    }
    .wordle-promo a.wordle-promo-btn:hover{
      background: #045bb5;
    }
  `;
  document.head.appendChild(style);

  const box = document.createElement('section');
  box.className = 'wordle-promo';

  const left = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'wordle-promo-title';
  title.textContent = copy.title;
  const text = document.createElement('div');
  text.className = 'wordle-promo-text';
  text.textContent = copy.text;
  left.append(title, text);

  const button = document.createElement('a');
  button.className = 'wordle-promo-btn';
  button.href = 'wordle.html';
  button.textContent = copy.button;

  box.append(left, button);

  // Sit just above the comments; fall back to the end of the article
  const comments = document.querySelector('.comments');
  if (comments) {
    comments.before(box);
  } else {
    (document.querySelector('article') || document.body).append(box);
  }
})();
