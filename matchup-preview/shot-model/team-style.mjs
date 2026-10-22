// Existing project team colors, normalized for punctuation and spacing.
// Michigan Blue corrected to #00274c per the U-M February 2025 brand guide.
export const TEAM_COLORS={
  "airforce": [
    "#003087",
    "#8a8d8f"
  ],
  "alaska": [
    "#236192",
    "#ffcd00"
  ],
  "alaskaanchorage": [
    "#00583d",
    "#ffc425"
  ],
  "americanintl": [
    "#000000",
    "#ffb60f"
  ],
  "arizonastate": [
    "#8c1d40",
    "#ffc627"
  ],
  "army": [
    "#d4bf91",
    "#b2b4b3"
  ],
  "augustana": [
    "#004b8d",
    "#ffdd00"
  ],
  "bemidjistate": [
    "#004d44",
    "#d4d67c"
  ],
  "bentley": [
    "#1b5faa",
    "#88898a"
  ],
  "bostoncollege": [
    "#98002e",
    "#bc9b6a"
  ],
  "bostonuniversity": [
    "#cc0000",
    "#a3011b"
  ],
  "bowlinggreen": [
    "#fe5000",
    "#4f2c1d"
  ],
  "brown": [
    "#4e3629",
    "#7c2529"
  ],
  "canisius": [
    "#0c2340",
    "#ffba00"
  ],
  "clarkson": [
    "#0d433b",
    "#fac922"
  ],
  "colgate": [
    "#821019",
    "#e10028"
  ],
  "coloradocollege": [
    "#000000",
    "#f2af36"
  ],
  "connecticut": [
    "#000e2f",
    "#ffffff"
  ],
  "cornell": [
    "#b31b1b",
    "#5e3920"
  ],
  "dartmouth": [
    "#046a38",
    "#000000"
  ],
  "denver": [
    "#8b233b",
    "#8b6f4b"
  ],
  "ferrisstate": [
    "#ba0c2f",
    "#fcc917"
  ],
  "harvard": [
    "#a41034",
    "#000000"
  ],
  "holycross": [
    "#602d89",
    "#ffffff"
  ],
  "lakesuperior": [
    "#003f87",
    "#ffc61e"
  ],
  "lindenwood": [
    "#B5A36A",
    "#101820"
  ],
  "longisland": [
    "#69b3e7",
    "#ffc72c"
  ],
  "maine": [
    "#003263",
    "#B0D7FF"
  ],
  "masslowell": [
    "#003da5",
    "#c8102e"
  ],
  "massachusetts": [
    "#971b2f",
    "#FFFFFF"
  ],
  "mercyhurst": [
    "#07594d",
    "#182752"
  ],
  "merrimack": [
    "#003768",
    "#fdb813"
  ],
  "miami": [
    "#b61e2e",
    "#000000"
  ],
  "michigan": [
    "#00274c",
    "#ffcb05"
  ],
  "michiganstate": [
    "#18453b",
    "#ffffff"
  ],
  "michigantech": [
    "#000000",
    "#ffcd00"
  ],
  "minnesota": [
    "#7a0019",
    "#ffcc33"
  ],
  "minnesotaduluth": [
    "#8e0a26",
    "#fab937"
  ],
  "minnesotastate": [
    "#480059",
    "#f7e400"
  ],
  "newhampshire": [
    "#041e42",
    "#bbbcbc"
  ],
  "niagara": [
    "#582c83",
    "#ffffff"
  ],
  "northdakota": [
    "#009a44",
    "#aaaead"
  ],
  "northeastern": [
    "#000000",
    "#e50000"
  ],
  "northernmichigan": [
    "#095339",
    "#ffc425"
  ],
  "notredame": [
    "#0c2340",
    "#c99700"
  ],
  "ohiostate": [
    "#bb0000",
    "#666666"
  ],
  "omaha": [
    "#000000",
    "#d71920"
  ],
  "pennstate": [
    "#001E44",
    "#ffffff"
  ],
  "princeton": [
    "#ff671f",
    "#000000"
  ],
  "providence": [
    "#8a8d8f",
    "#000000"
  ],
  "quinnipiac": [
    "#0c2340",
    "#ffb81c"
  ],
  "rensselaer": [
    "#232020",
    "#ffffff"
  ],
  "rit": [
    "#f76902",
    "#ffffff"
  ],
  "robertmorris": [
    "#14234b",
    "#a6192e"
  ],
  "sacredheart": [
    "#ce1141",
    "#b1b3b6"
  ],
  "stcloudstate": [
    "#a10209",
    "#000000"
  ],
  "stlawrence": [
    "#654134",
    "#e7d1a0"
  ],
  "stthomas": [
    "#512773",
    "#98999b"
  ],
  "stonehill": [
    "#2F2975",
    "#ffffff"
  ],
  "union": [
    "#9a0000",
    "#ffffff"
  ],
  "vermont": [
    "#154734",
    "#8b5b29"
  ],
  "westernmichigan": [
    "#6c4023",
    "#b5a167"
  ],
  "wisconsin": [
    "#c5050c",
    "#ffffff"
  ],
  "yale": [
    "#00356b",
    "#ffffff"
  ]
};

TEAM_COLORS.lakesuperiorstate=TEAM_COLORS.lakesuperior;
TEAM_COLORS.rpi=TEAM_COLORS.rensselaer;
const valid=c=>/^#[0-9a-f]{6}$/i.test(c);
export const normalizeTeam=name=>String(name??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function mix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}
export function luminance(color){
  const c=[1,3,5].map(i=>{const v=parseInt(color.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function teamStyle(team){
  const supplied=team?.colors;
  const mapped=TEAM_COLORS[normalizeTeam(team?.name)];
  const colors=Array.isArray(supplied)&&supplied.length>=2&&supplied.slice(0,2).every(valid)?supplied:mapped;
  const [primary,secondary]=colors||['#344957','#d8e1e6'];
  const base=mix(primary,'#080f17',.68);
  let panel=mix(primary,'#080f17',.5);
  while(contrast('#f6f8f5',panel)<7)panel=mix(panel,'#080f17',.12);
  let accent=secondary;
  for(let i=0;contrast(accent,panel)<4.5&&i<12;i++)accent=mix(accent,'#ffffff',.16);
  const mid=mix(primary,'#ffffff',.3);
  return {known:!!colors,primary,secondary,base,panel,accent,text:'#f6f8f5',muted:mix('#ffffff',panel,.22),
    palette:{stops:[[0,base],[.08,mix(base,primary,.55)],[.25,mid],[.45,'#96cb45'],[.62,'#f3dc5d'],[.8,'#f39943'],[1,'#f25545']],
      lightStops:[[0,mix(primary,'#ffffff',.97)],[.08,mix(primary,'#ffffff',.9)],[.25,mix(primary,'#ffffff',.64)],[.45,primary],[.62,mix(primary,'#080f17',.2)],[.8,'#d8b640'],[1,'#bb4334']]}};
}
