import {ZONES,areaOutcomes,outcomeGroups} from './model.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('en-US'),share=(n,total)=>total?`${(100*n/total).toFixed(1)}%`:'—';

// Always visible. Both maps inspect the same zone, with independent outcomes.
// All-outcome denominators stay intact when the rink's outcome is filtered.
export function areaPanelMarkup(population,zone=null){
  const area=ZONES.find(z=>z.id===zone),counts=areaOutcomes(population,area?.id),total=counts.reduce((a,b)=>a+b,0);
  return `<div class="area-panel-heading"><div><h4>${esc(area?.name||'All areas')}</h4><p>${fmt(total)} attempts${area?` · ${share(total,population.allPoints.length)} of map`:''}</p></div><button type="button" data-area-action="clear"${area?'':' disabled'}>All areas</button></div><div class="map-stats">${outcomeGroups(counts).map(group=>`<div><span class="panel-outcome">${group.name}</span><strong>${share(group.count,total)}</strong><span>${fmt(group.count)} ${group.count===1?'attempt':'attempts'}</span>${group.children.length?`<small>${group.children.map(child=>`${child.name} ${share(child.count,total)} (${fmt(child.count)})`).join('<br>')}</small>`:''}</div>`).join('')}</div><div class="area-panel-footer"><span>Shares of all outcomes in ${area?'this area':'the whole rink'}.</span><button type="button" data-area-action="details">Goal details ↓</button></div>`;
}
