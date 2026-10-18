// ============================================
// Admin: login + lineup and goal entry
// ============================================
// Writes only work for the admin email set in admin-lockdown.sql.
// Anyone else who opens this page can see the login form, but the
// database refuses their writes.
import { supabase } from './supabase-client.js';
import { buildPreview, toStandingsRows } from './table-paste.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const whoEl = document.getElementById('admin-who');
const signOutBtn = document.getElementById('sign-out');

const fixtureSelect = document.getElementById('fixture-select');
const lineupsForm = document.getElementById('lineups-form');
const goalsForm = document.getElementById('goals-form');
const lineupsStatus = document.getElementById('lineups-status');
const goalsStatus = document.getElementById('goals-status');
const tabButtons = document.querySelectorAll('[data-tab]');
const fixturePicker = document.getElementById('fixture-picker');
const tableForm = document.getElementById('table-form');
const tableStatus = document.getElementById('table-status');
const tablePreviewBtn = document.getElementById('table-preview-btn');
const tablePreviewArea = document.getElementById('table-preview-area');
const tableSaveBtn = document.getElementById('table-save-btn');

let fixturesById = {};
let fixturesLoaded = false;

// ---------- Login / session ----------
async function showForSession(session) {
  if (session) {
    loginSection.hidden = true;
    adminSection.hidden = false;
    whoEl.textContent = `Signed in as ${session.user.email}`;
    if (!fixturesLoaded) await loadFixtures();
  } else {
    fixturesLoaded = false;
    adminSection.hidden = true;
    loginSection.hidden = false;
  }
}

supabase.auth.getSession().then(({ data }) => showForSession(data.session));
supabase.auth.onAuthStateChange((_event, session) => showForSession(session));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginStatus.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({
    email: loginForm.email.value.trim(),
    password: loginForm.password.value,
  });

  if (error) {
    loginStatus.textContent = error.message;
    return;
  }
  loginStatus.textContent = '';
  loginForm.reset();
});

signOutBtn.addEventListener('click', () => supabase.auth.signOut());

// ---------- Fixture picker ----------
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
    lineupsStatus.textContent = 'Could not load fixtures: ' + error.message;
    return;
  }

  fixturesLoaded = true;
  fixturesById = Object.fromEntries(data.map(f => [f.id, f]));

  fixtureSelect.replaceChildren(...data.map(f => new Option(
    `${new Date(f.kickoff_time).toLocaleDateString()}: ${f.home_team.name} vs ${f.away_team.name}`,
    f.id
  )));

  updateTeamLabels();
}

function updateTeamLabels() {
  const f = fixturesById[fixtureSelect.value];
  if (!f) return;
  document.getElementById('lineups-home-label').textContent = f.home_team.name;
  document.getElementById('lineups-away-label').textContent = f.away_team.name;
  document.getElementById('goals-home-label').textContent = f.home_team.name;
  document.getElementById('goals-away-label').textContent = f.away_team.name;
}

fixtureSelect.addEventListener('change', updateTeamLabels);

// ---------- Tabs ----------
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach(b => b.classList.toggle('is-active', b === btn));
    lineupsForm.hidden = tab !== 'lineups';
    goalsForm.hidden = tab !== 'goals';
    tableForm.hidden = tab !== 'table';
    fixturePicker.hidden = tab === 'table';
  });
});

// ---------- Parsing ----------
// "7, Sam Kerr" or "7 Sam Kerr", one player per line
function parseLineupLines(text) {
  const items = [];
  const skipped = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const m = line.match(/^(\d+)\s*,?\s*(.+)$/);
    if (m) items.push({ shirt_number: parseInt(m[1], 10), player_name: m[2].trim() });
    else skipped.push(line);
  }
  return { items, skipped };
}

