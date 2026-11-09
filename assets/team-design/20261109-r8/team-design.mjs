import {METRICS,cohortValue,formatCohortValue,sharedMaximum,segmentGeometry,fieldPosition} from './team-design-model.mjs';

// The retained application normalizes its URL during its first render.
// Read the entry URL so custom review controls also survive a shared link.
const query=new URL(window.CHD_ENTRY_URL||window.CHD_LOCAL_ENTRY_URL||location.href).searchParams;
const view={metric:METRICS.some(m=>m.id===query.get('built'))?query.get('built'):'goals',
  strength:['total','es','pp','pk'].includes(query.get('styleStrength'))?query.get('styleStrength'):'total'};
const number=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const axisValue=(v,kind)=>kind==='time'?`${Math.floor(Math.round(v)/60)}:${String(Math.round(v)%60).padStart(2,'0')}`:number(v,1)+(kind==='pct'?'%':'');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ASSET_ROOT='/assets/team-design/20261109-r8/';
const dataVersion=new URL(document.querySelector('script[src^="snapshot.js"]')?.src||location.href,location.href).searchParams.get('v')||'';
const [cohorts,styles,basicData,goalieData]=await Promise.all(['cohorts','style','basics','goalies'].map(n=>fetch(`${ASSET_ROOT}${n}.json?v=${encodeURIComponent(dataVersion)}`,{cache:'no-store'}).then(r=>{
  if(!r.ok)throw new Error(`${n} unavailable`);return r.json();
})));
if(!window.CHD_DESIGN_CONTEXT)await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
const ctx=window.CHD_DESIGN_CONTEXT;
if(!ctx)throw new Error('Team review context unavailable');
const team=id=>ctx.data.teams[id];
const color=id=>/^#[0-9a-f]{6}$/i.test(team(id).color)?team(id).color:'#18453b';
const mark=id=>`<img src="/assets/logos/${escape(team(id).logo)}" alt=""/>`;
const choices=id=>ctx.available.filter(k=>ctx.data.seasons[ctx.state.year]?.teams[k]).map(k=>`<option value="${k}" ${String(k)===String(id)?'selected':''}>${escape(team(k).name)}</option>`).join('');
const shortClass={Fr:'FR',So:'SO',Jr:'JR',Sr:'SR',Gr:'GR'};
const shortRoute={ushl:'USHL/NTDP','us-other':'US JR/PREP',chl:'CHL',bchl:'BCHL','canada-other':'CAN JR',europe:'EUROPE',transfers:'TRANSFER',pro:'PRO',other:'OTHER'};
const shortDate=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'unavailable';

function header(ids){
  const comparison=ids.length===2;
  return `<section class="design-selector" aria-label="${comparison?'Choose comparison teams':'Choose a team'}">
    <div class="design-selector-heading"><div><span class="design-eyebrow">${comparison?'TEAM COMPARISON':'TEAM PROFILE'}</span><h1>${comparison?'Put two programs together.':'Get to know the program.'}</h1></div>${['127.0.0.1','localhost'].includes(new URL(location.href).hostname)?'<span class="design-local">Design preview</span>':''}</div>
    <div class="design-pickers ${comparison?'paired':''}"><label>First team<select data-design-team="first">${choices(ids[0])}</select></label>
    ${comparison?`<button class="design-swap" type="button" data-design-swap aria-label="Swap comparison teams" title="Swap teams">⇄</button><label>Second team<select data-design-team="second">${choices(ids[1])}</select></label>`:''}
    <label class="design-season">Season<select data-design-season>${['2026','2025'].map(y=>`<option value="${y}" ${ctx.state.year===y?'selected':''}>${y}–${String(+y+1).slice(-2)}</option>`).join('')}</select></label>
    ${comparison?'':`<button class="design-compare-link" data-design-open-compare>Compare another team ↗</button>`}</div>
    </section><div class="sheet-identities ${comparison?'paired':''}">${ids.map(id=>ctx.teamIdentity(id,comparison)).join('')}</div>
    <nav class="chapter-nav design-chapters" aria-label="Team sheet sections">${[['origins',"How they're built"],['current','How they play'],['drivers','Shots & chances'],['watch','Who to watch'],['history','Looking back']].map(([id,label],i)=>`<a href="#${id}"><b>0${i+1}</b> ${label}</a>`).join('')}</nav>`;
}

