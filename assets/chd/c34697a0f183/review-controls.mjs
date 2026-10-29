import {ZONES,GOAL_LINE,BLUE_LINE,faceoffMarkings} from './area-geometry.mjs';

// The retained chart engine owns filtering, values, exports and URL state.
// These controls call its existing inputs instead of maintaining a second model.
function installOverlap() {
  const markers = document.querySelector('#marker-style');
  if (!markers || document.querySelector('#logo-overlap')) return;
  const label = document.createElement('label');label.className='chd-overlap-control';
  const input=document.createElement('input');input.type='checkbox';input.id='logo-overlap';
  input.checked=globalThis.CHD_ALLOW_LOGO_OVERLAP===false;
  label.append(input,document.createTextNode('Separate logos'));
  label.title='Separate crowded logos with lines to their exact values. Turn off for the overlapping layout. Applies to every logo view and PNG exports.';
  markers.closest('label').after(label);
  input.addEventListener('change',()=>{
    globalThis.CHD_ALLOW_LOGO_OVERLAP=!input.checked;
    try{localStorage.setItem('chd-logo-overlap',String(!input.checked));localStorage.setItem('chd-logo-placement',input.checked?'separate':'overlap');}catch{}
    markers.dispatchEvent(new Event('change',{bubbles:true}));
  });
}

function installAreaPicker() {
  const select=document.querySelector('#location-region');
  if (!select || document.querySelector('#chd-area-picker') || !select.options.length) return;
  const section=document.createElement('section');section.id='chd-area-picker';section.className='chd-area-picker';
  section.innerHTML='<div><h2>Where does a team create its edge?</h2><p>Choose a part of the rink, then compare attempts created and allowed per mapped game. Change the outcome to compare shots on net or goals.</p><div class="chd-area-buttons" role="group" aria-label="Shot-origin area"></div><p class="chd-area-definition" aria-live="polite"></p></div><div class="chd-area-rink"></div>';
  const geometry=ZONES.filter(z=>z.code),ns='http://www.w3.org/2000/svg';
  const rink=document.createElementNS(ns,'svg');rink.setAttribute('viewBox','-3 -3 431 506');rink.setAttribute('aria-label','Choose a source-coded area, attacking end at the top');
  rink.innerHTML='<rect x="0" y="0" width="425" height="500" rx="45" fill="#e9efe7"/>'+geometry.map(z=>`<path data-area="${z.code===41?'front':z.id}" d="${z.path}"/>`).join('')+`<g fill="none" stroke="#7d9b92" pointer-events="none">${faceoffMarkings()}<path d="M0 ${GOAL_LINE*10}H425M0 ${BLUE_LINE*10}H425"/></g>`;
  section.querySelector('.chd-area-rink').append(rink);
  const choose=id=>{select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));};
  for(const zone of geometry){
    const id=zone.code===41?'front':zone.id,button=document.createElement('button');
    button.type='button';button.dataset.area=id;button.textContent=zone.name;
    button.addEventListener('click',()=>choose(id));section.querySelector('.chd-area-buttons').append(button);
    const path=rink.querySelector(`[data-area="${id}"]`);path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',zone.name);
    path.addEventListener('click',()=>choose(id));path.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();choose(id);}});
  }
  const sync=()=>{
    section.querySelectorAll('[data-area]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.area===select.value)));
    const zone=geometry.find(z=>(z.code===41?'front':z.id)===select.value);
    section.querySelector('.chd-area-definition').textContent=zone?`${zone.name} · ${zone.description}`:'';
  };
  select.addEventListener('change',sync);sync();
  document.querySelector('#location-controls').before(section);
  // Keep the native select as an accessible alternative, inside advanced controls.
  select.closest('label').classList.add('chd-area-select');
}

function install(){installOverlap();installAreaPicker();}
install();
// Zone options arrive after the retained engine initializes. Observe once,
// then disconnect as soon as all applicable controls have been installed.
const observer=new MutationObserver(()=>{
  install();
  if((!document.querySelector('#marker-style')||document.querySelector('#logo-overlap'))&&(!document.querySelector('#location-region')||document.querySelector('#chd-area-picker')))observer.disconnect();
});
observer.observe(document.body,{childList:true,subtree:true});
