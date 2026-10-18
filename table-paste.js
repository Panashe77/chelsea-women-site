// ============================================
// Parse a league table pasted from a website (Sky, BBC, ESPN, etc.)
// Pure functions only (no DOM), so they can be tested on their own.
// ============================================

const NUMBER = /^[+\-\u2212]?\d+$/;          // 12, +11, -6 (also the unicode minus)
const SCORE_PAIR = /^(\d+)[:\-](\d+)$/;     // "17:6" or "17-6" (goals for:against in one cell)

const NOISE_WORDS = new Set(['fc', 'afc', 'wfc', 'women', 'womens', 'ladies', 'the']);

// Spelling variations of the same club. Keys and values are normalised (see normalizeName).
const ALIASES = {
  'man city': 'manchester city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'spurs': 'tottenham',
  'tottenham hotspur': 'tottenham',
  'brighton and hove albion': 'brighton',
  'brighton hove albion': 'brighton',
  'london city lionesses': 'london city',
};

export function normalizeName(name) {
  const cleaned = String(name ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(w => w && !NOISE_WORDS.has(w));
  const joined = words.join(' ');
  return ALIASES[joined] ?? joined;
}

// Find the single team in `teams` ({id, name}) that a pasted name refers to.
export function matchTeam(pastedName, teams) {
  const target = normalizeName(pastedName).split(' ');
  if (!target[0]) return { team: null, reason: 'empty name' };

  const isPrefix = (a, b) => a.length <= b.length && a.every((w, i) => w === b[i]);

  const exact = [];
  const partial = [];
  for (const team of teams) {
    const candidate = normalizeName(team.name).split(' ');
    if (candidate.join(' ') === target.join(' ')) exact.push(team);
    else if (isPrefix(target, candidate) || isPrefix(candidate, target)) partial.push(team);
  }

  const hits = exact.length ? exact : partial;
  if (hits.length === 1) return { team: hits[0], reason: null };
  if (hits.length === 0) return { team: null, reason: `no team called "${pastedName}" in your teams table` };
  return { team: null, reason: `"${pastedName}" matches several teams: ${hits.map(t => t.name).join(', ')}` };
}

// Turn pasted text into one object per data row. Header rows (no numbers) are ignored.
// Each row: { raw, name, rank, stats | null, errors[], warnings[] }
export function parseTableText(text) {
  const rows = [];

  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;

    const tokens = line.split(/[\t ]+/);
    let rank = null;

    // optional leading position: "1", "1."
    if (/^\d+\.?$/.test(tokens[0]) && tokens.length > 1 && !NUMBER.test(tokens[1]) && !SCORE_PAIR.test(tokens[1])) {
      rank = parseInt(tokens.shift(), 10);
    }

    // team name = everything up to the first number
    const nameTokens = [];
    while (tokens.length && !NUMBER.test(tokens[0]) && !SCORE_PAIR.test(tokens[0])) {
      nameTokens.push(tokens.shift());
    }

    // numbers = the run of numeric cells after the name (stops at form letters like W D L)
    const numbers = [];
    while (tokens.length && (NUMBER.test(tokens[0]) || SCORE_PAIR.test(tokens[0]))) {
      const token = tokens.shift();
      const pair = token.match(SCORE_PAIR);
      if (pair) numbers.push(parseInt(pair[1], 10), parseInt(pair[2], 10));
      else numbers.push(parseInt(token.replace('\u2212', '-'), 10));
    }

    if (numbers.length === 0) continue;   // header or junk line

    const row = { raw: line, name: nameTokens.join(' '), rank, stats: null, errors: [], warnings: [] };

    if (!row.name) {
      row.errors.push('no team name found');
    } else if (numbers.length >= 8) {
      const [played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points] = numbers;
      row.stats = { played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points };
    } else if (numbers.length === 7) {
      const [played, won, drawn, lost, goalsFor, goalsAgainst, points] = numbers;
      row.stats = { played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff: null, points };
    } else {
      row.errors.push(`expected 7 or 8 numbers (P W D L GF GA [GD] Pts), found ${numbers.length}`);
    }

    if (row.stats) {
      const s = row.stats;
      const negative = [s.played, s.won, s.drawn, s.lost, s.goalsFor, s.goalsAgainst, s.points].some(n => n < 0);
      if (negative) row.errors.push('a column that can’t be negative is negative');
      if (s.won + s.drawn + s.lost !== s.played) row.warnings.push('W + D + L doesn’t equal P');
      if (s.points !== 3 * s.won + s.drawn) row.warnings.push('Pts isn’t 3×W + D (points deduction?)');
      if (s.goalDiff !== null && s.goalDiff !== s.goalsFor - s.goalsAgainst) row.warnings.push('GD doesn’t equal GF − GA');
    }

    rows.push(row);
  }

  return rows;
}

// Combine parsing with team matching; flags duplicates. Returns rows with .team set when matched.
export function buildPreview(text, teams) {
  const rows = parseTableText(text);
  const usedTeamIds = new Set();

  for (const row of rows) {
    row.team = null;
    if (row.errors.length) continue;

    const { team, reason } = matchTeam(row.name, teams);
    if (!team) { row.errors.push(reason); continue; }

    if (usedTeamIds.has(team.id)) { row.errors.push(`${team.name} appears more than once`); continue; }
    usedTeamIds.add(team.id);
    row.team = team;
  }

  return rows;
}

// The database rows to upsert for every row that parsed and matched cleanly.
export function toStandingsRows(previewRows) {
  return previewRows
    .filter(r => r.team && r.stats && r.errors.length === 0)
    .map(r => ({
      team_id: r.team.id,
      played: r.stats.played,
      won: r.stats.won,
      drawn: r.stats.drawn,
      lost: r.stats.lost,
      goals_for: r.stats.goalsFor,
      goals_against: r.stats.goalsAgainst,
      points: r.stats.points,
    }));
}
