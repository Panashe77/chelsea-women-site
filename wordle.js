// ============================================
// Chelsea Wordle — daily puzzle, same word for everyone
// ============================================

// Five-letter football terms + Chelsea player names/nicknames.
// Add more any time — just keep them exactly 5 letters.
const WORDS = [
  'BLUES', 'JAMES', 'WALSH', 'HAYES', 'TITLE', 'DERBY', 'SAVES',
  'FOULS', 'CARDS', 'VENUE', 'TEAMS', 'SQUAD', 'ROUND', 'GROUP',
  'STAGE', 'FINAL', 'AGGIE', 'NIAMH', 'SANDY', 'MAYRA', 'GOALS',
  'PITCH', 'BENCH', 'MATCH', 'EUROS', 'DRAWS',
];

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// Same puzzle for every visitor on a given calendar day
const EPOCH = new Date('2026-01-01T00:00:00Z');
const daysSinceEpoch = Math.floor((Date.now() - EPOCH.getTime()) / 86400000);
const todayKey = new Date().toISOString().slice(0, 10); // e.g. "2026-10-04"
const TARGET = WORDS[daysSinceEpoch % WORDS.length];

const boardEl = document.getElementById('wordle-board');
const keyboardEl = document.getElementById('wordle-keyboard');
const messageEl = document.getElementById('wordle-message');

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','BACK'],
];

let guesses = [];      // array of past guess strings
let currentGuess = '';
let gameOver = false;

// ---------- Persistence: one play per day ----------
function loadState() {
  const saved = localStorage.getItem('chelsea-wordle');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return parsed.date === todayKey ? parsed : null;
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem('chelsea-wordle', JSON.stringify({
    date: todayKey,
    guesses,
    gameOver,
  }));
}

// ---------- Scoring: handles duplicate letters correctly ----------
function scoreGuess(guess) {
  const result = Array(WORD_LENGTH).fill('gray');
  const targetLetters = TARGET.split('');
  const guessLetters = guess.split('');
  const remaining = {};

  // First pass: exact matches (green), tally leftover target letters
  guessLetters.forEach((letter, i) => {
    if (letter === targetLetters[i]) {
      result[i] = 'green';
      targetLetters[i] = null;
    } else {
      remaining[targetLetters[i]] = (remaining[targetLetters[i]] || 0) + (targetLetters[i] ? 1 : 0);
    }
  });

  // Recount remaining (excluding already-matched positions)
  const freq = {};
  targetLetters.forEach(l => { if (l) freq[l] = (freq[l] || 0) + 1; });

  // Second pass: yellow if letter exists elsewhere, not already used up
  guessLetters.forEach((letter, i) => {
    if (result[i] === 'green') return;
    if (freq[letter] > 0) {
      result[i] = 'yellow';
      freq[letter]--;
    }
  });

  return result;
}

// ---------- Rendering ----------
function render() {
  const rows = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i] ?? (i === guesses.length ? currentGuess : '');
    const isSubmitted = i < guesses.length;
    const scores = isSubmitted ? scoreGuess(guess) : [];

    const tiles = [];
    for (let j = 0; j < WORD_LENGTH; j++) {
      const letter = guess[j] || '';
      const stateClass = isSubmitted ? `tile-${scores[j]}` : (letter ? 'tile-filled' : '');
      tiles.push(`<div class="wordle-tile ${stateClass}">${letter}</div>`);
    }
    rows.push(`<div class="wordle-row">${tiles.join('')}</div>`);
  }
  boardEl.innerHTML = rows.join('');
  renderKeyboard();
}

function renderKeyboard() {
  const letterStates = {}; // letter -> best known state
  guesses.forEach(guess => {
    const scores = scoreGuess(guess);
    guess.split('').forEach((letter, i) => {
      const state = scores[i];
      const rank = { gray: 0, yellow: 1, green: 2 };
      if (!letterStates[letter] || rank[state] > rank[letterStates[letter]]) {
        letterStates[letter] = state;
      }
    });
  });

  keyboardEl.innerHTML = KEY_ROWS.map(row => `
    <div class="wordle-key-row">
      ${row.map(key => {
        const isSpecial = key === 'ENTER' || key === 'BACK';
        const stateClass = letterStates[key] ? `key-${letterStates[key]}` : '';
        const label = key === 'BACK' ? '⌫' : key;
        return `<button class="wordle-key ${isSpecial ? 'wordle-key-wide' : ''} ${stateClass}" data-key="${key}">${label}</button>`;
      }).join('')}
    </div>
  `).join('');
}

// ---------- Input handling ----------
function handleKey(key) {
  if (gameOver) return;

  if (key === 'BACK') {
    currentGuess = currentGuess.slice(0, -1);
  } else if (key === 'ENTER') {
    submitGuess();
    return;
  } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key;
  }
  render();
}

function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    showMessage('Not enough letters');
    return;
  }

  guesses.push(currentGuess);
  const won = currentGuess === TARGET;
  currentGuess = '';

  if (won) {
    gameOver = true;
    showMessage(`You got it in ${guesses.length}! 🔵`);
  } else if (guesses.length === MAX_GUESSES) {
    gameOver = true;
    showMessage(`Out of guesses — it was ${TARGET}`);
  }

  saveState();
  render();
}

function showMessage(text) {
  messageEl.textContent = text;
}

document.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  if (key === 'ENTER') handleKey('ENTER');
  else if (key === 'BACKSPACE') handleKey('BACK');
  else if (/^[A-Z]$/.test(key)) handleKey(key);
});

keyboardEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.wordle-key');
  if (btn) handleKey(btn.dataset.key);
});

// ---------- Restore today's progress, if any ----------
const saved = loadState();
if (saved) {
  guesses = saved.guesses;
  gameOver = saved.gameOver;
  if (gameOver) {
    const won = guesses[guesses.length - 1] === TARGET;
    showMessage(won ? `You got it in ${guesses.length}! 🔵` : `Out of guesses — it was ${TARGET}`);
  }
}

render();
