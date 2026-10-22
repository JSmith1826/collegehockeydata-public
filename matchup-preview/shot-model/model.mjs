import {ZONES,GOAL_LINE,BLUE_LINE,zoneOf} from './zones.mjs';
export {ZONES,GOAL_LINE,BLUE_LINE,zoneOf} from './zones.mjs';
export const OUTCOME_NAMES = ['Goals','Saved','Missed','Blocked'];
export const OUTCOME_COLORS = ['#b6523d','#18453b','#ab822e','#647d90'];

// Primary categories partition attempts once. Misses and blocks remain
// inspectable children of Not on net, with the same all-attempt denominator.
export function outcomeGroups(counts){
  const outcome=i=>({id:['goal','saved','missed','blocked'][i],name:OUTCOME_NAMES[i],color:OUTCOME_COLORS[i],count:counts[i]});
  return [
    {...outcome(0),children:[]},
    {...outcome(1),children:[]},
    {id:'notonnet',name:'Not on net',color:'#647d90',count:counts[2]+counts[3],children:[outcome(2),outcome(3)]},
  ];
}

export function matchesOutcome(point, outcome) {
  if(outcome==='all')return true;
  if(outcome==='onnet')return point[4]===0||point[4]===1;
  return point[4]===({goal:0,saved:1,missed:2,blocked:3})[outcome];
}

export function matchesPeriod(point,period) {
  return period==='all'||(period==='ot'?point[1]>=4:point[1]===Number(period));
}

export function sideReconciliation(game,side){
  return game.reconciliation?.[side]||{status:game.status,shotDifference:null};
}
export function acceptsSide(game,side,state={}){
  const status=sideReconciliation(game,side).status;
  return status==='verified'||(!state.exact&&status==='minor_discrepancy')||(!state.exact&&state.partial&&status==='count_mismatch');
}

export function selectPopulation(data,state,perspective='taken') {
  const subjects=new Set(data.teams.map((t,i)=>[t,i]).filter(([t])=>
    (state.conference==='all'||t.conference===state.conference) && (state.team==='all'||String(t.id)===state.team)).map(([,i])=>i));
  const eligible=new Set(),mapped=new Set(),skipped={missing:new Set(),direction_unknown:new Set(),count_mismatch:new Set()};
  let appearances=0,mappedAppearances=0,minorDiscrepancyAppearances=0,reviewAppearances=0;
  const discrepancyGames=new Set();
  const allPoints=[],allPointGameIndexes=[];
  data.games.forEach((game,index)=>{
    if(state.scope==='regular'&&game.postseason || state.scope==='postseason'&&!game.postseason)return;
    for(const side of [0,1]){
      const subject=side===0?game.away:game.home,opponent=side===0?game.home:game.away;
      if(!subjects.has(subject))continue;
      if(state.venue==='home'&&side!==1 || state.venue==='away'&&side!==0)continue;
      if(state.opponentConference!=='all'&&data.teams[opponent].conference!==state.opponentConference)continue;
      if(state.opponentTeam!=='all'&&String(data.teams[opponent].id)!==state.opponentTeam)continue;
      eligible.add(index);appearances++;
      const shotSide=perspective==='faced'?1-side:side,fact=sideReconciliation(game,shotSide);
      const accepted=acceptsSide(game,shotSide,state);
      if(!accepted){skipped[fact.status==='minor_discrepancy'?'count_mismatch':fact.status]?.add(index);continue;}
      mapped.add(index);mappedAppearances++;
      if(fact.status==='minor_discrepancy'){minorDiscrepancyAppearances++;discrepancyGames.add(index);}
      if(fact.status==='count_mismatch')reviewAppearances++;
      for(const point of game.shots)if(point[0]===shotSide&&matchesPeriod(point,state.period)){
        allPoints.push(point);allPointGameIndexes.push(index);
      }
    }
  });
  const points=[],pointGameIndexes=[];
  allPoints.forEach((p,i)=>{if(matchesOutcome(p,state.outcome)){points.push(p);pointGameIndexes.push(allPointGameIndexes[i]);}});
  const counts=Object.fromEntries(ZONES.map(z=>[z.id,0]));
  const outcomesByZone=Object.fromEntries(ZONES.map(z=>[z.id,[0,0,0,0]]));
  const outcomes=[0,0,0,0];
  // Classify once when filters change. Paired hover panels and references
  // can then inspect even a national sample without rescanning every attempt.
  for(const p of allPoints){const zone=zoneOf(p);outcomes[p[4]]++;outcomesByZone[zone][p[4]]++;if(matchesOutcome(p,state.outcome))counts[zone]++;}
  const scorerNames=new Map((data.players||[]).filter(p=>p.id!==undefined&&p.id!==null&&typeof p.name==='string'&&p.name.trim()).map(p=>[String(p.id),p.name]));
  return {points,allPoints,pointGameIndexes,allPointGameIndexes,scorerNames,counts,outcomes,outcomesByZone,total:points.length,appearances,mappedAppearances,
    games:eligible.size,mappedGames:mapped.size,minorDiscrepancyAppearances,minorDiscrepancyGames:discrepancyGames.size,reviewAppearances,skipped:Object.fromEntries(Object.entries(skipped).map(([k,v])=>[k,v.size])),
    beyondHalf:points.filter(p=>p[2]>50).length};
}

