import {faceoffMarkings} from './rink-geometry.mjs?v=d1559cfd3b60';
import {exportOutcome,exportPerspective} from './export-outcome.mjs?v=d1559cfd3b60';
import {ZONES,BLUE_LINE,GOAL_LINE,CREASE_PATH,DESIGN_PIXELS_PER_FOOT} from './zones.mjs?v=d1559cfd3b60';
import {zoneValue,areaOutcomes,outcomeGroups,colorAt} from './model.mjs?v=d1559cfd3b60';
import {summaryReference,compareSummary} from './summary-comparison.mjs?v=d1559cfd3b60';

export const PRINT_VERSION='connected-arch-print-1';
export const PRINT_WIDTH=2400;
const OUTCOMES={all:'All attempts',onnet:'On net',goal:'Goals',saved:'Saved',missed:'Missed',blocked:'Blocked'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const percent=(n,d)=>d?`${(100*n/d).toFixed(1)}%`:'n/a';
const text=(s,x,y,size=30,fill='#183c32',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
export function printValue(value,measure){
  if(value===null||!Number.isFinite(value))return 'n/a';
  return measure==='share'?`${value.toFixed(1)}%`:measure==='difference'?`${value>0?'+':''}${value.toFixed(1)} pp`:value.toFixed(1);
}
function wrapped(s,width,size){
  const max=Math.floor(width/(size*.61)),lines=[];let line='';
  for(const word of String(s).split(/\s+/)){
    if(line.length+word.length+1>max&&line){lines.push(line);line='';}
    if(word.length>max){if(line){lines.push(line);line='';}for(let i=0;i<word.length;i+=max)lines.push(word.slice(i,i+max));}
    else line+=(line?' ':'')+word;
  }
  if(line)lines.push(line);return lines.length?lines:[''];
}
function filters(state,data){
  const team=id=>data.teams.find(t=>String(t.id)===String(id))?.name||'Selected opponent';
  return [state.opponentTeam!=='all'?`Against ${team(state.opponentTeam)}`:state.opponentConference!=='all'?`Against ${state.opponentConference}`:'All opponents',
    state.period==='all'?'All periods':state.period==='ot'?'Overtime':`${['First','Second','Third'][Number(state.period)-1]} period`,
    state.venue==='all'?'Home & away':`Listed ${state.venue}`,
    state.scope==='all'?'Regular season + postseason':state.scope==='regular'?'Regular season':'Conference + NCAA postseason',
    ...(state.partial?['Count discrepancies included']:[])].join(' | ');
}
function outsideGroups(population){
  const cut=BLUE_LINE+3*DESIGN_PIXELS_PER_FOOT/10;
  return [
    {id:'near',name:'Near the blue line',count:population.points.filter(p=>p[2]>=BLUE_LINE&&p[2]<cut).length},
    {id:'far',name:'Farther out',count:population.points.filter(p=>p[2]>=cut).length},
  ];
}
function groupValue(count,population,measure,baselineCount,baseline){
  if(measure==='pergame')return population.mappedAppearances?count/population.mappedAppearances:null;
  if(!population.total)return null;
  if(measure==='difference')return baseline?.total?100*(count/population.total-baselineCount/baseline.total):null;
  return 100*count/population.total;
}

// Freeze counts and configuration before logos or image encoding are awaited.
// Ordinary hover never changes export focus; only an explicit selected area can.
export function buildPrintSnapshot(data,state,specs,{focus='whole',referenceModes=['off','off'],studyBase='http://127.0.0.1:8765/shot-maps/'}={}){
  if(specs.length!==2)throw new Error('A print comparison requires two maps.');
  const zone=focus==='selected'?ZONES.find(z=>z.id===state.zone):null;
  if(focus==='selected'&&!zone)throw new Error('Select an area before exporting its outcomes.');
  const panels=specs.map((spec,i)=>{
    const p=spec.population,reference=summaryReference(data,spec,referenceModes[i]);
    const counts=areaOutcomes(p,zone?.id||null),total=counts.reduce((a,b)=>a+b,0);
    const outside=outsideGroups(p),baseOutside=spec.baseline?outsideGroups(spec.baseline):[];
    return {name:spec.name,label:spec.label,perspective:spec.perspective,team:spec.team,
      logo:data.teams.find(t=>String(t.id)===String(spec.team))?.logo||'',logoData:null,
      total:p.total,allTotal:p.allPoints.length,mappedGames:p.mappedGames,eligibleGames:p.games,mappedAppearances:p.mappedAppearances,
      skipped:{...p.skipped},beyondHalf:p.beyondHalf,
      zones:ZONES.filter(z=>z.id!=='outside').map(z=>({id:z.id,count:p.counts[z.id],value:zoneValue(p,z.id,state.measure,spec.baseline)})),
      outside:outside.map((g,j)=>({...g,value:groupValue(g.count,p,state.measure,baseOutside[j]?.count,spec.baseline)})),
      summary:{counts,total,groups:outcomeGroups(counts).map(g=>({...g,share:total?100*g.count/total:null}))},
      reference:reference?{label:reference.label,...compareSummary(p,reference.population,zone?.id||null)}:null};
  });
  const same=panels[0].name===panels[1].name;
  return {version:PRINT_VERSION,privatePreview:data.privatePreview!==false,season:data.season,seasonLabel:data.label.replace(/[–—]/g,'-'),through:data.through,
    title:same?`${panels[0].name}: shots taken & faced`:`${panels[0].name} & ${panels[1].name}`,
    filterText:filters(state,data),measure:state.measure,outcome:state.outcome,outcomeLabel:OUTCOMES[state.outcome],
    focus:zone?{id:zone.id,name:zone.name}:null,partial:!!state.partial,
    context:same?'Season profile':'Season profiles',panels,
    configuration:{...state},studyUrl:`${studyBase}?${new URLSearchParams(Object.entries(state).map(([k,v])=>[k,String(v)]))}`};
}

function grayscaleFill(value,max){
  if(value===null||!Number.isFinite(value))return '#f6f6f6';
  const channel=Math.round(250-210*Math.min(1,Math.abs(value)/(max||1))).toString(16).padStart(2,'0');
  return '#'+channel.repeat(3);
}
function textFill(fill){
  const rgb=[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16));
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<135?'#ffffff':'#183c32';
}
function rink(panel,snapshot,max,gray,i){
  const bottom=BLUE_LINE*10,outline=`M100 0H325Q425 0 425 100V${bottom}H0V100Q0 0 100 0Z`,anchor='text-anchor="middle"';
  let markup=`<defs><clipPath id="rink-clip-${i}"><path d="${outline}"/></clipPath></defs>`;
  markup+=rect(0,0,425,bottom,gray?'#ffffff':'#f8faf3',`clip-path="url(#rink-clip-${i})"`);
  markup+=`<g clip-path="url(#rink-clip-${i})">`;
  for(const z of ZONES.filter(z=>z.id!=='outside')){
    const datum=panel.zones.find(d=>d.id===z.id),fill=gray?grayscaleFill(datum.value,max):colorAt(datum.value,max,snapshot.measure==='difference');
    const ink=gray?(textFill(fill)==='#ffffff'?'#ffffff':'#202020'):textFill(fill),selected=snapshot.focus?.id===z.id;
    markup+=`<path d="${z.path}" fill="${fill}" fill-rule="evenodd" stroke="${selected?(gray?'#000000':'#af661e'):(gray?'#999999':'#93a99b')}" stroke-width="${selected?2.5:.9}"/>`;
    if(gray&&snapshot.measure==='difference'&&datum.value<0)markup+=`<path d="${z.path}" fill="url(#below-average)" fill-rule="evenodd"/>`;
    const [x,y]=z.label,value=printValue(datum.value,snapshot.measure),count=fmt(datum.count);
    if(z.format==='band')markup+=text(z.short,x,y-5,10,ink,anchor+' font-weight="700"')+text(`${value} | ${count}`,x,y+9,12,ink,anchor+' font-weight="700"');
    else if(z.format==='central')markup+=text(z.short,x,y-8,z.id==='front'?11:13,ink,anchor+' font-weight="700"')+text(value,x,y+13,z.id==='front'?18:21,ink,anchor+' font-weight="700"')+text(count,x,y+27,10,ink,anchor);
    else markup+=text(z.short,x,y-8,z.format==='point'?12:13,ink,anchor+' font-weight="700"')+text(value,x,y+16,19,ink,anchor+' font-weight="700"')+text(count,x,y+29,10,ink,anchor);
  }
  const rinkInk=gray?'#777777':'#b2766e';
  markup+=`<g fill="none" stroke="${rinkInk}" stroke-width="1" opacity=".36"><path d="M0 ${GOAL_LINE*10}H425"/>${faceoffMarkings({dotRadius:3,ink:rinkInk})}<path d="${CREASE_PATH}"/></g>`;
  markup+=`<path d="M0 ${bottom}H425" stroke="${gray?'#6b6b6b':'#678796'}" stroke-width="1.6"/>`;
  if(!panel.total)markup+=rect(72,173,281,52,gray?'#ffffff':'#f8faf3','fill-opacity=".94"')+text('No mapped attempts',212.5,205,17,gray?'#303030':'#365f49',anchor);
  markup+='</g>';
  markup+=`<path d="${outline}" fill="none" stroke="${gray?'#626262':'#637e6d'}" stroke-width="1.5"/><path d="M197.5 ${GOAL_LINE*10}V${GOAL_LINE*10-18}H227.5V${GOAL_LINE*10}Z" fill="#ffffff" stroke="${gray?'#777777':'#647d6b'}" stroke-width="1"/>`;
  return markup;
}

export function renderPrintSVG(snapshot,{grayscale=false}={}){
  const gray=grayscale,W=PRINT_WIDTH,pad=80,gap=64,panelW=(W-pad*2-gap)/2,ink=gray?'#202020':'#183c32',muted=gray?'#555555':'#5b7162',line=gray?'#cccccc':'#cbd6ca';
  const titleLines=wrapped(snapshot.title,W-2*pad,68),filterLines=wrapped(snapshot.filterText,W-2*pad,29);
  const outcome=exportOutcome(snapshot.outcome),bannerY=165+(titleLines.length-1)*76;
  const metadataY=bannerY+182;
  const headerEnd=metadataY+38+(filterLines.length-1)*36+26;
  const nameLines=snapshot.panels.map(p=>wrapped(p.name,panelW-115,44)),nameHeight=Math.max(...nameLines.map(l=>l.length))*51;
  const directionY=headerEnd+nameHeight+91,rinkY=directionY+146,rinkH=panelW*(BLUE_LINE*10+6)/431,outsideY=rinkY+rinkH+17,summaryY=outsideY+87;
  const hasReference=snapshot.panels.some(p=>p.reference),legendY=summaryY+188+(hasReference?104:0),footerY=legendY+82,H=footerY+130;
  const values=snapshot.panels.flatMap(p=>p.zones.map(z=>z.value)).filter(v=>v!==null);
  const max=Math.max(snapshot.measure==='pergame'?.1:1,...values.map(v=>Math.abs(v)));
  const metric=snapshot.measure==='share'?`Share of ${snapshot.outcomeLabel.toLowerCase()} (%)`:snapshot.measure==='pergame'?`${snapshot.outcomeLabel} / mapped team game`:'Vs. national average (percentage points)';
  let body=rect(0,0,W,H,'#ffffff')+rect(pad,25,W-2*pad,5,ink);
  body+=text('COLLEGE HOCKEY DATA / SHOT ZONES',pad,66,27,ink,'font-weight="700" letter-spacing="2"');
  titleLines.forEach((s,j)=>body+=text(s,pad,135+j*76,68,ink,'font-weight="700"'));
  body+=rect(pad,bannerY,W-2*pad,142,ink);
  body+=text('MAP SHOWS',pad+28,bannerY+29,23,'#ffffff','font-weight="700" letter-spacing="2"');
  body+=text(outcome.title,pad+28,bannerY+82,55,'#ffffff','font-weight="700"');
  body+=text(outcome.definition,pad+28,bannerY+121,29,'#ffffff');
  body+=text(`${snapshot.seasonLabel} | Men's Division I | ${snapshot.context} | ${metric}`,pad,metadataY,29,muted);
  filterLines.forEach((s,j)=>body+=text(s,pad,metadataY+38+j*36,29,muted));
  for(const [i,p] of snapshot.panels.entries()){
    const x=pad+i*(panelW+gap),nameY=headerEnd+49;
    if(p.logoData)body+=`<image href="${esc(p.logoData)}" x="${x}" y="${headerEnd+7}" width="88" height="88" preserveAspectRatio="xMidYMid meet"${gray?' filter="url(#monochrome-logo)"':''}/>`;
    else body+=rect(x,headerEnd+9,83,83,gray?'#eeeeee':'#edf2e9','rx="8"')+text(p.name.split(/\s+/).map(s=>s[0]).join('').slice(0,3),x+41.5,headerEnd+62,32,ink,'text-anchor="middle" font-weight="700"');
    nameLines[i].forEach((s,j)=>body+=text(s,x+111,nameY+j*51,44,ink,'font-weight="700"'));
    body+=text(`${p.label} | ${fmt(p.total)} ${outcome.label.toLowerCase()}`,x+111,headerEnd+nameHeight+36,28,muted);
    body+=text(`${fmt(p.mappedGames)} / ${fmt(p.eligibleGames)} eligible games mapped`,x+111,headerEnd+nameHeight+72,26,muted);
    const direction=exportPerspective(p.perspective);
    body+=rect(x,directionY,panelW,126,gray?ink:direction.color);
    body+=text(direction.title,x+26,directionY+55,52,'#ffffff','font-weight="700"');
    body+=text(direction.definition,x+26,directionY+99,26,'#ffffff');
    body+=`<svg x="${x}" y="${rinkY}" width="${panelW}" height="${rinkH}" viewBox="-3 -3 431 ${BLUE_LINE*10+6}">${rink(p,snapshot,max,gray,i)}</svg>`;
    const cardW=(panelW-18)/2;
    p.outside.forEach((group,j)=>{
      const cx=x+j*(cardW+18);body+=rect(cx,outsideY,cardW,71,gray?'#f7f7f7':'#f3f6f0',`stroke="${line}"`);
      body+=text(group.name,cx+18,outsideY+29,24,muted)+text(`${printValue(group.value,snapshot.measure)} | ${fmt(group.count)} shown`,cx+18,outsideY+58,26,ink,'font-weight="700"');
    });
    const summaryScope=snapshot.focus?snapshot.focus.name:'Whole rink';
    body+=text(`HOW ATTEMPTS ENDED / ${summaryScope}`,x,summaryY+27,25,ink,'font-weight="700"');
    body+=text(`All outcomes, independent of map filter | ${fmt(p.summary.total)} attempts`,x,summaryY+61,24,muted);
    const outcomeColors=gray?['#272727','#858585','#dedede']:['#31553f','#88ab90','#dce5d6'];
    let cursor=x;
    p.summary.groups.forEach((group,j)=>{
      const width=p.summary.total?panelW*group.count/p.summary.total:0;
      body+=rect(cursor,summaryY+77,Math.max(0,width),16,outcomeColors[j]);cursor+=width;
      const cx=x+j*panelW/3;
      body+=text(group.name,cx,summaryY+125,25,muted)+text(`${percent(group.count,p.summary.total)} | ${fmt(group.count)}`,cx,summaryY+160,31,ink,'font-weight="700"');
    });
    body+=text(`Missed ${fmt(p.summary.counts[2])} | Blocked ${fmt(p.summary.counts[3])}`,x+panelW*2/3,summaryY+187,21,muted);
    if(p.reference){
      const ref=p.reference,y=summaryY+224;
      body+=text(`${ref.label} | ${fmt(ref.referenceTotal)} reference attempts`,x,y,24,ink,'font-weight="700"');
      ref.rows.forEach((row,j)=>{
        const delta=row.difference===null?'n/a':`${row.difference>0?'+':''}${row.difference.toFixed(1)} pp`;
        body+=text(`${row.name}: ${row.referenceShare===null?'n/a':row.referenceShare.toFixed(1)+'%'} (${delta})`,x+j*panelW/3,y+33,22,muted);
      });
      body+=text('Differences are your share minus the average; same filters.',x,y+61,21,muted);
    }
  }
  const scaleLabel=snapshot.measure==='difference'?'Signed differences; shared scale'+(gray?' | Hatched areas: below average':''):snapshot.measure==='pergame'?'Attempts per mapped team game; shared scale':'Shares include outside origins; shared scale on both rinks';
  body+=text(scaleLabel,pad,legendY+33,27,ink);
  const diverging=snapshot.measure==='difference'&&!gray,barX=W-pad-440,barY=legendY+15;
  const low=diverging?-max:0,end=snapshot.measure==='difference'&&gray?`+/-${max.toFixed(1)} pp`:printValue(max,snapshot.measure);
  body+=text(printValue(low,snapshot.measure),barX-15,legendY+33,24,muted,'text-anchor="end"');
  body+=rect(barX,barY,260,20,'url(#zone-scale)',`stroke="${line}"`);
  body+=text(end,W-pad,legendY+33,24,muted,'text-anchor="end"');
  body+=text('Rinks end at the blue line. Outside cards retain every outside origin, including those beyond the displayed half.',pad,legendY+68,25,muted);
  body+=`<line x1="${pad}" y1="${footerY}" x2="${W-pad}" y2="${footerY}" stroke="${line}" stroke-width="2"/>`;
  body+=text('CollegeHockeyData.com',pad,footerY+49,45,ink,'font-weight="700"');
  body+=text(`Results through ${snapshot.through} | Recorded locations: College Hockey News${snapshot.privatePreview?' | PRIVATE PREVIEW':''}`,W-pad,footerY+41,25,ink,'text-anchor="end"');
  body+=text(`Approximate locations | All game states combined | ${snapshot.partial?'Includes count-discrepancy charts':'Goal/on-net totals checked; miss/block completeness not established'}`,pad,footerY+78,24,muted);
  body+=text(`Near-line grouping uses rounded source coordinates | ${snapshot.version}`,pad,footerY+113,22,muted);
  const stops=Array.from({length:11},(_,i)=>{const t=i/10,value=diverging?max*(2*t-1):max*t;return `<stop offset="${t*100}%" stop-color="${gray?grayscaleFill(value,max):colorAt(value,max,diverging)}"/>`;}).join('');
  const definitions=`<linearGradient id="zone-scale">${stops}</linearGradient><filter id="monochrome-logo" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter><pattern id="below-average" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M-1 1L1 -1M0 5L5 0M4 6L6 4" stroke="#000000" stroke-opacity=".24" stroke-width=".5"/></pattern>`;
  const safe={...snapshot,panels:snapshot.panels.map(({logoData,...p})=>p)};
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Trebuchet MS,Arial,sans-serif"><title>${esc(snapshot.title+' - print shot-zone comparison')}</title><desc>${esc(snapshot.filterText+'; '+metric+'; cropped at blue line with all outside counts retained.')}</desc><metadata>${esc(JSON.stringify(safe))}</metadata><defs>${definitions}</defs>${body}</svg>`;
}