// "23, Kerr" or "45, Buchanan, og"
function parseGoalLines(text) {
  const items = [];
  const skipped = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const parts = line.split(',').map(p => p.trim());
    const minute = parseInt(parts[0], 10);
    if (Number.isNaN(minute) || !parts[1]) {
      skipped.push(line);
    } else {
      items.push({ minute, player_name: parts[1], is_own_goal: (parts[2] || '').toLowerCase() === 'og' });
    }
  }
  return { items, skipped };
}

// ---------- Save helpers ----------
// Insert the new rows first, and only delete the old ones if that worked,
// so a failed save never leaves a fixture with no lineup or goals.
async function replaceRows(table, fixtureId, newRows, label) {
  const { data: oldRows, error: readError } = await supabase
    .from(table)
    .select('id')
    .eq('fixture_id', fixtureId);

  if (readError) return { error: readError };

  if (oldRows.length > 0) {
    const ok = confirm(`This fixture already has ${oldRows.length} ${label} saved. Replace them with what you've entered?`);
    if (!ok) return { cancelled: true };
  }

  const { error: insertError } = await supabase.from(table).insert(newRows);
  if (insertError) return { error: insertError };

  if (oldRows.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in('id', oldRows.map(r => r.id));
    if (deleteError) return { error: deleteError };
  }

  return { saved: newRows.length };
}

function reportResult(statusEl, result, noun, skipped = []) {
  if (result.cancelled) statusEl.textContent = 'Cancelled. Nothing was changed.';
  else if (result.error) statusEl.textContent = 'Error: ' + result.error.message;
  else {
    statusEl.textContent = `Saved ${result.saved} ${noun}.` +
      (skipped.length ? ` Skipped ${skipped.length} line(s) it couldn't read: ${skipped.join(' | ')}` : '');
  }
}

// ---------- Lineups ----------
lineupsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fixture = fixturesById[fixtureSelect.value];
  if (!fixture) { lineupsStatus.textContent = 'Pick a fixture first.'; return; }

  const build = (players, teamId, isStarting) => players.map((p, i) => ({
    fixture_id: fixture.id,
    team_id: teamId,
    player_name: p.player_name,
    shirt_number: p.shirt_number,
    is_starting: isStarting,
    sort_order: i,
  }));

  const groups = [
    [parseLineupLines(lineupsForm.home_starters.value), fixture.home_team.id, true],
    [parseLineupLines(lineupsForm.home_subs.value), fixture.home_team.id, false],
    [parseLineupLines(lineupsForm.away_starters.value), fixture.away_team.id, true],
    [parseLineupLines(lineupsForm.away_subs.value), fixture.away_team.id, false],
  ];
  const rows = groups.flatMap(([parsed, teamId, isStarting]) => build(parsed.items, teamId, isStarting));
  const skipped = groups.flatMap(([parsed]) => parsed.skipped);

  if (rows.length === 0) { lineupsStatus.textContent = 'Nothing to save. Paste some players first.'; return; }

  lineupsStatus.textContent = 'Saving…';
  const result = await replaceRows('lineups', fixture.id, rows, 'lineup rows');
  reportResult(lineupsStatus, result, 'players', skipped);
  if (result.saved) lineupsForm.reset();
});

// ---------- Goals ----------
goalsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fixture = fixturesById[fixtureSelect.value];
  if (!fixture) { goalsStatus.textContent = 'Pick a fixture first.'; return; }

  const home = parseGoalLines(goalsForm.home_goals.value);
  const away = parseGoalLines(goalsForm.away_goals.value);
  const rows = [
    ...home.items.map(g => ({ ...g, fixture_id: fixture.id, team_id: fixture.home_team.id })),
    ...away.items.map(g => ({ ...g, fixture_id: fixture.id, team_id: fixture.away_team.id })),
  ];
  const skipped = [...home.skipped, ...away.skipped];

  if (rows.length === 0) { goalsStatus.textContent = 'Nothing to save. Add some goals first.'; return; }

  goalsStatus.textContent = 'Saving…';
  const result = await replaceRows('goals', fixture.id, rows, 'goals');
  reportResult(goalsStatus, result, 'goals', skipped);
  if (result.saved) goalsForm.reset();
});

