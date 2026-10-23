const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number.isFinite(n);
const pct=(n,d)=>d?(100*n/d).toFixed(1)+'%':'—';
export function goalGroups(points,plane='ice'){
  const grouped=new Map();
  for(const p of points){
    if(p[4]!==0||!p[10])continue;
    const x=plane==='ice'?p[3]*4.25:p[8]*4.5,y=plane==='ice'?p[2]*10:p[9]*3;
    if(plane==='ice'&&(!num(p[2])||!num(p[3])||p[2]>50))continue;
    if(plane==='net'&&(!num(p[8])||!num(p[9])))continue;
    const key=x+','+y;
    if(!grouped.has(key))grouped.set(key,{x,y,keys:[]});
    grouped.get(key).keys.push(p[10]);
  }
  return [...grouped.values()];
}
export function goalMarks(points,plane,visible=true){
  if(!visible)return '';
  return `<g class="study-goals" aria-label="Interactive goal crosses">${goalGroups(points,plane).map(g=>`<g class="study-goal" data-goal-keys="${esc(g.keys.join(' '))}" tabindex="0" role="button" aria-pressed="false" aria-label="${g.keys.length} goal${g.keys.length===1?'':'s'}; inspect scorer"><title>Goal · hover or focus to inspect; select to follow scorer</title><circle cx="${g.x}" cy="${g.y}" r="11" fill="transparent"/><circle class="goal-halo" cx="${g.x}" cy="${g.y}" r="10" fill="none" stroke="#fff4a6" stroke-width="3" opacity="0"/><path d="M${g.x-4} ${g.y-4}l8 8m-8 0l8-8" stroke="#062b22" stroke-width="5"/><path d="M${g.x-4} ${g.y-4}l8 8m-8 0l8-8" stroke="#fff9e9" stroke-width="2"/>${g.keys.length>1?`<text x="${g.x+8}" y="${g.y-9}" fill="#fff9e9" stroke="#062b22" stroke-width="2" paint-order="stroke" font-size="12">×${g.keys.length}</text>`:''}</g>`).join('')}</g>`;
}
export function netSample(population){
  const sog=population.points.filter(p=>p[4]<=1);
  const points=sog.filter(p=>num(p[8])&&num(p[9])&&p[8]>=0&&p[8]<=100&&p[9]>=0&&p[9]<=100);
  const bins=Array.from({length:9},()=>({sog:0,goals:0}));
  for(const p of points){const i=Math.min(2,Math.floor(p[9]*.03))*3+Math.min(2,Math.floor(p[8]*.03));bins[i].sog++;bins[i].goals+=p[4]===0;}
  return {points,bins,total:sog.length,missing:sog.length-points.length};
}
export function netGrid(sample,games){
  const width=72,height=48,values=new Float32Array(width*height);
  // The same net-space bandwidth and normalization apply to every compared panel.
  for(const p of sample.points){const px=p[8]*width/100,py=p[9]*height/100;
    for(let y=Math.max(0,Math.floor(py-10));y<Math.min(height,py+11);y++)for(let x=Math.max(0,Math.floor(px-10));x<Math.min(width,px+11);x++)values[y*width+x]+=Math.exp(-((x-px)**2+(y-py)**2)/24)/Math.max(1,games);
  }
  return {width,height,values,max:Math.max(0,...values)};
}
const zones=['Upper left','Upper middle','Upper right','Middle left','Middle','Middle right','Lower left','Lower middle','Lower right'];
export function netSVG(spec,i,state,grid,max,color,ghost){
  const sample=spec.net,canvas=document.createElement('canvas');canvas.width=grid.width;canvas.height=grid.height;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(grid.width,grid.height);
  grid.values.forEach((v,n)=>{const hex=color(v,max);for(let c=0;c<3;c++)image.data[n*4+c]=parseInt(hex.slice(1+c*2,3+c*2),16);image.data[n*4+3]=255;});
  ctx.putImageData(image,0,0);
  const heat=state.view==='heatmap',zoneView=state.view==='zones',dark=heat&&state.theme==='dark',ink=dark?'#f5f8e9':'#18453b';
  const base=heat?color(0,max):'#eef3e9';
  const dots=state.view==='attempts'?sample.points.filter(p=>p[4]!==0).map(p=>`<circle cx="${p[8]*4.5}" cy="${p[9]*3}" r="2.2" fill="#218e76" opacity=".55"/>`).join(''):'';
  const cells=sample.bins.map((b,n)=>{const x=n%3*150,y=Math.floor(n/3)*100;return `<g class="net-cell" tabindex="0" role="img" aria-label="${zones[n]}: ${b.sog} on-net placements, ${b.goals} goals, ${pct(b.sog,sample.points.length)} of shown placements"><title>${zones[n]} · ${b.sog} on net · ${b.goals} goals · ${pct(b.goals,b.sog)} goals per shot on net</title><rect x="${x}" y="${y}" width="150" height="100" fill="${zoneView?color(b.sog/Math.max(1,sample.points.length),.4):'transparent'}" stroke="${dark?'#c8ded566':'#18453b44'}" stroke-width="1"/>${zoneView?`<text x="${x+75}" y="${y+49}" text-anchor="middle" fill="${ink}" font-size="23" font-weight="bold" pointer-events="none">${pct(b.sog,sample.points.length)}</text><text x="${x+75}" y="${y+72}" text-anchor="middle" fill="${ink}" font-size="13" pointer-events="none">${b.sog} on net · ${b.goals} goals</text>`:`<text x="${x+10}" y="${y+21}" fill="${ink}" font-size="13" pointer-events="none" stroke="${dark?'#10372c':'#f8faf2'}" stroke-width="2" paint-order="stroke">${pct(b.sog,sample.points.length)}</text>`}</g>`;}).join('');
  return `<svg id="net-${i}" class="study-net" viewBox="-8 -8 526 354" role="group" aria-label="${esc(spec.name+' '+spec.label.toLowerCase())}: goal-face placements, shooter perspective" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="300" rx="4" fill="${base}"/>${heat?`<image href="${canvas.toDataURL()}" width="450" height="300" preserveAspectRatio="none"/>`:''}${heat&&ghost?`<image href="${ghost}" x="15" y="25" width="420" height="280" opacity=".25" pointer-events="none"/>`:''}${cells}${dots}<rect width="450" height="300" rx="3" fill="none" stroke="${ink}" stroke-width="4" pointer-events="none"/>${goalMarks(spec.population.points,'net',state.goals)}${[0,1,2].map(r=>`<text x="469" y="${r*100+56}" fill="${ink}" font-size="15" font-weight="bold">${pct(sample.bins.slice(r*3,r*3+3).reduce((s,b)=>s+b.sog,0),sample.points.length)}</text>`).join('')}${[0,1,2].map(c=>`<text x="${c*150+75}" y="332" text-anchor="middle" fill="${ink}" font-size="15" font-weight="bold">${pct(sample.bins.filter((_,i)=>i%3===c).reduce((s,b)=>s+b.sog,0),sample.points.length)}</text>`).join('')}</svg>`;
}
export function eventLabel(e,teams){
  const clock=Number.isFinite(e.elapsed)?`${Math.floor(e.elapsed/60)}:${String(Math.floor(e.elapsed%60)).padStart(2,'0')} elapsed`:'Time unavailable';
  const score=e.scoreBefore?`${e.scoreBefore.join('–')} before goal`:'Pre-goal score unavailable';
  return `${e.scorer} · ${teams[e.team]?.name||'Team'} vs ${teams[e.opponent]?.name||'Opponent'} · ${e.date} · ${e.period===4?'OT':'P'+e.period} · ${clock} (Instat) · ${score}`;
}
let focusScope='',focused=new Map(),resets=[];
export function wireGoals(root,specs,state,linked,showPlayer){
  const scope=JSON.stringify(['season','team','conference','opponentConference','opponentTeam','period','venue','scope','outcome','layout','compareTeam','perspective'].map(k=>state[k]));
  if(scope!==focusScope||!state.goals){focused.clear();focusScope=scope;}
  resets=[];
  root.querySelectorAll('[data-paired-panel]').forEach((panel,i)=>{
    const allKeys=[...new Set(specs[i].population.points.filter(p=>p[4]===0).map(p=>p[10]))],events=linked.events,all=allKeys.map(k=>events[k]).filter(Boolean),marks=[...panel.querySelectorAll('[data-goal-keys]')],readout=panel.querySelector('.goal-readout');
    let selected=focused.get(i)||null,hovered=[];
    const keys=m=>m.dataset.goalKeys.split(' ').filter(k=>events[k]&&(!selected||events[k].shooterKey===selected.shooterKey));
    const repaint=()=>{for(const m of marks){const visible=keys(m),active=visible.some(k=>(hovered.length?hovered:selected?[selected.key]:[]).includes(k));m.style.display=visible.length?'':'none';m.classList.toggle('goal-active',active);m.querySelector('.goal-halo').setAttribute('opacity',active?'1':'0');m.setAttribute('aria-pressed',String(!!selected&&visible.length>0));m.setAttribute('aria-label',(visible.length?visible:m.dataset.goalKeys.split(' ')).map(k=>eventLabel(events[k],linked.teams)).join('; ')+'; select to focus scorer');m.querySelector('title').textContent=visible.map(k=>eventLabel(events[k],linked.teams)).join('; ');const count=m.querySelector('text');if(count)count.textContent=visible.length>1?'×'+visible.length:'';}};
    const reset=()=>{selected=null;hovered=[];focused.delete(i);update();repaint();};
    const choose=key=>{selected=events[key];focused.set(i,selected);hovered=[key];update();repaint();};
    const chooseOverlap=(found,mark)=>{
      const dialog=document.getElementById('goal-choices-dialog'),list=dialog.querySelector('[data-goal-choice-list]');
      list.innerHTML=found.map(k=>`<button data-choice="${esc(k)}">${esc(eventLabel(events[k],linked.teams))}</button>`).join('');
      list.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choose(b.dataset.choice);dialog.close();});
      dialog.querySelector('[data-close-choices]').onclick=()=>dialog.close();
      dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
      dialog.onclose=()=>{if(mark.isConnected&&mark.style.display!=='none')mark.focus({preventScroll:true});};
      dialog.showModal();list.querySelector('[data-choice]')?.focus({preventScroll:true});
    };
    const updateDetail=()=>{const e=events[hovered[0]]||selected,detail=readout.querySelector('.goal-event-detail');detail.textContent=e?eventLabel(e,linked.teams):'Hover or focus a cross to connect its origin and finish. Select to follow that scorer.';detail.scrollTop=0;};
    const update=()=>{
      const shown=selected?all.filter(e=>e.shooterKey===selected.shooterKey):all,hover=hovered.map(k=>events[k]),e=selected||hover[0];
      readout.innerHTML=`<div class="goal-readout-top"><div class="goal-readout-identity"><b title="${esc(selected?.scorer||'One goal. Two views.')}">${esc(selected?.scorer||'One goal. Two views.')}</b><span>${state.goals?`${shown.length} goals in this filtered sample${selected?' · scorer focus':''}`:'Goal crosses are hidden'}</span></div><div class="goal-readout-actions"><button data-player-details${selected?.playerId?'':' disabled'}>Player details ↗</button><button data-reset-goals${selected?'':' disabled'}>Show all goals</button></div></div><p class="goal-event-detail">${e?esc(eventLabel(hover[0]||e,linked.teams)):'Hover or focus a × to connect its origin and finish. Select to follow that scorer.'}</p>`;
      readout.querySelector('[data-reset-goals]')?.addEventListener('click',reset);
      readout.querySelector('[data-player-details]')?.addEventListener('click',ev=>showPlayer(selected,ev.currentTarget));
    };
    for(const m of marks){const enter=()=>{hovered=keys(m);updateDetail();repaint();};m.onpointerenter=enter;m.onfocus=enter;m.onpointerleave=()=>{if(!m.matches(':focus-visible')){hovered=[];updateDetail();repaint();}};m.onblur=e=>{if(readout.contains(e.relatedTarget))return;hovered=[];updateDetail();repaint();};m.onclick=()=>{const found=keys(m);if(found.length===1)choose(found[0]);else if(found.length>1)chooseOverlap(found,m);};m.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();m.onclick();}if(e.key==='Escape')reset();};}
    resets.push(reset);update();repaint();
  });
}
export function resetGoalFocus(event){
  if(event?.target?.closest('[data-goal-keys],.goal-readout,#player-dialog,#goal-choices-dialog'))return;
  resets.forEach(reset=>reset());
}

