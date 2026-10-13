import {outcomeGroups} from './model.mjs?v=157209627a34';

// The popup belongs to its source rink; its geographic highlight spans both.
// Keep hover classes separate from the user's persistent area selection.
export function highlightMatchingZones(root,zone=null){
  root.querySelectorAll('.zone-hit[data-zone]').forEach(path=>{
    path.classList.toggle('zone-hovered',zone!==null&&path.dataset.zone===zone);
  });
}

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function tooltipMarkup({heading,context,counts,note,areaDetails=false}){
  const total=counts.reduce((sum,n)=>sum+n,0),fmt=n=>n.toLocaleString('en-US');
  const row=(item,child=false)=>`<div class="${child?'tooltip-child':'tooltip-primary'}" data-outcome="${item.id}"><dt><i style="background:${item.color}"></i>${item.name}</dt><dd class="tooltip-share">${total?(100*item.count/total).toFixed(1)+'%':'\u2014'}</dd><dd class="tooltip-count">${fmt(item.count)}<span class="sr-only"> attempts</span></dd></div>`;
  const groups=outcomeGroups(counts).map(item=>row(item)+item.children.map(child=>row(child,true)).join('')).join('');
  return `<div class="tooltip-actions"><span>Pinned</span><button type="button" class="tooltip-close" aria-label="Close area details">Close \u00d7</button></div><h4>${escape(heading)}</h4><p class="tooltip-context">${escape(context)}</p><div class="tooltip-columns" aria-hidden="true"><span>Outcome</span><span>Share</span><span>Count</span></div><dl>${groups}</dl><p class="tooltip-note">${escape(note)}. Shares use all attempts.</p>${areaDetails?'<a class="tooltip-details" href="#area-section">Goal &amp; scorer details \u2193</a>':''}`;
}

// Shared desktop hover timing and placement, independent of the shot data.
export function createTooltipIntent({isOpen,close,isActive,isPinned,isSuppressed,isConnected,
  setTimer=setTimeout,clearTimer=clearTimeout,openDelay=160,switchDelay=200,closeDelay=300}){
  let opening=null,closing=null,pending=null;
  const cancelOpen=()=>{if(opening!==null)clearTimer(opening);opening=null;pending=null;};
  const cancelClose=()=>{if(closing!==null)clearTimer(closing);closing=null;};
  const queueClose=()=>{
    if(isPinned())return;
    cancelClose();closing=setTimer(()=>{closing=null;if(!isPinned())close();},closeDelay);
  };
  return {
    enter(target,show,immediate=false){
      if(isPinned()||isSuppressed(target))return;
      cancelClose();cancelOpen();
      if(isActive(target))return;
      if(immediate){show();return;}
      pending=target;
      opening=setTimer(()=>{
        opening=null;pending=null;
        if(isConnected(target)&&!isPinned()&&!isSuppressed(target))show();
      },isOpen()?switchDelay:openDelay);
    },
    leave(target,keepOpen=false){
      if(pending===target)cancelOpen();
      if(!keepOpen&&isOpen())queueClose();
    },
    enterPanel(){cancelOpen();cancelClose();},
    leavePanel(keepOpen=false){if(!keepOpen)queueClose();},
    cancel(){cancelOpen();cancelClose();},
    pendingTarget(){return pending;},
  };
}

export function tooltipPosition({anchor,obstacles=[],pointer,width,height,viewportWidth,viewportHeight,gap=12,padding=12}){
  const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
  const w=Math.min(width,Math.max(0,viewportWidth-2*padding));
  const h=Math.min(height,Math.max(0,viewportHeight-2*padding));
  const y=clamp(anchor.top,padding,viewportHeight-padding-Math.min(300,viewportHeight-2*padding));
  const sideHeight=Math.min(h,Math.max(0,viewportHeight-padding-y));
  const clear=p=>!obstacles.some(r=>p.x<r.right+4&&p.x+w>r.left-4&&p.y<r.bottom+4&&p.y+p.maxHeight>r.top-4);
  // Dock beside the whole rink: moving between its areas does not move the card.
  const right={x:anchor.right+gap,y,maxHeight:sideHeight},left={x:anchor.left-gap-w,y,maxHeight:sideHeight};
  if(right.x+w<=viewportWidth-padding&&clear(right))return right;
  if(left.x>=padding&&clear(left))return left;
  const above=Math.max(0,anchor.top-gap-padding);
  const below=Math.max(0,viewportHeight-padding-anchor.bottom-gap);
  const minimum=Math.min(h,120);
  if(Math.max(above,below)>=minimum){
    const useBelow=below>=minimum,maxHeight=Math.min(h,useBelow?below:above);
    const position={x:clamp(anchor.left,padding,viewportWidth-padding-w),
      y:useBelow?anchor.bottom+gap:anchor.top-gap-maxHeight,maxHeight};
    if(clear(position))return position;
  }
  // If one rink is taller, use space beyond both rather than covering the
  // comparison rink. Smaller windows can scroll the compact summary.
  if(obstacles.length){
    const top=Math.min(...obstacles.map(r=>r.top)),bottom=Math.max(...obstacles.map(r=>r.bottom));
    const slots=[{space:viewportHeight-padding-bottom-gap,y:bottom+gap},
      {space:top-gap-padding,y:null}];
    for(const slot of slots)if(slot.space>=minimum){
      const maxHeight=Math.min(h,slot.space),position={x:clamp(anchor.left,padding,viewportWidth-padding-w),y:slot.y??top-gap-maxHeight,maxHeight};
      if(clear(position))return position;
    }
  }
  // A cramped window may have no clear side. Leave space around the pointer
  // and scroll the card's contents instead of clamping the card over it.
  const px=clamp(pointer?.clientX??(anchor.left+anchor.right)/2,padding,viewportWidth-padding);
  const py=clamp(pointer?.clientY??(anchor.top+anchor.bottom)/2,padding,viewportHeight-padding);
  const x=clamp(px+gap+w<=viewportWidth-padding?px+gap:px-gap-w,padding,viewportWidth-padding-w);
  const roomBelow=Math.max(0,viewportHeight-padding-py-gap),roomAbove=Math.max(0,py-gap-padding);
  const useBelow=roomBelow>=roomAbove,maxHeight=Math.min(h,useBelow?roomBelow:roomAbove);
  return {x,y:useBelow?py+gap:py-gap-maxHeight,maxHeight};
}
