// CHN display coordinates, not calibrated feet or an expected-goals model.
import {GOAL_LINE,BLUE_LINE,DOT_LEFT,DOT_RIGHT,DOT_DEPTH,CIRCLE_DEPTH_RADIUS} from './rink-geometry.mjs?v=c4c8c5d94363';
export {GOAL_LINE,BLUE_LINE,DOT_LEFT,DOT_RIGHT,DOT_DEPTH,CIRCLE_DEPTH_RADIUS,CIRCLE_LATERAL_RADIUS,RINK_GEOMETRY_VERSION} from './rink-geometry.mjs?v=c4c8c5d94363';
// Preserve the reviewed custom S1/crease/center-point design scale. It is
// independent of the source circles and must not be described as measured feet.
export const DESIGN_REFERENCE_RADIUS=75,DESIGN_PIXELS_PER_FOOT=DESIGN_REFERENCE_RADIUS/15;
// Compatibility for cached consumers of the earlier synthetic circle design.
export const CIRCLE_RADIUS=DESIGN_REFERENCE_RADIUS;
export const POINT_START=DOT_DEPTH+CIRCLE_DEPTH_RADIUS;
export const CREASE_HALF_WIDTH=4*DESIGN_PIXELS_PER_FOOT;
export const CREASE_LEFT=50-CREASE_HALF_WIDTH/4.25,CREASE_RIGHT=100-CREASE_LEFT;
export const PRIME_RADIUS_FEET=15;
export const CENTER_POINT_HALF_WIDTH=8*DESIGN_PIXELS_PER_FOOT;
export const CENTER_POINT_LEFT=50-CENTER_POINT_HALF_WIDTH/4.25,CENTER_POINT_RIGHT=100-CENTER_POINT_LEFT;
export const zonePath=vertices=>{
  const area=vertices.reduce((a,[x,y],i)=>{const [u,v]=vertices[(i+1)%vertices.length];return a+x*v-u*y;},0);
  return (area<0?[...vertices].reverse():vertices).map(([l,d],i)=>`${i?'L':'M'}${l*4.25} ${d*10}`).join('')+'Z';
};
const rectangle=(a,b,c,d)=>zonePath([[a,c],[b,c],[b,d],[a,d]]);
// Full S1 + S2 + S3 home plate: crease edges -> dots -> circle tops.
export const SCORING_AREA=[[CREASE_LEFT,GOAL_LINE],[CREASE_RIGHT,GOAL_LINE],[DOT_RIGHT,DOT_DEPTH],[DOT_RIGHT,POINT_START],[DOT_LEFT,POINT_START],[DOT_LEFT,DOT_DEPTH]];
// Connected dot-to-dot arch, reviewed against both available seasons. A broad
// crown holds the central scoring space; steeper shoulders meet the dots. This
// is one fixed geography, not a fitted goal-probability contour. Its central
// rise leaves a visible S3 bridge all the way across the top of the home plate.
export const SECONDARY_RISE=4.2,SECONDARY_SHOULDER=.65;
export function secondaryDepth(lateral){
  const u=Math.min(1,Math.abs((lateral-50)/((DOT_RIGHT-DOT_LEFT)/2)));
  return DOT_DEPTH+SECONDARY_RISE*(1-u*u)*(1+SECONDARY_SHOULDER*u*u);
}
export const SECONDARY_BOUNDARY=Array.from({length:129},(_,i)=>{
  const lateral=DOT_RIGHT+(DOT_LEFT-DOT_RIGHT)*i/128;
  return [lateral,secondaryDepth(lateral)];
});
export const SECONDARY_AREA=[[CREASE_LEFT,GOAL_LINE],[CREASE_RIGHT,GOAL_LINE],...SECONDARY_BOUNDARY];
export function primeArea(radiusFeet=PRIME_RADIUS_FEET){
  const radius=radiusFeet*DESIGN_PIXELS_PER_FOOT;
  const slope=((DOT_RIGHT-50)*4.25-CREASE_HALF_WIDTH)/((DOT_DEPTH-GOAL_LINE)*10);
  // Meet the actual home-plate sides: the thin framing strips belong to S1.
  // The goal-centered circular front remains a cap, not a complete half-disc.
  const base=CREASE_HALF_WIDTH;
  const y=(-base*slope+Math.sqrt((1+slope*slope)*radius*radius-base*base))/(1+slope*slope);
  const angle=Math.atan2(y,base+slope*y);
  return [[CREASE_LEFT,GOAL_LINE],[CREASE_RIGHT,GOAL_LINE],...Array.from({length:65},(_,i)=>{
    const theta=angle+(Math.PI-2*angle)*i/64;
    return [50+radius*Math.cos(theta)/4.25,GOAL_LINE+radius*Math.sin(theta)/10];
  })];
}
export const PRIME_AREA=primeArea();
const creaseRadius=6*DESIGN_PIXELS_PER_FOOT;
const creaseAngle=Math.acos(CREASE_HALF_WIDTH/creaseRadius);
export const CREASE_PATH=zonePath([[CREASE_LEFT,GOAL_LINE],[CREASE_RIGHT,GOAL_LINE],...Array.from({length:33},(_,i)=>{
  const theta=creaseAngle+(Math.PI-2*creaseAngle)*i/32;
  return [50+creaseRadius*Math.cos(theta)/4.25,GOAL_LINE+creaseRadius*Math.sin(theta)/10];
})]);
// One horizontal split per flank, halfway from the near circle edge to its
// center. Rounded source coordinates make tiny angular wedges unhelpful.
export const TIGHT_FRONT=DOT_DEPTH-CIRCLE_DEPTH_RADIUS/2;
export const LOW_WING_REAR_ANGLE_DEGREES=5;
// Rear edges leave the crease-edge origins and run 5 degrees behind the goal
// line to their respective boards, measured in the displayed SVG geometry.
const rearSlope=4.25/10*Math.tan(LOW_WING_REAR_ANGLE_DEGREES*Math.PI/180);
export const lowWingRearDepth=lateral=>GOAL_LINE-Math.max(0,Math.abs(lateral-50)-CREASE_HALF_WIDTH/4.25)*rearSlope;
export const TIGHT_REAR=lowWingRearDepth(0);
const flankFraction=(TIGHT_FRONT-GOAL_LINE)/(DOT_DEPTH-GOAL_LINE);
export const TIGHT_LEFT=CREASE_LEFT+(DOT_LEFT-CREASE_LEFT)*flankFraction,TIGHT_RIGHT=100-TIGHT_LEFT;
export const tightArea=right=>right?
  [[CREASE_RIGHT,GOAL_LINE],[100,TIGHT_REAR],[100,TIGHT_FRONT],[TIGHT_RIGHT,TIGHT_FRONT]]:
  [[0,TIGHT_REAR],[CREASE_LEFT,GOAL_LINE],[TIGHT_LEFT,TIGHT_FRONT],[0,TIGHT_FRONT]];
