'use strict';
// Both map families consume one accepted ordinary-event population. Do not mix
// archived CHN points into the current Instat spatial sample.
const IR=window.INSTAT_RELEASE;
if(IR){
 window.TEAM_SHEET_DATA.shots['2026']=IR.shots;
 window.TEAM_SHEET_DATA.nets=IR.nets;
 window.TEAM_HUB.chanceContext=IR.chanceContext;
 window.TEAM_HUB.cohortXg=IR.playerXg;
}
function instatPlayerStats(p){return S.year==='2026'?IR?.playerShots[S.team]?.[p.id]:null}
const goalMapFocus=new Map();let goalMapScope='';
function goalClock(seconds){if(!Number.isFinite(seconds))return 'Time unavailable';return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')+' elapsed'}
function goalEventLabel(e){const team=D.teams[e.team]?.name||'Team',opponent=D.teams[e.opponent]?.name||'Opponent',score=e.scoreBefore;return `${e.scorer} · ${team} vs ${opponent} · ${e.date} · ${e.period===4?'OT':'P'+e.period} · ${goalClock(e.elapsed)} (Instat) · ${score?`${score[0]}–${score[1]} before goal (${score[0]===score[1]?'tied':score[0]>score[1]?'leading':'trailing'})`:'Score before goal unavailable'}`}
function goalKeys(mark){return (mark.dataset.goalKeys||'').split(' ').filter(Boolean)}
function goalSelection(keys,events,shooter){return keys.filter(k=>events[k]&&(!shooter||events[k].shooterKey===shooter))}
function linkedMapPanel(){
 if(S.year!=='2026'||!IR?.goalEvents)return `<div class="pills">${[['onnet','SOG for'],['faced','SOG faced']].map(([k,l])=>`<button data-net-kind="${k}" aria-pressed="${(S.netKind||'onnet')===k}">${l}</button>`).join('')}</div><div class="shot-net-layout"><div>${shootingPreview()}</div><div>${netPreview()}</div></div>`;
 const kind=S.netKind||'onnet';
 return `<div class="linked-map-panel" data-goal-team="${S.team}"><div class="linked-map-controls"><div><span class="map-control-label">Shots</span><div class="pills">${[['onnet','SOG for'],['faced','SOG faced']].map(([k,l])=>`<button data-net-kind="${k}" aria-pressed="${kind===k}">${l}</button>`).join('')}</div></div><div><span class="map-control-label">Ice view</span><div class="pills">${[['heatmap','Heatmap'],['zones','Instat zones']].map(([k,l])=>`<button data-ice-view="${k}" aria-pressed="${(S.iceView||'heatmap')===k}">${l}</button>`).join('')}</div></div></div><div class="goal-focus-readout" aria-live="polite" aria-atomic="true"></div><div class="shot-net-layout"><div>${shootingPreview()}</div><div>${netPreview()}</div></div><p class="note goal-map-help">Hover or keyboard-focus a × to highlight the same goal on both maps. Click or press Enter to show that scorer’s goals; use Show all goals to reset. Heatmaps, zone shares and totals always describe the full team sample. Times are Instat elapsed time within the period.</p></div>`;
}
function wireLinkedGoals(){
 const scope=[S.year,S.netKind,...(S.sheetTeams||[S.team])].join(':');if(scope!==goalMapScope){goalMapFocus.clear();goalMapScope=scope}
 document.querySelectorAll('[data-goal-team]').forEach(panel=>{
  const tid=panel.dataset.goalTeam,marks=[...panel.querySelectorAll('[data-goal-keys]')],events=IR.goalEvents,all=Object.values(events).filter(e=>e[(S.netKind||'onnet')==='faced'?'opponent':'team']===tid),readout=panel.querySelector('.goal-focus-readout');
  let selected=goalMapFocus.get(tid)||null,hovered=[];
  const repaint=()=>{for(const m of marks){const keys=goalSelection(goalKeys(m),events,selected?.shooterKey),active=keys.filter(k=>(hovered.length?hovered:selected?[selected.key]:[]).includes(k));m.classList.toggle('goal-hidden',keys.length===0);m.classList.toggle('goal-active',active.length>0);m.setAttribute('aria-pressed',String(!!selected&&keys.length>0));m.setAttribute('aria-label',(keys.length?keys:goalKeys(m)).map(k=>goalEventLabel(events[k])).join('; ')+'; select to focus scorer');m.querySelector('title').textContent=(keys.length?keys:goalKeys(m)).map(k=>goalEventLabel(events[k])).join('; ');const count=m.querySelector('text');if(count)count.textContent=keys.length>1?'×'+keys.length:'';}};
  const inspect=(key)=>{selected=events[key];goalMapFocus.set(tid,selected);hovered=[key];closeCohort(false);update();repaint()};
  const update=(choices=[])=>{
   const visible=selected?all.filter(e=>e.shooterKey===selected.shooterKey):all,located=visible.filter(e=>e.ice&&e.ice[0]<=44&&e.net).length;
   readout.innerHTML=selected?`<div><b>${esc(selected.scorer)}</b><span>${visible.length} goal${visible.length===1?'':'s'} in this team sample · ${located} paired in these crops</span></div><button data-goal-reset>Show all goals</button><p>${esc(goalEventLabel(selected))}</p>${selected.playerId?'<button data-goal-player>Player details ↗</button>':''}${located<visible.length?'<p>Some goals are outside the ice crop or lack a placement; no location is invented.</p>':''}`:`<div><b>One goal. Two views.</b><span>${all.length} goals · select a × to follow the scorer</span></div>`;
   if(choices.length>1)readout.innerHTML+=`<div class="goal-overlap-choices"><b>${choices.length} goals share this location. Choose one:</b>${choices.map(k=>`<button data-goal-choice="${esc(k)}">${esc(goalEventLabel(events[k]))}</button>`).join('')}</div>`;
   readout.querySelector('[data-goal-reset]')?.addEventListener('click',()=>{selected=null;goalMapFocus.delete(tid);hovered=[];closeCohort(false);update();repaint()});
   readout.querySelectorAll('[data-goal-choice]').forEach(b=>b.onclick=()=>inspect(b.dataset.goalChoice));
   readout.querySelector('[data-goal-player]')?.addEventListener('click',e=>withSheetTeam(selected.team,()=>{const p=roster().find(p=>String(p.id)===String(selected.playerId));if(p)showCohort(e.currentTarget,D.teams[selected.team].name+' · '+selected.scorer,[p],true)}));
  };
  for(const mark of marks){
   const enter=()=>{hovered=goalSelection(goalKeys(mark),events,selected?.shooterKey);repaint();mark.dataset.helpTitle=hovered.length>1?hovered.length+' goals at this location':events[hovered[0]]?.scorer||'Goal';mark.dataset.helpText=hovered.map(k=>goalEventLabel(events[k])).join(' / ')+' · Click for scorer focus.';if(hovered.length)quickTip(mark)};
   mark.onpointerenter=()=>{if(matchMedia('(hover:hover)').matches)enter()};mark.onfocus=enter;
   mark.onpointerleave=mark.onblur=()=>{hovered=[];repaint();if(!pin)closeCohort(false)};
   mark.onclick=()=>{const keys=goalSelection(goalKeys(mark),events,selected?.shooterKey);if(keys.length===1)inspect(keys[0]);else{closeCohort(false);update(keys);readout.querySelector('[data-goal-choice]')?.focus({preventScroll:true})}};
   mark.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mark.onclick()}if(e.key==='Escape'){selected=null;goalMapFocus.delete(tid);hovered=[];update();repaint();closeCohort(false)}};
  }
  update();repaint();
 });
}
function instatGoalieWatch(){const coverage=IR.officialGoalieCoverage?.[S.team],gs=(IR.officialGoalies?.[S.team]||[]).slice().sort((a,b)=>b.seconds-a.seconds),total=gs.reduce((s,g)=>s+g.seconds,0),shown=gs.filter((g,i)=>i===0||g.seconds/total>=.2),peers=Object.entries(IR.officialGoalies||{}).filter(([tid])=>tid!==S.team).flatMap(([,gs])=>gs),sv=peers.reduce((s,g)=>s+g.saves,0),ga=peers.reduce((s,g)=>s+g.goalsAgainst,0),ref=sv+ga?sv/(sv+ga):null;return `<div class="goalie-watch"><div class="kicker">IN GOAL / CHN BOX SCORES</div>${shown.map(g=>`<div class="goalie-feature"><div><h3>${esc(g.name)}</h3>${g.id?draftBadge(g.id):''}<span>${fmt(100*g.seconds/total)}% of goalie time · ${fmt(g.seconds/60,1)} min · ${g.games} GP</span></div><div><strong>${g.savePct==null?'—':g.savePct.toFixed(3)}</strong><span>Save % · ${fmt(g.saves)} saves / ${fmt(g.saves+g.goalsAgainst)} shots faced</span></div><div><strong>${g.savePct!=null&&ref!=null?sheetSigned(100*(g.savePct-ref))+' pp':'—'}</strong><span>vs other teams’ CHN save %</span><span class="goalie-support">${fmt(g.goalsAgainst)} GA · ${fmt(g.gaa,2)} GAA</span></div></div>`).join('')||`<p class="empty-state">${coverage&&!coverage.complete?'Season goaltending statistics are held for source reconciliation. '+coverage.verifiedGames+' of '+coverage.eligibleGames+' game box scores pass the checks.':'No reconciled goalie appearances yet.'}</p>`}<p class="note">CHN box scores through ${coverage?.through||IR.through}. Save % = saves / (saves + goals allowed); empty-net goals are excluded. Every game must reconcile goalie saves and goals allowed with opponent shots and the final score before season statistics appear. ${coverage?.complete?coverage.verifiedGames+' / '+coverage.eligibleGames+' team games verified. ':''}Most-used goalie plus teammates with 20%+ of goalie time. Peer reference uses shot-weighted, reconciled CHN goalie totals and excludes this team. Instat chart counts and goalie IDs are kept separately for research; they do not supply these season statistics. <a href="/data-status/">Data coverage ↗</a></p></div>`}

