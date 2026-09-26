// ============================================
// Memory Match — player name pairs
// ============================================

// Edit this list any time to change the roster in the game.
// Needs an even spread — each name appears exactly twice automatically.
const PLAYERS = [
  'Hannah Hampton',
  'Nathalie Björn',
  'Kadeisha Buchanan',
  'Erin Cuthbert',
  'Sam Kerr',
  'Lauren James',
  'Guro Reiten',
  'Mayra Ramírez',
];

const boardEl = document.getElementById('game-board');
const movesEl = document.getElementById('game-moves');
const statusEl = document.getElementById('game-status');
const restartBtn = document.getElementById('game-restart');

let cards = [];
let flipped = [];
let matchedCount = 0;
let moves = 0;
let lockBoard = false;

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck() {
  const deck = shuffle([...PLAYERS, ...PLAYERS]);
  return deck.map((name, index) => ({ id: index, name, isFlipped: false, isMatched: false }));
}

function render() {
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

function startGame() {
  cards = buildDeck();
  flipped = [];
  matchedCount = 0;
  moves = 0;
  lockBoard = false;
  statusEl.textContent = '';
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
        statusEl.textContent = `You won in ${moves} moves! 🔵`;
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

restartBtn.addEventListener('click', startGame);

startGame();
