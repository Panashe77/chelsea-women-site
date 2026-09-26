// ============================================
// Memory Match — player name pairs, with difficulty levels
// ============================================
import { supabase } from './supabase-client.js';

// Full squad pool — levels pull a subset of this list.
// Edit freely; just make sure each level's count below matches.
const ALL_PLAYERS = [
  'Hannah Hampton',
  'Nathalie Björn',
  'Kadeisha Buchanan',
  'Erin Cuthbert',
  'Sam Kerr',
  'Lauren James',
  'Guro Reiten',
  'Mayra Ramírez',
  'Aggie Beever-Jones',
  'Niamh Charles',
  'Sandy Baltimore',
  'Ashley Lawrence',
];

const LEVELS = {
  easy:   { label: 'Easy (6 pairs)',   count: 6,  columns: 4 },
  medium: { label: 'Medium (8 pairs)', count: 8,  columns: 4 },
  hard:   { label: 'Hard (12 pairs)',  count: 12, columns: 6 },
};

const boardEl = document.getElementById('game-board');
const movesEl = document.getElementById('game-moves');
const statusEl = document.getElementById('game-status');
const restartBtn = document.getElementById('game-restart');
const levelButtons = document.querySelectorAll('.level-btn');
const leaderboardListEl = document.getElementById('leaderboard-list');

let cards = [];
let flipped = [];
let matchedCount = 0;
let moves = 0;
let lockBoard = false;
let currentLevel = 'medium';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(levelKey) {
  const { count } = LEVELS[levelKey];
  const players = shuffle(ALL_PLAYERS).slice(0, count);
  const deck = shuffle([...players, ...players]);
  return deck.map((name, index) => ({ id: index, name, isFlipped: false, isMatched: false }));
}

function render() {
  const { columns } = LEVELS[currentLevel];
  boardEl.className = `memory-board board-cols-${columns}`;

  boardEl.innerHTML = cards.map(card => `
    <button class="memory-card ${card.isFlipped || card.isMatched ? 'is-flipped' : ''} ${card.isMatched ? 'is-matched' : ''}"
            data-id="${card.id}"
            ${card.isMatched ? 'disabled' : ''}
            aria-label="${card.isFlipped || card.isMatched ? card.name : 'Hidden card'}">
      <span class="memory-card-inner">
        <span class="memory-card-back">CFC</span>
        <span class="memory-card-front">${escapeHtml(card.name)}</span>
      </span>
    </button>
  `).join('');

  movesEl.textContent = moves;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function startGame(levelKey) {
  currentLevel = levelKey;
  cards = buildDeck(levelKey);
  flipped = [];
  matchedCount = 0;
  moves = 0;
  lockBoard = false;
  statusEl.textContent = '';

  levelButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.level === levelKey);
  });

  loadLeaderboard(levelKey);
  render();
}

boardEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.memory-card');
  if (!btn || lockBoard) return;

  const id = parseInt(btn.dataset.id, 10);
  const card = cards.find(c => c.id === id);
  if (!card || card.isFlipped || card.isMatched) return;

  card.isFlipped = true;
  flipped.push(card);
  render();

  if (flipped.length === 2) {
    moves++;
    const [first, second] = flipped;

    if (first.name === second.name) {
      first.isMatched = true;
      second.isMatched = true;
      matchedCount += 2;
      flipped = [];
      render();

      if (matchedCount === cards.length) {
        statusEl.textContent = `You won ${LEVELS[currentLevel].label} in ${moves} moves! 🔵`;
        saveScore(currentLevel, moves);
      }
    } else {
      lockBoard = true;
      setTimeout(() => {
        first.isFlipped = false;
        second.isFlipped = false;
        flipped = [];
        lockBoard = false;
        render();
      }, 800);
    }
  }
});

restartBtn.addEventListener('click', () => startGame(currentLevel));

levelButtons.forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.level));
});

// ---------- Leaderboard ----------
async function saveScore(level, moveCount) {
  const name = prompt('New best run! Enter your name for the leaderboard:');
  if (!name || !name.trim()) return;

  const { error } = await supabase
    .from('leaderboard')
    .insert({ level, player_name: name.trim().slice(0, 30), moves: moveCount });

  if (error) {
    console.error('Error saving score:', error);
    return;
  }

  loadLeaderboard(level);
}

async function loadLeaderboard(level) {
  if (!leaderboardListEl) return;
  leaderboardListEl.innerHTML = '<p class="commentsLoading">Loading…</p>';

  const { data, error } = await supabase
    .from('leaderboard')
    .select('player_name, moves, created_at')
    .eq('level', level)
    .order('moves', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardListEl.innerHTML = '<p>Could not load the leaderboard.</p>';
    return;
  }

  if (!data || data.length === 0) {
    leaderboardListEl.innerHTML = '<p>No scores yet for this level — be the first!</p>';
    return;
  }

  leaderboardListEl.innerHTML = `
    <ol class="leaderboard-list">
      ${data.map(row => `
        <li><span class="leaderboard-name">${escapeHtml(row.player_name)}</span><span class="leaderboard-moves">${row.moves} moves</span></li>
      `).join('')}
    </ol>
  `;
}

startGame(currentLevel);
