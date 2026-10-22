import {brandExportCanvas} from './export-branding.mjs';
import {ZONES,GOAL_LINE,BLUE_LINE,OUTCOME_NAMES,OUTCOME_COLORS,heatStops,selectPopulation,zoneOf,zoneValue,areaOutcomes,outcomeGroups,areaGoalDetails,outsideBreakdown,groupedLocations,locationRadius,locationFindings,locationMarkerLayout,colorAt,heatColorAt,densityContours,density} from './model.mjs';
import {createSelectionMemory} from './selection-memory.mjs';
import {summaryConference,summaryReference,compareSummary} from './summary-comparison.mjs';
import {teamStyle} from './team-style.mjs';
import {FLANK_CLIP,CREASE_PATH} from './zones.mjs';
import {faceoffMarkings} from './rink-geometry.mjs';
import {areaPanelMarkup} from './area-panel.mjs';
import {createTooltipIntent,tooltipPosition,tooltipMarkup,highlightMatchingZones} from './tooltip.mjs';
import {buildPrintSnapshot,renderPrintSVG} from './print-export.mjs';
import {exportLogoFile,loadExportLogo,drawExportLogo,webExportLayout,drawOutcomeBanner,drawPerspectiveBanner,exportOutcome} from './web-export.mjs';
import {zoneBorderStyle} from './zone-borders.mjs';
import {comparisonSpecs} from './comparison-specs.mjs';

const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('en-US'),pct=(n,d)=>d?`${(100*n/d).toFixed(1)}%`:'—';
const defaults={season:2026,conference:'all',team:'all',opponentConference:'all',opponentTeam:'all',period:'all',venue:'all',scope:'all',partial:false,exact:false,layout:'profile',compareTeam:'all',perspective:'taken',view:'heatmap',outcome:'all',measure:'share',breakdown:'share',palette:'forest',theme:'dark',goals:false,unusual:false,zoneBorders:false,marks:'grouped',summaryLeft:'off',summaryRight:'off',zone:null};
const state={...defaults},selectionMemory=createSelectionMemory(defaults);
try{const saved=localStorage.getItem('chd-shot-map-theme');if(['dark','light'].includes(saved))state.theme=saved;}catch{}
const params=new URLSearchParams(location.search);
for(const key of Object.keys(defaults))if(params.has(key))state[key]=params.get(key);
state.exact=state.exact===true||state.exact==='true';
state.season=Number(state.season);state.partial=state.partial===true||state.partial==='true';state.goals=state.goals===true||state.goals==='true';state.unusual=state.unusual===true||state.unusual==='true';
state.zoneBorders=state.zoneBorders===true||state.zoneBorders==='true';
let index,data,current=[],loadGeneration=0,exporting=false,inspectionZone=null;
const privatePreview=document.documentElement.dataset.privateShotMaps==='true';
let tooltipTarget=null,tooltipDismissedTarget=null,tooltipPointer=null;
const tooltipIntent=createTooltipIntent({
  isOpen:()=>tooltipTarget!==null,
  close:()=>hideZoneTooltip(),
  isActive:target=>tooltipTarget===target,
  isPinned:()=>$('zone-tooltip').classList.contains('is-pinned'),
  isSuppressed:target=>target===tooltipDismissedTarget,
  isConnected:target=>target.isConnected,
});
const labels={all:'All attempts',onnet:'Shots on net',goal:'Goals',saved:'Saved attempts',missed:'Missed attempts',blocked:'Blocked attempts'};
const selectedCountLabel=n=>n===1?({all:'attempt',onnet:'shot on net',goal:'goal',saved:'saved attempt',missed:'missed attempt',blocked:'blocked attempt'})[state.outcome]:state.outcome==='all'?'attempts':labels[state.outcome].toLowerCase();
const gameCountLabel=n=>`${fmt(n)} mapped ${n===1?'game':'games'}`;
const controlIds={conference:'conference',team:'team',opponentConference:'opponent-conference',opponentTeam:'opponent-team',period:'period',venue:'venue',scope:'scope',compareTeam:'compare-team',perspective:'perspective',measure:'measure',palette:'palette',marks:'point-style'};

