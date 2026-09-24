// ============================================
// Fixtures list + league table — reads from Supabase
// ============================================
import { supabase } from './supabase-client.js';

// ---------- Fixtures ----------
async function loadFixtures() {
  const container = document.getElementById('fixtures-list');
  if (!container) return; // this page doesn't have a fixtures section

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, kickoff_time, home_score, away_score, status, home_manager, away_manager,
      home_team:home_team_id ( id, name, logo_url ),
      away_team:away_team_id ( id, name, logo_url )
    `)
    .order('kickoff_time', { ascending: true });

  if (error) {
    console.error('Error loading fixtures:', error);
    container.innerHTML = '<p>Could not load fixtures.</p>';
    return;
  }

  if (!fixtures || fixtures.length === 0) {
    container.innerHTML = '<p>No fixtures yet.</p>';
    return;
  }

  // Fetch every lineup entry for these fixtures in one go, then group them
  const fixtureIds = fixtures.map(f => f.id);
  const { data: lineupRows, error: lineupError } = await supabase
    .from('lineups')
    .select('fixture_id, team_id, player_name, shirt_number, is_starting, sort_order')
    .in('fixture_id', fixtureIds)
    .order('sort_order', { ascending: true });

  if (lineupError) {
    console.error('Error loading lineups:', lineupError);
  }

  const lineupsByFixture = {};
  (lineupRows || []).forEach(row => {
    if (!lineupsByFixture[row.fixture_id]) lineupsByFixture[row.fixture_id] = {};
    if (!lineupsByFixture[row.fixture_id][row.team_id]) lineupsByFixture[row.fixture_id][row.team_id] = [];
    lineupsByFixture[row.fixture_id][row.team_id].push(row);
  });

  // Fetch every goal for these fixtures in one go, then group them
  const { data: goalRows, error: goalError } = await supabase
    .from('goals')
    .select('fixture_id, team_id, player_name, minute, is_own_goal')
    .in('fixture_id', fixtureIds)
    .order('minute', { ascending: true });

  if (goalError) {
    console.error('Error loading goals:', goalError);
  }

  const goalsByFixture = {};
  (goalRows || []).forEach(row => {
    if (!goalsByFixture[row.fixture_id]) goalsByFixture[row.fixture_id] = {};
    if (!goalsByFixture[row.fixture_id][row.team_id]) goalsByFixture[row.fixture_id][row.team_id] = [];
    goalsByFixture[row.fixture_id][row.team_id].push(row);
  });

  container.innerHTML = fixtures.map(f => {
    const date = new Date(f.kickoff_time).toLocaleString();
    const isFinished = f.status === 'finished';

    const fixtureLineups = lineupsByFixture[f.id] || {};
    const homeLineup = fixtureLineups[f.home_team.id] || [];
    const awayLineup = fixtureLineups[f.away_team.id] || [];

    const fixtureGoals = goalsByFixture[f.id] || {};
    const homeGoals = fixtureGoals[f.home_team.id] || [];
    const awayGoals = fixtureGoals[f.away_team.id] || [];

    const hasLineups = homeLineup.length > 0 || awayLineup.length > 0;
    const hasGoals = isFinished && (homeGoals.length > 0 || awayGoals.length > 0);

    const scoreBlock = isFinished ? `
      <span class="fixture-score-big">
        <span>${f.home_score}</span>
        <span class="fixture-score-divider"></span>
        <span>${f.away_score}</span>
      </span>
      <span class="fixture-status-line">FT</span>
    ` : `
      <span class="fixture-status-line fixture-status-upcoming">${date}</span>
    `;

    return `
      <div class="fixture-card">
        <div class="fixture-teams-row">
          <div class="fixture-team-col">
            ${crest(f.home_team.logo_url, f.home_team.name)}
            <span class="fixture-team-label">${f.home_team.name}</span>
          </div>

          <div class="fixture-score-col">
            ${scoreBlock}
          </div>

          <div class="fixture-team-col">
            ${crest(f.away_team.logo_url, f.away_team.name)}
            <span class="fixture-team-label">${f.away_team.name}</span>
          </div>
        </div>

        ${f.home_manager || f.away_manager ? `
          <div class="fixture-managers-line">
            ${escapeHtml(f.home_manager || '—')} &middot; ${escapeHtml(f.away_manager || '—')}
          </div>
        ` : ''}

        ${hasGoals ? `
          <div class="fixture-goals">
            <span class="fixture-goals-home">${goalsLine(homeGoals)}</span>
            <span class="fixture-goals-away">${goalsLine(awayGoals)}</span>
          </div>
        ` : ''}
      ${hasLineups ? `
        <details class="fixture-lineups-toggle">
          <summary>View lineups</summary>
          <div class="fixture-lineups">
            ${lineupColumn(f.home_team.name, homeLineup)}
            ${lineupColumn(f.away_team.name, awayLineup)}
          </div>
        </details>
      ` : ''}
      </div>
    `;
  }).join('');
}

// ---------- Renders one team's starting XI + subs list ----------
function lineupColumn(teamName, players) {
  const starting = players.filter(p => p.is_starting);
  const subs = players.filter(p => !p.is_starting);

  return `
    <div class="lineup-column">
      <h4 class="lineup-team">${escapeHtml(teamName)}</h4>
      <ul class="lineup-list">
        ${starting.map(p => `<li><span class="shirt-number">${p.shirt_number ?? ''}</span> ${escapeHtml(p.player_name)}</li>`).join('')}
      </ul>
      ${subs.length > 0 ? `
        <p class="lineup-subs-heading">Subs</p>
        <ul class="lineup-list lineup-subs">
          ${subs.map(p => `<li><span class="shirt-number">${p.shirt_number ?? ''}</span> ${escapeHtml(p.player_name)}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

// ---------- League table ----------
async function loadStandings() {
  const container = document.getElementById('league-table');
  if (!container) return; // this page doesn't have a table section

  const { data, error } = await supabase
    .from('standings')
    .select(`
      played, won, drawn, lost, goals_for, goals_against, points,
      team:team_id ( name, logo_url )
    `)
    .order('points', { ascending: false });

  if (error) {
    console.error('Error loading standings:', error);
    container.innerHTML = '<p>Could not load the league table.</p>';
    return;
  }

  const rows = data.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="teamCell">${badge(row.team.logo_url, row.team.name)} ${row.team.name}</td>
      <td>${row.played}</td>
      <td>${row.won}</td>
      <td>${row.drawn}</td>
      <td>${row.lost}</td>
      <td>${row.goals_for - row.goals_against}</td>
      <td>${row.points}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------- Formats a team's goals as "Kerr 23', James 67' (og)" ----------
function goalsLine(goals) {
  if (goals.length === 0) return '';
  return goals.map(g => {
    const minute = g.minute != null ? `${g.minute}'` : '';
    const og = g.is_own_goal ? ' (og)' : '';
    return `${escapeHtml(g.player_name)} ${minute}${og}`;
  }).join(', ');
}

// ---------- Bigger centered crest for the match card layout ----------
function crest(logoUrl, teamName) {
  if (!logoUrl) return '<div class="fixture-crest-placeholder"></div>';
  return `<img src="${logoUrl}" alt="${teamName} badge" class="fixture-crest">`;
}

// ---------- Shared badge renderer ----------
function badge(logoUrl, teamName) {
  if (!logoUrl) return '';
  return `<img src="${logoUrl}" alt="${teamName} badge" class="teamBadge">`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadFixtures();
loadStandings();
