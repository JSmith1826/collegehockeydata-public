import {originColor} from './roster-origin-colors.mjs';
import { CLASS_ORDER, CLASS_LABELS, esc, fmt, seasonLabel, shares, scoringPlayers, shootingPct, safeSource, chooseSelection, easternDate, scoringCoverageText } from './model.mjs';

const $ = selector => document.querySelector(selector);
let index, currentSeason, currentTeam, currentHistory, sequence = 0;
const cache = new Map();
const metricCard = (label, value, note = '') => `<div class="metric"><dt>${esc(label)}</dt><dd>${value}</dd><p>${esc(note)}</p></div>`;
const sourceLink = (url, text) => safeSource(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>` : esc(text);
const coverage = (n, all) => `${fmt(n)} / ${fmt(all)} games`;
const panel = (id, number, title, subtitle, content) => `<section id="${id}" class="panel"><header class="panel-heading"><span class="section-number">${number}</span><div><h2>${title}</h2><p>${subtitle}</p></div></header>${content}</section>`;
const empty = text => `<p class="empty">${esc(text)}</p>`;
function table(headers, rows, caption = '') {
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(caption || headers[0])}"><table>${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ''}<thead><tr>${headers.map((h, i) => `<th scope="col"${i === 0 ? ' class="name"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((v, i) => i === 0 ? `<th class="name" scope="row">${v}</th>` : `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function origins(team) {
  const max = Math.max(1, ...team.origins.map(o => o.players));
  return `<div class="columns"><div><h3>Roster pathways</h3><p class="muted">Previous league or team reported on the roster.</p><div class="origin-bars">${team.origins.map(o => `<div class="bar-row"><span>${esc(o.label)}</span><div class="bar-track"><i style="width:${o.players / max * 100}%;background:${originColor(o.key||o.label)}"></i></div><b>${o.players}</b></div>`).join('')}</div></div><div><h3>New faces. Familiar faces.</h3><p class="muted">Verified with player IDs on the immediately preceding season’s roster.</p><ul class="movement-list">${Object.entries(team.movement).map(([name, n]) => `<li><span>${esc(name)}</span><b>${n}</b></li>`).join('')}</ul><p class="note">“No prior membership observed” can include freshmen and players with missing history. A pathway labeled Transfers does not itself verify a transfer.</p></div></div>`;
}
function classPanel(team) {
  const groups = team.classes;
  const portions = shares(groups, 'points');
  const total = groups.reduce((n, g) => n + (g.points ?? 0), 0);
  const bars = portions.filter(g => g.pct > 0).map(g => `<span class="class-${g.key}" style="width:${g.pct}%" title="${esc(CLASS_LABELS[g.key])}: ${fmt(g.value)} points (${fmt(g.pct, 1)}%)">${g.pct >= 9 ? `${g.key} ${fmt(g.pct, 0)}%` : ''}</span>`).join('');
  return `<p class="callout scoring-coverage">${esc(scoringCoverageText(team))}</p><p class="callout"><strong>${fmt(team.knownClasses)} of ${fmt(team.rosterCount)}</strong> rostered players have a reported class. ${fmt(team.rosterStatPlayers)} rostered players link to scoring observations${team.unlinkedStatPlayers ? `; ${fmt(team.unlinkedStatPlayers)} additional scorers lack a roster link` : ''}.</p>${total > 0 ? `<h3>Share of recorded points</h3><div class="stack" aria-label="Class share of ${fmt(total)} recorded points">${bars}</div>` : empty('No recorded points are available for a class production comparison.')}<div class="legend">${CLASS_ORDER.map(c => `<span><i class="class-${c}"></i>${CLASS_LABELS[c]}</span>`).join('')}</div>${table(['Class', 'Roster', 'With scoring', 'G', 'A', 'PTS', 'SOG'], groups.map(g => [`<span class="class-dot class-${g.key}"></span>${esc(g.label)}`, fmt(g.players), fmt(g.matched), fmt(g.goals), fmt(g.assists), fmt(g.points), fmt(g.shots)]), 'Production by reported class')}<p class="note">${esc(team.limitations.class)} Production sums recorded player totals. Unknown class remains a separate group. A blank is unavailable; a zero is observed.</p><details><summary>Position groups and line production</summary>${table(['Roster position', 'Roster', 'With scoring', 'G', 'A', 'PTS'], team.positions.map(g => [esc(g.label), fmt(g.players), fmt(g.matched), fmt(g.goals), fmt(g.assists), fmt(g.points)]), 'Production by roster position')}<p class="note">${esc(team.limitations.lines)}</p></details>`;
}
function scorers(team) {
  const players = scoringPlayers(team.players);
  const sampleNote = `<p class="callout scoring-coverage">${esc(scoringCoverageText(team))}</p>`;
  if (!players.length) return sampleNote + empty('No individual scoring observations are available for this season. The roster and observed team results are still shown.');
  return sampleNote + table(['Player', 'Class', 'Pos', 'GP', 'G', 'A', 'PTS', 'PTS/GP', 'SOG', 'SH%'], players.map(p => {
    const s = p.stats;
    return [`${esc(p.name)}${!p.rostered ? '<span class="small-tag">Roster link unavailable</span>' : ''}`, esc(p.class), esc(p.position || '—'), fmt(s.games), fmt(s.goals), fmt(s.assists), fmt(s.points), fmt(s.points == null || !s.games ? null : s.points / s.games, 2), fmt(s.shots), fmt(shootingPct(s), 1, '%')];
  }), 'Individual scorers') + `<p class="note">${team.scoringBasis === 'reported season totals' ? 'GP and production are reported season totals from archived CHN team pages. They are not reconstructed from the incomplete game-result archive. Historic shot and goalie placeholder fields are excluded.' : 'GP counts observed non-exhibition player game rows. Players and metrics can have incomplete game coverage. SH% uses only rows where both shots and goals are recorded.'}</p>`;
}
function shooting(team) {
  const m = team.metrics, c = m.coverage;
  return `<dl class="metrics four">${metricCard('Shots on goal / game', fmt(m.shotsForPerGame, 1), coverage(c.shotsFor, m.games))}${metricCard('Shooting percentage', fmt(m.shootingPct, 1, '%'), 'Goals and SOG from the same covered games')}${metricCard('Share of SOG', fmt(m.shotShare, 1, '%'), coverage(c.pairedShots, m.games) + ' with both teams’ SOG')}${metricCard('Power play', fmt(m.powerPlayPct, 1, '%'), coverage(c.powerPlay, m.games) + ' with goals and chances')}</dl><p class="note">SOG = shots on goal. Shot share excludes missed and blocked attempts. Team shooting includes empty-net goals and excludes shootout attempts; it does not measure shot quality. Missing games are excluded from each rate’s numerator and denominator.</p>`;
}
function defense(team) {
  const m = team.metrics, c = m.coverage;
  const goalies = team.goalies;
  const goalieTable = goalies.length ? table(['Goalie', 'GP', 'Minutes', 'Saves', 'GA', 'SV%', 'GAA', 'SV% games', 'GAA games'], goalies.map(g => [esc(g.name), fmt(g.games), fmt(g.seconds == null ? null : g.seconds / 60, 1), fmt(g.saves), fmt(g.goalsAgainst), fmt(g.savePct == null ? null : g.savePct * 100, 1, '%'), fmt(g.gaa, 2), fmt(g.saveGames), fmt(g.timedGames)]), 'Available goaltending observations') : empty('Individual goaltending observations are unavailable for this team and season. Team goals against are shown from observed results.');
  return `<dl class="metrics three">${metricCard('Goals against / game', fmt(m.gapg, 2), `${fmt(m.games)} observed games · includes empty net`)}${metricCard('SOG allowed / game', fmt(m.shotsAgainstPerGame, 1), coverage(c.shotsAgainst, m.games))}${metricCard('Penalty kill', fmt(m.penaltyKillPct, 1, '%'), coverage(c.penaltyKill, m.games))}</dl><h3>The goaltenders</h3>${goalieTable}<p class="note">Goalie totals describe available box lines, not necessarily the full season. SV% uses saves and goals against recorded together; GAA uses goals against and ice time recorded together. Empty-net lines are excluded from goalie statistics.</p><div class="data-gap"><span aria-hidden="true">↗</span><div><h3>Shot blocking</h3><p>${esc(team.limitations.blockedShots)} A player leaderboard needs consistent per-game counts before it can support a fair comparison.</p></div></div>`;
}
function recentGames(team) {
  if (!team.recentGames.length) return '';
  return `<details><summary>Latest ${team.recentGames.length} recorded results and sources</summary>${table(['Date', 'Opponent', 'Venue', 'Score', 'SOG for', 'SOG against'], team.recentGames.map(g => [sourceLink(g.sourceUrl, g.date), esc(g.opponent), esc(g.venue), `${g.goalsFor}–${g.goalsAgainst}`, fmt(g.shotsFor), fmt(g.shotsAgainst)]), 'Recent recorded results')}</details>`;
}
function emptyNetPanel(team) {
  const en = team.metrics.emptyNet;
  return `<details open><summary>Scoring with empty-net goals removed</summary><dl class="metrics four">${metricCard('GPG without empty net', fmt(en.gpg, 2), `${coverage(en.games, team.metrics.games)} verified`)}${metricCard('Same-game GPG, all goals', fmt(en.pairedGpg, 2), 'Paired baseline on the verified games')}${metricCard('GA/G without empty net', fmt(en.gapg, 2), `${fmt(en.goalsAgainst)} empty-net goals against removed`)}${metricCard('Same-game GA/G, all goals', fmt(en.pairedGapg, 2), 'Paired baseline on the verified games')}</dl><p class="note">Only games whose goalie accounting or complete scoring summaries reconcile to the final score enter these rates. They remove goals scored into an empty net. Extra-attacker goals stay included. Missing or conflicting evidence is unavailable; a missing empty-net row is not automatically a zero.</p></details>`;
}
function render(team) {
  const m = team.metrics;
  const record = m.games ? `${m.wins}–${m.losses}–${m.ties}` : '—';
  $('#dossier').innerHTML = panel('overview', '01', `<span class="team-season">${seasonLabel(team.season)}</span>${esc(team.name)}`, `${esc(team.conference)} · Men’s Division I`, `<div class="summary-line"><p>${m.games ? `${fmt(m.games)} observed games${team.latestGame ? ` through ${esc(team.latestGame)}` : ''}.` : 'No scored games are available.'} ${team.recordCoverage === 'complete' ? 'The season result archive is marked complete.' : `Result archive: ${esc(team.recordCoverage.replaceAll('_', ' '))}.`} Record treats a tied score as a tie.</p><span class="badge">${team.scoringBasis === 'unavailable' ? 'Scoring coverage unavailable' : esc(team.scoringBasis)}</span></div><dl class="metrics four">${metricCard('Observed W–L–T', record, `${fmt(m.games)} games`)}${metricCard('Goals / game', fmt(m.gpg, 2), 'Includes empty-net goals')}${metricCard('Goals against / game', fmt(m.gapg, 2), 'Includes empty-net goals')}${metricCard('Rostered players', fmt(team.rosterCount), `${fmt(team.knownClasses)} with reported class`)}</dl>${emptyNetPanel(team)}${recentGames(team)}`) +
    panel('construction', '02', 'How they were built', 'The pathways into this roster, and the players who came back.', origins(team)) +
    panel('classes', '03', 'Where the production comes from', 'Scoring by class, with the coverage kept in view.', classPanel(team)) +
    panel('scorers', '04', 'Who puts up the points', `${team.scoringBasis === 'unavailable' ? 'Individual scoring is unavailable.' : esc(team.scoringBasis) + ' · All recorded scorers.'}`, scorers(team)) +
    panel('shooting', '05', 'Getting pucks on net', 'Volume, conversion, and power-play output.', shooting(team)) +
    panel('defense', '06', 'At the other end', 'Scoring prevention, shots allowed, and the available goalie record.', defense(team)) +
    panel('roster', '07', 'Who they are', 'Every rostered player in the selected season.', table(['Player', '#', 'Class', 'Position', 'Hometown', 'Pathway', 'Membership'], team.players.filter(p => p.rostered).sort((a, b) => a.name.localeCompare(b.name)).map(p => [esc(p.name), esc(p.number ?? '—'), esc(p.class), esc(p.position || '—'), esc(p.hometown || '—'), esc(p.origin), esc(p.movement)]), 'Complete selected roster')) +
    panel('history', '08', 'The classes before them', 'Follow this program back through the archive. Scoring gaps stay visible.', `<div class="history-controls"><label>Compare<select id="history-metric"><option value="points">Share of recorded points</option><option value="goals">Share of recorded goals</option><option value="players">Share of roster</option></select></label><label class="check-label"><input id="history-only" type="checkbox"> Seasons with scoring only</label></div><div class="legend">${CLASS_ORDER.map(c => `<span><i class="class-${c}"></i>${CLASS_LABELS[c]}</span>`).join('')}</div><div id="history-content" aria-live="polite">Loading history…</div>`);
  $('#history-metric').addEventListener('change', renderHistory);
  $('#history-only').addEventListener('change', renderHistory);
  document.title = `${team.name} ${seasonLabel(team.season)} · Team Summary · College Hockey Data`;
}
function renderHistory() {
  if (!currentHistory) return;
  const metric = $('#history-metric').value;
  const only = $('#history-only').checked;
  const rows = [...currentHistory.seasons].reverse().filter(s => !only || s.statPlayers > 0);
  $('#history-content').innerHTML = table(['Season', 'Class shares', metric === 'players' ? 'Roster' : metric.toUpperCase(), 'Class known', 'Scoring basis'], rows.map(s => {
    const parts = shares(s.classes, metric);
    const total = s.classes.reduce((sum, g) => sum + (g[metric] ?? 0), 0);
    const hasData = metric === 'players' ? s.roster > 0 : s.classes.some(g => g[metric] != null);
    const bar = hasData && total > 0 ? `<div class="history-stack">${parts.filter(p => p.pct > 0).map(p => `<span class="class-${p.key}" style="width:${p.pct}%" title="${esc(CLASS_LABELS[p.key])}: ${fmt(p.value)} (${fmt(p.pct, 1)}%)"></span>`).join('')}</div><span class="sr-only">${parts.filter(p => p.value != null).map(p => `${CLASS_LABELS[p.key]} ${fmt(p.pct, 1)}%`).join(', ')}</span>` : `<span class="muted">${hasData ? 'No recorded production' : 'Unavailable'}</span>`;
    return [`<button class="season-jump" data-year="${s.season}">${seasonLabel(s.season)}</button>`, bar, hasData ? fmt(total) : '—', `${fmt(s.knownClasses)}/${fmt(s.roster)}`, esc(s.scoringBasis)];
  }), 'Historical production by class') + '<p class="note">Class shares use the displayed season’s roster and recorded player totals. Older CHN season totals can cover a different set of games from the result archive; missing historical players can change the shares. Compare like coverage. Each season button opens its full team dossier.</p>';
  document.querySelectorAll('.season-jump').forEach(button => button.addEventListener('click', () => {
    const year = Number(button.dataset.year);
    if (!index.seasons.find(s => s.start === year)?.teams.some(t => t.id === currentTeam.id)) return;
    $('#season').value = year;
    fillTeams(year, currentTeam.id);
    loadTeam();
    $('#overview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}
function fillTeams(year, preferred) {
  const season = index.seasons.find(s => s.start === Number(year));
  $('#team').innerHTML = season.teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  $('#team').value = season.teams.some(t => t.id === Number(preferred)) ? preferred : season.teams[0].id;
}
async function fetchData(filename) {
  if (!cache.has(filename)) cache.set(filename, fetch(`./data/${filename}`).then(response => {
    if (!response.ok) throw new Error(`Could not load ${filename} (${response.status}).`);
    return response.json();
  }).catch(error => { cache.delete(filename); throw error; }));
  return cache.get(filename);
}
async function loadTeam() {
  const turn = ++sequence;
  const year = Number($('#season').value), id = Number($('#team').value);
  $('#dossier').setAttribute('aria-busy', 'true');
  $('#status').textContent = 'Loading team dossier…';
  currentHistory = null;
  try {
    const season = index.seasons.find(s => s.start === year);
    const data = await fetchData(season.file);
    if (turn !== sequence) return;
    const team = data.teams.find(t => t.id === id);
    if (!team) throw new Error('This team is unavailable for the selected season.');
    currentSeason = year; currentTeam = team;
    render(team);
    const params = new URLSearchParams(location.search);
    params.set('season', year); params.set('team', id);
    history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`);
    $('#status').textContent = `${team.name} · ${seasonLabel(year)}`;
    $('#dossier').setAttribute('aria-busy', 'false');
    const historyFile = index.historyFiles[String(id)];
    if (historyFile) {
      try {
        const teamHistory = await fetchData(historyFile);
        if (turn !== sequence) return;
        currentHistory = teamHistory; renderHistory();
      } catch (error) { if (turn === sequence) $('#history-content').innerHTML = empty('Historical data could not be loaded. The selected team summary remains available.'); }
    } else $('#history-content').innerHTML = empty('Historical data is unavailable.');
  } catch (error) {
    if (turn !== sequence) return;
    $('#status').textContent = error.message;
    $('#dossier').innerHTML = empty('Team data could not be loaded. Check that the data exporter has run, then reload this page.');
    $('#dossier').setAttribute('aria-busy', 'false');
  }
}
$('#season').addEventListener('change', () => { fillTeams($('#season').value, $('#team').value); loadTeam(); });
$('#team').addEventListener('change', loadTeam);
$('#copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('#status').textContent = 'Team link copied.'; }
  catch { $('#status').textContent = 'Copy the team link from your address bar.'; }
});
try {
  index = await fetchData('index.json');
  const selection = chooseSelection(index, new URLSearchParams(location.search));
  $('#season').innerHTML = [...index.seasons].reverse().map(s => `<option value="${s.start}">${esc(s.label)}</option>`).join('');
  $('#season').value = selection.season.start;
  fillTeams(selection.season.start, selection.team.id);
  $('#season').disabled = $('#team').disabled = false;
  $('#source-note').textContent = `${index.source}. Exported ${easternDate(index.generatedAt)}; origin classification snapshot ${easternDate(index.rosterOriginSnapshotAt)}. Scored non-exhibition games; missing values remain unavailable.`;
  await loadTeam();
} catch (error) { $('#status').textContent = 'Team data could not be loaded. Run build_team_summary.py and serve this page over HTTP.'; }
