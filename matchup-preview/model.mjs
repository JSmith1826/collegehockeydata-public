import {originColor} from '../shared/roster-origin-colors.mjs?v=unified-e1fe3bc4a6f2';
export const VENUES = ['At home team', 'At away team', 'Home & home', 'Neutral site'];
export const CLASSES = ['Fr', 'So', 'Jr', 'Sr', 'Gr', 'Unknown'];
export const PATHWAYS = [
  {name:'USHL / NTDP',indices:[0,1],origin:'USHL (non-NTDP)'}, {name:'Other US',indices:[2,3,4],origin:'NAHL/NCDC'},
  {name:'CHL',indices:[5],origin:'CHL (Major Junior)'}, {name:'BCHL',indices:[6],origin:'BCHL'},
  {name:'Other Canada',indices:[7,8,9],origin:'CJHL (Canadian Jr A)'}, {name:'Europe',indices:[10],origin:'Europe'},
  {name:'Transfers',indices:[11,13],origin:'Transfers'}, {name:'Pro leagues',indices:[12],origin:'Professional'},
  {name:'Other / unknown',indices:[14,15,16,17],origin:'Other/Various'},
];
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rate = (n,d) => Number.isFinite(n) && Number.isFinite(d) && d > 0 ? n/d : null;
export const format = (n,digits=1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
export function dateLabel(iso) {
  return new Date(iso+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
}
export function eventDetails(away,home,start,end='',venue=VENUES[0]) {
  const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  if(!valid(start) || end&&!valid(end))throw Error('Choose valid game dates.');
  const last=end||start;
  if(last<start)throw Error('The last game date must be on or after the first game date.');
  if(start<'2026-07-01'||last>'2027-06-30')throw Error('This preview uses the 2026–27 roster. Choose dates in that season.');
  if(away.id===home.id)throw Error('Choose two different teams.');
  if(!VENUES.includes(venue))throw Error('Choose an available venue.');
  const location=venue===VENUES[0]?'At '+home.name:venue===VENUES[1]?'At '+away.name:venue;
  const label=(last===start?dateLabel(start):dateLabel(start)+' – '+dateLabel(last))+' · '+location;
  return {date:start,dates:[...new Set([start,last])],venue,label,source:'User-selected dates and venue'};
}
export function pathways(team) {
  const rows=PATHWAYS.map(g=>({name:g.name,color:originColor(g.origin),count:g.indices.reduce((n,i)=>n+(team.originCounts[i]||0),0)}));
  if(rows.reduce((n,g)=>n+g.count,0)!==team.roster)throw Error(team.name+': pathway counts do not match the roster.');
  return rows;
}
export function defenseSummary(population) {
  const [goals,saved,missed,blocked]=population.outcomes;
  const attempts=goals+saved+missed+blocked;
  return {games:population.mappedGames,attempts,goals,saved,missed,blocked,
    shotsAgainst:goals+saved,shotsAgainstPerGame:rate(goals+saved,population.mappedGames),
    blocksPerGame:rate(blocked,population.mappedGames),blockShare:rate(100*blocked,attempts)};
}