export function zoneValue(population,zone,measure,baseline) {
  const count=population.counts[zone];
  if(measure==='pergame')return population.mappedAppearances?count/population.mappedAppearances:null;
  if(!population.total)return null;
  const share=count/population.total;
  if(measure==='difference')return baseline?.total?100*(share-baseline.counts[zone]/baseline.total):null;
  return 100*share;
}

export function areaOutcomes(population,zone) {
  if(!zone&&population.outcomes)return [...population.outcomes];
  if(population.outcomesByZone?.[zone])return [...population.outcomesByZone[zone]];
  const counts=[0,0,0,0];
  for(const p of population.allPoints)if(!zone||zoneOf(p)===zone)counts[p[4]]++;
  return counts;
}

export function areaGoalDetails(population,zone){
  const counts=areaOutcomes(population,zone),goals=counts[0],onnet=goals+counts[1];
  const periods=[0,0,0,0],games=new Set(),scorers=new Map();let namedGoals=0;
  population.allPoints.forEach((p,i)=>{
    if(p[4]!==0||(zone&&zoneOf(p)!==zone))return;
    periods[Math.min(3,p[1]-1)]++;
    if(population.allPointGameIndexes?.[i]!==undefined)games.add(population.allPointGameIndexes[i]);
    const name=p[5]===undefined?null:population.scorerNames?.get(String(p[5]));
    if(name){namedGoals++;const id=String(p[5]);if(!scorers.has(id))scorers.set(id,{id,name,goals:0});scorers.get(id).goals++;}
  });
  const totalGoals=population.outcomes[0];
  return {goals,onnet,totalGoals,share:totalGoals?100*goals/totalGoals:null,conversion:onnet?100*goals/onnet:null,
    periods,games:games.size,namedGoals,unnamedGoals:goals-namedGoals,
    scorers:[...scorers.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name)||a.id.localeCompare(b.id))};
}

export function outsideBreakdown(population){
  const areas=['Left','Center','Right'].map(name=>({name,counts:[0,0,0,0]}));
  for(const p of population.allPoints)if(zoneOf(p)==='outside')areas[p[3]<100/3?0:p[3]<200/3?1:2].counts[p[4]]++;
  return areas;
}

export function groupedLocations(points) {
  const groups=new Map();
  for(const p of points){
    if(p[2]>50)continue;
    const key=JSON.stringify([p[2],p[3]]);
    if(!groups.has(key))groups.set(key,{depth:p[2],lateral:p[3],counts:[0,0,0,0],total:0});
    const group=groups.get(key);group.counts[p[4]]++;group.total++;
  }
  return [...groups.values()];
}

export function locationRadius(count,maxCount) {
  return 2+5*Math.sqrt(count/Math.max(4,maxCount));
}