function options(element,items,value){
  element.replaceChildren(...items.map(([id,label])=>{const o=document.createElement('option');o.value=id;o.textContent=label;return o;}));
  if(items.some(([id])=>String(id)===String(value)))element.value=value;else element.value=items[0]?.[0]??'';
  return element.value;
}
function populateTeams(){
  const conferences=[...new Set(data.teams.map(t=>t.conference))].sort();
  state.conference=options($('conference'),[['all','All conferences'],...conferences.map(c=>[c,c])],state.conference);
  state.opponentConference=options($('opponent-conference'),[['all','All conferences'],...conferences.map(c=>[c,c])],state.opponentConference);
  const subjects=data.teams.filter(t=>state.conference==='all'||t.conference===state.conference);
  const opponents=data.teams.filter(t=>state.opponentConference==='all'||t.conference===state.opponentConference);
  state.team=options($('team'),[['all',state.conference==='all'?'All teams':'All teams in this conference'],...subjects.map(t=>[String(t.id),t.name])],state.team);
  state.opponentTeam=options($('opponent-team'),[['all','All opponents'],...opponents.map(t=>[String(t.id),t.name])],state.opponentTeam);
  state.compareTeam=options($('compare-team'),data.teams.map(t=>[String(t.id),t.name]),state.compareTeam);
}
function syncControls(){
  $('season').value=state.season;
  for(const [key,id] of Object.entries(controlIds)){
    const select=$(id);
    if([...select.options].some(o=>o.value===String(state[key])))select.value=state[key];
    else {select.selectedIndex=0;state[key]=select.value;}
  }
  if(!['profile','compare'].includes(state.layout))state.layout='profile';
  if(!['zones','heatmap','attempts'].includes(state.view))state.view=defaults.view;
  if(!['share','counts'].includes(state.breakdown))state.breakdown='share';
  if(!['dark','light'].includes(state.theme))state.theme=defaults.theme;
  if(!Object.hasOwn(labels,state.outcome))state.outcome='all';
  for(const key of ['summaryLeft','summaryRight'])if(!['off','conference','national'].includes(state[key]))state[key]='off';
  const aliases={'high-slot':'slot','left-sharp':'left-tight','right-sharp':'right-tight','left-line':'left-tight','right-line':'right-tight'};
  if(Object.hasOwn(aliases,state.zone))state.zone=aliases[state.zone];
  if(!ZONES.some(z=>z.id===state.zone))state.zone=null;
  $('export-focus').options[1].disabled=!state.zone;
  if(!state.zone)$('export-focus').value='whole';
  $('partial').checked=state.partial;$('exact').checked=state.exact;$('partial').disabled=state.exact;
  document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layout===state.layout));
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===state.view));
  document.querySelectorAll('[data-outcome]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.outcome===state.outcome));
  document.querySelectorAll('button[data-theme]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.theme===state.theme));
  $('compare-control').hidden=state.layout!=='compare';$('perspective-control').hidden=state.layout!=='compare';
  // Exact dots carry outcome symbols, not an intensity measure.
  $('measure').disabled=state.view==='attempts';
  $('heatmap-options').hidden=state.view!=='heatmap';
  $('attempt-options').hidden=state.view!=='attempts';
  $('palette').disabled=state.measure==='difference';
  $('goals').checked=state.goals;
  $('goals').disabled=!['all','onnet','goal'].includes(state.outcome);
  $('unusual').checked=state.unusual;
  $('zone-borders').checked=state.zoneBorders;
}
async function loadSeason(){
  hideZoneTooltip();
  const generation=++loadGeneration;
  $('load-status').hidden=false;$('load-status').textContent='Loading archived shot locations…';
  $('study').hidden=true;
  for(const id of ['season','conference','team','opponent-conference'])$(id).disabled=true;
  const season=index.seasons.find(s=>s.season===state.season)||index.seasons[0];
  state.season=season.season;
  try{
    const response=await fetch(`./data/${season.file}`);
    if(!response.ok)throw new Error(`Dataset unavailable (${response.status})`);
    const loaded=await response.json();
    if(loaded.schema!==1||loaded.privatePreview!==privatePreview||loaded.season!==state.season)throw new Error('Dataset identity check failed');
    if(generation!==loadGeneration)return;
    data=loaded;populateTeams();syncControls();
    $('load-status').hidden=true;$('study').hidden=false;
    for(const id of ['season','conference','team','opponent-conference'])$(id).disabled=false;
    render();
  }catch(error){if(generation===loadGeneration){$('load-status').textContent=`The shot maps could not load. ${error.message}. Reload to try again.`;$('season').disabled=false;}}
}
function subjectName(team=state.team,conference=state.conference){
  return team==='all'?(conference==='all'?'All teams':conference):data.teams.find(t=>String(t.id)===team)?.name||'All teams';
}
function mark(team){return data.teams.find(t=>String(t.id)===team)?.logo||'';}
function describeFilters(){
  const parts=[state.opponentTeam!=='all'?`Against ${subjectName(state.opponentTeam,'all')}`:state.opponentConference!=='all'?`Against ${state.opponentConference}`:'All opponents'];
  if(state.period!=='all')parts.push(state.period==='ot'?'Overtime':`${['First','Second','Third'][Number(state.period)-1]} period`);
  if(state.venue!=='all')parts.push(`Listed ${state.venue}`);
  if(state.scope!=='all')parts.push(state.scope==='regular'?'Regular season':'Conference & NCAA postseason');
  if(state.exact)parts.push('Exact matches only');else if(state.partial)parts.push('Larger count discrepancies included');
  return parts.join(' · ');
}
function populationSpec(){
  return comparisonSpecs(state,subjectName);
}
function valueText(v){
  if(v===null)return '—';
  if(state.measure==='share')return `${v.toFixed(1)}%`;
  if(state.measure==='difference')return `${v>0?'+':''}${v.toFixed(1)} pp`;
  return v.toFixed(1);
}
function textOn(fill){
  const rgb=[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16));
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<132?'#fff':'#183c32';
}
function heatGradient(palette,difference){return `linear-gradient(90deg,${heatStops(palette,difference,state.theme).map(([t,c])=>`${c} ${(difference?(t+1)/2:t)*100}%`).join(',')})`;}
function paletteFor(spec){return state.palette==='team'?teamStyle(data.teams.find(t=>String(t.id)===spec.team)).palette:state.palette;}
function heatImage(grid,max,difference,palette=state.palette){
  const small=document.createElement('canvas');small.width=grid.nx;small.height=grid.ny;
  const context=small.getContext('2d'),pixels=context.createImageData(grid.nx,grid.ny);
  grid.values.forEach((v,i)=>{
    const color=heatColorAt(v,max,palette,difference,state.theme);
    for(let j=0;j<3;j++)pixels.data[i*4+j]=parseInt(color.slice(1+j*2,3+j*2),16);
    pixels.data[i*4+3]=255;
  });
  context.putImageData(pixels,0,0);
  const image=document.createElement('canvas');image.width=425;image.height=500;
  image.getContext('2d').drawImage(small,0,0,425,500);
  return image.toDataURL('image/png');
}
function shotSymbol(outcome,x,y,size=3.4){
  const c=OUTCOME_COLORS[outcome];
  if(outcome===0){
    const points=Array.from({length:10},(_,i)=>{const r=i%2?size*.45:size;return `${x+Math.sin(i*Math.PI/5)*r},${y-Math.cos(i*Math.PI/5)*r}`;}).join(' ');
    return `<polygon points="${points}" fill="${c}" stroke="#fff" stroke-width=".6"/>`;
  }
  if(outcome===1)return `<circle cx="${x}" cy="${y}" r="${size*.55}" fill="${c}" fill-opacity=".52"/>`;
  if(outcome===2)return `<path d="M${x-size*.6} ${y-size*.6}l${size*1.2} ${size*1.2}m0 ${-size*1.2}l${-size*1.2} ${size*1.2}" fill="none" stroke="${c}" stroke-width="1.3"/>`;
  return `<rect x="${x-size*.5}" y="${y-size*.5}" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.2"/>`;
}
function attemptImage(population,groups,maxCount){
  // A canvas layer keeps season/conference selections responsive while drawing
  // every mark at its actual location. No thinning, jitter, or event inference.
  const canvas=document.createElement('canvas');canvas.width=850;canvas.height=1000;
  const ctx=canvas.getContext('2d');ctx.scale(2,2);
  if(groups){
    const outcome={goal:0,saved:1,missed:2,blocked:3}[state.outcome],color=OUTCOME_COLORS[outcome??1];
    for(const g of groups){
      const x=g.lateral*4.25,y=g.depth*10,r=locationRadius(g.total,maxCount);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=.66;ctx.fill();
      ctx.globalAlpha=.8;ctx.strokeStyle='#fff';ctx.lineWidth=.65;ctx.stroke();
    }
    // Goal rings sit on top of the location dots, so overlaps cannot hide them.
    if(['all','onnet'].includes(state.outcome))for(const g of groups)if(g.counts[0]){
      ctx.beginPath();ctx.arc(g.lateral*4.25,g.depth*10,locationRadius(g.total,maxCount)+1,0,Math.PI*2);
      ctx.globalAlpha=.95;ctx.strokeStyle=OUTCOME_COLORS[0];ctx.lineWidth=1.5;ctx.stroke();
    }
    return canvas.toDataURL('image/png');
  }
  const points=[...population.points.filter(p=>p[4]!==0),...population.points.filter(p=>p[4]===0)];
  for(const p of points){
    if(p[2]>50)continue;
    const x=p[3]*4.25,y=p[2]*10,o=p[4],size=o===0?5.3:3.4;
    ctx.strokeStyle=OUTCOME_COLORS[o];ctx.fillStyle=OUTCOME_COLORS[o];ctx.globalAlpha=1;ctx.lineWidth=1.3;ctx.beginPath();
    if(o===0){
      for(let i=0;i<10;i++){const r=i%2?size*.45:size,px=x+Math.sin(i*Math.PI/5)*r,py=y-Math.cos(i*Math.PI/5)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
      ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=.6;ctx.stroke();
    }else if(o===1){ctx.globalAlpha=.52;ctx.arc(x,y,size*.55,0,2*Math.PI);ctx.fill();}
    else if(o===2){ctx.moveTo(x-size*.6,y-size*.6);ctx.lineTo(x+size*.6,y+size*.6);ctx.moveTo(x+size*.6,y-size*.6);ctx.lineTo(x-size*.6,y+size*.6);ctx.stroke();}
    else {ctx.lineWidth=1.2;ctx.strokeRect(x-size*.5,y-size*.5,size,size);}
  }
  return canvas.toDataURL('image/png');
}
function locationName(g){
  const zone=ZONES.find(z=>z.id===zoneOf([0,1,g.depth,g.lateral,0]));
  const side=g.lateral<40?'left':g.lateral>60?'right':'center';
  return `${zone.name}${['left','right'].includes(zone.id)?'':` · ${side}`}`;
}
function findingMarkers(spec){
  if(state.view!=='heatmap'||!state.unusual)return '';
  return `<g class="finding-markers">${locationMarkerLayout(spec.findings.markers).map(g=>{
    const {x,y,bx,by}=g;
    const light=state.theme==='light',behind=g.categories.includes('behind'),color=behind?(light?'#146b78':'#8be6f1'):(light?'#995b20':'#fff0bc'),base=heatColorAt(0,1,paletteFor(spec),state.measure==='difference',state.theme);
    return `<g class="finding-marker" data-finding="${g.id}" role="button" tabindex="0" aria-label="${esc(`Location ${g.id}: ${locationName(g)}, ${fmt(g.total)} ${selectedCountLabel(g.total)} across ${gameCountLabel(g.games)}. Inspect all outcomes.`)}"><line x1="${x}" y1="${y}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="1" pointer-events="none"/><circle cx="${x}" cy="${y}" r="2" fill="${color}" pointer-events="none"/><circle cx="${bx}" cy="${by}" r="15" fill="transparent"/>${behind?`<circle cx="${bx}" cy="${by}" r="9" fill="${base}" stroke="${color}" stroke-width="2"/>`:`<path d="M${bx} ${by-11}L${bx+11} ${by}L${bx} ${by+11}L${bx-11} ${by}Z" fill="${base}" stroke="${color}" stroke-width="2"/>`}<text x="${bx}" y="${by+4}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" pointer-events="none">${g.id}</text></g>`;
  }).join('')}</g>`;
}
function rinkSVG(spec,i,max,grid,heatMax,groups,pointMax){
  const id=`rink-${i}`,difference=state.measure==='difference',heat=state.view==='heatmap',overlay=heat||state.view==='attempts';
  const darkHeat=heat&&state.theme!=='light';
  const palette=paletteFor(spec);
  const background=heat?`<image href="${heatImage(grid,heatMax,difference,palette)}" width="425" height="500" class="rink-layer-image"/>`:'';
  const contours=heat?`<g fill="none" stroke="${darkHeat?'#f0f8da':'#254d46'}" stroke-width=".65" stroke-opacity=".3" pointer-events="none" aria-hidden="true">${densityContours(grid,heatMax,difference).map(c=>`<path d="${c.path}"/>`).join('')}</g>`:'';
  let zones='';
  for(const z of ZONES.filter(z=>z.path)){
    const value=zoneValue(spec.population,z.id,state.measure,spec.baseline);
    const fill=state.view==='zones'?colorAt(value,max,difference):'transparent';
    const textFill=textOn(fill==='transparent'?'#f6f9ef':fill);
    const count=spec.population.counts[z.id];
    zones+=`<path class="zone-hit" data-zone="${z.id}" d="${z.path}" ${z.flank?`clip-path="url(#${id}-flanks)"`:''} fill="${fill}" fill-rule="evenodd" stroke="${zoneBorderStyle(state,state.zone===z.id).stroke}" stroke-width="${zoneBorderStyle(state,state.zone===z.id).width}" role="button" tabindex="0" aria-pressed="${state.zone===z.id}" aria-label="${esc(`${z.name}: ${pct(count,spec.population.total)} of this map's ${labels[state.outcome].toLowerCase()} (${fmt(count)} attempts). Focus for outcome shares and counts. Select for full area details.`)}"/>`;
    if(state.view==='zones'){
      const [x,y]=z.label;
      const format=z.format||'full';
      const text=format==='edge'?`<text x="${x}" y="${y+4}" font-size="11" font-weight="700">${z.short}</text>`:format==='slice'?`<text x="${x}" y="${y-4}" font-size="10" font-weight="700">${z.short}</text><text x="${x}" y="${y+9}" font-size="${state.measure==='difference'?10:12}" font-weight="800">${valueText(value)}</text>`:format==='band'?`<text x="${x}" y="${y-5}" font-size="10" font-weight="700">${z.short}</text><text x="${x}" y="${y+9}" font-size="${state.measure==='difference'?12:14}" font-weight="800">${valueText(value)}<tspan font-size="10" font-weight="500"> · ${fmt(count)}</tspan></text>`:format==='central'?`<text x="${x}" y="${y-8}" font-size="${z.id==='front'?11:14}" font-weight="650">${z.short}</text><text x="${x}" y="${y+14}" font-size="${z.id==='front'?18:22}" font-weight="800">${valueText(value)}</text><text x="${x}" y="${y+28}" font-size="11">${fmt(count)}</text>`:`<text x="${x}" y="${y-(format==='point'?8:10)}" font-size="${format==='point'?14:16}" font-weight="650">${z.short}</text><text x="${x}" y="${y+17}" font-size="${format==='point'?20:state.measure==='difference'?22:26}" font-weight="800">${valueText(value)}</text><text x="${x}" y="${y+(format==='point'?30:32)}" font-size="${format==='point'?11:14}">${fmt(count)}</text>`;
      zones+=`<g fill="${textFill}" text-anchor="middle" pointer-events="none">${text}</g>`;
    }
  }
  let attempts='';
  if(state.view==='attempts')attempts=`<image href="${attemptImage(spec.population,groups,pointMax)}" width="425" height="500" pointer-events="none"/>`;
  if(heat&&state.goals)attempts=`<g pointer-events="none" aria-label="Goals in the shown attempts">${spec.population.points.filter(p=>p[4]===0&&p[2]<=50).map(p=>`<circle cx="${p[3]*4.25}" cy="${p[2]*10}" r="3.2" fill="${darkHeat?'#fff7cf':'#a3382e'}" fill-opacity=".7" stroke="${darkHeat?heatColorAt(0,heatMax,palette,difference,state.theme):'#fff'}" stroke-width="1"/>`).join('')}</g>`;
  const empty=!spec.population.total?'<rect x="72" y="195" width="281" height="72" rx="5" fill="#fff" fill-opacity=".96"/><text class="empty-map" x="212.5" y="224" fill="#526b5c" font-size="15" text-anchor="middle">No mapped attempts in this selection.</text><text x="212.5" y="246" fill="#526b5c" font-size="12" text-anchor="middle">Try another team or widen the filters.</text>':'';
  const goal=GOAL_LINE*10,blue=BLUE_LINE*10;
  return `<svg id="${id}" class="rink ${heat?'rink-heatmap':''} ${heat&&!darkHeat?'rink-light':''} ${heat&&state.zoneBorders?'rink-zone-borders':''}" viewBox="-3 -3 431 507" role="group" font-family="Trebuchet MS,Arial,sans-serif" aria-label="${esc(`${spec.name}, ${spec.label.toLowerCase()}, ${labels[state.outcome].toLowerCase()}, ${state.view} view`)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(`${spec.name} · ${spec.label}`)}</title><defs><clipPath id="${id}-clip"><path d="M100 0H325Q425 0 425 100V500H0V100Q0 0 100 0Z"/></clipPath><clipPath id="${id}-flanks"><path d="${FLANK_CLIP}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs><rect width="425" height="500" fill="${heat?heatColorAt(0,heatMax,palette,difference,state.theme):'#f6f9ef'}" clip-path="url(#${id}-clip)"/><g clip-path="url(#${id}-clip)">${background}${contours}${zones}<g class="rink-lines" fill="none" pointer-events="none" opacity="${heat?'.65':state.view==='zones'?'.3':'.48'}" stroke="${heat?(darkHeat?'#b1d4c9':'#b58780'):'#acbdba'}" stroke-width="1.5"><path d="M0 ${goal}H425" stroke="${darkHeat?'#e0b9ac':'#cc726b'}"/>${faceoffMarkings({ink:darkHeat?'#e0b9ac':'#cc726b'})}<path d="${CREASE_PATH}" fill="#7dbac0" fill-opacity=".15"/><path d="M0 ${blue}H425" stroke="${darkHeat?'#a3cfe4':'#446f94'}" stroke-width="${heat?2:3}"/><circle cx="212.5" cy="500" r="75"/></g>${attempts}</g><path d="M100 0H325Q425 0 425 100V500H0V100Q0 0 100 0Z" fill="none" stroke="${darkHeat?'#9fbfb2':'#3d6455'}" stroke-width="2" pointer-events="none"/><path d="M197.5 ${goal}V${goal-18}H227.5V${goal}Z" fill="${darkHeat?heatColorAt(0,heatMax,palette,difference,state.theme):'#fff'}" stroke="${darkHeat?'#e1ece2':'#537165'}" stroke-width="1.5" pointer-events="none"/>${findingMarkers(spec)}${empty}</svg>`;
}

const summaryKey=i=>i===0?'summaryLeft':'summaryRight';
const summaryDelta=value=>value===null?'—':`${Math.abs(value)<.05?'':value>0?'+':'−'}${Math.abs(value).toFixed(1)} pp`;
function referenceFor(spec,mode){
  spec.summaryReferences??={};
  if(!Object.hasOwn(spec.summaryReferences,mode))spec.summaryReferences[mode]=summaryReference(data,spec,mode);
  return spec.summaryReferences[mode];
}
function benchmarkMarkup(spec,mode,zone=inspectionZone){
  const reference=referenceFor(spec,mode);if(!reference)return '';
  const comparison=compareSummary(spec.population,reference.population,zone);
  const area=ZONES.find(z=>z.id===zone);
  if(!comparison.referenceTotal)return `<p class="summary-empty">No mapped attempts for ${esc(reference.label.toLowerCase())} with these filters${area?' in '+esc(area.name):''}.</p>`;
  return `<div class="summary-benchmarks">${comparison.rows.map(row=>`<div><span>${row.name}</span><strong>${row.referenceShare.toFixed(1)}%</strong><small>${summaryDelta(row.difference)} <span>vs. average</span></small></div>`).join('')}</div><p class="summary-method">${esc(reference.label)} from ${fmt(comparison.referenceTotal)} mapped attempts${area?' in '+esc(area.name):''}. Attempt-weighted shares; same season and filters. Differences are percentage points (your map minus average). All outcomes included.</p>`;
}
function summaryControl(spec,i){
  const key=summaryKey(i),conference=summaryConference(data,spec);
  if(state[key]==='conference'&&!conference)state[key]='off';
  const mode=state[key],conferenceLabel=conference==='Independent'?'Independent programs average':conference?`${conference} average`:'Conference average (select a team)';
  return `<section class="summary-comparison" aria-label="${esc(spec.name+' '+spec.label.toLowerCase()+' summary comparison')}"><label for="summary-reference-${i}">Compare summary<select id="summary-reference-${i}" data-summary="${i}"><option value="off"${mode==='off'?' selected':''}>Off</option><option value="conference"${mode==='conference'?' selected':''}${!conference?' disabled':''}>${esc(conferenceLabel)}</option><option value="national"${mode==='national'?' selected':''}>National average</option></select></label><div id="summary-benchmark-${i}" aria-live="polite">${benchmarkMarkup(spec,mode)}</div></section>`;
}

function inspectArea(zone){
  inspectionZone=ZONES.some(z=>z.id===zone)?zone:null;
  hideZoneTooltip();
  highlightMatchingZones($('map-grid'),inspectionZone);
  current.forEach((spec,i)=>{
    $('area-panel-'+i).innerHTML=areaPanelMarkup(spec.population,inspectionZone);
    $('summary-benchmark-'+i).innerHTML=benchmarkMarkup(spec,state[summaryKey(i)],inspectionZone);
  });
}
function bindAreaInspection(){
  $('map-grid').querySelectorAll('.zone-hit[data-zone]').forEach(path=>{
    path.setAttribute('aria-controls','area-panel-0 area-panel-1');
    path.addEventListener('pointerenter',e=>{
      if(e.pointerType==='mouse')inspectArea(path.dataset.zone);
    });
    path.addEventListener('focus',()=>inspectArea(path.dataset.zone));
    const activate=()=>{if(state.zone!==path.dataset.zone)selectZone(path.dataset.zone,false);else inspectArea(path.dataset.zone);};
    path.addEventListener('click',activate);
    path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });
  $('map-grid').querySelectorAll('.area-panel').forEach(panel=>panel.addEventListener('click',e=>{
    const action=e.target.closest('[data-area-action]')?.dataset.areaAction;if(!action)return;
    if(action==='clear'){state.zone=null;selectZone(null,false);return;}
    if(state.zone!==inspectionZone)selectZone(inspectionZone,false);
    const heading=$('area-heading');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
    heading.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }));
}

function render(){
  hideZoneTooltip();tooltipDismissedTarget=null;
  syncControls();
  if(state.zone)inspectionZone=state.zone;
  $('study').dataset.view=state.view;
  $('study').dataset.theme=state.theme;
  const specs=populationSpec();
  for(const spec of specs){
    spec.population=selectPopulation(data,spec.state,spec.perspective);
    spec.baseline=selectPopulation(data,{...spec.state,conference:'all',team:'all'},spec.perspective);
    if(state.view==='heatmap'&&state.unusual)spec.findings=locationFindings(spec.population);
  }
  current=specs;
  const values=specs.flatMap(s=>ZONES.map(z=>zoneValue(s.population,z.id,state.measure,s.baseline))).filter(v=>v!==null);
  const max=Math.max(state.measure==='difference'?1:state.measure==='pergame'?0.1:1,...values.map(v=>state.measure==='difference'?Math.abs(v):v));
  const grids=state.view==='heatmap'?specs.map(s=>{
    const grid=density(s.population,state.measure);
    if(state.measure==='difference'&&s.population.total&&s.baseline.total){
      const baseline=density(s.baseline,'share');
      grid.values=grid.values.map((v,i)=>v-baseline.values[i]);
    }else if(state.measure==='difference')grid.values.fill(0);
    return grid;
  }):[];
  let heatMax=.00001;
  for(const grid of grids)for(const v of grid.values)heatMax=Math.max(heatMax,state.measure==='difference'?Math.abs(v):v);
  const locationGroups=state.view==='attempts'&&state.marks==='grouped'?specs.map(s=>groupedLocations(s.population.points)):[];
  let pointMax=4;
  for(const groups of locationGroups)for(const g of groups)pointMax=Math.max(pointMax,g.total);
  $('scope-kicker').textContent=`${data.label} / MEN`;
  $('study-title').textContent=state.layout==='profile'?subjectName():`${subjectName()} & ${subjectName(state.compareTeam,'all')}`;
  $('scope-description').textContent=describeFilters();
  const areaHint=matchMedia('(any-hover: hover) and (any-pointer: fine)').matches?'Hover or focus an area to update the fixed panels beneath both rinks. The panels keep the last area you inspected. Select for full goal details in Read the rink.':'Tap an area to update both fixed panels. Goal details opens its full breakdown in Read the rink.';
  $('reading-guide').textContent=(state.view==='attempts'?(state.marks==='grouped'?'Each dot is a recorded location. Larger dots contain more attempts; both maps use the same size scale.':'Every symbol is a recorded attempt; overlapping marks are retained.'):state.measure==='difference'?`${state.view==='heatmap'&&state.theme==='dark'?'Lime':'Green'} shows a larger location share than the league; ${state.view==='heatmap'?'coral':'copper'} shows a smaller share. Both maps use the same scale.`:state.view==='zones'?`Each area shows ${state.measure==='pergame'?'shown attempts per mapped team game':'its share of the shown attempts'}. Smaller numbers are counts.`:`Warmer colors show where ${labels[state.outcome].toLowerCase()} concentrate${state.measure==='pergame'?', normalized per mapped team game':''}. Both maps use the same scale.`)+` ${areaHint} Matching areas light up on both maps.`;
  $('map-grid').innerHTML=specs.map((spec,i)=>{
    const p=spec.population,logo=mark(spec.team);
    const name=state.layout==='profile'?spec.label:spec.name;
    const subtitle=state.layout==='profile'?spec.name:spec.label;
    const branded=state.palette==='team'&&state.theme==='dark'&&state.view==='heatmap',brand=teamStyle(data.teams.find(t=>String(t.id)===spec.team));
    return `<article class="map-card${branded?' map-team-color':''}"${branded?` style="--team-panel:${brand.panel};--team-accent:${brand.accent};--team-text:${brand.text};--team-muted:${brand.muted};--team-base:${brand.base}"`: ''}><div class="card-heading">${logo?`<img src="../assets/logos/${encodeURIComponent(logo)}" alt="">`:''}<div><h3>${esc(name)}</h3><p>${esc(subtitle)} · ${fmt(p.mappedGames)} mapped games${p.minorDiscrepancyGames?` · ${fmt(p.minorDiscrepancyGames)} with a 1-shot discrepancy`:''}</p></div><span class="card-view-label">${state.view==='heatmap'?'SHOT CONCENTRATION':state.view==='zones'?'BY AREA':state.marks==='grouped'?'RECORDED LOCATIONS':'RECORDED ATTEMPTS'}</span></div><div class="map-stage"><p class="map-direction">Attacking end ↑</p><div class="map-wrap">${rinkSVG(spec,i,max,grids[i],heatMax,locationGroups[i],pointMax)}</div></div><section class="area-panel" id="area-panel-${i}" aria-label="${esc(name+' area outcomes')}">${areaPanelMarkup(p,inspectionZone)}</section>${summaryControl(spec,i)}<p class="map-note">Whole map: ${fmt(p.allPoints.length)} recorded attempts across ${fmt(p.mappedAppearances)} team games in the selected period. On net (goals + saves): ${pct(p.outcomes[0]+p.outcomes[1],p.allPoints.length)}. Map: ${esc(labels[state.outcome].toLowerCase())}${p.beyondHalf?` · ${fmt(p.beyondHalf)} origins beyond this half-rink remain in the totals.`:'.'}</p></article>`;
  }).join('');
  $('map-grid').querySelectorAll('[data-summary]').forEach(select=>select.addEventListener('change',()=>{
    const i=Number(select.dataset.summary),mode=select.value;
    state[summaryKey(i)]=mode;
    $('summary-benchmark-'+i).innerHTML=benchmarkMarkup(current[i],mode);
    saveState();
  }));
  $('map-grid').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
  bindAreaInspection();
  highlightMatchingZones($('map-grid'),inspectionZone);
  bindFindingMarkers(specs);
  const heat=state.view==='heatmap',difference=state.measure==='difference';
  const pointColor=OUTCOME_COLORS[{goal:0,saved:1,missed:2,blocked:3}[state.outcome]??1];
  const locationLegend=`<div class="location-legend"><span>Attempts at a location</span>${[...new Set([1,Math.ceil(pointMax/2),pointMax])].map(n=>`<span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="${locationRadius(n,pointMax)}" fill="${pointColor}" fill-opacity=".66"/></svg>${fmt(n)}</span>`).join('')}</div>${['all','onnet'].includes(state.outcome)?'<span class="location-goal-legend"><i></i> Ring: at least one goal</span>':''}<span>All game states combined</span>`;
  $('map-legend').innerHTML=state.view==='attempts'?(state.marks==='grouped'?locationLegend:`<div class="symbol-legend">${OUTCOME_NAMES.map((n,i)=>`<span><svg viewBox="0 0 16 16" aria-hidden="true">${shotSymbol(i,8,8,6)}</svg>${n}</span>`).join('')}</div><span>Overlapping marks are retained.</span>`):`<div class="legend-scale"><span>${difference?'Less than league':'Lower concentration'}</span><span class="legend-gradient ${difference?'difference':''}" ${heat?`style="background:${heatGradient(state.palette,difference)}"`:''}></span><span>${difference?'More than league':'Higher concentration'}</span></div><span>${heat?'Contours follow equal concentration':'Shared zone scale'}</span>${heat&&state.goals&&['all','onnet','goal'].includes(state.outcome)?'<span class="goal-legend"><i></i> Goal locations</span>':''}<span>All game states combined</span>`;
  if(heat&&state.palette==='team'&&!difference){
    $('map-legend').innerHTML=specs.map(spec=>`<div class="legend-scale team-legend"><b>${esc(spec.name)}</b><span>Lower</span><span class="legend-gradient" style="background:${heatGradient(paletteFor(spec),false)}"></span><span>Higher</span></div>`).join('')+'<span>Shared concentration scale. Team colors change the cold end.</span>';
  }
  if(heat&&state.unusual)$('map-legend').insertAdjacentHTML('beforeend','<span class="finding-key"><i class="behind-key"></i> Behind goal line</span><span class="finding-key"><i class="frequent-key"></i> Frequent locations</span>');
  if(state.view==='zones')$('map-legend').insertAdjacentHTML('beforeend','<div class="slice-key"><span><b>Instat areas 41–49</b> Provider-defined shot-origin zones</span><span>Hover or tap for full names and counts.</span></div>');
  renderFindings(specs);
  const p=specs[0].population;
  $('coverage-summary').classList.toggle('warning',specs.some(s=>s.population.mappedGames<s.population.games||s.population.minorDiscrepancyGames)||state.partial);
  const coverageText=s=>`${s.name} ${s.label.toLowerCase()}: ${fmt(s.population.mappedGames)} of ${fmt(s.population.games)} eligible games mapped${s.population.minorDiscrepancyGames?` (${fmt(s.population.minorDiscrepancyGames)} with a 1-shot discrepancy)`:''}`;
  $('coverage-summary').innerHTML=`<strong>Coverage matters.</strong><span>${esc(specs.map(coverageText).join(' | ')+'.')} Accepted ordinary Instat events reconcile to period goals and independent player-overview SOG totals. Both maps use the same game sample. Missing coordinates remain unknown; no locations are invented.</span>`;
  const c=data.coverage;
  $('coverage-details').textContent=`${data.label}: ${fmt(c.verifiedMappedGames||0)} accepted countable D1 games. Source zones 41–49 are retained directly. Results through ${data.through}. Historical CHN maps remain in the archive; women's sources are unchanged.`;
  renderArea();saveState();
}
function hideZoneTooltip(){
  tooltipIntent.cancel();
  if(tooltipTarget){for(const attribute of ['aria-describedby','aria-controls','aria-expanded'])tooltipTarget.removeAttribute(attribute);tooltipTarget.classList.remove('zone-hovered','location-hovered');}
  tooltipTarget=null;tooltipPointer=null;const tip=$('zone-tooltip');tip.hidden=true;tip.classList.remove('is-pinned','is-mobile');tip.setAttribute('role','tooltip');tip.removeAttribute('aria-label');tip.style.bottom='';tip.style.maxHeight='';
}
function queueHideZoneTooltip(){
  tooltipIntent.leavePanel(tooltipTarget?.matches(':focus-visible'));
}
function showStatsTooltip(path,heading,context,counts,note,event,explicit=false){
  if(path===tooltipDismissedTarget||(!explicit&&$('zone-tooltip').classList.contains('is-pinned')))return;
  hideZoneTooltip();
  const tip=$('zone-tooltip');
  tip.innerHTML=tooltipMarkup({heading,context,counts,note,areaDetails:!!path.dataset.zone});
  tip.querySelector('.tooltip-close').addEventListener('click',()=>{const target=tooltipTarget;tooltipDismissedTarget=target;hideZoneTooltip();target?.focus({preventScroll:true});});
  tip.querySelector('.tooltip-details')?.addEventListener('click',e=>{
    e.preventDefault();const zone=tooltipTarget.dataset.zone;
    hideZoneTooltip();if(state.zone!==zone)selectZone(zone,false);
    const heading=$('area-heading');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
    heading.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  });
  tooltipTarget=path;path.setAttribute('aria-describedby',tip.id);
  path.classList.add('location-hovered');
  tip.hidden=false;
  tooltipPointer=event?{clientX:event.clientX,clientY:event.clientY}:null;
  positionStatsTooltip();
}
function positionStatsTooltip(){
  if(!tooltipTarget)return;
  const tip=$('zone-tooltip');tip.style.maxHeight='';
  const bounds=tip.getBoundingClientRect(),anchor=(tooltipTarget.closest('.rink')||tooltipTarget).getBoundingClientRect();
  const obstacles=[...$('map-grid').querySelectorAll('.rink')].map(r=>r.getBoundingClientRect());
  const position=tooltipPosition({anchor,obstacles,pointer:tooltipPointer,width:bounds.width,height:bounds.height,viewportWidth:innerWidth,viewportHeight:innerHeight});
  tip.style.left=`${position.x}px`;tip.style.top=`${position.y}px`;tip.style.maxHeight=`${position.maxHeight}px`;
}
function pinStatsTooltip(mobile=false){
  tooltipIntent.cancel();
  const tip=$('zone-tooltip');tip.classList.add('is-pinned');tip.classList.toggle('is-mobile',mobile);tip.setAttribute('role','dialog');tip.setAttribute('aria-label',tip.querySelector('h4').textContent+' details');
  tooltipTarget.removeAttribute('aria-describedby');tooltipTarget.setAttribute('aria-controls',tip.id);tooltipTarget.setAttribute('aria-expanded','true');
  if(mobile){tip.style.top='auto';tip.style.bottom='12px';tip.style.left='12px';tip.style.maxHeight='';}else positionStatsTooltip();
  tip.querySelector('.tooltip-close').focus({preventScroll:true});
}
function goalMarkup(details){
  if(!details.goals)return '<section class="goal-detail"><h5>Goals from this area</h5><p>No recorded goals in this area.</p></section>';
  const scorerList=details.scorers.map(s=>`<li><span>${esc(s.name)}</span><b>${fmt(s.goals)} ${s.goals===1?'goal':'goals'}</b></li>`).join('');
  return `<section class="goal-detail"><h5>Goals from this area</h5><div class="goal-measures"><div><strong>${pct(details.goals,details.totalGoals)}</strong><span>of mapped goals</span><small>${fmt(details.goals)} of ${fmt(details.totalGoals)} goals</small></div><div><strong>${pct(details.goals,details.onnet)}</strong><span>on-net conversion</span><small>${fmt(details.goals)} goals / ${fmt(details.onnet)} on net</small></div></div><p class="goal-games">Goals in ${gameCountLabel(details.games)}.</p><div class="goal-periods">${details.periods.map((n,i)=>`<div><span>${['First','Second','Third','OT'][i]}</span><b>${pct(n,details.goals)}</b><small>${fmt(n)} ${n===1?'goal':'goals'}</small></div>`).join('')}</div>${scorerList?`<h6>Goal scorers</h6><ul class="goal-scorers">${scorerList}</ul><p class="goal-attribution">Names linked for ${fmt(details.namedGoals)} of ${fmt(details.goals)} goals.</p>`:'<p class="goal-attribution">Scorer names are not attached to these goal locations.</p>'}</section>`;
}
function showFindingTooltip(target,spec,finding,event,explicit=false){
  const selected=`${fmt(finding.total)} ${selectedCountLabel(finding.total)} · ${pct(finding.total,spec.population.total)} of this map · ${gameCountLabel(finding.games)}`;
  showStatsTooltip(target,`Location ${finding.id}: ${locationName(finding)}`,`${spec.name} · ${spec.label==='Shots taken'?'Taken':'Faced'}`,finding.counts,selected+'. All outcomes at this location.',event,explicit);
}
function bindFindingMarkers(specs){
  $('map-grid').querySelectorAll('[data-finding]').forEach(target=>{
    const spec=specs[Number(target.closest('.rink').id.split('-')[1])],finding=spec.findings.markers.find(g=>g.id===Number(target.dataset.finding));
    target.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(any-hover: hover) and (any-pointer: fine)').matches)tooltipIntent.enter(target,()=>showFindingTooltip(target,spec,finding,e));});
    target.addEventListener('pointerleave',e=>{if(tooltipDismissedTarget===target)tooltipDismissedTarget=null;tooltipIntent.leave(target,$('zone-tooltip').contains(e.relatedTarget)||target.matches(':focus-visible'));});
    target.addEventListener('focus',()=>{if(target.matches(':focus-visible'))tooltipIntent.enter(target,()=>showFindingTooltip(target,spec,finding),true);});
    target.addEventListener('blur',()=>{if(tooltipDismissedTarget===target)tooltipDismissedTarget=null;if(tooltipTarget===target&&!target.matches(':hover')&&!$('zone-tooltip').classList.contains('is-pinned'))hideZoneTooltip();});
    const activate=e=>{tooltipDismissedTarget=null;showFindingTooltip(target,spec,finding,e.detail?e:undefined,true);pinStatsTooltip(matchMedia('(max-width:620px)').matches);};
    target.addEventListener('click',activate);
    target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e);}});
  });
}
function renderFindings(specs){
  const section=$('location-findings');section.hidden=state.view!=='heatmap'||!state.unusual;
  if(section.hidden){$('findings-grid').replaceChildren();return;}
  $('findings-grid').innerHTML=specs.map((spec,i)=>{
    const f=spec.findings,p=spec.population;
    const rows=locations=>locations.map(g=>`<button type="button" class="finding-row" data-finding-row="${i}:${g.id}" aria-label="Inspect location ${g.id}, ${esc(locationName(g))}"><span class="finding-number ${g.categories.includes('behind')?'behind':'frequent'}">${g.id}</span><span>${esc(locationName(g))}<small>${fmt(g.total)} ${esc(selectedCountLabel(g.total))} · ${gameCountLabel(g.games)}</small></span><strong>${pct(g.total,p.total)}</strong></button>`).join('');
    return `<article class="findings-card"><h4>${esc(state.layout==='profile'?spec.label:spec.name)}</h4><p class="findings-scope">${esc(state.layout==='profile'?spec.name:spec.label)} · ${esc(labels[state.outcome])}</p><div class="finding-category"><h5>Behind the goal line</h5><p class="finding-summary"><strong>${pct(f.behindCount,p.total)}</strong> of shown attempts · ${fmt(f.behindCount)} at ${fmt(f.behindLocations)} recorded locations</p>${rows(f.behindShown)}${!f.behindCount?'<p class="finding-empty">No shown attempts behind the goal line.</p>':f.behindLocations>f.limit?`<p class="finding-empty">The ${f.limit} most frequent behind-line locations are marked.</p>`:''}</div><div class="finding-category"><h5>Frequent locations</h5>${rows(f.frequentShown)}${!f.frequentShown.length?`<p class="finding-empty">No location has ${f.minRepeats} or more shown attempts.</p>`:`<p class="finding-empty">${f.frequentLocations>f.limit?`Top ${f.limit} of ${fmt(f.frequentLocations)} locations`:`${fmt(f.frequentLocations)} locations`} with ${f.minRepeats}+ shown attempts. Percentages are shares of this map.</p>`}</div></article>`;
  }).join('');
  $('findings-grid').querySelectorAll('[data-finding-row]').forEach(button=>button.addEventListener('click',e=>{
    const [i,id]=button.dataset.findingRow.split(':').map(Number),spec=specs[i],finding=spec.findings.markers.find(g=>g.id===id);
    tooltipDismissedTarget=null;showFindingTooltip(button,spec,finding,e.detail?e:undefined,true);pinStatsTooltip(matchMedia('(max-width:620px)').matches);
  }));
}
function renderArea(){
  const selected=ZONES.find(z=>z.id===state.zone);
  const shares=state.breakdown==='share';
  document.querySelectorAll('[data-breakdown]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.breakdown===state.breakdown));
  $('area-heading').textContent=selected?selected.name:'Explore an area.';
  $('area-help').textContent=selected?'See how attempts in this area end. Each bar adds up to 100%.':'Select an area on either map or below. Start with how attempts end across the whole rink.';
  $('clear-zone').hidden=!selected;
  $('zone-buttons').innerHTML=ZONES.map(z=>`<button data-area="${z.id}" aria-pressed="${state.zone===z.id}">${z.name}</button>`).join('');
  $('zone-buttons').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectZone(b.dataset.area,false)));
  $('area-insight').innerHTML=current.map(spec=>{
    const counts=areaOutcomes(spec.population,state.zone),total=counts.reduce((a,b)=>a+b,0),onnet=counts[0]+counts[1],groups=outcomeGroups(counts);
    const conversion=onnet?`${pct(counts[0],onnet)} of on-net shots became goals (${counts[0]} / ${onnet}).`:'No on-net shots in this selection.';
    const outside=state.zone==='outside'?`<details class="outside-breakdown"><summary>Left, center &amp; right beyond the blue line</summary><div>${outsideBreakdown(spec.population).map(a=>{const attempts=a.counts.reduce((sum,n)=>sum+n,0);return `<p><b>${a.name}</b><span>${pct(attempts,total)} of this area’s attempts</span><small>${fmt(attempts)} attempts · ${fmt(a.counts[0])} goals</small></p>`;}).join('')}</div></details>`:'';
    const value=n=>shares?pct(n,total):fmt(n),secondary=n=>shares?`${fmt(n)} attempts`:`${pct(n,total)} of attempts`;
    const breakdown=groups.map(group=>`<section class="outcome-group ${group.id}"><span class="outcome-label"><i style="background:${group.color}"></i>${group.name}</span><b>${value(group.count)}</b><small>${secondary(group.count)}</small>${group.children.length?`<dl class="outcome-children">${group.children.map(child=>`<div><dt>${child.name}</dt><dd><strong>${value(child.count)}</strong><small>${secondary(child.count)}</small></dd></div>`).join('')}</dl>`:''}</section>`).join('');
    return `<article class="insight-card"><h4>${esc(state.layout==='profile'?spec.label:spec.name)}</h4><p class="bar-caption">${state.layout==='compare'&&current[0].perspective!==current[1].perspective?esc(spec.label)+' · ':''}${selected?'Share of attempts in this area':'Share of attempts across the whole rink'}</p><div class="outcome-bar" aria-hidden="true">${groups.map(group=>`<span style="width:${total?100*group.count/total:0}%;background:${group.color}">${total&&group.count/total>=.1?pct(group.count,total):''}</span>`).join('')}</div><div class="outcome-row">${breakdown}</div><p class="insight-note">${fmt(total)} recorded attempts. ${total?`${pct(onnet,total)} on net (${fmt(onnet)} goals + saves). `:''}${conversion}${onnet>0&&onnet<20?' Small sample: fewer than 20 on-net shots.':''}</p><p class="insight-scope">All outcomes, regardless of the map's outcome filter. Missed and blocked attempts are included in Not on net; all shares use the same attempt total.</p>${goalMarkup(areaGoalDetails(spec.population,state.zone))}${outside}</article>`;
  }).join('');
  const mixed=state.layout==='compare'&&current[0].perspective!==current[1].perspective;
  $('table-left').textContent=state.layout==='profile'?'Shots taken':current[0].name+(mixed?' · '+current[0].label:'');
  $('table-right').textContent=state.layout==='profile'?'Shots faced':current[1].name+(mixed?' · '+current[1].label:'');
  $('zone-table-caption').textContent=`${labels[state.outcome]} by area · share of each map’s shown attempts`;
  $('zone-table').innerHTML=ZONES.map(z=>`<tr class="${state.zone===z.id?'selected':''}"><td><button data-area="${z.id}" aria-pressed="${state.zone===z.id}">${z.name}</button></td>${current.map(s=>`<td><strong>${shares?pct(s.population.counts[z.id],s.population.total):fmt(s.population.counts[z.id])}</strong><small>${shares?`${fmt(s.population.counts[z.id])} attempts`:pct(s.population.counts[z.id],s.population.total)}</small></td>`).join('')}</tr>`).join('')+`<tr><td><strong>Total</strong></td>${current.map(s=>`<td><strong>${shares?(s.population.total?'100%':'—'):fmt(s.population.total)}</strong><small>${shares?`${fmt(s.population.total)} attempts`:(s.population.total?'100%':'—')}</small></td>`).join('')}</tr>`;
  $('zone-table').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectZone(b.dataset.area,false)));
}
function selectZone(zone,scroll=true){
  state.zone=state.zone===zone?null:zone;
  $('export-focus').options[1].disabled=!state.zone;
  if(!state.zone)$('export-focus').value='whole';
  const heat=state.view==='heatmap',overlay=heat||state.view==='attempts';
  $('map-grid').querySelectorAll('[data-zone]').forEach(p=>{const selected=p.dataset.zone===state.zone;p.setAttribute('aria-pressed',selected);p.setAttribute('stroke',selected?(heat?'#e3f37e':'#b36914'):(overlay?'transparent':'#527263'));p.setAttribute('stroke-width',selected?'3':(overlay?'0':'1.3'));});
  inspectArea(state.zone);renderArea();saveState();
  if(scroll)$('area-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
function saveState(){
  const p=new URLSearchParams();
  for(const [k,v] of Object.entries(state))if(v!==null&&v!==defaults[k])p.set(k,String(v));
  history.replaceState(null,'',location.pathname+(p.size?'?'+p.toString():''));
  const gateway=document.querySelector('.comparison-gateway');
  if(gateway){const q=new URLSearchParams({season:String(state.season)});
    if(state.team!=='all'){q.set('teams',state.team);q.set('team',state.team);}
    if(state.conference!=='all')q.set('conference',state.conference);
    const region={front:'front',slot:'scoring','outer-slot':'outer-slot','left-tight':'low-wings','right-tight':'low-wings','left-wing':'upper-wings','right-wing':'upper-wings','point-left':'points','point-center':'points','point-right':'points'}[state.zone];
    if(region)q.set('region',region);gateway.href='../explorers/shot-locations/?'+q;}
}
function drawWrapped(ctx,text,x,y,width,lineHeight){
  let line='';
  for(const word of text.split(' ')){
    if(ctx.measureText(line+word+' ').width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line='';}
    line+=word+' ';
  }
  if(line)ctx.fillText(line,x,y);
  return y+lineHeight;
}
async function saveImage(){
  if(exporting)return;exporting=true;
  const button=$('save-image');button.disabled=true;button.textContent='Preparing image…';
  const exportFocus=$('export-focus').value,exportStyle=$('export-style').value;
  const exportState={...state},exportData=data,exportSpecs=current,exportZone=exportFocus==='selected'?state.zone:null,
        exportHeading=$('study-title').textContent,exportFilters=describeFilters(),
        exportReferences=current.map((spec,i)=>referenceFor(spec,state[summaryKey(i)]));
  try{
    if(exportStyle!=='web'){
      await savePrintImage(exportData,exportState,exportSpecs,exportFocus,exportStyle);
      button.textContent='Image saved ✓';return;
    }
    const images=await Promise.all([...$('map-grid').querySelectorAll('svg.rink')].map(svg=>new Promise((resolve,reject)=>{
      const clone=svg.cloneNode(true);
      clone.querySelectorAll('.zone-hovered,.location-hovered').forEach(node=>node.classList.remove('zone-hovered','location-hovered'));
      clone.querySelectorAll('.zone-hit').forEach(path=>{
        const selected=path.dataset.zone===exportZone,border=zoneBorderStyle(exportState,selected);
        path.setAttribute('stroke',border.stroke);
        path.setAttribute('stroke-width',String(border.width));path.setAttribute('aria-pressed',String(selected));
      });
      clone.setAttribute('width','862');clone.setAttribute('height','1014');
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
      const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not render the rink'));};image.src=url;
    })));
    const layout=webExportLayout(),{width,pad,panelWidth,mapHeight,xs}=layout;
    const logos=await Promise.all(exportSpecs.map(spec=>loadExportLogo(exportLogoFile(exportData,spec))));
    // Draw with measured text positions, then crop the working canvas at the footer.
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=2800;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f4ee';ctx.fillRect(0,0,width,canvas.height);
    ctx.fillStyle='#18453b';ctx.fillRect(0,0,width,10);ctx.font='bold 42px Trebuchet MS';ctx.fillText('College Hockey Shot Maps',pad,64);
    ctx.fillStyle='#516d60';ctx.font='24px Trebuchet MS';
    const subtitleBottom=drawWrapped(ctx,`${exportData.label} · Men · ${exportState.layout==='compare'?'Team comparison':'Shots taken & faced'} · ${exportState.view}`,pad,103,width-pad*2,31);
    const bannerBottom=drawOutcomeBanner(ctx,exportState.outcome,pad,subtitleBottom+5,width-pad*2);
    const outcomeHeading=exportOutcome(exportState.outcome);
    ctx.font='25px Trebuchet MS';const headerEnd=drawWrapped(ctx,exportFilters,pad,bannerBottom+37,width-pad*2,32);
    const panelTop=headerEnd+9;let mapY=panelTop+108;
    for(let i=0;i<2;i++){
      const spec=exportSpecs[i];drawExportLogo(ctx,logos[i],spec.name,xs[i],panelTop,96);
      ctx.fillStyle='#18453b';ctx.font='bold 34px Trebuchet MS';
      const nameBottom=drawWrapped(ctx,spec.name,xs[i]+116,panelTop+39,panelWidth-116,41);
      ctx.font='bold 24px Trebuchet MS';ctx.fillStyle='#516d60';
      const labelBottom=drawWrapped(ctx,`${spec.label} · ${outcomeHeading.label}`,xs[i]+116,nameBottom+1,panelWidth-116,31);
      mapY=Math.max(mapY,labelBottom+9);
    }
    for(let i=0;i<2;i++)drawPerspectiveBanner(ctx,exportSpecs[i].perspective,xs[i],mapY,panelWidth);
    mapY+=124;
    const mapBottom=mapY+mapHeight;
    let detailsBottom=mapBottom+12;
    for(let i=0;i<2;i++){
      const spec=exportSpecs[i];ctx.drawImage(images[i],xs[i],mapY,panelWidth,mapHeight);
      ctx.font='23px Trebuchet MS';ctx.fillStyle='#516d60';
      detailsBottom=Math.max(detailsBottom,drawWrapped(ctx,`${fmt(spec.population.total)} ${outcomeHeading.label.toLowerCase()} shown · ${fmt(spec.population.mappedGames)} / ${fmt(spec.population.games)} eligible games mapped${spec.population.minorDiscrepancyGames?` · ${spec.population.minorDiscrepancyGames} with a 1-shot discrepancy`:''}`,xs[i],mapBottom+35,panelWidth,31));
    }
    let contentBottom=detailsBottom;
    for(let i=0;i<2;i++)if(exportReferences[i]){
      const reference=exportReferences[i],comparison=compareSummary(exportSpecs[i].population,reference.population,exportZone);
      ctx.fillStyle='#18453b';ctx.font='bold 23px Trebuchet MS';
      const refBottom=drawWrapped(ctx,reference.label+(exportZone?' / '+ZONES.find(z=>z.id===exportZone).short:''),xs[i],detailsBottom+18,panelWidth,29);
      ctx.font='20px Trebuchet MS';ctx.fillStyle='#516d60';
      if(!comparison.referenceTotal){contentBottom=Math.max(contentBottom,drawWrapped(ctx,'No mapped reference attempts with these filters.',xs[i],refBottom+2,panelWidth,27));continue;}
      const values=comparison.rows.map(row=>`${row.name}: ${row.referenceShare.toFixed(1)}% (${summaryDelta(row.difference)})`).join(' / ');
      const valueBottom=drawWrapped(ctx,values,xs[i],refBottom+2,panelWidth,27);
      contentBottom=Math.max(contentBottom,drawWrapped(ctx,`${fmt(comparison.referenceTotal)} mapped attempts. Differences: your map minus average.`,xs[i],valueBottom+1,panelWidth,27));
    }
    let noteY=contentBottom+20;
    if(exportState.view==='heatmap'){
      const difference=exportState.measure==='difference';
      const entries=exportState.palette==='team'&&!difference?exportSpecs.map((spec,i)=>({palette:teamStyle(exportData.teams.find(t=>String(t.id)===spec.team)).palette,x:xs[i],width:panelWidth})):[{palette:exportState.palette,x:(width-620)/2,width:620}];
      for(const entry of entries){const gradient=ctx.createLinearGradient(entry.x,0,entry.x+entry.width,0);
        heatStops(entry.palette,difference,exportState.theme).forEach(([t,color])=>gradient.addColorStop(difference?(t+1)/2:t,color));
        ctx.fillStyle=gradient;ctx.fillRect(entry.x,noteY,entry.width,16);ctx.fillStyle='#18453b';ctx.font='19px Trebuchet MS';
        ctx.textAlign='left';ctx.fillText(difference?'Less than league':'Lower concentration',entry.x,noteY+39);
        ctx.textAlign='right';ctx.fillText(difference?'More than league':'Higher concentration',entry.x+entry.width,noteY+39);ctx.textAlign='left';}
      noteY+=67;
    }
    ctx.font='23px Trebuchet MS';ctx.fillStyle='#18453b';
    const measurement=exportState.view==='attempts'?(exportState.marks==='grouped'?'Dot size shows repeated attempts at a recorded location. Shared size scale.'+(['all','onnet'].includes(exportState.outcome)?' Rings mark locations with goals.':''):'Symbols: star = goal, dot = saved, cross = missed, square = blocked.'):exportState.measure==='difference'?`${exportState.view==='heatmap'&&exportState.theme==='dark'?'Lime':'Green'} = greater location share than league. ${exportState.view==='heatmap'?'Coral':'Copper'} = smaller share.`:exportState.view==='heatmap'?'Smoothed concentration · shared scale · '+(exportState.measure==='pergame'?'normalized per mapped team game.':'normalized to shown attempts.')+(exportState.goals&&['all','onnet','goal'].includes(exportState.outcome)?(exportState.theme==='light'?' Red dots mark goals.':' Light dots mark goals.'):''):exportState.measure==='pergame'?'Zone measure: shown attempts per mapped team game.':'Zone measure: share of shown attempts.';
    const markerNote=exportState.view==='heatmap'&&exportState.unusual?` Numbered ${exportState.theme==='light'?'teal':'cyan'} circles: behind goal line. ${exportState.theme==='light'?'Amber':'Cream'} diamonds: frequent coordinates (3+ shown attempts); up to 5 per category per map.`:'';
    const sliceNote=exportState.view==='zones'?' Source-coded Instat areas 41–49.':'';
    const noteBottom=drawWrapped(ctx,measurement+markerNote+sliceNote,pad,noteY,width-pad*2,31);
    ctx.font='21px Trebuchet MS';ctx.fillStyle='#516d60';
    const coverageBottom=drawWrapped(ctx,'Instat ordinary events; all game states combined. Goals and SOG reconcile independently. Source-coded zones 41–49; missing locations remain unknown.',pad,noteBottom+5,width-pad*2,29);
    const footerY=coverageBottom+14,height=footerY+104;
    ctx.fillStyle='#18453b';ctx.fillRect(0,footerY,width,104);ctx.fillStyle='#fff';ctx.font='bold 40px Trebuchet MS';
    if(exportData.privatePreview)ctx.fillText('PRIVATE PREVIEW',pad,footerY+46);
    ctx.font='21px Trebuchet MS';ctx.fillText('Recorded locations: Hudl Instat · Visual by u/BakedMitten',pad,footerY+80);
    const output=document.createElement('canvas');output.width=width;output.height=height;
    output.getContext('2d').drawImage(canvas,0,0,width,height,0,0,width,height);
    const blob=await brandExportCanvas(output).then(branded=>new Promise(resolve=>branded.toBlob(resolve,'image/png')));
    if(!blob)throw new Error('Image export failed');
    const directions=exportSpecs.map(spec=>spec.perspective).join('-vs-');
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`chd-shot-maps-${exportData.season}-${directions}-${exportState.outcome}-${exportState.view}${exportState.view==='heatmap'?'-'+exportState.theme:''}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    button.textContent='Image saved ✓';
  }catch(error){button.textContent='Try saving again';$('reading-guide').textContent=`Image export: ${error.message}.`;}
  finally{exporting=false;button.disabled=false;setTimeout(()=>{if(!exporting)button.textContent='Save image ↗';},2500);}
}

async function savePrintImage(exportData,exportState,specs,focus,style){
  const snapshot=buildPrintSnapshot(exportData,exportState,specs,{focus,
    referenceModes:[exportState.summaryLeft,exportState.summaryRight],studyBase:location.origin+location.pathname});
  const logos=new Map();
  for(const panel of snapshot.panels)if(panel.logo){
    if(!logos.has(panel.logo))logos.set(panel.logo,(async()=>{
      try{
        const response=await fetch(`../assets/logos/${encodeURIComponent(panel.logo)}`);if(!response.ok)return null;
        const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
        for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        return `data:${response.headers.get('content-type')||'image/png'};base64,${btoa(binary)}`;
      }catch{return null;}
    })());
    panel.logoData=await logos.get(panel.logo);
  }
  const gray=style.includes('gray'),svg=renderPrintSVG(snapshot,{grayscale:gray});
  let blob;
  const vector=style.endsWith('svg');
  if(vector)blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  else{
    const source=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not render the print comparison'));img.src=source;});
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      canvas.getContext('2d').drawImage(image,0,0);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Could not encode the print comparison');
    }finally{URL.revokeObjectURL(source);}
  }
  const slug=snapshot.panels.map(p=>p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')).join('-vs-');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
  const directions=snapshot.panels.map(p=>p.perspective).join('-vs-');
  link.download=`chd-shot-zones-${snapshot.season}-${slug}-${directions}-${snapshot.outcome}-${snapshot.measure}-${snapshot.focus?.id||'whole'}-print-${gray?'grayscale':'color'}.${vector?'svg':'png'}`;
  link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}

for(const [key,id] of Object.entries(controlIds))$(id).addEventListener('change',()=>{
  if(!data)return;state[key]=$(id).value;
  if(key==='conference'){state.team='all';populateTeams();}
  if(key==='opponentConference'){state.opponentTeam='all';populateTeams();}
  render();
});
$('season').addEventListener('change',()=>{state.season=Number($('season').value);state.zone=null;inspectionZone=null;loadSeason();});
$('exact').addEventListener('change',()=>{state.exact=$('exact').checked;render();});
$('partial').addEventListener('change',()=>{state.partial=$('partial').checked;render();});
$('goals').addEventListener('change',()=>{state.goals=$('goals').checked;render();});
$('unusual').addEventListener('change',()=>{state.unusual=$('unusual').checked;render();});
$('zone-borders').addEventListener('change',()=>{state.zoneBorders=$('zone-borders').checked;render();});
document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;state.layout=selectionMemory.select('layout',state.layout,b.dataset.layout);render();}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;state.view=selectionMemory.select('view',state.view,b.dataset.view);render();}));
document.querySelectorAll('button[data-theme]').forEach(b=>b.addEventListener('click',()=>{
  if(!data)return;state.theme=b.dataset.theme;
  try{localStorage.setItem('chd-shot-map-theme',state.theme);}catch{}
  render();
}));
document.querySelectorAll('[data-outcome]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;state.outcome=selectionMemory.select('outcome',state.outcome,b.dataset.outcome);render();}));
document.querySelectorAll('[data-breakdown]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;state.breakdown=selectionMemory.select('breakdown',state.breakdown,b.dataset.breakdown);renderArea();saveState();}));
$('clear-zone').addEventListener('click',()=>{state.zone=null;selectZone(null,false);});
$('save-image').addEventListener('click',saveImage);
$('zone-tooltip').addEventListener('pointerenter',()=>tooltipIntent.enterPanel());
$('zone-tooltip').addEventListener('pointerleave',queueHideZoneTooltip);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(tooltipTarget||tooltipIntent.pendingTarget())){const target=tooltipTarget||tooltipIntent.pendingTarget(),pinned=$('zone-tooltip').classList.contains('is-pinned');tooltipDismissedTarget=target;hideZoneTooltip();if(pinned)target.focus({preventScroll:true});}});
document.addEventListener('pointerdown',e=>{const target=tooltipTarget||tooltipIntent.pendingTarget();if(target&&!target.contains(e.target)&&!$('zone-tooltip').contains(e.target))hideZoneTooltip();});
window.addEventListener('scroll',e=>{if(!(e.target instanceof Node&&$('zone-tooltip').contains(e.target)))hideZoneTooltip();},{passive:true,capture:true});
window.addEventListener('resize',hideZoneTooltip,{passive:true});
window.addEventListener('blur',hideZoneTooltip);
$('reset').addEventListener('click',()=>{
  if(!data)return;
  selectionMemory.reset();inspectionZone=null;
  const season=state.season,theme=state.theme;Object.assign(state,defaults,{season,theme});
  const msu=data.teams.find(t=>t.name==='Michigan State');state.team=msu?String(msu.id):'all';
  const michigan=data.teams.find(t=>t.name==='Michigan');state.compareTeam=michigan?String(michigan.id):String(data.teams[0]?.id);
  populateTeams();render();
});

try{
  const response=await fetch('./data/index.json');if(!response.ok)throw new Error('Private dataset index unavailable');
  index=await response.json();if(index.schema!==1||index.privatePreview!==privatePreview||!index.seasons.length)throw new Error('Shot-map dataset index invalid');
  options($('season'),index.seasons.map(s=>[s.season,s.label+(s.season===2026?' · in progress':'')]),state.season);
  // Seed recognizable programs only when a review link did not specify them.
  if(!params.has('team')){
    const s=index.seasons.find(s=>s.season===state.season)||index.seasons[0];
    const seedResponse=await fetch('./data/'+s.file);if(!seedResponse.ok)throw new Error('Could not load initial season');
    const seed=await seedResponse.json();
    state.team=String(seed.teams.find(t=>t.name==='Michigan State')?.id??'all');
    state.compareTeam=String(seed.teams.find(t=>t.name==='Michigan')?.id??seed.teams[0]?.id??'all');
  }
  await loadSeason();
}catch(error){$('load-status').textContent=`The shot maps could not load. ${error.message}.`;}
