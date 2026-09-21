// ============================================
// Admin: bulk lineup entry
// ============================================
import { supabase } from './supabase-client.js';

const fixtureSelect = document.getElementById('fixture-select');
const homeTeamLabel = document.getElementById('home-team-label');
const awayTeamLabel = document.getElementById('away-team-label');
const form = document.getElementById('lineup-form');
const statusEl = document.getElementById('admin-status');

let fixturesById = {};

// ---------- Populate the fixture dropdown ----------
async function loadFixtures() {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id, kickoff_time,
      home_team:home_team_id ( id, name ),
      away_team:away_team_id ( id, name )
    `)
    .order('kickoff_time', { ascending: false });

  if (error) {
    statusEl.textContent = 'Could not load fixtures: ' + error.message;
    return;
  }

  fixturesById = Object.fromEntries(data.map(f => [f.id, f]));

  fixtureSelect.innerHTML = data.map(f => `
    <option value="${f.id}">
      ${new Date(f.kickoff_time).toLocaleDateString()} — ${f.home_team.name} vs ${f.away_team.name}
    </option>
  `).join('');

  updateTeamLabels();
}

function updateTeamLabels() {
  const fixture = fixturesById[fixtureSelect.value];
  if (!fixture) return;
  homeTeamLabel.textContent = fixture.home_team.name;
  awayTeamLabel.textContent = fixture.away_team.name;
}

fixtureSelect.addEventListener('change', updateTeamLabels);

// ---------- Parse a textarea of "number, name" lines ----------
// Accepts "7, Sam Kerr" or "7 Sam Kerr" (comma optional) — one player per line.
function parseLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^(\d+)\s*,?\s*(.+)$/);
      if (!match) return null;
      return { shirt_number: parseInt(match[1], 10), player_name: match[2].trim() };
    })
    .filter(Boolean);
}

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Saving…';

  const fixture = fixturesById[fixtureSelect.value];
  if (!fixture) {
    statusEl.textContent = 'Pick a fixture first.';
    return;
  }

  const homeStarters = parseLines(form.home_starters.value);
  const homeSubs = parseLines(form.home_subs.value);
  const awayStarters = parseLines(form.away_starters.value);
  const awaySubs = parseLines(form.away_subs.value);

  const rows = [
    ...buildRows(fixture.id, fixture.home_team.id, homeStarters, true),
    ...buildRows(fixture.id, fixture.home_team.id, homeSubs, false),
    ...buildRows(fixture.id, fixture.away_team.id, awayStarters, true),
    ...buildRows(fixture.id, fixture.away_team.id, awaySubs, false),
  ];

  if (rows.length === 0) {
    statusEl.textContent = 'Nothing to save — paste some players first.';
    return;
  }

  const { error } = await supabase.from('lineups').insert(rows);

  if (error) {
    console.error('Error saving lineups:', error);
    statusEl.textContent = 'Error: ' + error.message;
    return;
  }

  statusEl.textContent = `Saved ${rows.length} players.`;
  form.reset();
});

function buildRows(fixtureId, teamId, players, isStarting) {
  return players.map((p, index) => ({
    fixture_id: fixtureId,
    team_id: teamId,
    player_name: p.player_name,
    shirt_number: p.shirt_number,
    is_starting: isStarting,
    sort_order: index,
  }));
}

loadFixtures();