function cohortRow(id,kind,maximum){
  const t=cohorts.teams[id],metric=METRICS.find(m=>m.id===view.metric),groups=t[kind];
  return `<div class="design-cohort-team" data-design-cohort-team="${id}" data-group-kind="${kind}">
    <div class="design-raised-chart" aria-label="${escape(t.name)} ${kind==='classes'?'class':'recruiting route'} composition; width is players, height is ${escape(metric.unit)}">
      <div class="design-chart-grid" aria-hidden="true"><span>${formatCohortValue(maximum,view.metric)}</span><span>${view.metric==='toi'?'00:00':'0'}</span></div>
      <div class="design-segments">${groups.map(g=>{
        const value=cohortValue(t,g,view.metric),geo=segmentGeometry(g.count,t.count,value,maximum);
        const fill=g.color||ctx.cohortColor('class',g.id);
        return `<button type="button" class="design-segment ${kind==='classes'?'is-class':'is-path'} ${value===null?'unavailable':''}" data-design-members="${g.members.join(',')}" data-design-team-context="${id}" data-design-group-label="${escape(g.label)}" data-value="${value??''}" data-scale="${maximum}" style="width:${geo.width}%;height:${geo.height}px;--cohort-fill:${fill};--count-size:${geo.width<6?16:geo.width<10?21:28}px" aria-label="${escape(g.label)}: ${g.count} players; ${value===null?'no reported value':formatCohortValue(value,view.metric)+' '+metric.unit}. Select to inspect players." title="${escape(g.label)} · ${g.count} players · ${formatCohortValue(value,view.metric)} ${metric.unit}">${kind==='classes'?`<span class="design-class-on-bar">${escape(shortClass[g.id]||'?')}</span>`:''}<span class="design-count">${g.count}</span>${kind==='classes'&&geo.width>=13&&value!==null?`<span class="design-height-value">${formatCohortValue(value,view.metric)}</span>`:''}</button>`;
      }).join('')}</div>
    </div>
  </div>`;
}

function pathwayLegend(id){
  const t=cohorts.teams[id],toi=view.metric==='toi',label=toi?'TOI/GP':METRICS.find(m=>m.id===view.metric).label;
  const columnHeading=`<div class="design-path-column-heading"><span>Pathway</span><span>Players</span><span>${label}</span></div>`;
  return `<div class="design-path-legend"><div class="design-path-legend-headings" aria-hidden="true">${columnHeading}${columnHeading}</div><div class="design-cohort-key design-route-key" aria-label="Recruiting pathways, player counts and selected statistics">${t.routes.map(g=>{
    const value=cohortValue(t,g,view.metric),total=toi?g.toiSeconds:g[view.metric],primary=formatCohortValue(toi?value:total,view.metric),secondary=toi?formatCohortValue(total,'toi')+' total':formatCohortValue(value,view.metric)+' /GP';
    return `<button type="button" data-design-members="${g.members.join(',')}" data-design-team-context="${id}" data-design-group-label="${escape(g.label)}" title="${escape(g.label)} · ${g.count} players · ${primary}${toi?' average per skater appearance':' recorded '+label.toLowerCase()} · ${secondary}" aria-label="${escape(g.label)}, ${g.count} players, ${primary} ${label}, ${secondary}" data-cohort-total="${total??''}" data-cohort-value="${value??''}"><i style="background:${g.color}"></i><span>${escape(shortRoute[g.id]||g.label)}</span><b class="design-path-count">${g.count}</b><span class="design-path-stat"><strong>${primary}</strong><small>${secondary}</small></span></button>`;
  }).join('')}</div></div>`;
}

function cohortSample(id){
  const c=cohorts.teams[id].coverage,toi=view.metric==='toi',missing=c.missing[view.metric]||0,unassigned=c.unassigned[view.metric]||0;
  return `<p class="design-sample ${missing||unassigned?'partial':''}">CHN${toi?' TOI':''} · ${toi?c.toiGames:c.boxGames}/${c.games} games · ${shortDate(toi?c.toiThrough:c.through)}${missing?` · ${missing} missing rows`:''}${unassigned?` · ${number(toi?unassigned/60:unassigned,1)} unassigned ${toi?'min':view.metric}`:''}</p>`;
}

