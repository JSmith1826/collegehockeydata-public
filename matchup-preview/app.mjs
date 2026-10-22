import {selectPopulation,density,heatColorAt,heatStops} from './shot-model/model.mjs';
import {faceoffMarkings,GOAL_LINE,BLUE_LINE} from './shot-model/rink-geometry.mjs';
import {CREASE_PATH} from './shot-model/zones.mjs';
import {TEAM_COLORS,normalizeTeam} from './shot-model/team-style.mjs';
import {buildCaption} from './captions.mjs';
import {CLASSES,escapeHtml as esc,format as fmt,rate,dateLabel,eventDetails,pathways,defenseSummary} from './model.mjs';
import {downloadPreview} from './export.mjs';

const $=id=>document.getElementById(id);
let source,shots,current,populations,grids,sharedMax=0;
const loadedImages=new Map();
const stateFor=t=>({team:String(t.id),conference:'all',scope:'all',venue:'all',opponentConference:'all',opponentTeam:'all',period:'all',outcome:'onnet',partial:false});
const colors=t=>TEAM_COLORS[normalizeTeam(t.canonicalName||t.name)]||['#253038','#8a9c96'];
const stat=(value,label)=>`<div class="stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
const stats=(...items)=>'<div class="stats">'+items.join('')+'</div>';
const teamTitle=t=>`<div class="team-title"><img src="../assets/logos/${encodeURIComponent(t.logo)}" alt=""><div><h4>${esc(t.name)}</h4><p>${esc(t.conference)} · ${t.record.join('–')} · ${t.boxGames} games</p></div></div>`;
const bar=(label,n,denominator,color=null)=>`<div class="bar-row"><span>${esc(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${denominator?n/denominator*100:0}%;${color?'background:'+color:''}"></div></div><strong>${n}</strong></div>`;
function teamPanel(t,content){return `<article class="team-panel" style="--team-color:${colors(t)[0]}">${teamTitle(t)}${content}</article>`;}
function panel(title,note,content){return `<section class="panel"><div class="panel-heading"><h3>${esc(title)}</h3><p>${esc(note)}</p></div><div class="paired">${content}</div></section>`;}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(v=>`<td>${esc(v)}</td>`).join('')+'</tr>').join('')}</tbody></table></div>`;}
function imageFor(t){
  if(!loadedImages.has(t.id))loadedImages.set(t.id,new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='../assets/logos/'+encodeURIComponent(t.logo);}));
  return loadedImages.get(t.id);
}

function heatImage(grid,max){
  const canvas=document.createElement('canvas');canvas.width=grid.nx;canvas.height=grid.ny;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(grid.nx,grid.ny);
  grid.values.forEach((v,i)=>{const c=heatColorAt(v,max,'forest',false,'dark');for(let k=0;k<3;k++)pixels.data[i*4+k]=parseInt(c.slice(1+k*2,3+k*2),16);pixels.data[i*4+3]=255;});
  ctx.putImageData(pixels,0,0);return canvas.toDataURL();
}
function rink(p,grid,max,id){
  if(!p.mappedGames)return `<div class="missing"><strong>${p.games?'Map unavailable':'Season debut'}</strong><p>${p.games?'No verified shot maps in this snapshot.':'No completed games through '+esc(dateLabel(source.through))+'.'}</p></div>`;
  const outline='M100 0H325Q425 0 425 100V500H0V100Q0 0 100 0Z';
  const marks=p.points.filter(pt=>pt[4]===0&&pt[2]<=50).map(pt=>`<circle cx="${pt[3]*4.25}" cy="${pt[2]*10}" r="5.5" fill="#fff7d4" fill-opacity=".25" stroke="#fff7d4" stroke-width="1.8"/>`).join('');
  return `<svg class="rink" xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 506 431" role="img" aria-label="${esc(perspectiveLabel(id))}"><defs><clipPath id="clip-${id}"><path d="${outline}"/></clipPath></defs><g transform="translate(0 425) rotate(-90)"><g clip-path="url(#clip-${id})"><image href="${heatImage(grid,max)}" width="425" height="500" preserveAspectRatio="none"/><g fill="none" stroke="#bed8ca" stroke-width="1.2" opacity=".65" color="#bed8ca"><path d="M0 ${GOAL_LINE*10}H425"/>${faceoffMarkings()}<path d="${CREASE_PATH}" fill="#7dbac0" fill-opacity=".15"/><path d="M0 ${BLUE_LINE*10}H425" stroke="#a3cfe4" stroke-width="2"/><circle cx="212.5" cy="500" r="75"/></g>${marks}</g><path d="${outline}" fill="none" stroke="#9fbfb2" stroke-width="1.5"/></g></svg>`;
}
function perspectiveLabel(id){return id.startsWith('def')?'Opponent shots on goal; rings show goals against':'Shots on goal; rings show goals';}
function mapNote(p){return `${p.mappedGames}/${p.games} games mapped${p.minorDiscrepancyGames?` (${p.minorDiscrepancyGames} with a 1-shot discrepancy)`:""} · ${p.total} shots on goal${p.beyondHalf?' · '+p.beyondHalf+' outside displayed half':''}`;}
function shooting(t,i){
  const p=populations.taken[i];
  let body=rink(p,grids.taken[i],sharedMax.taken,'off-'+t.id);
  body+=`<p class="map-note">${mapNote(p)}. Color = share of mapped shots; rings = goals.</p>`;
  body+=stats(stat(fmt(rate(t.boxGoals,t.boxGames),2),'Goals / game'),stat(fmt(rate(t.boxShots,t.boxGames),1),'SOG / game'),stat(fmt(rate(100*t.boxGoals,t.boxShots),1)+(t.boxShots?'%':''),'Shooting'));
  body+=`<p class="roster-subtitle">Scoring leaders · ${esc(t.leaderSeason)}${t.boxGames?'':' · prior season'}</p>`;
  body+=t.leaders.length?table(['Player','GP','G','A','PTS','SOG'],t.leaders.map(p=>[p.name,p.gp,p.goals,p.assists,p.points,p.shots])):'<p class="map-note">No scoring rows available.</p>';
  return teamPanel(t,body);
}
function defense(t,i){
  const p=populations.faced[i],d=defenseSummary(p);
  let body=rink(p,grids.faced[i],sharedMax.faced,'def-'+t.id);
  body+=`<p class="map-note">${mapNote(p)} faced. Opponent’s attacking direction; rings = goals allowed.</p>`;
  body+=stats(stat(fmt(rate(t.goalsAgainst,t.boxGames),2),'GA / game · all games'),stat(fmt(d.shotsAgainstPerGame,1),'SOG faced / mapped game'),stat(fmt(d.blocksPerGame,1),'Recorded blocks / mapped game'));
  if(d.attempts)body+=bar('Recorded blocks',d.blocked,d.attempts)+`<p class="map-note">${d.blocked} of ${d.attempts} recorded opponent attempts blocked (${fmt(d.blockShare)}%). Counts include the full rink. Miss/block completeness is not independently verified. Individual blockers are unavailable.</p>`;
  body+=`<p class="roster-subtitle">Goalies · ${t.goalieGames}/${t.boxGames} games reported</p>`;
  body+=t.goalies.length?table(['Goalie','GP','Saves','SV%','GAA'],t.goalies.map(p=>[p.name,p.games,p.saves??'—',fmt(p.savePct,3),fmt(p.gaa,2)])):'<p class="map-note">No goalie detail available in this snapshot.</p>';
  body+='<p class="map-note">Goalie rates cover reported appearances. Starters and availability are not projected.</p>';
  return teamPanel(t,body);
}
function roster(t){
  let body=stats(stat(t.roster,'Rostered'),stat(t.drafted,'NHL picks'),stat(t.firstRound,'First round'));
  body+='<p class="roster-subtitle">Reported class · not age</p>'+t.classes.map((n,i)=>bar(CLASSES[i],n,t.roster)).join('');
  body+='<p class="roster-subtitle">Paths to the roster</p>'+pathways(t).filter(p=>p.count).map(p=>bar(p.name,p.count,t.roster,p.color)).join('');
  body+='<p class="roster-subtitle">Players to watch</p>'+t.watch.map(p=>`<div class="watch"><b>${esc(p.name)}</b><small>${esc(p.position)} · ${esc(p.class)}${p.jersey?' · #'+esc(p.jersey):''}${p.draft?' · '+p.draft.year+' RD '+p.draft.round+(p.draft.overall?' #'+p.draft.overall:''):' · Undrafted'}<br>${p.experienceComplete?'':'≥'}${p.careerGP} recorded career D1 GP · ${p.gp?p.goals+'G + '+p.assists+'A / '+p.gp+' GP':'Season debut'}${p.priorSeasonGP?'<br>'+p.priorPoints+' points in '+p.priorSeasonGP+' games last season':''}</small></div>`).join('');
  return teamPanel(t,body);
}
function updateCaption(){ $('caption').value=buildCaption(current,$('platform').value);$('characters').textContent=$('caption').value.length+' characters';}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function link(){const url=new URL(location.href);url.search='';if(current){const values={away:current.teams[0].id,home:current.teams[1].id,date:current.event.date,end:current.event.dates.length>1?current.event.dates.at(-1):'',venue:current.event.venue};for(const [key,value] of Object.entries(values))if(value)url.searchParams.set(key,value);}return url;}
async function copyText(value,fallback){try{await navigator.clipboard.writeText(value);$('status').textContent='Copied.';}catch{$('status').textContent=fallback;}}
function generate({focus=true}={}){
  try{
    const teams=[$('away').value,$('home').value].map(id=>source.teams.find(t=>String(t.id)===id));
    if(teams.some(t=>!t))throw Error('Choose teams from the available list.');
    const event=eventDetails(...teams,$('date').value,$('end').value,$('venue').value);
    current={...source,teams,event};
    populations={taken:teams.map(t=>selectPopulation(shots,stateFor(t),'taken')),faced:teams.map(t=>selectPopulation(shots,stateFor(t),'faced'))};
    grids=Object.fromEntries(['taken','faced'].map(k=>[k,populations[k].map(p=>density(p,'share'))]));
    sharedMax=Object.fromEntries(['taken','faced'].map(k=>[k,Math.max(0,...grids[k].flatMap(g=>[...g.values]))]));
    for(let i=0;i<2;i++)if(populations.taken[i].total!==teams[i].mapBoxShots+(teams[i].mapCoverage?.offense?.shotDifference||0)||populations.taken[i].outcomes[0]!==teams[i].mapBoxGoals)throw Error('Map totals differ from the verified snapshot. Please try again after the next data update.');
    const gradient=heatStops('forest',false,'dark').map(([v,c])=>`${c} ${v*100}%`).join(',');
    const key=`<div class="heat-key">Less concentrated <i aria-hidden="true" style="background:linear-gradient(to right,${gradient})"></i> More concentrated · same scale for both teams · goals ○</div>`;
    $('preview').innerHTML=`<div class="matchup-heading"><div><p class="eyebrow">THE MATCHUP</p><h2>${teams.map(t=>esc(t.name)).join(' / ')}</h2><p>${esc(event.label)}</p></div><p class="scope-pill">Snapshot through ${esc(dateLabel(source.through))}</p></div>`
      +panel('Shooting & scoring','Season stats: all completed games · maps: verified subset',teams.map(shooting).join('')).replace('</section>',key+'</section>')
      +panel('Defense & goalies','Goals allowed: all games · shot and block rates: mapped games only',teams.map(defense).join('')).replace('</section>',key+'</section>')
      +panel('How they’re built','Current roster · observed production · no projected lineups',teams.map(roster).join(''));
    $('sharing').hidden=false;updateCaption();teams.forEach(imageFor);
    history.replaceState(null,'',link());
    const age=Math.round((Date.parse($('date').value)-Date.parse(source.through))/86400000);
    $('status').textContent=age>3?`The data cutoff is ${age} days before your selected date. This preview uses the displayed snapshot; refresh the data before posting a current preview.`:'Preview ready. Check your dates and the snapshot cutoff before posting.';
    if(focus)$('preview').focus({preventScroll:true});
  }catch(e){$('status').textContent=e.message;$('preview').innerHTML='';$('sharing').hidden=true;current=null;}
}
$('controls').addEventListener('submit',e=>{e.preventDefault();generate();});
$('swap').addEventListener('click',()=>{const a=$('away').value;$('away').value=$('home').value;$('home').value=a;generate({focus:false});});
$('platform').addEventListener('change',updateCaption);
$('caption').addEventListener('input',()=>{$('characters').textContent=$('caption').value.length+' characters';});
$('copy-caption').addEventListener('click',()=>copyText($('caption').value,'Select the caption text to copy it.'));
$('save-caption').addEventListener('click',()=>saveBlob(new Blob([$('caption').value+'\n'],{type:'text/plain;charset=utf-8'}),'chd-matchup-caption.txt'));
$('share').addEventListener('click',()=>copyText(link().href,'Copy the matchup URL from your address bar.'));
$('download').addEventListener('click',async()=>{
  if(!current)return;
  const button=$('download');button.disabled=true;$('status').textContent='Preparing the preview image…';
  try{await downloadPreview({data:current,populations,grids,sharedMax,heatImage,colors,imageFor,page:$('export-page').value,saveBlob});$('status').textContent='Preview downloaded. The cutoff and data sources are included in the image.';}catch(e){$('status').textContent='Image download failed: '+e.message;}finally{button.disabled=false;}
});
async function boot(){
  try{
    [source,shots]=await Promise.all(['./data/teams.json','./data/shots.json'].map(async u=>{const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw Error('The matchup snapshot could not be loaded.');return r.json();}));
    if(source.through!==shots.through)throw Error('The shooting and roster snapshots have different cutoffs. Please return after the next update.');
    const q=new URLSearchParams(location.search),known=new Set(source.teams.map(t=>String(t.id)));
    for(const key of ['away','home']){$(key).innerHTML=source.teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');$(key).value=known.has(q.get(key))?q.get(key):key==='away'?'30':'27';$(key).disabled=false;}
    // A future date is deliberately not auto-invented; use today in Eastern time.
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    $('date').value=q.get('date')|| (today>='2026-07-01'&&today<='2027-06-30'?today:'2026-10-23');
    $('end').value=q.get('end')||'';if(q.has('venue')&&[...$('venue').options].some(o=>o.value===q.get('venue')))$('venue').value=q.get('venue');
    $('snapshot').textContent=`Data through ${dateLabel(source.through)} · ${source.teams.length} teams · changing the matchup date does not update the statistics.`;
    $('generate').disabled=$('swap').disabled=false;generate({focus:false});
  }catch(e){$('snapshot').textContent=e.message;$('status').textContent='Please try again after the data snapshot is available.';}
}
boot();