function instatShotPreview(){const t=IR.teams[S.team],entry=IR.shots.teams[S.team],faced=S.netKind==='faced',d=faced?entry?.faced:entry,ps=d?.points||[],shown=ps.filter(p=>p.x<=44),games=d?.games||0,W=425,H=440,id='instat-ice-'+S.team,zoneView=S.iceView==='zones',outline='M100 0H325Q425 0 425 100V440H0V100Q0 0 100 0Z';
 const raw=ps.map(p=>({x:p.y,y:p.x/44*100})),grid=densityGrid(raw,games,85,88,4),ids=S.screen==='matchup'?S.sheetTeams:[S.team],max=Math.max(0,...ids.map(tid=>{const v=IR.shots.teams[tid],s=faced?v?.faced:v;return densityGrid((s?.points||[]).map(p=>({x:p.y,y:p.x/44*100})),s?.games||0,85,88,4).max})),heat=gridImage(grid,max),counts=Object.fromEntries(IR.zones.map(z=>[z.id,ps.filter(p=>p.zone===z.code).length]));
 const goals=faced?t?.againstGoals:t?.goals,sog=faced?t?.againstSog:t?.sog;
 return `<h3>${faced?'Where opposition attempts start.':'Where attempts originate.'}</h3><div class="map-total-chip">${goals??0} ${faced?'GA':'Goals'} / ${sog??0} SOG · ${games} games · Instat</div>${games?`<svg class="ice-preview instat-ice-preview" viewBox="-5 -5 435 455" role="group" aria-label="Instat attacking shot origins with provider zone boundaries"><defs><clipPath id="${id}"><path d="${outline}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="425" height="440" fill="#0e2e2a"/>${zoneView?'':`<image href="${heat}" width="425" height="440" preserveAspectRatio="none"/>`}${IR.zones.filter(z=>z.path).map(z=>`<path d="${z.path}" fill="${zoneView?heatAt(ps.length?counts[z.id]/ps.length*3:0):'none'}" fill-opacity="${zoneView?1:0}" stroke="#d5e7df" stroke-opacity=".45" stroke-width="1"><title>${esc(z.name)} · ${counts[z.id]} attempts · ${fmt(ps.length?100*counts[z.id]/ps.length:0,1)}% of all attempts</title></path>`).join('')}<g stroke="#c8ded5" stroke-opacity=".45" fill="none">${[102.5,322.5].map(x=>`<ellipse cx="${x}" cy="155" rx="75" ry="75"/>`).join('')}<path d="M0 55H425M0 375H425"/></g>${sheetGoalMarks(shown.map(p=>({...p,x:p.y,y:p.x})),4.25,10)}${zoneView?IR.zones.filter(z=>z.path).map(z=>`<text x="${z.label[0]}" y="${z.label[1]}" text-anchor="middle" fill="#fffbe8" stroke="#12382b" stroke-width="3" paint-order="stroke" font-size="16" font-weight="bold">${fmt(ps.length?100*counts[z.id]/ps.length:0,1)}%</text>`).join(''):''}</g><path d="${outline}" fill="none" stroke="#819b8f" stroke-width="2"/><path d="M198 55V40H227V55" fill="none" stroke="#fffbe8" stroke-width="2"/></svg>`:'<p class="empty-state">No accepted Instat map sample.</p>'}<p class="note">Same ${games}-game ordinary-attempt sample as the net map; shootouts and reviewed overturned goals excluded. ${ps.length} located attempts; ${ps.length-shown.length} beyond the displayed crop. ${ps.filter(p=>p.goal).length-shown.filter(p=>p.goal).length} goal origins outside this crop. Source-coded zones 41–49; left/right use the displayed attacking view. ${zoneView?'Zone shares use all located attempts, including outside this crop.':'Attempt density per mapped game on a shared scale; smoothing adds no source precision.'} <a href="/shot-maps/?season=2026&team=${S.team}">Open the full shooting study ↗</a></p>`;
}
// One fixed, symmetric scale across zones, teams and both sheet layouts.
const BATTLE_DELTA_SCALE={limit:10,under:'#c87973',even:'#f4f1e7',over:'#6caa87'};
function battleZoneComparison(z){
 const rate=z?.n?100*z.w/z.n:null,reference=z?.peerN?100*z.peerW/z.peerN:null;
 const delta=rate!=null&&reference!=null?rate-reference:null;
 const fill=delta==null?'#e3e7e3':blendHex(BATTLE_DELTA_SCALE.even,delta<0?BATTLE_DELTA_SCALE.under:BATTLE_DELTA_SCALE.over,Math.min(1,Math.abs(delta)/BATTLE_DELTA_SCALE.limit));
 return {rate,reference,delta,fill};
}
function instatBattleDiagram(){
 const b=IR?.battleZones?.[S.team];if(!b)return '';
 const zones=[['1','Defensive zone',0,300],['2','Neutral zone',300,200],['3','Offensive zone',500,300]].map(([key,label,x,width])=>({key,label,x,width,z:b[key],...battleZoneComparison(b[key])}));
 const total=Object.values(b).reduce((s,z)=>s+z.n,0),scale=BATTLE_DELTA_SCALE;
 return `<div class="battle-zone-heading"><h4>Where do they win their contests?</h4><span>5v5 · both goalies present · source zones</span></div>
 <svg class="battle-zone-diagram" viewBox="0 0 800 330" role="img" aria-label="Battle win percentages and percentage-point differences from the NCAA zone average">
 <defs><clipPath id="battle-rink-${S.team}"><rect width="800" height="320" rx="90"/></clipPath></defs>
 <g clip-path="url(#battle-rink-${S.team})">
 ${zones.map(v=>`<rect x="${v.x}" width="${v.width}" height="320" fill="${v.fill}"/>`).join('')}
 <path d="M300 0V320M500 0V320" stroke="#547c9b" stroke-opacity=".5" stroke-width="3"/><path d="M400 0V320" stroke="#c77c77" stroke-opacity=".2" stroke-width="2"/>
 ${zones.map(v=>{const {key,label,x,width,z,rate,reference,delta}=v,cx=x+width/2;return `<g class="battle-zone" data-zone="${key}" data-delta-pp="${delta??''}">
 <title>${label}: ${rate==null?'rate unavailable':fmt(rate,1)+'% won'}. ${delta==null?'NCAA comparison unavailable':sheetSigned(delta)+' percentage points versus the NCAA zone average of '+fmt(reference,1)+'%'}.</title>
 <text x="${cx}" y="65" text-anchor="middle" font-size="${width===200?24:26}" font-weight="bold" fill="#15392f">${label}</text>
 <text x="${cx}" y="124" text-anchor="middle" font-size="46" font-weight="bold" fill="#15392f">${rate==null?'—':fmt(rate,1)+'%'}</text>
 <text x="${cx}" y="168" text-anchor="middle" font-size="34" font-weight="bold" fill="${delta==null||delta===0?'#29493c':delta<0?'#7e2f2f':'#1d5b3b'}">${delta==null?'—':sheetSigned(delta)+' pp'}</text>
 <text x="${cx}" y="193" text-anchor="middle" font-size="22" fill="#29493c">${delta==null?(z?.n?'No NCAA sample':'No team sample'):'vs NCAA average'}</text>
 <text x="${cx}" y="237" text-anchor="middle" font-size="22" fill="#29493c">${z?.n?fmt(z.w)+' / '+fmt(z.n)+' won':'No valid contests'}</text>
 <text x="${cx}" y="269" text-anchor="middle" font-size="21" fill="#29493c">${reference==null?'No NCAA sample':'NCAA '+fmt(reference,1)+'%'}</text></g>`}).join('')}
 </g><rect width="800" height="320" rx="90" fill="none" stroke="#8aa497" stroke-width="2"/></svg>
 <div class="battle-delta-key" style="--battle-under:${scale.under};--battle-even:${scale.even};--battle-over:${scale.over}" aria-label="Color shows percentage-point difference from the NCAA zone average; one fixed scale from minus ${scale.limit} to plus ${scale.limit} points">
 <b>Zone win rate vs NCAA</b><div class="battle-delta-gradient" aria-hidden="true"></div><div class="battle-delta-ticks"><span>≤ −${scale.limit} pp</span><span>0</span><span>≥ +${scale.limit} pp</span></div><div class="battle-delta-ticks"><span>Below average</span><span>Above average</span></div></div>
 <p class="note">${fmt(total)} valid team-perspective contests. Percent = wins / contests in that source-tagged zone, not share of all battles. The secondary value is the percentage-point difference from the NCAA average for that same zone, calculated before rounding. The reference uses other D1 teams with the same sample/strength rules. Red = below; green = above; neutral = equal; gray = comparison unavailable. One shared ±${scale.limit} pp color scale; values beyond its ends retain their exact labels. A win does not establish possession retained. These three source zones are distinct from the nine shot-origin areas.</p>`;
}
function instatCoverageNote(){const r=IR.teams[S.team],n=IR.nets[S.team]?.coverage[S.netKind||'onnet'];return `<div class="map-sample-warning"><b>One Instat sample for both maps.</b><span>${r?.games||0}/${r?.eligibleGames||0} countable D1 games through ${IR.through}. Origin and net totals use the same ordinary events. ${n?.unlocatedSog||0} SOG (${n?.unlocatedGoals||0} goals) lack a usable net placement; retained in totals, never assigned a made-up location. <a href="/data-status/">Data coverage and source audit ↗</a></span></div>`}
