/** Grounded, deterministic copy; Python counterpart: tools/matchup_preview/version_1_early_season/captions.py. */
const CONFERENCE_TAGS = {
  'Atlantic Hockey': '#AtlanticHockey', 'Big Ten': '#B1GHockey', CCHA: '#CCHA',
  ECAC: '#ECACHockey', 'Hockey East': '#HockeyEast', NCHC: '#NCHCHockey',
};
const BASE_TAGS = ['#collegehockey', '#collegehockeydata', '#NCAAHockey'];
const count = n => Number.isInteger(n) && n >= 0;
const games = n => `${n} game${n === 1 ? '' : 's'}`;
const rate = (total, games) => {
  const tenths = Math.floor((total * 20 + games) / (2 * games));
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parseDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Expected an ISO date.');
  const [year, month, day] = iso.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) throw new Error('Invalid caption date.');
  return {year, month, day};
}
function dateLabel(d, abbreviated = false) {
  const month = MONTHS[d.month - 1];
  return `${abbreviated ? month.slice(0, 3) : month} ${d.day}, ${d.year}`;
}

function eventTitle(data) {
  const [a, b] = data.teams;
  const event = data.event || {};
  let venue = event.venue;
  if (!venue) {
    const label = (event.label || '').toUpperCase();
    if (label.endsWith(`AT ${b.name.toUpperCase()}`)) venue = 'At home team';
    else if (label.endsWith(`AT ${a.name.toUpperCase()}`)) venue = 'At away team';
    else if (label.endsWith('HOME & HOME')) venue = 'Home & home';
    else if (label.endsWith('NEUTRAL SITE')) venue = 'Neutral site';
  }
  let title = venue === 'At home team' ? `${a.name} at ${b.name}`
    : venue === 'At away team' ? `${b.name} at ${a.name}` : `${a.name} vs. ${b.name}`;
  if (venue === 'Home & home') title += ' · home and home';
  if (venue === 'Neutral site') title += ' · neutral site';
  const dates = event.dates?.length ? event.dates : event.date ? [event.date] : [];
  if (dates.length) {
    const first = parseDate(dates[0]), last = parseDate(dates.at(-1));
    let days;
    if (dates[0] === dates.at(-1)) days = dateLabel(first, true);
    else if (first.year === last.year && first.month === last.month) days = `${MONTHS[first.month - 1].slice(0, 3)} ${first.day}–${last.day}, ${first.year}`;
    else days = `${dateLabel(first, true)} – ${dateLabel(last, true)}`;
    title += ` | ${days}`;
  }
  return title;
}

function goalsAllowed(team, through) {
  const rows = team.recordGames;
  if (!team.boxGames || !Array.isArray(rows) || rows.length !== team.boxGames) return null;
  let total = 0;
  const seen = new Set();
  for (const row of rows) {
    if (row.game_id == null || seen.has(row.game_id) || !row.game_date || row.game_date > through) return null;
    seen.add(row.game_id);
    let own, opponent;
    if (team.id === row.away_team_id) [own, opponent] = [row.away_score, row.home_score];
    else if (team.id === row.home_team_id) [own, opponent] = [row.home_score, row.away_score];
    else return null;
    if (!count(own) || !count(opponent)) return null;
    total += opponent;
  }
  return total;
}

