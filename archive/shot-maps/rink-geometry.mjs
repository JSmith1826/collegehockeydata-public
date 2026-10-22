// Measured CHN background landmarks, in its 1200 x 600 image coordinate space.
// These describe the source display, not independently calibrated physical ice.
export const RINK_GEOMETRY_VERSION='chn-display-2026-10-13';
export const SOURCE_RINK={length:1200,width:600,goal:110,blue:400,dotDepth:240,dotLateral:144,circleRadius:75};
export const GOAL_LINE=SOURCE_RINK.goal/SOURCE_RINK.length*100;
export const BLUE_LINE=SOURCE_RINK.blue/SOURCE_RINK.length*100;
export const DOT_DEPTH=SOURCE_RINK.dotDepth/SOURCE_RINK.length*100;
export const DOT_LEFT=SOURCE_RINK.dotLateral/SOURCE_RINK.width*100,DOT_RIGHT=100-DOT_LEFT;
export const CIRCLE_DEPTH_RADIUS=SOURCE_RINK.circleRadius/SOURCE_RINK.length*100;
export const CIRCLE_LATERAL_RADIUS=SOURCE_RINK.circleRadius/SOURCE_RINK.width*100;

// Source circles become ellipses when rotated/resized into our 425 x 1000 view.
// Use the same length/lateral transforms as the shot dots.
export function faceoffMarkings({dotRadius=3.5}={}) {
  return [DOT_LEFT,DOT_RIGHT].map(l=>{
    const x=l*4.25,y=DOT_DEPTH*10,rx=CIRCLE_LATERAL_RADIUS*4.25,ry=CIRCLE_DEPTH_RADIUS*10;
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><circle cx="${x}" cy="${y}" r="${dotRadius}" fill="currentColor" stroke="none"/><path d="M${x-17} ${y-11}H${x-7}M${x+7} ${y-11}H${x+17}M${x-17} ${y+11}H${x-7}M${x+7} ${y+11}H${x+17}"/>`;
  }).join('');
}