// ---------- League table: paste, preview, save ----------
let previewRows = [];

async function loadTeams() {
  const { data, error } = await supabase.from('teams').select('id, name');
  if (error) throw error;
  return data;
}

function cell(text, tag = 'td') {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

function renderPreview(rows) {
  tablePreviewArea.replaceChildren();

  const good = rows.filter(r => r.team && r.errors.length === 0);
  const bad = rows.length - good.length;
  const warned = good.filter(r => r.warnings.length).length;

  const summary = document.createElement('div');
  summary.className = 'table-summary';
  summary.textContent = `${rows.length} row(s) read: ${good.length} ready to save` +
    (warned ? `, ${warned} with warnings` : '') + (bad ? `, ${bad} with errors (these will be skipped)` : '') + '.';
  tablePreviewArea.append(summary);

  const table = document.createElement('table');
  table.className = 'table-preview';

  const head = document.createElement('tr');
  ['#', 'Pasted as', 'Saves to', 'P', 'W', 'D', 'L', 'GF', 'GA', 'Pts', 'Notes'].forEach(t => head.append(cell(t, 'th')));
  table.append(head);

  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const isError = r.errors.length > 0;
    tr.className = isError ? 'row-error' : (r.warnings.length ? 'row-warn' : 'row-ok');

    const s = r.stats;
    [
      r.rank ?? i + 1,
      r.name,
      r.team ? r.team.name : '—',
      s?.played ?? '', s?.won ?? '', s?.drawn ?? '', s?.lost ?? '',
      s?.goalsFor ?? '', s?.goalsAgainst ?? '', s?.points ?? '',
    ].forEach(v => tr.append(cell(v)));

    const notes = cell('');
    r.errors.forEach(msg => { const d = document.createElement('div'); d.className = 'note-error'; d.textContent = msg; notes.append(d); });
    r.warnings.forEach(msg => { const d = document.createElement('div'); d.className = 'note-warn'; d.textContent = msg; notes.append(d); });
    tr.append(notes);

    table.append(tr);
  });

  tablePreviewArea.append(table);

  tableSaveBtn.hidden = good.length === 0;
  tableSaveBtn.textContent = `Save ${good.length} row(s)`;
}

tablePreviewBtn.addEventListener('click', async () => {
  tableStatus.textContent = 'Reading…';
  tablePreviewArea.replaceChildren();
  tableSaveBtn.hidden = true;

  let teams;
  try {
    teams = await loadTeams();
  } catch (err) {
    tableStatus.textContent = 'Could not load teams: ' + err.message;
    return;
  }

  previewRows = buildPreview(tableForm.table_text.value, teams);

  if (previewRows.length === 0) {
    tableStatus.textContent = 'No table rows found. Paste the rows including the numbers.';
    return;
  }

  tableStatus.textContent = 'Check the preview below, then save.';
  renderPreview(previewRows);
});

tableForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const rows = toStandingsRows(previewRows);
  if (rows.length === 0) { tableStatus.textContent = 'Nothing to save.'; return; }

  const skipped = previewRows.length - rows.length;
  if (skipped > 0 && !confirm(`${skipped} row(s) have errors and will be skipped. Save the other ${rows.length}?`)) return;

  tableStatus.textContent = 'Saving…';
  const { error } = await supabase.from('standings').upsert(rows, { onConflict: 'team_id' });

  if (error) {
    tableStatus.textContent = 'Error: ' + error.message;
    return;
  }

  tableStatus.textContent = `Saved ${rows.length} team(s). The table page now shows the new standings.`;
  tableSaveBtn.hidden = true;
  previewRows = [];
  tableForm.table_text.value = '';
  tablePreviewArea.replaceChildren();
});
