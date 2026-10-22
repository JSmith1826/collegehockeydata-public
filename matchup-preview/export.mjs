import {CLASSES,dateLabel,pathways,rate,format as fmt,defenseSummary} from './model.mjs';
import {heatStops} from './shot-model/model.mjs';
import {GOAL_LINE,BLUE_LINE,DOT_DEPTH,DOT_LEFT,DOT_RIGHT,CIRCLE_DEPTH_RADIUS,CIRCLE_LATERAL_RADIUS} from './shot-model/rink-geometry.mjs';
import {CREASE_PATH} from './shot-model/zones.mjs';

const PAPER='#f3f5f1',INK='#17382f',MUTED='#5c7069',RULE='#d5dfda';
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('A preview image could not be loaded.'));image.src=src;});}

/** Browser canvas export: no server, external image endpoint or HTML screenshot needed. */
export async function downloadPreview({data,populations,grids,sharedMax,heatImage,colors,imageFor,page,saveBlob}) {
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1800;
  const ctx=canvas.getContext('2d');
  const text=(s,x,y,size=30,color=INK,weight=400,width)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Tw Cen MT","Trebuchet MS",Arial,sans-serif`;ctx.fillText(String(s),x,y,width);};
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const rule=(x,y,w)=>rect(x,y,w,1.5,RULE);
  const title={shooting:'Shooting & scoring',defense:'Defense & goalies',roster:'How they’re built'}[page]||'Shooting & scoring';
  rect(0,0,1440,1800,PAPER);rect(0,0,720,10,colors(data.teams[0])[0]);rect(720,0,720,10,colors(data.teams[1])[0]);
  text('2026–27 MEN’S DIVISION I / MATCHUP PREVIEW',60,70,27,MUTED,700);
  text(title,60,151,76,INK,700);text(data.event.label,60,207,29,MUTED,400,1320);
  const images=await Promise.all(data.teams.map(imageFor));
  function teamHeader(t,i,y,w=1320,x=60){
    rect(x,y,w,88,'#e7ede2');rect(x,y,7,88,colors(t)[0]);
    const logo=images[i];if(logo){const scale=Math.min(90/logo.width,74/logo.height);ctx.drawImage(logo,x+20+(90-logo.width*scale)/2,y+7+(74-logo.height*scale)/2,logo.width*scale,logo.height*scale);}
    text(t.name,x+132,y+40,42,INK,700,w-350);text(t.conference,x+132,y+70,25,MUTED);
    ctx.textAlign='right';text(t.record.join('–'),x+w-20,y+52,42,INK,700);ctx.textAlign='left';
  }
  async function map(t,p,grid,max,x,y,w=580,h=493){
    if(!p.mappedGames){rect(x,y,w,h,'#e7ede2');text(p.games?'Map unavailable':'Season debut',x+28,y+h/2,39,INK,700);text('No verified shots through '+dateLabel(data.through),x+28,y+h/2+50,25,MUTED,400,w-56);return;}
    const image=await loadImage(heatImage(grid,max));
    ctx.save();ctx.translate(x,y+h);ctx.rotate(-Math.PI/2);ctx.scale(h/425,w/500);
    ctx.beginPath();ctx.moveTo(100,0);ctx.lineTo(325,0);ctx.quadraticCurveTo(425,0,425,100);ctx.lineTo(425,500);ctx.lineTo(0,500);ctx.lineTo(0,100);ctx.quadraticCurveTo(0,0,100,0);ctx.closePath();ctx.clip();ctx.drawImage(image,0,0,425,500);
    ctx.strokeStyle='#bed8ca';ctx.lineWidth=1.2;
    const goal=GOAL_LINE*10,blue=BLUE_LINE*10,dot=DOT_DEPTH*10;
    for(const yy of [goal,blue]){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(425,yy);ctx.stroke();}
    for(const xx of [DOT_LEFT*4.25,DOT_RIGHT*4.25]){ctx.beginPath();ctx.ellipse(xx,dot,CIRCLE_LATERAL_RADIUS*4.25,CIRCLE_DEPTH_RADIUS*10,0,0,Math.PI*2);ctx.stroke();}
    const crease=new Path2D(CREASE_PATH);ctx.fillStyle='#7dbac033';ctx.fill(crease);ctx.stroke(crease);
    ctx.fillStyle='#10342c';ctx.fillRect(197.5,goal-18,30,18);ctx.strokeStyle='#e1ece2';ctx.strokeRect(197.5,goal-18,30,18);
    for(const pt of p.points.filter(pt=>pt[4]===0&&pt[2]<=50)){ctx.beginPath();ctx.arc(pt[3]*4.25,pt[2]*10,5.5,0,Math.PI*2);ctx.fillStyle='#fff7d455';ctx.fill();ctx.strokeStyle='#fff7d4';ctx.lineWidth=1.6;ctx.stroke();}
    ctx.restore();
  }
  function metrics(items,x,y,w){const stride=w/items.length;items.forEach(([v,label],i)=>{text(v,x+i*stride,y,48,INK,700);text(label,x+i*stride,y+37,23,MUTED,700,stride-10);});}
  function row(name,values,x,y,width=570){text(name,x,y,31,INK,600,width-205);const stride=values.length===4?66:78;ctx.textAlign='right';values.forEach((v,j)=>text(v,x+width-(values.length-1-j)*stride,y,29,INK,400));ctx.textAlign='left';rule(x,y+16,width);}
  if(page!=='roster'){
    for(let i=0;i<2;i++){
      const t=data.teams[i],y=245+i*660,perspective=page==='defense'?'faced':'taken',p=populations[perspective][i];
      teamHeader(t,i,y);await map(t,p,grids[perspective][i],sharedMax[perspective],60,y+105);
      const x=725,w=655;
      if(page==='defense'){
        const d=defenseSummary(p);
        metrics([[fmt(rate(t.goalsAgainst,t.boxGames),2),'GA / GAME¹'],[fmt(d.shotsAgainstPerGame),'SOG FACED²'],[fmt(d.blocksPerGame),'REC. BLOCKS²']],x,y+166,w);
        rule(x,y+229,w);text('BLOCKED OPPONENT ATTEMPTS',x,y+276,27,MUTED,700);
        rect(x,y+300,w,24,'#dce5d6');if(d.attempts)rect(x,y+300,w*d.blocked/d.attempts,24,colors(t)[0]);
        text(d.attempts?`${d.blocked} / ${d.attempts} recorded attempts · ${fmt(d.blockShare)}%`:'No verified attempt sample',x,y+364,31,INK,600,w);
        text(`GOALIES · ${t.goalieGames}/${t.boxGames} GAMES REPORTED`,x,y+422,26,MUTED,700);
        row('Goalie',['SV%','GAA'],x,y+464,w);
        t.goalies.slice(0,2).forEach((g,j)=>row(g.name,[fmt(g.savePct,3),fmt(g.gaa,2)],x,y+512+j*50,w));
        if(!t.goalies.length)text('No goalie detail available',x,y+521,29,MUTED);
        text('Starters / availability not projected',x,y+622,25,MUTED);
      }else{
        metrics([[fmt(rate(t.boxGoals,t.boxGames),2),'GOALS / GAME'],[fmt(rate(t.boxShots,t.boxGames)),'SOG / GAME'],[t.boxShots?fmt(100*t.boxGoals/t.boxShots)+'%':'—','SHOOTING']],x,y+166,w);
        rule(x,y+229,w);text('SCORING LEADERS · '+t.leaderSeason+(t.boxGames?'':' (PRIOR)'),x,y+279,27,MUTED,700);
        row('Player',['G','A','PTS','SOG'],x,y+330,w);
        t.leaders.slice(0,5).forEach((p,j)=>row(p.name,[p.goals,p.assists,p.points,p.shots],x,y+383+j*48,w));
        if(!t.leaders.length)text('No scoring rows available',x,y+398,30,MUTED);
      }
      text(`${p.mappedGames}/${p.games} games mapped · ${p.total} ${page==='defense'?'opponent ':''}SOG${p.beyondHalf?' · '+p.beyondHalf+' outside half':''}`,60,y+625,22,MUTED,400,625);
    }
    const gradient=ctx.createLinearGradient(60,0,420,0);heatStops('forest',false,'dark').forEach(([v,c])=>gradient.addColorStop(v,c));rect(60,1571,360,16,gradient);
    text('Less',60,1556,23,MUTED);text('More concentrated',274,1556,23,MUTED);
    text(page==='defense'?'Opponent SOG · same scale · attacking direction · rings = goals against.':'Share of mapped SOG · same scale · rings = goals. Scoring: all completed games.',60,1622,26,MUTED);
    text(page==='defense'?'¹ All games. ² Per mapped game. Miss/block completeness not independently verified.':'Leaders: goals, points, then shots. Maps cover the verified game counts shown.',60,1662,25,MUTED);
  }else{
    for(let i=0;i<2;i++){
      const t=data.teams[i],x=60+i*700,w=620;teamHeader(t,i,245,w,x);
      metrics([[t.roster,'ROSTER'],[t.drafted,'NHL PICKS'],[t.firstRound,'FIRST ROUND']],x,409,w);
      text('REPORTED CLASS · NOT AGE',x,510,27,MUTED,700);
      let bx=x;const classColors=['#0072b2','#009e73','#e69f00','#d55e00','#cc79a7','#767676'];
      t.classes.forEach((n,j)=>{if(!n)return;const bw=w*n/t.roster;rect(bx,535,bw,44,classColors[j]);if(bw>25)text(n,bx+bw/2-10,568,29,'#fff',700);bx+=bw;});
      text(CLASSES.map((c,j)=>c+' '+t.classes[j]).join(' · '),x,622,25,INK,400,w);
      text('PATHS TO THE ROSTER',x,697,27,MUTED,700);
      pathways(t).filter(g=>g.count).forEach((g,j)=>{const y=745+j*35;text(g.name,x,y,27,INK,400,260);rect(x+268,y-22,290,22,'#e0e8db');rect(x+268,y-22,290*g.count/t.roster,22,g.color);text(g.count,x+w-34,y,29,INK,700);});
      text('PLAYERS TO WATCH',x,1100,27,MUTED,700);
      t.watch.slice(0,4).forEach((p,j)=>{const y=1140+j*120;rule(x,y-20,w);text(p.name,x,y+17,35,INK,700,w);text(`${p.position} · ${p.class}${p.draft?' · '+p.draft.year+' RD '+p.draft.round+(p.draft.overall?' #'+p.draft.overall:''):' · Undrafted'}`,x,y+51,25,MUTED,400,w);text(`${p.experienceComplete?'':'≥'}${p.careerGP} career D1 GP · ${p.gp?p.goals+'G + '+p.assists+'A / '+p.gp+' GP':'Season debut'}`,x,y+84,26,INK,400,w);});
    }
    text('Pathways: reported previous league. Transfers grouped separately. No projected lines.',60,1651,26,MUTED);
  }
  text('Through '+dateLabel(data.through)+' · Instat shots · CHN roster / A / PTS / goalie boxes · Snapshot.',60,1704,26,MUTED);
  rect(0,1732,1440,68,'#10342c');
  try{const logo=await loadImage('../assets/site/chd-horizontal-reversed.svg');const w=385,h=w*logo.height/logo.width;ctx.drawImage(logo,60,1745,w,h);}catch{text('College Hockey Data',60,1778,32,'#fff',700);}
  text('CollegeHockeyData.com',964,1778,31,'#fff',600);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('The browser could not create a PNG.');
  const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  saveBlob(blob,`chd-${slug(data.teams[0].name)}-vs-${slug(data.teams[1].name)}-${page}.png`);
}
