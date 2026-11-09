// Shared chart geometry for the local Team / Compare review.
export const METRICS = [
  {id:'goals', label:'Goals', unit:'goals / game'},
  {id:'points', label:'Points', unit:'points / game'},
  {id:'toi', label:'Ice time', unit:'average TOI per skater appearance (MM:SS)'},
  {id:'shots', label:'SOG', unit:'shots on goal / game'},
];
export function cohortValue(team, group, metric) {
  if(metric === 'toi')return group.toiAppearances > 0 && Number.isFinite(group.toiSeconds)
    ? group.toiSeconds / group.toiAppearances : null;
  const games = team.coverage.games;
  const value = group[metric];
  return games > 0 && Number.isFinite(value) ? value / games : null;
}
export function formatCohortValue(value, metric) {
  if(!Number.isFinite(value))return '—';
  if(metric === 'toi'){
    const seconds=Math.round(value);
    return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  return value.toLocaleString('en-US',{maximumFractionDigits:2});
}
export function sharedMaximum(teams, metric) {
  return Math.max(0,...teams.flatMap(t => [...t.classes,...t.routes].map(g => cohortValue(t,g,metric) ?? 0)));
}
export function segmentGeometry(count, total, value, maximum) {
  return {width:total > 0 ? 100 * count / total : 0,
    // The count/class base stays readable even when production is zero.
    height:52 + (maximum > 0 && value !== null ? 100 * value / maximum : 0)};
}
export function fieldPosition(value, domain) {
  return Number.isFinite(value) && domain[1] > domain[0]
    ? Math.min(100, Math.max(0,100 * (value-domain[0])/(domain[1]-domain[0]))) : null;
}