function built(ids){
  if(ctx.state.year!=='2026')return `<article class="design-panel"><p>This new cohort view uses the current 2026–27 CHN boxes. Historical roster and production context remains below.</p><button data-design-current>Show 2026–27</button></article>`;
  const selected=ids.map(id=>cohorts.teams[id]).filter(Boolean),maximum=sharedMaximum(selected,view.metric),metric=METRICS.find(m=>m.id===view.metric);
  return `<article class="design-panel design-built" data-height-metric="${view.metric}" aria-label="How they're built">
    <div class="design-panel-heading"><div><h3>The roster behind the production.</h3><p>Width: <b>players</b>. Height: <b>${escape(metric.unit)}</b>.</p></div><div class="design-metrics" role="group" aria-label="Cohort height metric">${METRICS.map(m=>`<button type="button" data-design-metric="${m.id}" aria-pressed="${view.metric===m.id}">${m.label}</button>`).join('')}</div></div>
    <div class="design-built-teams ${ids.length===2?'paired':''}">${ids.filter(id=>cohorts.teams[id]).map(id=>`<section class="design-built-team"><div class="design-team-label">${mark(id)}<b>${escape(team(id).name)}</b><span>${cohorts.teams[id].count} players</span></div><div class="design-team-groups">${[['classes','CLASS'],['routes','PATHWAYS']].map(([kind,label])=>`<section class="design-built-group"><div class="design-group-heading"><h4>${label}</h4></div>${cohortRow(id,kind,maximum)}</section>`).join('')}</div>${pathwayLegend(id)}${cohortSample(id)}</section>`).join('')}</div>
    <details class="design-method"><summary>Chart details</summary><p>Shared height scale across teams, class and pathways. Counts include goalies. Ice time is total linked skater seconds divided by reported skater appearances, shown as MM:SS; one appearance is one skater in one game. Goalies and missing TOI rows are excluded from that average. The legend also shows total recorded skater time. Goals, points and SOG show recorded totals with their per-team-game rate below. Select a group for its players.</p></details>
  </article>`;
}