function hook(data) {
  const [a, b] = data.teams;
  const played = data.teams.filter(t => t.boxGames);
  if (!played.length) return 'A roster-first comparison: neither team has a completed regular-season game in this snapshot.';
  if (played.length === 1) {
    const active = played[0], idle = active === a ? b : a;
    return `${active.name} scored ${active.boxGoals} goals in ${games(active.boxGames)}. ${idle.name} has no completed regular-season games in this snapshot.`;
  }
  const contrasts = [];
  for (const [offense, defense] of [[a, b], [b, a]]) {
    const allowed = goalsAllowed(defense, data.through);
    if (Math.min(offense.boxGames, defense.boxGames) >= 2 && allowed !== null) {
      const scoring = offense.boxGoals / offense.boxGames, prevention = allowed / defense.boxGames;
      if (scoring >= 3 && prevention <= 2) contrasts.push({gap: scoring - prevention, offense, defense, allowed});
    }
  }
  if (contrasts.length) {
    contrasts.sort((x, y) => y.gap - x.gap);
    const {offense, defense, allowed} = contrasts[0];
    return `An early scoring/defense contrast: ${offense.name} scored ${offense.boxGoals} goals in ${games(offense.boxGames)}; ${defense.name} allowed ${allowed} in ${games(defense.boxGames)}.`;
  }
  const unbeaten = data.teams.every(t => Array.isArray(t.record) && t.record.length === 3 && t.record[0] === t.boxGames && t.record[1] === 0 && t.record[2] === 0);
  if (unbeaten) return `Two unbeaten starts in the snapshot: ${a.name} scored ${a.boxGoals} goals in ${games(a.boxGames)}; ${b.name} scored ${b.boxGoals} in ${games(b.boxGames)}.`;
  const rates = data.teams.map(t => t.boxGoals / t.boxGames);
  if (Math.abs(rates[0] - rates[1]) >= 1) return `Scoring so far: ${a.name} averaged ${rate(a.boxGoals, a.boxGames)} goals per game (${a.boxGames} GP); ${b.name} averaged ${rate(b.boxGoals, b.boxGames)} (${b.boxGames} GP).`;
  if (Math.min(a.boxGames, b.boxGames) >= 2 && data.teams.every(t => count(t.boxShots))) {
    const shots = data.teams.map(t => t.boxShots / t.boxGames);
    if (Math.abs(shots[0] - shots[1]) >= 5) return `Shot volume is one difference: ${a.name} averaged ${rate(a.boxShots, a.boxGames)} shots on goal per game (${a.boxGames} GP); ${b.name} averaged ${rate(b.boxShots, b.boxGames)} (${b.boxGames} GP).`;
  }
  return `The scoring snapshot: ${a.name} had ${a.boxGoals} goals in ${games(a.boxGames)}; ${b.name} had ${b.boxGoals} in ${games(b.boxGames)}.`;
}

function rosterFact(teams) {
  const [a, b] = teams;
  if (teams.every(t => count(t.drafted))) {
    if (a.drafted === b.drafted && a.drafted >= 4) return `Both current rosters list ${a.drafted} NHL draft picks.`;
    if (Math.abs(a.drafted - b.drafted) >= 4) return `Roster construction: ${a.name} lists ${a.drafted} NHL draft picks; ${b.name} lists ${b.drafted}.`;
  }
  if (teams.every(t => count(t.roster) && t.roster && Array.isArray(t.classes) && t.classes.length === 6 && t.classes.every(count) && t.classes.reduce((x, y) => x + y, 0) === t.roster)) {
    return `Roster construction: ${a.name} lists ${a.classes[0]} freshmen on a ${a.roster}-player roster; ${b.name} lists ${b.classes[0]} on a ${b.roster}-player roster.`;
  }
  return '';
}

