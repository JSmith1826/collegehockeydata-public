// Continuous, color-vision-friendly ramps. Shared by fills and the legend.
// Viridis / Cividis sampled at equal intervals; darker means more throughout.
const TERRITORY_PALETTES = {
  viridis:{label:'Viridis',colors:['#fde725','#addc30','#5ec962','#28ae80','#21918c','#2c728e','#3b528b','#472d7b','#440154']},
  cividis:{label:'Cividis',colors:['#fee838','#c8b866','#918b78','#575d6d','#00224e']},
  inferno:{label:'Inferno',colors:['#fcffa4','#f7d13d','#fb9b06','#ed6925','#cf4446','#a52c60','#781c6d','#4a0c6b','#1b0c41','#000004']},
  grayscale:{label:'Grayscale',colors:['#f4f4f0','#bec2bd','#818b85','#46574e','#1e2a24']},
};
const NO_TERRITORY_DATA='#e1e5e3';
const ZERO_TERRITORY='#f6f8f5';
const clamp=t=>Math.max(0,Math.min(1,t));
function interpolate(colors,t){
  const at=clamp(t)*(colors.length-1),i=Math.min(colors.length-2,Math.floor(at)),u=at-i;
  const rgb=hex=>hex.match(/\w\w/g).map(c=>parseInt(c,16));
  const a=rgb(colors[i]),b=rgb(colors[i+1]);
  return '#'+a.map((v,j)=>Math.round(v+(b[j]-v)*u).toString(16).padStart(2,'0')).join('');
}
function territoryScale(values,{signed=false,percentage=false,root=false}={}){
  const finite=values.filter(Number.isFinite),bound=Math.max(0,...finite.map(Math.abs))||1;
  return {min:signed?-bound:0,max:percentage?100:bound,signed,root:root&&!signed&&!percentage};
}
function territoryColor(value,scale,palette='viridis'){
  if(!Number.isFinite(value))return NO_TERRITORY_DATA;
  const colors=(TERRITORY_PALETTES[palette]||TERRITORY_PALETTES.viridis).colors;
  if(value===0&&!(scale.signed&&palette==='grayscale'))return ZERO_TERRITORY;
  if(scale.signed){
    if(palette==='grayscale')return interpolate(colors,(value-scale.min)/(scale.max-scale.min));
    // Same sign convention for both color palettes: amber negative, blue positive.
    return interpolate(value<0?['#f6f8f5','#d8b365','#8c510a']:['#f6f8f5','#67a9cf','#2166ac'],Math.abs(value)/scale.max);
  }
  const t=clamp(value/scale.max);
  return interpolate(colors,scale.root?Math.sqrt(t):t);
}
function scaleValue(t,scale){
  return scale.signed?scale.min+t*(scale.max-scale.min):scale.max*(scale.root?t*t:t);
}
function territoryGradient(scale,palette){
  // Sample the actual function, including its nonlinear normalization.
  return 'linear-gradient(90deg,'+Array.from({length:101},(_,i)=>territoryColor(scaleValue(i/100,scale),scale,palette)+' '+i+'%').join(',')+')';
}