// Descriptive flags, not a statistical significance or shot-danger model.
// Keep exact coordinates so a finer future source does not get rounded into
// artificial repeated locations. Game counts help expose one-game clusters.
export function locationFindings(population,{limit=5,minRepeats=3}={}) {
  const groups=new Map(),keyOf=p=>JSON.stringify([p[2],p[3]]);
  population.points.forEach((p,i)=>{
    if(p[2]>50)return;
    const key=keyOf(p);
    if(!groups.has(key))groups.set(key,{key,depth:p[2],lateral:p[3],total:0,counts:[0,0,0,0],games:new Set()});
    const g=groups.get(key);g.total++;
    if(population.pointGameIndexes?.[i]!==undefined)g.games.add(population.pointGameIndexes[i]);
  });
  for(const p of population.allPoints){const g=groups.get(keyOf(p));if(g)g.counts[p[4]]++;}
  const ranked=[...groups.values()].map(g=>({...g,games:g.games.size,share:population.total?100*g.total/population.total:0}))
    .sort((a,b)=>b.total-a.total||b.games-a.games||a.depth-b.depth||a.lateral-b.lateral);
  const behind=ranked.filter(g=>g.depth<GOAL_LINE),frequent=ranked.filter(g=>g.total>=minRepeats);
  const selected=new Map();
  for(const [category,locations] of [['behind',behind],['frequent',frequent]])for(const g of locations.slice(0,limit)){
    if(!selected.has(g.key))selected.set(g.key,{...g,categories:[]});
    selected.get(g.key).categories.push(category);
  }
  const markers=[...selected.values()].map((g,i)=>({...g,id:i+1}));
  return {markers,behindCount:behind.reduce((sum,g)=>sum+g.total,0),behindLocations:behind.length,
    behindShown:behind.slice(0,limit).map(g=>markers.find(m=>m.key===g.key)),
    frequentLocations:frequent.length,frequentShown:frequent.slice(0,limit).map(g=>markers.find(m=>m.key===g.key)),
    minRepeats,limit};
}

// Offset only the numbered badges when locations are close. Leader lines keep
// their exact source anchors; the heatmap and attempt coordinates never move.
export function locationMarkerLayout(markers) {
  const placed=[];
  for(const marker of markers){
    const x=marker.lateral*4.25,y=marker.depth*10,candidates=[];
    for(const radius of [0,22,34,48,64,82,105,128])for(let i=0;i<16;i++){
      const angle=i*Math.PI/8;
      candidates.push({bx:Math.max(14,Math.min(411,x+Math.cos(angle)*radius)),by:Math.max(14,Math.min(486,y+Math.sin(angle)*radius))});
    }
    const clearance=c=>placed.length?Math.min(...placed.map(p=>Math.hypot(c.bx-p.bx,c.by-p.by))):Infinity;
    const badge=candidates.find(c=>clearance(c)>=32)||candidates.reduce((best,c)=>clearance(c)>clearance(best)?c:best);
    placed.push({...marker,x,y,...badge});
  }
  return placed;
}

export function colorAt(value,max=1,difference=false) {
  if(value===null||!Number.isFinite(value))return '#eef1eb';
  const t=Math.min(1,Math.max(0,difference?Math.abs(value)/max:value/max));
  const start=[246,249,239],end=difference&&value<0?[182,82,61]:[24,69,59];
  return '#'+start.map((v,i)=>Math.round(v+(end[i]-v)*t).toString(16).padStart(2,'0')).join('');
}

// One color mapping is shared by the raster, on-page key, and image export.
// Values remain linear; the display never rescales each team's map separately.
export const HEAT_PALETTES = {
  forest: {name:'Forest & flame',stops:[[0,'#0e2e2a'],[.08,'#174c4c'],[.25,'#218e76'],[.45,'#96cb45'],[.62,'#f3dc5d'],[.8,'#f39943'],[1,'#f25545']]},
  glacier: {name:'Glacier & ember',stops:[[0,'#112d3b'],[.12,'#205973'],[.3,'#3db9cd'],[.5,'#b2e0d9'],[.68,'#f8db80'],[.85,'#f59167'],[1,'#e95469']]},
};
export const DIFFERENCE_STOPS = [[-1,'#ff6b55'],[-.55,'#cc745a'],[-.15,'#574840'],[0,'#0e2e2a'],[.15,'#225743'],[.55,'#64b976'],[1,'#c5ec64']];
export const LIGHT_HEAT_PALETTES = {
  forest:{name:'Forest & flame',stops:[[0,'#f8faf2'],[.08,'#e5efdf'],[.25,'#a9d0ad'],[.45,'#4d9c77'],[.62,'#1b6650'],[.8,'#d8b640'],[1,'#bb4334']]},
  glacier:{name:'Glacier & ember',stops:[[0,'#f6fafc'],[.12,'#e2eef5'],[.3,'#a4cfe0'],[.5,'#428dac'],[.68,'#2b5c94'],[.85,'#cb896e'],[1,'#bb3e4a']]},
};
export const LIGHT_DIFFERENCE_STOPS = [[-1,'#ba4b39'],[-.55,'#e7a190'],[0,'#f8faf2'],[.55,'#8bb795'],[1,'#18563e']];