function style(ids){
  if(ctx.state.year!=='2026')return '';
  const rows=styles.strengths[view.strength],peerCounts=rows.map(r=>r.points.length),loPeers=Math.min(...peerCounts),hiPeers=Math.max(...peerCounts);
  return `<article class="design-panel design-style" aria-label="How they play advanced comparisons">
    <div class="design-panel-heading"><div><h3>How they play.</h3></div><label class="design-strength">Situations<select data-design-strength>${[['total','All situations'],['es','Even strength'],['pp','Power play'],['pk','Penalty kill']].map(([v,l])=>`<option value="${v}" ${view.strength===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="design-field-key"><span><i class="design-mean-key"></i> National average</span>${ids.map((id,i)=>{const v=rows[0].values[id];return `<span class="design-field-team-key" style="--selected-color:${color(id)}">${mark(id)}<i class="design-marker-shape ${i?'square':''}"></i><b>${escape(team(id).name)}</b><small>${v?.sample??0}/${v?.officialGames??0} games · ${shortDate(v?.through)}</small></span>`;}).join('')}</div>
    <div class="design-field-rows">${rows.map(row=>{
      const mean=fieldPosition(row.mean,row.domain);
      return `<section class="design-field-row"><div class="design-trait"><h4>${escape(row.title)}</h4><span>${escape(row.subtitle)}</span></div>
      <div class="design-field"><div class="design-field-area"><span class="design-range-end low">${axisValue(row.domain[0],row.kind)}</span><span class="design-range-end high">${axisValue(row.domain[1],row.kind)}</span><div class="design-field-line"></div>${row.points.map(p=>`<span class="design-peer" style="left:${fieldPosition(p.value,row.domain)}%" title="${escape(p.name)} · ${escape(p.display)}"></span>`).join('')}${mean!==null?`<i class="design-mean" style="left:${mean}%" title="Eligible-team mean"></i>`:''}
        ${ids.map((id,i)=>{const v=row.values[id],position=fieldPosition(v?.value,row.domain);return position===null?'':`<button type="button" class="design-field-marker lane-${i}" style="left:${position}%;--selected-color:${color(id)}" title="${escape(team(id).name)} · ${escape(v.display)}${v.rank?' · #'+v.rank:''}" aria-label="${escape(team(id).name)}: ${escape(v.display)}, ${v.rank?'rank '+v.rank:'rank unavailable'}, ${escape(row.title)}">${mark(id)}<i class="design-marker-shape ${i?'square':''}"></i></button>`;}).join('')}</div></div>
      <div class="design-field-values">${ids.map((id,i)=>{const v=row.values[id],gap=v?.value==null?'No reported value':!v.rank?'Rank unavailable: metric coverage or minimum sample':'';return `<div class="design-team-value" style="--selected-color:${color(id)}" aria-label="${escape(team(id).name)}: ${escape(v?.display||'unavailable')}${gap?', '+escape(gap):', rank '+v.rank}" ${gap?`title="${escape(gap)}"`:''}><i class="design-marker-shape ${i?'square':''}"></i><strong>${escape(v?.display||'—')}</strong><b>${v?.rank?'#'+v.rank:'—'}</b></div>`;}).join('')}</div></section>`;
    }).join('')}</div>
    <details class="design-method"><summary>Sources & ranks</summary><p>National reference: ${loPeers===hiPeers?loPeers:loPeers+'–'+hiPeers} eligible teams, equal weight. Rank 1 is the highest value. Ranks require three games and complete metric dependencies. Hudl InStat selected-match tables; ${escape(styles.sampleDefinition)}</p><p>Source checks: ${escape(styles.snapshot.observed_at)} to ${escape(styles.snapshot.last_checked)}. This sample is independent of CHN scoring and ice time.</p></details>
  </article>`;
}

const BASIC_METRICS=[
  {key:'goals',label:'Goals For',digits:2},{key:'against',label:'Goals Allowed',digits:2},
  {key:'shots',label:'Shots',digits:1},{key:'shotsAgainst',label:'Shots Against',digits:1},
  {key:'pim',label:'PIM',digits:1},{key:'margin',label:'Goal Differential',digits:2},
  {key:'pp',label:'PP',digits:1,pct:true},{key:'pk',label:'PK',digits:1,pct:true},
];
function basicObservation(id,key){
  const t=basicData.teams[id],d=ctx.data.seasons['2026'].teams[id],m=d?.metrics,n=t?.games??0;
  if(['goals','shots','pim'].includes(key))return t?.metrics[key]||{value:null,games:0};
  const spec={against:[m?.gapg,m?.games],shotsAgainst:[m?.shotsAgainstPerGame,m?.coverage?.shotsAgainst],
    margin:[m?.games?(m.goalsFor-m.goalsAgainst)/m.games:null,m?.games],
    pp:[m?.powerPlayPct,m?.coverage?.powerPlay],pk:[m?.penaltyKillPct,m?.coverage?.penaltyKill]}[key];
  return {value:Number.isFinite(spec?.[0])?spec[0]:null,games:spec?.[1]??0,officialGames:n};
}
function basicReference(key){
  const pool=ctx.available.map(id=>({id,...basicObservation(id,key)})).filter(r=>Number.isFinite(r.value)&&r.games>0&&r.games===(basicData.teams[r.id]?.games??0));
  return {value:pool.length?pool.reduce((sum,r)=>sum+r.value,0)/pool.length:null,n:pool.length};
}
function basics(ids){
  if(ctx.state.year!=='2026')return '';
  const references=Object.fromEntries(BASIC_METRICS.map(m=>[m.key,basicReference(m.key)]));
  const peers=Object.values(references).map(r=>r.n),low=Math.min(...peers),high=Math.max(...peers);
  const domain=key=>{const values=ctx.available.map(id=>basicObservation(id,key).value).filter(Number.isFinite);return [Math.min(0,...values),Math.max(0,...values)];};
  const heading=(id,index)=>`<th scope="col" class="design-h2h-team ${index===0?'first':'second'}" style="${ctx.themeStyle(id)}"><div>${mark(id)}<b>${escape(team(id).name)}</b><small>CHN · ${shortDate(basicData.teams[id]?.through)}</small></div></th>`;
  const cell=(id,m,index)=>{
    const obs=basicObservation(id,m.key),ref=references[m.key],[lo,hi]=domain(m.key),range=hi-lo,position=v=>range>0&&v!==null?100*(v-lo)/range:0,
      zero=position(0),target=position(obs.value),width=obs.value!==null?Math.abs(target-zero):0,start=Math.min(zero,target),avg=ref.value!==null?position(ref.value):null,
      delta=Number.isFinite(obs.value)&&ref.value!==null?Number((obs.value-ref.value).toFixed(m.digits)):null,
      difference=delta===null?'—':(delta>0?'+':delta<0?'−':'')+number(Math.abs(delta),m.digits)+(m.pct?' pp':'');
    return `<td class="design-h2h-cell ${index===0?'first':'second'}" style="${ctx.themeStyle(id)}" data-team="${id}" data-stat="${m.key}" data-value="${obs.value??''}" data-national="${ref.value??''}"><div class="design-h2h-cell-content"><div class="design-h2h-value"><strong>${number(obs.value,m.digits)}${m.pct&&obs.value!==null?'%':''}${obs.games<(basicData.teams[id]?.games??0)?'<sup title="Partial source sample">†</sup>':''}</strong><small title="Difference from national average">${difference}</small></div><div class="design-h2h-track" aria-hidden="true"><i style="${index===0?'right':'left'}:${start}%;width:${width}%"></i>${lo<0?`<span class="design-h2h-zero" style="${index===0?'right':'left'}:${zero}%"></span>`:''}${avg!==null?`<span class="design-h2h-average" style="${index===0?'right':'left'}:${avg}%"></span>`:''}</div></div></td>`;
  };
  return `<section class="design-team-stats" aria-label="Team statistics and national averages"><div class="design-stat-intro"><h3>The numbers behind the record.</h3><span>Per game · PP/PK in % · differences vs. national average</span></div><table class="design-h2h ${ids.length===2?'paired':'single'}"><colgroup><col class="design-h2h-team-col"/><col class="design-h2h-metric-col"/>${ids.length===2?'<col class="design-h2h-team-col"/>':''}</colgroup><thead><tr>${heading(ids[0],0)}<th scope="col" class="design-h2h-center-heading">Metric</th>${ids.length===2?heading(ids[1],1):''}</tr></thead><tbody>${BASIC_METRICS.map(m=>`<tr data-metric="${m.key}">${cell(ids[0],m,0)}<th scope="row" class="design-h2h-metric"><b>${m.label}</b></th>${ids.length===2?cell(ids[1],m,1):''}</tr>`).join('')}</tbody></table><details class="design-method"><summary>Sources & averages</summary><p>CHN official totals. Reference: ${low===high?low:low+'–'+high} programs by metric, equal team weight. Complete reported game samples enter each national average; † marks partial team coverage. Each row shares its scale across both teams and the reference. PIM includes bench penalties; PP/PK differences are percentage points.</p></details></section>`;
}

function playerRate(p,metric){
  const s=p.stats,games=s?.[metric==='shots'?'shotGames':metric==='points'?'pointGames':'goalGames']??s?.games;
  return games>0&&Number.isFinite(s?.[metric])?s[metric]/games:null;
}

function watchSelection(id){
  const roster=ctx.data.seasons[ctx.state.year]?.teams[id]?.players.filter(p=>p.rostered)||[],
    xg=ctx.state.year==='2026'?ctx.data.cohortXg[id]:null,
    battles=ctx.state.year==='2026'?ctx.sheetData().battles[id]||[]:[];
  const result=[];
  for(const [position,title] of [['Forwards','Forwards'],['Defensemen','Defense']]){
    const pool=roster.filter(p=>p.position===position),cards=[],used=new Set();
    const add=(p,label,value,detail='')=>{if(!p||used.has(p.id)||cards.length>=3)return;cards.push({p,label,value,detail});used.add(p.id);};
    const ranked=metric=>pool.filter(p=>playerRate(p,metric)!==null).sort((a,b)=>playerRate(b,metric)-playerRate(a,metric)||a.id-b.id);
    const quality=pool.filter(p=>xg?.players[p.id]?.shots>=10).sort((a,b)=>xg.players[b.id].xg/xg.players[b.id].shots-xg.players[a.id].xg/xg.players[a.id].shots);
    if(position==='Defensemen'){
      const impact=battles.filter(b=>pool.some(p=>p.id===b.player.roster_id)).sort((a,b)=>b.excess-a.excess)[0];
      if(impact)add(pool.find(p=>p.id===impact.player.roster_id),'Modeled DZ impact',(impact.excess>0?'+':'')+number(impact.excess,1),`${impact.n} 5v5 contests · ${impact.games} games`);
    }
    const creator=quality.find(p=>!used.has(p.id));
    if(creator){const v=xg.players[creator.id];add(creator,'5v5 xG / 100 att.',number(100*v.xg/v.shots,1),`${v.shots} attempts · ${xg.games} paired games`);}
    const scorer=ranked('points').find(p=>!used.has(p.id));
    add(scorer,'PTS/GP',scorer?number(playerRate(scorer,'points'),2):'—');
    for(const p of ranked('shots'))add(p,'SOG/GP',number(playerRate(p,'shots'),1));
    for(const p of ranked('points'))add(p,'PTS/GP',number(playerRate(p,'points'),2));
    result.push({title,position,cards});
  }
  return result;
}

function playerMetrics(id,p,featured=''){
  const usage=ctx.state.year==='2026'?basicData.teams[id]?.players[p.id]:null,
    toi=usage?.observedGames?usage.seconds/usage.observedGames:null,
    s=p.stats,r=ctx.state.year==='2026'?ctx.release?.playerShots[id]?.[p.id]:null,
    q=ctx.state.year==='2026'?ctx.data.cohortXg[id]?.players[p.id]:null,
    battle=ctx.state.year==='2026'?(ctx.sheetData().battles[id]||[]).find(b=>b.player.roster_id===p.id):null;
  const field=(key,label,value,digits=0,suffix='')=>({key,label,value,display:number(value,digits)+(Number.isFinite(value)?suffix:'')});
  const blocks=[{key:'chn',title:'CHN',sample:s?.games??0,cells:[field('g','G',s?.goals),field('a','A',s?.assists),field('pts','PTS',s?.points),field('sog','SOG',s?.shots),
    {key:'toi',label:'TOI/GP',value:toi,display:toi!==null?axisValue(toi,'time'):'—',hint:usage?`${usage.observedGames}/${usage.appearances} appearances with reported TOI`:''},field('pim','PIM',s?.pim)]}];
  if(r){
    const full=r.xgAttempts===r.attempts&&r.xgAttempts>0;
    blocks.push({key:'all',title:'InStat · all strengths',sample:r.sampleGames,cells:[field('att','ATT',r.attempts),field('onnet','ON NET',r.attempts?100*r.shots/r.attempts:null,1,'%'),
      {key:'xg',label:'xG',value:r.xgAttempts?r.xg:null,display:r.xgAttempts?(full?'':'≥')+number(r.xg,2):'—',hint:`${r.xgAttempts}/${r.attempts} attempts have source xG`},
      field('quality','xG/100',full?100*r.xg/r.attempts:null,1),field('sh','SH%',r.shots?100*r.goals/r.shots:null,1,'%'),field('hits','HITS',r.hitGames?r.hits:null)]});
  }
  if(q?.shots)blocks.push({key:'5v5',title:'5v5 · paired games',sample:ctx.data.cohortXg[id].games,cells:[field('xg','xG',q.xg,2),...(!featured.includes('5v5 xG')?[field('quality','xG/100',100*q.xg/q.shots,1)]:[]),field('att','ATT',q.shots)]});
  if(battle?.n)blocks.push({key:'battle',title:'5v5 · DZ battles',sample:battle.games,cells:[field('win','WON',100*battle.rate,1,'%'),...(!featured.includes('DZ')?[field('impact','EXCESS',battle.excess,1)]:[]),field('n','CONTESTS',battle.n)]});
  return blocks;
}

function watchCard(id,{p,label,value,detail}){
  const blocks=playerMetrics(id,p,label),prior=[p.lastTeam,p.lastLeague].filter(Boolean).join(' · ');
  return `<article class="watch-player design-watch-player design-watch-restored" data-player-position="${escape(p.position)}" data-player-id="${p.id}"><div class="watch-number">#${p.number||'—'} <span>${shortClass[p.class]||p.class||'N/A'}</span></div><h3><button data-watch-player="${p.id}">${escape(ctx.displayName(p.name))}</button></h3>${ctx.draftBadge(p.id)}<strong class="design-watch-feature-value">${value}</strong><b class="design-watch-feature-label">${label}</b>${detail?`<div class="design-watch-feature-sample">${escape(detail)}</div>`:''}${blocks.map(block=>`<section class="design-player-stat-block" data-stat-scope="${block.key}"><h4 title="${block.sample} reported ${block.key==='chn'?'player appearances':'team games'}">${block.title}</h4><dl class="player-stat-line">${block.cells.map(cell=>`<div ${cell.hint?`title="${escape(cell.hint)}"`:''}><dt>${cell.label}</dt><dd>${escape(cell.display)}</dd></div>`).join('')}</dl></section>`).join('')}${prior?`<small class="design-player-prior">${escape(prior)}</small>`:''}</article>`;
}

function watch(ids){
  return `<div class="design-watch-pair ${ids.length===2?'paired':''}">${ids.map(id=>ctx.withSheetTeam(id,()=>{
    const selected=watchSelection(id),xg=ctx.state.year==='2026'?ctx.data.cohortXg[id]:null;
    return `<article class="panel sheet-card design-watch-team" data-team-context="${id}" style="${ctx.themeStyle(id)}"><div class="column-team">${mark(id)}<b>${escape(team(id).name)}</b></div>${selected.map(group=>`<section class="design-watch-position"><h3>${group.title}</h3><div class="design-watch-cards">${group.cards.length?group.cards.map(card=>watchCard(id,card)).join(''):'<p class="empty-state">No reported player sample.</p>'}</div></section>`).join('')}<details class="design-method"><summary>Player sources</summary><p>CHN scoring and observed player TOI through ${escape(ctx.data.seasons[ctx.state.year]?.teams[id]?.scoringCoverage.latestGame||'unavailable')}. InStat all-strength shot sample through ${escape(ctx.release?.through||ctx.data.through)}. ${xg?`5v5: ${xg.games} complete paired games through ${escape(ctx.release?.metricCoverage?.paired5v5?.through||ctx.data.through)}.`:''} ≥xG is a partial sum; xG/100 is unavailable when attempts lack ratings. DZ excess is a shrunk peer-model estimate. Hover a source heading for its game sample.</p></details><section class="design-watch-goalies">${goalies(id)}</section></article>`;
  })).join('')}</div>`;
}

function goalieTrend(g){
  const games=g.recent.filter(r=>Number.isFinite(r.savePct));
  if(!games.length)return '';
  const lo=Math.min(.85,...games.map(r=>r.savePct)),hi=1,x=i=>18+(games.length===1?144:i*288/(games.length-1)),y=v=>66-(v-lo)/(hi-lo||1)*48;
  return `<div class="design-goalie-form"><div><b>Last ${g.recent.length} appearances</b><span>Save percentage</span></div><svg viewBox="0 0 324 92" role="img" aria-label="${escape(g.name)} recent save percentages: ${games.map(r=>shortDate(r.date)+' '+r.savePct.toFixed(3)).join(', ')}"><path d="M18 66H306" stroke="#ffffff35"/>${g.leagueSavePct!=null?`<path d="M18 ${y(Math.max(lo,g.leagueSavePct))}H306" stroke="#ffffff55" stroke-dasharray="4 4"/>`:''}<polyline points="${games.map((r,i)=>x(i)+','+y(r.savePct)).join(' ')}" fill="none" stroke="var(--team-accent)" stroke-width="3"/>${games.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.savePct)}" r="4.5" fill="var(--team-accent)" stroke="#fff" stroke-width="1"><title>${escape(r.opponent)} · ${shortDate(r.date)} · ${r.savePct.toFixed(3)} SV% · ${r.saves}/${r.shotsFaced} saves</title></circle>`).join('')}<text x="18" y="87" font-size="10" fill="#e0e7dd">${shortDate(games[0].date)}</text><text x="306" y="87" text-anchor="end" font-size="10" fill="#e0e7dd">${games.length>1?shortDate(games.at(-1).date):''}</text></svg></div>`;
}

function goalies(id){
  if(ctx.state.year!=='2026')return ctx.goalieWatch();
  const t=goalieData.teams[id],players=t?.players||[];
  return `<div class="design-goalie-section"><h3>In goal.</h3>${players.length?players.map(g=>{
    const roster=ctx.data.seasons['2026'].teams[id].players.find(p=>p.id===g.id),signed=Number.isFinite(g.savesAboveAverage)?(g.savesAboveAverage>0?'+':'')+number(g.savesAboveAverage,1):'—';
    const metrics=[['GAA',number(g.gaa,2),g.gaaRank?'#'+g.gaaRank:''],['Shots faced / 60',number(g.shotsPer60,1),''],['Saves above avg',signed,''],['Season-high saves',number(g.seasonHighSaves,0),''],['Team goalie time',number(100*g.minuteShare,0)+'%',''],['Appearances',number(g.games,0),'']];
    return `<article class="watch-player design-goalie-card" data-goalie-id="${g.id??''}"><div class="watch-number">${roster?.number?'#'+roster.number:''}<span>${shortClass[roster?.class]||roster?.class||''}</span></div><h3>${escape(g.name)}</h3>${g.id?ctx.draftBadge(g.id):''}<div class="design-goalie-headline"><div><strong>${g.savePct==null?'—':g.savePct.toFixed(3)}</strong><b>Save percentage</b></div><div class="design-goalie-rank"><strong>${g.savePctRank?'#'+g.savePctRank:'—'}</strong><span>National rank</span></div></div><dl class="design-goalie-metrics">${metrics.map(([label,value,rank])=>`<div><dt>${label}</dt><dd>${value}</dd>${rank?`<small>${rank} nationally</small>`:''}</div>`).join('')}</dl>${goalieTrend(g)}</article>`;
  }).join(''):`<p class="empty-state">${t?.coverage?.complete?'No recorded goalie appearances.':'Goalie totals await complete CHN box reconciliation.'}</p>`}<details class="design-method"><summary>Goalie sources · ${shortDate(t?.coverage?.through||goalieData.through)}</summary><p>Reconciled CHN boxes. Ranks require 120+ minutes and 25% of team goalie time. Saves above average uses other teams' shot-weighted save rate, without shot-quality adjustment. Most-used goalie plus teammates with at least 20% of goalie time. Recent form uses appearances, including partial games. InStat xG is a separate sample.</p></details></div>`;
}

