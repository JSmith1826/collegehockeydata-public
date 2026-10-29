// Provider NHL zone codes and display geometry, retained client bundle hash in
// the release audit. The source `z` is authoritative; never infer it from x/y.
// Source SVG 400 x 426.2 covers 44% of full rink length. Reproject that drawing
// to our lateral*4.25, depth*10 coordinate convention without changing its zones.
export {GOAL_LINE,BLUE_LINE,faceoffMarkings} from './instat-rink.mjs?v=unified-e1fe3bc4a6f2';
export const DESIGN_PIXELS_PER_FOOT=5,FLANK_CLIP='M0 0H425V500H0Z';
export const CREASE_PATH='M195 55Q212.5 100 230 55Z';
const sx=425/400,sy=440/426.2;
const poly=ps=>ps.map(([x,y],i)=>(i?'L':'M')+(x*sx).toFixed(2)+' '+(y*sy).toFixed(2)).join('')+'Z';
const p=(s)=>poly(s.split(/\s+/).map(a=>a.split(',').map(Number)));
const make=(code,id,name,points,label)=>({code,id,name,short:name,path:p(points),label:[label[0]*sx,label[1]*sy],format:'central',description:`Instat NHL ice zone ${code}. Source-coded area, not an expected-goals or danger category. Left/right refer to the displayed attacking view.`});
export const ZONES=[
 make(48,'behind','Behind goal line','0,0 400,0 400,53 0,53',[200,27]),
 make(41,'inner-slot','Inner slot','181.2,53 217.7,53 260.1,108.1 200,150.7 139.5,108.1',[200,94]),
 make(42,'middle-slot','Middle slot','97.3,163.9 138.9,108.9 200,152 260.8,108.9 302.4,163.1 302.4,233.3 97.4,233.3',[200,190]),
 make(44,'left-low','Left low zone','0,53 179.8,53 96.4,163.4 96.3,233.3 0,233.3',[47,144]),
 make(45,'right-low','Right low zone','219.1,53 400,53 400,233.4 303.5,233.4 303.5,163.1',[353,144]),
 make(46,'left-high','Left high zone','0,234.4 96.6,234.4 137.7,352 0,352',[52,293]),
 make(43,'high-center','High center','97.8,234.4 302.3,234.4 260,352 138.8,352',[200,293]),
 make(47,'right-high','Right high zone','303.5,234.4 400,234.4 400,352 261.2,352',[348,293]),
 make(49,'outside','High / beyond zone','0,353.1 400,353.1 400,484.32 0,484.32',[200,397]),
 {id:'unknown',name:'Zone not supplied',short:'Unknown zone',path:'',label:[212.5,475],description:'The source did not supply a recognized zone. Included in totals; no spatial zone is invented.'},
];
// The shallow behind-goal band needs a compact label; unknown zones stay in
// tables/totals and have no fictitious location on the rink.
ZONES.find(z=>z.code===48).format='band';
ZONES.find(z=>z.code===48).label=[212.5,22];
export function zoneOf(point){return ZONES.find(z=>z.code===point[6]&&z.code!=null)?.id||'unknown'}
