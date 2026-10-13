const logoImages=new Map();

export function exportLogoFile(data,spec) {
  const file=data.teams.find(team=>String(team.id)===String(spec.team))?.logo;
  return /^[a-z0-9_.-]+\.png$/i.test(file||'') ? file : null;
}

export async function loadExportLogo(file) {
  if(!file)return null;
  if(!logoImages.has(file))logoImages.set(file,new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);
    image.src=`../assets/logos/${encodeURIComponent(file)}`;
  }));
  return logoImages.get(file);
}

export function drawExportLogo(context,image,name,x,y,size=96) {
  if(image){
    const scale=Math.min(size/image.naturalWidth,size/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    context.drawImage(image,x+(size-w)/2,y+(size-h)/2,w,h);
  }else {
    context.save();context.fillStyle='#18453b';context.font='bold 30px Trebuchet MS';context.textAlign='center';
    context.fillText(name.split(/\s+/).map(word=>word[0]).join('').slice(0,3),x+size/2,y+size*.62);context.restore();
  }
}

export function webExportLayout(width=1800) {
  const pad=54,gap=44,panelWidth=(width-2*pad-gap)/2;
  return {width,pad,gap,panelWidth,mapHeight:panelWidth*507/431,xs:[pad,pad+panelWidth+gap]};
}
