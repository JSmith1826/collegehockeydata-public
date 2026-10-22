export const CLASS_ORDER = ['Fr', 'So', 'Jr', 'Sr', 'Gr', 'Unknown'];
export const CLASS_LABELS = { Fr: 'Freshmen', So: 'Sophomores', Jr: 'Juniors', Sr: 'Seniors', Gr: 'Graduate', Unknown: 'Unknown class' };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const seasonLabel = year => `${year}–${String(year + 1).slice(-2)}`;
export function fmt(value, digits = 0, suffix = '') {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + suffix;
}
export function easternDate(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric'
  }).format(date) + ' Eastern';
}
export function scoringCoverageText(team) {
  const sample = team.scoringCoverage;
  if (sample.basis === 'reported season totals') {
    return 'Individual scoring uses archived CHN season totals. Game-by-game coverage and a last-game cutoff are unavailable; these totals are separate from the recorded result sample.';
  }
  if (sample.basis === 'unavailable') {
    return `Individual scoring is unavailable for the ${fmt(sample.resultGames)} recorded team results.`;
  }
  return `Individual scoring: ${fmt(sample.games)} of ${fmt(sample.resultGames)} recorded results have player rows${sample.latestGame ? `, through ${sample.latestGame}` : ''}. Player and metric coverage can vary within that sample.`;
}
export function shares(groups, metric) {
  const known = groups.filter(g => Number.isFinite(g[metric]));
  const denominator = known.reduce((sum, g) => sum + g[metric], 0);
  return CLASS_ORDER.map(key => {
    const g = groups.find(row => row.key === key);
    const value = g?.[metric];
    return { key, value: value ?? null, pct: value != null && denominator > 0 ? value / denominator * 100 : null };
  });
}
export function scoringPlayers(players) {
  return players.filter(p => p.stats).sort((a, b) => (b.stats.points ?? -1) - (a.stats.points ?? -1) || (b.stats.goals ?? -1) - (a.stats.goals ?? -1) || a.name.localeCompare(b.name));
}
export function shootingPct(stats) {
  return stats?.shootingGoals != null && stats.shootingShots > 0 ? 100 * stats.shootingGoals / stats.shootingShots : null;
}
export function safeSource(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null; } catch { return null; }
}
export function chooseSelection(index, params) {
  const requestedSeason = Number(params.get('season'));
  const season = index.seasons.find(s => s.start === requestedSeason) ?? index.seasons.at(-1);
  const requestedTeam = Number(params.get('team'));
  const team = season.teams.find(t => t.id === requestedTeam) ?? season.teams.find(t => t.name === 'Michigan State') ?? season.teams[0];
  return { season, team };
}