function mapNotes(id){
  if(ctx.state.year!=='2026')return `<details class="design-method design-map-notes"><summary>Sources & data</summary>${ctx.mapCoverageNote()}</details>`;
  const r=ctx.release?.teams[id],placement=ctx.release?.nets[id]?.coverage[ctx.state.netKind||'onnet'];
  const sample=r?`${r.games}/${r.eligibleGames} games · ${shortDate(ctx.release.through)}`:'sample unavailable';
  const unlocated=placement?.unlocatedSog||0,goals=placement?.unlocatedGoals||0;
  return `<details class="design-method design-map-notes"><summary>Sources & data · ${sample}</summary><p>Hudl InStat. Both maps use the same ordinary-event sample.${unlocated?` ${unlocated} SOG (${goals} goals) have no usable net location and remain in totals.`:''} <a href="/data-status/">Coverage & source audit ↗</a></p></details>`;
}

function condenseNotes(){
  document.querySelectorAll('.design-map-pair .sheet-card').forEach(card=>{
    const source=card.querySelector('.design-map-notes');
    if(!source)return;
    card.querySelectorAll('p.note').forEach(note=>{if(!note.closest('details'))source.append(note);});
  });
  document.querySelectorAll('.five-question-sheet p.note').forEach(note=>{
    if(note.closest('details')||note.textContent.length<210)return;
    const details=document.createElement('details'),summary=document.createElement('summary');
    details.className='design-method design-legacy-note';summary.textContent='Sources & details';
    note.before(details);details.append(summary,note);
  });
}

