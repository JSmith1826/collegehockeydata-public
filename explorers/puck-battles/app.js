'use strict';
const D=window.BATTLES,R=D.rows.map(a=>Object.fromEntries(D.fields.map((k,i)=>[k,a[i]]))),P=new URLSearchParams(location.search);
const S={team:P.get('team')||'87220',game:P.get('game')||'all',period:P.get('period')||'0',outcome:P.get('outcome')||'all',state:['tied','lead','trail'].includes(P.get('state'))?P.get('state'):'all',zone:Number(P.get('zone')||0),player:P.get('player')||'',event:''};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US'),percent=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
const playerName=id=>D.names[id]||'Player '+id,teamName=id=>D.teams[id]||'Team '+id;
const time=r=>`P${r.period} ${Math.floor(r.clock/60)}:${(r.clock%60).toFixed(3).padStart(6,'0')} elapsed`;
const gameLabel=g=>g.date+' · '+g.teams.map(teamName).join(' / ');
function options(){
 $('#team').innerHTML=Object.entries(D.teams).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');
 if(!D.teams[S.team])S.team=Object.keys(D.teams)[0];$('#team').value=S.team;
 const games=D.games.filter(g=>g.teams.includes(Number(S.team)));
 if(!games.some(g=>g.game===S.game))S.game='all';
 $('#game').innerHTML='<option value="all">All catalog games for this team</option>'+games.slice().reverse().map(g=>`<option value="${g.game}">${esc(gameLabel(g))}</option>`).join('');$('#game').value=S.game;
 $('#period').value=S.period;$('#outcome').value=S.outcome;$('#state').value=S.state;
}
function render(){
 const focus=document.activeElement?.id;
 options();const games=D.games.filter(g=>g.teams.includes(Number(S.team))&&(S.game==='all'||g.game===S.game)),ids=new Set(games.map(g=>g.game));
 const raw=R.filter(r=>ids.has(r.game)&&r.team===Number(S.team));
 const periodBase=raw.filter(r=>r.valid&&(S.period==='0'||r.period===Number(S.period)));
 const base=periodBase.filter(r=>S.state==='all'||r.state===S.state);
 const zoned=base.filter(r=>!S.zone||r.zone===S.zone),selected=zoned.filter(r=>!S.player||String(r.player)===S.player);
 const pool=selected.filter(r=>S.outcome==='all'||r.outcome===S.outcome);
 const stateScope=periodBase.filter(r=>(!S.zone||r.zone===S.zone)&&(!S.player||String(r.player)===S.player));
 const stateCounts=Object.fromEntries(['tied','lead','trail','unknown'].map(k=>[k,stateScope.filter(r=>r.state===k).length]));
 $('#state-note').textContent=`Score immediately before each contest, from the perspective of ${teamName(S.team)}. This game/period/zone/player sample: tied ${fmt(stateCounts.tied)}, leading ${fmt(stateCounts.lead)}, trailing ${fmt(stateCounts.trail)}, unknown ${fmt(stateCounts.unknown)}. Unknown timing or score context stays in All only.`;
 const won=selected.filter(r=>r.outcome==='won').length,good=games.filter(g=>g.status==='observed').length;
 $('#coverage').innerHTML=`<div class="coverage ${D.summary.missing_scope_games||D.summary.source_null_scope_games?'gap':''}"><b>Archive coverage: ${D.summary.six_observed_scopes} / ${D.summary.catalog_references} source references have all six observed battle scopes.</b> ${D.summary.missing_scope_games} have missing scopes; ${D.summary.source_null_scope_games} have source-null scopes. Includes exhibitions and non-D1 opponents.</div>`;
 $('#sample').textContent=`${teamName(S.team)}${S.player?' · '+playerName(S.player):''} · ${good} / ${games.length} selected references have all six observed battle scopes. Missing data are not zero.`;
 $('#stats').innerHTML=[[fmt(selected.length),'validated team-view contests'],[fmt(won),'source-credited wins'],[percent(won,selected.length),'won / contested · both outcomes'],[new Set(selected.map(r=>r.game)).size,'games contributing validated rows']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
 $('#zones').innerHTML=[0,1,2,3].map(z=>{const rows=base.filter(r=>(!S.player||String(r.player)===S.player)&&(!z||r.zone===z));return `<button class="zone" data-zone="${z}" aria-pressed="${S.zone===z}"><span>${['ALL ZONES','DEFENSIVE','NEUTRAL','OFFENSIVE'][z]}</span><strong>${fmt(rows.length)}</strong><small>${percent(rows.filter(r=>r.outcome==='won').length,rows.length)} won</small></button>`;}).join('');
 const max=Math.max(1,...[...new Set(base.map(r=>r.player))].map(id=>base.filter(r=>r.player===id).length));
 const people=[...new Set(zoned.map(r=>r.player))].map(id=>{const rows=zoned.filter(r=>r.player===id);return {id,n:rows.length,w:rows.filter(r=>r.outcome==='won').length};}).sort((a,b)=>playerName(a.id).localeCompare(playerName(b.id)));
 $('#players').innerHTML=people.map(p=>`<button class="player" data-player="${p.id}" aria-pressed="${String(p.id)===S.player}"><span>${esc(playerName(p.id))}</span><span class="bar" role="img" aria-label="${p.w} won of ${p.n} contested"><i class="won" style="width:${100*p.w/max}%"></i><i class="lost" style="width:${100*(p.n-p.w)/max}%"></i></span><span class="counts">${p.w} / ${p.n}<small>${percent(p.w,p.n)}</small></span></button>`).join('')||'<p class="note">No validated contests in this selection. Check the coverage panel to distinguish observed empty scopes from uncollected data.</p>';
 $('#clearplayer').hidden=!S.player;
 const flagged=raw.filter(r=>!r.valid).length;
 $('#gamesummary').innerHTML=[['Catalog references selected',games.length],['Six battle scopes observed',good],['References with missing scopes',games.filter(g=>g.missing_scopes).length],['References with source nulls',games.filter(g=>g.source_null_scopes).length],['Known score-state contests (selected sample)',stateCounts.tied+stateCounts.lead+stateCounts.trail],['Unknown score-state contests (selected sample)',stateCounts.unknown],['Flagged team rows (all periods)',flagged],['Validated dots in current view',pool.filter(r=>r.map_eligible).length]].map(([l,v])=>`<div class="check"><span>${l}</span><b>${fmt(v)}</b></div>`).join('');
 draw(pool);const recent=pool.slice().sort((a,b)=>b.game.localeCompare(a.game)||a.period-b.period||a.clock-b.clock).slice(0,150);
 $('#eventcount').textContent=`Showing ${recent.length} of ${fmt(pool.length)} selected rows; full archive in CSV.`;
 $('#events').innerHTML=recent.map(r=>`<button class="event" data-event="${r.game}:${r.event}"><span>${esc(time(r))}<small>${D.games.find(g=>g.game===r.game)?.date}</small></span><span>${esc(playerName(r.player))}<small>vs ${esc(playerName(r.opponent))}</small></span><b>${r.outcome==='won'?'Won':'Lost'}</b></button>`).join('');
 function detail(key){const r=recent.find(r=>r.game+':'+r.event===key)||recent[0];if(!r){$('#detail').textContent='Select a populated game/team sample to inspect source events.';return;}S.event=r.game+':'+r.event;$('#events').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.event===S.event)));$('#detail').innerHTML=`<div class="eyebrow">${esc(time(r))} · ${r.outcome.toUpperCase()}</div><h3>${esc(playerName(r.player))}</h3><p>vs ${esc(playerName(r.opponent))}</p><p class="note">${['','Defensive','Neutral','Offensive'][r.zone]} zone relative to ${esc(teamName(r.team))}. Source strength code ${esc(r.strength)} (not decoded here).</p><div class="check"><span>Match / event ID</span><span>${r.game} / ${r.event}</span></div><div class="check"><span>State before contest</span><b>${({tied:'Tied',lead:'Leading',trail:'Trailing',unknown:'Unknown'})[r.state]||'Unknown'}</b></div><div class="check"><span>Selected team : opponent</span><b>${r.score_for==null?'Unresolved':r.score_for+' : '+r.score_against}</b></div>${r.state==='unknown'?`<p class="note">${r.state_issue==='goal_time_boundary'?'Too close to a goal timestamp to order this contest confidently.':'Score context could not be reconciled for this period.'} Audit reason: ${esc(r.state_issue)}.</p>`:''}<div class="check"><span>Source clock seconds</span><b>${r.clock}</b></div><div class="check"><span>Source x / y</span><span>${esc(r.x)} / ${esc(r.y)}</span></div><div class="check"><span>Capture ID</span><b>${r.capture}</b></div><p class="note">Source-period clock, not video time. Match + event ID pairs the opposite battle view; it does not identify continuous possession. Source clocks and event identifiers are retained for reproducibility.</p>`;}
 detail(S.event);$('#events').querySelectorAll('button').forEach(b=>b.onclick=()=>detail(b.dataset.event));
 document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>{S.zone=Number(b.dataset.zone);render();document.querySelector(`[data-zone="${S.zone}"]`)?.focus({preventScroll:true});});
 document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>{S.player=S.player===b.dataset.player?'':b.dataset.player;render();document.querySelector(`[data-player="${b.dataset.player}"]`)?.focus({preventScroll:true});});
 $('#stamp').textContent=`Generated ${new Date(D.summary.generated_at).toLocaleString('en-US',{timeZone:'America/New_York'})} Eastern · maximum capture ${D.summary.max_capture_id} · ${fmt(D.summary.distinct_battles)} distinct retained battles across ${D.summary.games_with_battle_rows} references. Two team views normally describe one contest. Numeric precision is not measurement accuracy.`;
 const q=new URLSearchParams(Object.entries(S).filter(([k,v])=>k!=='event'&&v!==''));history.replaceState(null,'','?'+q);
 if(focus)$('#'+focus)?.focus({preventScroll:true});
}
function draw(rows){
 const c=$('#rink'),x=c.getContext('2d'),W=c.width,H=c.height,pad=38,w=W-2*pad,h=H-2*pad;
 x.clearRect(0,0,W,H);x.fillStyle='#edf3f2';x.fillRect(0,0,W,H);x.strokeStyle='#aebfb6';x.lineWidth=2;x.strokeRect(pad,pad,w,h);
 x.strokeStyle='#d2deda';for(const t of [15,30,45]){const a=pad+w*t/61;x.beginPath();x.moveTo(a,pad);x.lineTo(a,H-pad);x.stroke();}
 x.font='18px Arial';x.fillStyle='#5c7069';x.textAlign='center';for(const t of [0,15,30,45,61])x.fillText(t,pad+w*t/61,H-10);
 x.textAlign='left';x.fillText('0',5,pad+5);x.fillText('25.91',0,H-pad+5);
 for(const r of rows){if(!r.map_eligible)continue;const px=pad+w*r.x/61,py=pad+h*r.y/25.91,size=rows.length>1200?3:4.5;
  x.beginPath();if(r.outcome==='won'){x.fillStyle='#0072b2aa';x.arc(px,py,size,0,2*Math.PI);x.fill();}
  else{x.strokeStyle='#d55e00bb';x.lineWidth=1.8;x.moveTo(px-size,py-size);x.lineTo(px+size,py+size);x.moveTo(px-size,py+size);x.lineTo(px+size,py-size);x.stroke();}}
 if(!rows.length){x.fillStyle='#5c7069';x.textAlign='center';x.font='26px Arial';x.fillText('No validated locations in this selection',W/2,H/2);}
}
for(const name of ['team','game','period','state','outcome'])$('#'+name).onchange=e=>{S[name]=e.target.value;if(name!=='state')S.player='';render();};
$('#clearplayer').onclick=()=>{S.player='';render();};render();