export function heatStops(palette='forest',difference=false,theme='dark'){
  if(difference)return theme==='light'?LIGHT_DIFFERENCE_STOPS:DIFFERENCE_STOPS;
  if(palette && typeof palette==='object')return theme==='light'?palette.lightStops:palette.stops;
  const palettes=theme==='light'?LIGHT_HEAT_PALETTES:HEAT_PALETTES;
  return (palettes[palette]||palettes.forest).stops;
}

export function heatColorAt(value,max=1,palette='forest',difference=false,theme='dark') {
  const stops=heatStops(palette,difference,theme);
  const t=Number.isFinite(value)&&max>0?Math.max(difference?-1:0,Math.min(1,value/max)):0;
  if(t<=stops[0][0])return stops[0][1];
  const upper=stops.findIndex(s=>s[0]>=t),a=stops[upper-1],b=stops[upper];
  const ratio=(t-a[0])/(b[0]-a[0]);
  return '#'+[1,3,5].map(i=>Math.round(parseInt(a[1].slice(i,i+2),16)*(1-ratio)+parseInt(b[1].slice(i,i+2),16)*ratio).toString(16).padStart(2,'0')).join('');
}

export function densityContours(grid,max,difference=false) {
  if(!(max>0))return [];
  const {nx,ny,values}=grid,result=[];
  // Linear interpolation over triangles handles saddle cells consistently.
  // These are display contours of the smoothed field, not shot-danger zones.
  for(const polarity of difference?[1,-1]:[1])for(const fraction of [.14,.3,.5,.72,.9]){
    const level=max*fraction*polarity,segments=[];
    for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
      const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([px,py])=>({x:(px+.5)/nx*425,y:(py+.5)/ny*500,v:values[py*nx+px]}));
      for(const triangle of [[0,1,2],[0,2,3]]){
        const crossings=[];
        for(let edge=0;edge<3;edge++){
          const a=corners[triangle[edge]],b=corners[triangle[(edge+1)%3]];
          if((a.v>=level)===(b.v>=level))continue;
          const t=(level-a.v)/(b.v-a.v);
          crossings.push([a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t]);
        }
        if(crossings.length===2)segments.push(`M${crossings[0].map(v=>v.toFixed(2)).join(' ')}L${crossings[1].map(v=>v.toFixed(2)).join(' ')}`);
      }
    }
    if(segments.length)result.push({fraction,polarity,path:segments.join('')});
  }
  return result;
}

export function density(population,measure='share',nx=60,ny=70) {
  const raw=new Float64Array(nx*ny);
  for(const p of population.points){
    if(p[2]>50)continue;
    const x=Math.min(nx-1,Math.floor(p[3]/100*nx)),y=Math.min(ny-1,Math.floor(p[2]/50*ny));
    raw[y*nx+x]++;
  }
  const sigma=2.1,radius=6,kernel=[];
  let sum=0;
  for(let i=-radius;i<=radius;i++){const k=Math.exp(-i*i/(2*sigma*sigma));kernel.push(k);sum+=k;}
  const horizontal=new Float64Array(raw.length),smooth=new Float64Array(raw.length);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    for(let k=-radius;k<=radius;k++)if(x+k>=0&&x+k<nx)horizontal[y*nx+x]+=raw[y*nx+x+k]*kernel[k+radius]/sum;
  }
  const denominator=measure==='pergame'?population.mappedAppearances:population.total;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    for(let k=-radius;k<=radius;k++)if(y+k>=0&&y+k<ny)smooth[y*nx+x]+=horizontal[(y+k)*nx+x]*kernel[k+radius]/sum;
    smooth[y*nx+x]=denominator?smooth[y*nx+x]/denominator:0;
  }
  return {values:smooth,nx,ny};
}