export async function exportPairs(root,specs,state,title,through){
  const canvas=document.createElement('canvas'),W=2400,H=1330;canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');ctx.fillStyle='#f4f5ed';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#18453b';ctx.font='bold 58px Arial';ctx.fillText('From the ice. To the net.',65,88);ctx.font='28px Arial';ctx.fillText(title,65,137);ctx.fillText('CollegeHockeyData.com',W-425,88);
  const cards=[...root.querySelectorAll('[data-paired-panel]')];
  for(let i=0;i<cards.length;i++){
    const x=65+i*1165;ctx.fillStyle='#12372f';ctx.fillRect(x,180,1105,1000);ctx.fillStyle='#f5f8e9';ctx.font='bold 32px Arial';ctx.fillText(specs[i].name,x+25,230);ctx.font='25px Arial';ctx.fillText(specs[i].label+' · '+specs[i].population.mappedGames+' games',x+25,269);
    const svgs=[cards[i].querySelector('svg.rink'),cards[i].querySelector('svg.study-net')];
    for(let j=0;j<svgs.length;j++){
      const clone=svgs[j].cloneNode(true);clone.setAttribute('width',j?'800':'850');clone.setAttribute('height',j?'540':'1000');
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
      try{const img=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});const h=j?350:635,w=j?520:540;ctx.drawImage(img,x+20+j*550,310,w,h);}finally{URL.revokeObjectURL(url);}
    }
    ctx.fillStyle='#f5f8e9';ctx.font='24px Arial';const p=specs[i].population;ctx.fillText(p.outcomes[0]+' goals · '+(p.outcomes[0]+p.outcomes[1])+' SOG · '+p.allPoints.length+' attempts',x+25,1040);ctx.font='21px Arial';const focus=cards[i].querySelector('.goal-readout-top b').textContent;ctx.fillText(focus==='One goal. Two views.'?(state.goals?'Goal crosses shown':'Goal crosses hidden'):focus+' · scorer goal crosses',x+25,1080);ctx.fillText('Heatmaps and shares retain the full filtered sample.',x+25,1120);
  }
  ctx.fillStyle='#18453b';ctx.font='24px Arial';ctx.fillText('Hudl Instat ordinary events · through '+through+' · '+state.view+' · '+state.outcome+' · period '+state.period,65,1235);ctx.font='22px Arial';ctx.fillText('Origin: shown half-rink. Net: shooter’s view, goals + saves. Missing coordinates remain unlocated. All game states.',65,1275);
  const a=document.createElement('a');a.download='chd-paired-shot-maps-'+through+'.png';a.href=canvas.toDataURL('image/png');a.click();
}
