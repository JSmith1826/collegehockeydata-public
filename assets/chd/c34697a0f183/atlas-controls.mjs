// Reuse the Atlas engine's actual controls and state; moving them preserves
// its calculations, URL handling, async-load guard, exports and map camera.
const frame=document.querySelector('#atlas-section');
const workspace=document.querySelector('.workspace');
if(frame&&workspace&&!frame.classList.contains('chd-atlas-experience')) {
  frame.classList.add('chd-atlas-experience');
  const heading=frame.querySelector('.atlas-heading');
  const toolbar=document.createElement('div');toolbar.className='chd-atlas-toolbar';
  const filters=document.createElement('details');filters.className='chd-atlas-filters';
  const summary=document.createElement('summary');summary.textContent='Filters & range';
  const panel=document.createElement('div');panel.className='chd-atlas-filter-panel';panel.id='chd-atlas-filter-panel';
  summary.setAttribute('aria-controls',panel.id);filters.append(summary,panel);
  workspace.querySelector('.section-head').hidden=true;
  workspace.setAttribute('aria-label','Map filters and season range');
  const endpoint=document.querySelector('#season-end-value').closest('.season-endpoint');
  endpoint.classList.add('chd-atlas-season');
  const select=document.createElement('select');select.id='atlas-season';select.setAttribute('aria-label','Roster season');select.disabled=true;
  const stepper=endpoint.querySelector('.season-stepper');
  stepper.insertBefore(select,document.querySelector('#season-end-value'));
  document.querySelector('#season-end-value').classList.add('chd-atlas-sr-only');
  const previous=document.querySelector('#season-end-down'),next=document.querySelector('#season-end-up');
  previous.textContent='‹';next.textContent='›';
  previous.setAttribute('aria-label','Previous season');next.setAttribute('aria-label','Next season');
  const moveField=id=>{const label=document.getElementById(id).closest('label');label.classList.add('chd-atlas-field');toolbar.append(label);};
  toolbar.append(endpoint);moveField('program');moveField('metric');toolbar.append(filters);
  const fullscreen=document.querySelector('#fullscreen-map');fullscreen.classList.add('chd-atlas-fullscreen');toolbar.append(fullscreen);
  const modes=workspace.querySelector('.view-switcher');modes.classList.add('chd-atlas-modes');
  const count=document.querySelector('#filter-summary');count.classList.add('chd-atlas-count');
  panel.append(workspace);
  const tools=document.createElement('div');tools.className='chd-atlas-map-tools';
  tools.append(frame.querySelector('.map-actions'));panel.append(tools);
  heading.after(toolbar,modes,count);
  const range=document.querySelector('#season-end');
  const rangeLabel=document.querySelector('#season-range-label');
  const context=document.createElement('span');context.className='chd-atlas-range-context';context.setAttribute('aria-live','polite');toolbar.append(context);
  let seasons=[];
  function sync(){
    select.value=range.value;select.disabled=!seasons.length||range.disabled;
    const ranged=document.querySelector('[data-time-mode=range]').getAttribute('aria-pressed')==='true';
    select.setAttribute('aria-label',ranged?'Last season in selected range':'Roster season');
    const message=ranged?rangeLabel.textContent:seasons.length===1?'One roster season available':'';
    if(context.textContent!==message)context.textContent=message;
    context.hidden=!message;
  }
  select.addEventListener('change',()=>{
    range.value=select.value;
    range.dispatchEvent(new Event('input',{bubbles:true}));
    range.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const observer=new MutationObserver(sync);
  observer.observe(range,{attributes:true,attributeFilter:['min','max','disabled']});
  observer.observe(rangeLabel,{childList:true,characterData:true,subtree:true});
  observer.observe(document.querySelector('[data-time-mode=range]'),{attributes:true,attributeFilter:['aria-pressed']});
  const women=new URLSearchParams(location.search).get('competition')==='women'||/^\/women\//.test(location.pathname);
  fetch(new URL('data/'+(women?'women/':'')+'index.json',location.href)).then(response=>{
    if(!response.ok)throw new Error('Season list unavailable');return response.json();
  }).then(index=>{
    seasons=index.seasons.slice().sort((a,b)=>a.start-b.start);
    select.replaceChildren(...seasons.map(s=>new Option(s.label,String(s.start))));sync();
  }).catch(()=>{select.replaceChildren(new Option('Seasons unavailable',''));});
  document.addEventListener('pointerdown',event=>{if(!filters.contains(event.target))filters.open=false;});
  // The Fullscreen API owns Escape while fullscreen; normal disclosure keys
  // remain native, and all filters live inside the element it fullscreened.
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