function rerender(focusSelector){
  const y=window.scrollY;ctx.render();window.scrollTo(0,y);
  if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
}
function wire(){
  document.body.dataset.designScreen=ctx.state.screen;
  const q=new URL(location.href);q.searchParams.set('built',view.metric);q.searchParams.set('styleStrength',view.strength);history.replaceState(null,'',q);
  document.querySelectorAll('[data-design-metric]').forEach(b=>b.onclick=()=>{view.metric=b.dataset.designMetric;rerender(`[data-design-metric="${view.metric}"]`);});
  document.querySelectorAll('[data-design-team]').forEach(select=>select.onchange=()=>{
    const oldFirst=ctx.state.team,oldSecond=ctx.state.opponent;
    if(select.dataset.designTeam==='first'){ctx.state.team=select.value;if(ctx.state.team===oldSecond)ctx.state.opponent=oldFirst;}
    else{ctx.state.opponent=select.value;if(ctx.state.opponent===oldFirst)ctx.state.team=oldSecond;}
    rerender(`[data-design-team="${select.dataset.designTeam}"]`);
  });
  document.querySelector('[data-design-swap]')?.addEventListener('click',()=>{[ctx.state.team,ctx.state.opponent]=[ctx.state.opponent,ctx.state.team];rerender('[data-design-swap]');});
  document.querySelector('[data-design-season]')?.addEventListener('change',e=>{ctx.state.year=e.target.value;rerender('[data-design-season]');});
  document.querySelector('[data-design-current]')?.addEventListener('click',()=>{ctx.state.year='2026';rerender('[data-design-season]');});
  document.querySelector('[data-design-open-compare]')?.addEventListener('click',()=>{ctx.state.screen='matchup';if(ctx.state.team===ctx.state.opponent)ctx.state.opponent=ctx.available.find(id=>id!==ctx.state.team);rerender('[data-design-team="second"]');});
  document.querySelector('[data-design-strength]')?.addEventListener('change',e=>{view.strength=e.target.value;rerender('[data-design-strength]');});
  document.querySelectorAll('[data-design-members]').forEach(b=>b.onclick=()=>ctx.withSheetTeam(b.dataset.designTeamContext,()=>{
    const ids=new Set(b.dataset.designMembers.split(','));const members=ctx.roster().filter(p=>ids.has(String(p.id)));
    ctx.showCohort(b,team(b.dataset.designTeamContext).name+' · '+b.dataset.designGroupLabel,members,true);
  }));
  condenseNotes();
}
window.CHD_TEAM_DESIGN={header,built,basics,basicObservation,basicReference,style,watch,watchSelection,playerMetrics,goalies,mapNotes,wire};
ctx.render();
