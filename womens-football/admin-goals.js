// ============================================
// Admin: bulk goal entry
// ============================================
import { supabase } from './supabase-client.js';

const fixtureSelect = document.getElementById('fixture-select');
const homeTeamLabel = document.getElementById('home-team-label');
const awayTeamLabel = document.getElementById('away-team-label');
const form = document.getElementById('goals-form');
const statusEl = document.getElementById('admin-status');

let fixturesById = {};

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

// Parses lines like:
//   23, Kerr
//   45, Buchanan, og
// (minute, name, optional "og" for own goal)
function parseLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      const minute = parseInt(parts[0], 10);
      const playerName = parts[1];
      const isOwnGoal = parts[2] && parts[2].toLowerCase() === 'og';
      if (isNaN(minute) || !playerName) return null;
      return { minute, player_name: playerName, is_own_goal: !!isOwnGoal };
    })
    .filter(Boolean);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Saving…';

  const fixture = fixturesById[fixtureSelect.value];
  if (!fixture) {
    statusEl.textContent = 'Pick a fixture first.';
    return;
  }

  const homeGoals = parseLines(form.home_goals.value);
  const awayGoals = parseLines(form.away_goals.value);

  const rows = [
    ...homeGoals.map(g => ({ ...g, fixture_id: fixture.id, team_id: fixture.home_team.id })),
    ...awayGoals.map(g => ({ ...g, fixture_id: fixture.id, team_id: fixture.away_team.id })),
  ];

  if (rows.length === 0) {
    statusEl.textContent = 'Nothing to save — add some goals first.';
    return;
  }

  const { error } = await supabase.from('goals').insert(rows);

  if (error) {
    console.error('Error saving goals:', error);
    statusEl.textContent = 'Error: ' + error.message;
    return;
  }

  statusEl.textContent = `Saved ${rows.length} goal(s).`;
  form.reset();
});

loadFixtures();
