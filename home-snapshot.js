// ============================================
// Homepage snapshot: next match, latest result, mini league table
// ============================================
import { supabase } from './supabase-client.js';

const el = document.getElementById('home-snapshot');
const TEAM_HIGHLIGHT = 'chelsea'; // this team's row is highlighted in the table

const FIXTURE_FIELDS = `
  id, kickoff_time, home_score, away_score, status,
  home_team:home_team_id ( name, logo_url ),
  away_team:away_team_id ( name, logo_url )
`;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function crest(team) {
  return team.logo_url
    ? `<img src="${escapeHtml(team.logo_url)}" alt="" class="snap-crest">`
    : '<div class="snap-crest-empty"></div>';
}

function formatKickoff(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function matchCard(heading, fixture, emptyText, centreHtml, metaHtml) {
  if (!fixture) {
    return `
      <div class="snap-card">
        <h3 class="snap-heading">${heading}</h3>
        <div class="snap-empty">${emptyText}</div>
        <a class="snap-link" href="fixtures.html">All fixtures</a>
      </div>`;
  }

  return `
    <div class="snap-card">
      <h3 class="snap-heading">${heading}</h3>
      <div class="snap-match">
        <div class="snap-team">${crest(fixture.home_team)}${escapeHtml(fixture.home_team.name)}</div>
        <div class="snap-centre">${centreHtml}</div>
        <div class="snap-team">${crest(fixture.away_team)}${escapeHtml(fixture.away_team.name)}</div>
      </div>
      <div class="snap-meta">${metaHtml}</div>
      <a class="snap-link" href="fixtures.html">All fixtures</a>
    </div>`;
}

// Same tiebreakers as the full table: points, goal difference, goals scored
function sortStandings(rows) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdB !== gdA) return gdB - gdA;
    return b.goals_for - a.goals_for;
  });
}

function tableCard(standings) {
  if (!standings || standings.length === 0) {
    return `
      <div class="snap-card">
        <h3 class="snap-heading">League table</h3>
        <div class="snap-empty">The table isn't available yet.</div>
        <a class="snap-link" href="table.html">Full table</a>
      </div>`;
  }

  const sorted = sortStandings(standings);
  const isHighlighted = row => row.team.name.toLowerCase().includes(TEAM_HIGHLIGHT);

  const rowHtml = (row, rank, extraClass = '') => `
    <tr class="${isHighlighted(row) ? 'snap-me' : ''} ${extraClass}">
      <td>${rank}</td>
      <td>${escapeHtml(row.team.name)}</td>
      <td>${row.played}</td>
      <td>${row.goals_for - row.goals_against}</td>
      <td>${row.points}</td>
    </tr>`;

  let rows = sorted.slice(0, 5).map((row, i) => rowHtml(row, i + 1)).join('');

  // If the highlighted team is outside the top 5, pin their row underneath
  const highlightIndex = sorted.findIndex(isHighlighted);
  if (highlightIndex >= 5) {
    rows += rowHtml(sorted[highlightIndex], highlightIndex + 1, 'snap-pinned');
  }

  return `
    <div class="snap-card">
      <h3 class="snap-heading">League table</h3>
      <table class="snap-table">
        <thead><tr><th>#</th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a class="snap-link" href="table.html">Full table</a>
    </div>`;
}

export async function loadSnapshot() {
  if (!el) return;

  // Keep a match visible for 3 hours after kickoff, until it's marked finished
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const [nextRes, lastRes, tableRes] = await Promise.all([
    supabase.from('fixtures').select(FIXTURE_FIELDS)
      .neq('status', 'finished').gte('kickoff_time', cutoff)
      .order('kickoff_time', { ascending: true }).limit(1),
    supabase.from('fixtures').select(FIXTURE_FIELDS)
      .eq('status', 'finished')
      .order('kickoff_time', { ascending: false }).limit(1),
    supabase.from('standings')
      .select('played, goals_for, goals_against, points, team:team_id ( name )'),
  ]);

  const failed = [nextRes, lastRes, tableRes].find(r => r.error);
  if (failed) {
    console.error('Error loading homepage snapshot:', failed.error);
    el.innerHTML = '';
    return;
  }

  const next = nextRes.data?.[0];
  const last = lastRes.data?.[0];

  const nextCentre = next && new Date(next.kickoff_time) <= new Date()
    ? '<div class="snap-vs">Underway</div>'
    : '<div class="snap-vs">vs</div>';

  el.innerHTML = `
    <div class="snap-grid">
      ${matchCard('Next match', next, 'No upcoming fixtures yet.', nextCentre, next ? escapeHtml(formatKickoff(next.kickoff_time)) : '')}
      ${matchCard('Latest result', last, 'No results yet.',
        last ? `${last.home_score} &ndash; ${last.away_score}` : '',
        last ? escapeHtml(formatKickoff(last.kickoff_time)) : '')}
      ${tableCard(tableRes.data)}
    </div>`;
}

loadSnapshot();