function comparePlayers(a, b) {
  return b.points - a.points || (b.goals || 0) - (a.goals || 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
function playerFact(teams) {
  const facts = [];
  for (const team of teams) {
    if (team.boxGames) {
      const source = team.watchCandidates?.length ? team.watchCandidates : [...(team.watch || []), ...(team.leaders || [])];
      const rows = source.filter(r => count(r.points) && r.points >= 2 && count(r.goals) && count(r.gp) && r.gp > 0 && r.gp <= team.boxGames).sort(comparePlayers);
      if (rows.length) {
        const p = rows[0];
        facts.push(`${p.name} (${team.name}): ${p.points} points, ${p.goals} goal${p.goals === 1 ? '' : 's'} in ${games(p.gp)}`);
      }
    } else {
      const rows = (team.leaders || []).filter(r => count(r.points) && r.points > 0 && count(r.gp) && r.gp > 0).sort(comparePlayers);
      const season = team.leaderSeason;
      if (rows.length && season && season !== '2026–27' && season !== '2026-27') {
        const p = rows[0];
        facts.push(`${p.name} (${team.name}): ${p.points} points in ${games(p.gp)} in ${season}`);
      }
    }
  }
  return facts.length ? `Players to watch — ${facts.join('; ')}.` : '';
}

function coverage(teams) {
  const facts = [];
  for (const team of teams) {
    if (!team.boxGames) continue;
    const ids = team.mapGameIds;
    if (!Array.isArray(ids) || new Set(ids).size > team.boxGames) facts.push(`${team.name}: map coverage unconfirmed`);
    else if (new Set(ids).size < team.boxGames) facts.push(`${team.name}: ${new Set(ids).size} of ${team.boxGames} games mapped`);
  }
  return facts.length ? `Shot-map coverage — ${facts.join('; ')}; scoring summaries use all recorded games.` : '';
}

function hashtags(teams) {
  return [...new Set([...BASE_TAGS, ...teams.map(t => CONFERENCE_TAGS[t.conference]).filter(Boolean)])].join(' ');
}

function shortCaption(data, cutoff) {
  const [a, b] = data.teams;
  let facts, note;
  if (data.teams.every(t => t.boxGames)) {
    facts = `${a.name}: ${rate(a.boxGoals, a.boxGames)} goals/game (${a.boxGames} GP); ${b.name}: ${rate(b.boxGoals, b.boxGames)} (${b.boxGames} GP).`;
    note = `Stats through ${dateLabel(cutoff, true)}; includes empty-net goals.`;
  } else {
    facts = `Snapshot games: ${a.name} ${a.boxGames}; ${b.name} ${b.boxGames}.`;
    note = `Stats through ${dateLabel(cutoff, true)}.`;
  }
  const tags = BASE_TAGS.slice(0, 2).join(' ');
  const candidates = [
    [eventTitle(data), facts, note, tags].join('\n\n'),
    [facts, note, tags].join('\n\n'),
    [`${a.name} vs. ${b.name}`, `Snapshot through ${dateLabel(cutoff, true)}.`, tags].join('\n\n'),
  ];
  for (const candidate of candidates) if (Array.from(candidate).length <= 280) return candidate + '\n';
  throw new Error('Team names are too long for a 280-character caption.');
}

/** social includes discovery tags; reddit omits tags; short fits 280 Unicode code points, excluding final newline. */
export function buildCaption(data, platform = 'social') {
  if (!['social', 'reddit', 'short'].includes(platform)) throw new Error(`Unknown caption platform: ${platform}`);
  if (data.teams.length !== 2 || data.teams.some(t => !count(t.boxGames) || !count(t.boxGoals))) throw new Error('Captions require two teams with known game and goal totals.');
  const cutoff = parseDate(data.through);
  if (platform === 'short') return shortCaption(data, cutoff);
  const body = [hook(data), rosterFact(data.teams), playerFact(data.teams)].filter(Boolean).join(' ');
  const notes = [`Current-season stats through ${dateLabel(cutoff)}.`];
  if (data.teams.some(t => t.boxGames)) {
    notes.push('Scoring totals include empty-net goals.');
    if (data.teams.some(t => t.boxGames > 0 && t.boxGames < 6)) notes.push('Small samples; no opponent adjustment.');
  }
  const mapNote = coverage(data.teams);
  if (mapNote) notes.push(mapNote);
  const paragraphs = [eventTitle(data), body, notes.join(' ')];
  if (platform === 'social') paragraphs.push(hashtags(data.teams));
  return paragraphs.join('\n\n') + '\n';
}
