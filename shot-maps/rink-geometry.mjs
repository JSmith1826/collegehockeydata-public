// Hudl Instat NHL field type 2: metres, both attacking shot maps toward +x.
// Display percentages cover the full 60.96 x 25.91 m template.
export const RINK_GEOMETRY_VERSION='instat-nhl-metres-2026-10-22';
export const SOURCE_RINK={length:60.96,width:25.91,goal:3.3528,blue:22.86};
export const GOAL_LINE=5.5,BLUE_LINE=37.5,DOT_DEPTH=15.5;
export const DOT_LEFT=6.2484/25.91*100,DOT_RIGHT=100-DOT_LEFT;
export const CIRCLE_DEPTH_RADIUS=7.5,CIRCLE_LATERAL_RADIUS=4.572/25.91*100;
export function faceoffMarkings({dotRadius=3.5}={}){return [DOT_LEFT,DOT_RIGHT].map(l=>{const x=l*4.25,y=DOT_DEPTH*10;return `<ellipse cx="${x}" cy="${y}" rx="${CIRCLE_LATERAL_RADIUS*4.25}" ry="${CIRCLE_DEPTH_RADIUS*10}"/><circle cx="${x}" cy="${y}" r="${dotRadius}" fill="currentColor" stroke="none"/>`}).join('')}