// Kept for older diagram consumers; the zones no longer need wedge cutouts.
export const FLANK_CLIP=rectangle(0,100,0,50);
export const ZONES=[
  {id:'behind',name:'Behind the net',short:'Behind net',path:zonePath([[0,0],[100,0],[100,TIGHT_REAR],[CREASE_RIGHT,GOAL_LINE],[CREASE_LEFT,GOAL_LINE],[0,TIGHT_REAR]]),label:[212.5,30],description:'Rear ice beyond the two straight low-wing edges, plus the central space directly behind the net. Each edge runs from a crease-edge origin to the boards at 5 degrees behind the goal line in the displayed geometry.'},
  {id:'front',name:'Score 1 · Net-front prime',short:'S1 · Prime',path:zonePath(PRIME_AREA),label:[212.5,136],format:'central',description:'A net-front circular cap with a nominal 15-foot radius from the goal center, extending to the home-plate sides. The thin framing strips are part of prime. The radius uses a separate fixed design scale; it is not the measured source faceoff-circle radius, and archived locations are not calibrated feet. This is geography, not an expected-goals estimate.'},
  {id:'slot',name:'Score 2 · Scoring area',short:'S2 · Scoring area',path:zonePath(SECONDARY_AREA)+zonePath(PRIME_AREA),label:[212.5,203],format:'central',description:'The middle scoring tier lies outside S1 and inside a broad, gently flattened arch from faceoff dot to faceoff dot. The symmetric curve was reviewed against the recorded locations in both available seasons and stays fixed across teams and filters. It describes geography, not scoring probability.'},
  {id:'outer-slot',name:'Score 3 · Outer slot',short:'S3 · Outer slot',path:zonePath(SCORING_AREA)+zonePath(SECONDARY_AREA),label:[212.5,251],format:'band',description:'One connected outer-slot band completes the home plate beyond the S2 dot-to-dot arch, reaching the top of the faceoff circles and all three point areas. The central bridge joins both shoulders; S2 never cuts through to Center Point. S1, S2 and S3 partition the home plate once.'},
  ...[false,true].map(right=>({id:`${right?'right':'left'}-tight`,name:`${right?'Right':'Left'} low wing / tight angle`,short:`${right?'R':'L'} low wing`,path:zonePath(tightArea(right)),label:[right?379:46,126],format:'point',description:'A broad low-wing area outside the home plate, ending halfway between the near edge and center of the faceoff circle. Its rear edge is a straight line from the crease-edge scoring origin to the boards, 5 degrees behind the goal line in the displayed geometry. A geographic low-wing grouping, not a strict shot-angle threshold.'})),
  ...[false,true].map(right=>{
    const vertices=right?[[TIGHT_RIGHT,TIGHT_FRONT],[100,TIGHT_FRONT],[100,POINT_START],[DOT_RIGHT,POINT_START],[DOT_RIGHT,DOT_DEPTH]]:[[0,TIGHT_FRONT],[TIGHT_LEFT,TIGHT_FRONT],[DOT_LEFT,DOT_DEPTH],[DOT_LEFT,POINT_START],[0,POINT_START]];
    return {id:`${right?'right':'left'}-wing`,name:`${right?'Right':'Left'} upper wing`,short:`${right?'R':'L'} upper wing`,path:zonePath(vertices),label:[right?379:46,224],format:'point',description:`The ${right?'right':'left'} upper wing outside the home plate, between the low-wing band and the point. Shares one horizontal boundary with the low wing. Left and right refer to the displayed rink.`};
  }),
  ...[['left',0,CENTER_POINT_LEFT],['center',CENTER_POINT_LEFT,CENTER_POINT_RIGHT],['right',CENTER_POINT_RIGHT,100]].map(([side,a,b])=>({id:`point-${side}`,name:`${side[0].toUpperCase()+side.slice(1)} point`,short:`${side==='center'?'C':side[0].toUpperCase()+side.slice(1)} point`,path:rectangle(a,b,POINT_START,BLUE_LINE),label:[(a+b)/2*4.25,296],format:'point',description:'The band from the circle edge toward the blue line to the blue line itself. Center point is a narrow central lane, about 19% of the displayed width; left and right occupy the wider flanks. Positions describe attempt origins, not observed puck movement or measured danger.'})),
  {id:'outside',name:'Beyond source blue line',short:'Beyond source blue line',description:'Origins at or beyond the blue line drawn on CHN’s rink background (33.33% of its length). This source-display classification has not been independently calibrated to physical rink markings or game video.',path:rectangle(0,100,BLUE_LINE,50),label:[212.5,398]},
];
export function inPolygon(vertices,depth,lateral){
  let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
    const [x,y]=vertices[i],[a,b]=vertices[j];
    if(Math.abs((lateral-x)*(b-y)-(depth-y)*(a-x))<1e-9&&lateral>=Math.min(x,a)&&lateral<=Math.max(x,a)&&depth>=Math.min(y,b)&&depth<=Math.max(y,b))return true;
    if((y>depth)!==(b>depth)&&lateral<(a-x)*(depth-y)/(b-y)+x)inside=!inside;
  }
  return inside;
}
export const inScoringArea=(d,l)=>inPolygon(SCORING_AREA,d,l);
export function zoneOf(point){
  const d=point[2],l=point[3];
  if(d<GOAL_LINE){
    if(d>=lowWingRearDepth(l)&&(l<CREASE_LEFT||l>CREASE_RIGHT))return l<50?'left-tight':'right-tight';
    return 'behind';
  }
  if(d>=BLUE_LINE)return 'outside';
  if(d>=POINT_START)return `point-${l<CENTER_POINT_LEFT?'left':l<CENTER_POINT_RIGHT?'center':'right'}`;
  if(inPolygon(PRIME_AREA,d,l))return 'front';
  if(inPolygon(SECONDARY_AREA,d,l))return 'slot';
  if(inScoringArea(d,l))return 'outer-slot';
  if(d<TIGHT_FRONT)return l<50?'left-tight':'right-tight';
  return l<50?'left-wing':'right-wing';
}
