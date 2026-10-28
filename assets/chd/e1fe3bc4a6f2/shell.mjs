import {GROUPS,VIEWS,contextFromUrl,viewHref,mainHref,switchHref,activeSection} from './catalog.mjs?v=unified-e1fe3bc4a6f2';
import navigationStyle from './navigation-style.mjs?v=unified-e1fe3bc4a6f2';

const host=document.getElementById('chd-shell');
const navigation=host.attachShadow({mode:'open'});
while(host.firstChild)navigation.append(host.firstChild);
const componentStyle=document.createElement('style');componentStyle.textContent=navigationStyle;navigation.prepend(componentStyle);
const capabilities=JSON.parse(document.getElementById('chd-capabilities')?.textContent || '{}');
const $=selector=>navigation.querySelector(selector);
let previous={};
try { previous=JSON.parse(sessionStorage.getItem('chd-navigation-context')||'{}'); } catch {}
let context=contextFromUrl(location.href,previous);
const requestedYear=Number(new URL(window.CHD_ENTRY_URL || location.href).searchParams.get('fromSeason')) || null;
let seasonNote;

function text(tag,value,className='') {
  const element=document.createElement(tag);element.textContent=value;
  if(className)element.className=className;return element;
}
function link(label,href,className='') {
  const element=text('a',label,className);element.href=href;return element;
}

function update() {
  context=contextFromUrl(location.href,context);
  if(window.CHD_SHARE && window.TEAM_HUB) {
    const query=window.CHD_SHARE.query(location,window.TEAM_HUB);
    for(const key of ['team','opponent'])if(query.has(key))context.url.searchParams.set(key,query.get(key));
  }
  // Some apps select their latest supported season after reading the URL.
  const seasonControl=document.querySelector('#season-select,#season,#season-end');
  if(!context.year && /^\d{4}$/.test(seasonControl?.value||''))context.year=Number(seasonControl.value);
  try {sessionStorage.setItem('chd-navigation-context',JSON.stringify({competition:context.competition,year:context.year}));}catch{}
  document.documentElement.dataset.chdCompetition=context.competition;
  document.documentElement.dataset.chdScreen=context.url.searchParams.get('screen')||'home';
  const active=activeSection(context);
  $('.chd-wordmark').href=mainHref('home',context);
  navigation.querySelectorAll('[data-section]').forEach(anchor=>{
    anchor.href=mainHref(anchor.dataset.section,context);
    if(active===anchor.dataset.section)anchor.setAttribute('aria-current','page');else anchor.removeAttribute('aria-current');
  });
  navigation.querySelectorAll('[data-competition]').forEach(anchor=>{
    const competition=anchor.dataset.competition;
    anchor.href=switchHref(context,competition,capabilities);
    anchor.setAttribute('aria-current',competition===context.competition?'true':'false');
    anchor.title=context.view&&!context.view.paths[competition]?`Browse ${competition==='women'?"women's":"men's"} studies`:`Explore ${competition==='women'?"women's":"men's"} hockey`;
  });
  const crumbs=$('.chd-location'), tabs=$('.chd-study-tabs');
  crumbs.replaceChildren();tabs.replaceChildren();
  if(context.view) {
    const group=GROUPS.find(group=>group.id===context.view.group);
    crumbs.append(link('Explore',mainHref('explore',context)),text('span','/'),link(group.title,mainHref('explore',context)+'#'+group.id));
    VIEWS.filter(view=>view.group===group.id&&view.paths[context.competition]).forEach(view=>{
      const anchor=link(view.title,viewHref(view.id,context,capabilities));
      if(view.id===context.view.id)anchor.setAttribute('aria-current','page');tabs.append(anchor);
    });
  }
  crumbs.hidden=!context.view;tabs.hidden=!context.view;
  const title=document.querySelector('[data-chd-page-title]');
  if(title && context.view)title.textContent=context.view.title;
  const status=document.querySelector('[data-chd-context]');
  if(status) {
    const bits=[context.competition==='women'?"Women's hockey":"Men's D1"];
    if(context.range)bits.push('Selected season range');
    else if(context.year)bits.push(`${context.year}–${String((context.year+1)%100).padStart(2,'0')}`);
    if(context.view?.source)bits.push(context.view.source);
    if(context.view?.research)bits.push('Exploratory study');
    status.textContent=bits.join(' · ');
  }
  if(requestedYear && context.year && requestedYear!==context.year) {
    if(!seasonNote) {
      seasonNote=text('p','','chd-context-note');seasonNote.setAttribute('role','status');host.after(seasonNote);
    }
    const label=year=>`${year}–${String((year+1)%100).padStart(2,'0')}`;
    seasonNote.textContent=`${label(requestedYear)} is not available in this view. Showing ${label(context.year)}.`;
  }
  document.querySelectorAll('.chd-explore-topics a').forEach(anchor=>{
    const group=anchor.hash.slice(1);
    anchor.hidden=!VIEWS.some(view=>view.group===group&&view.paths[context.competition]);
  });
  document.dispatchEvent(new CustomEvent('chd:context',{detail:{competition:context.competition,year:context.year}}));
}

function closeMenu(returnFocus=false) {
  host.classList.remove('is-open');$('.chd-menu-toggle').setAttribute('aria-expanded','false');
  if(returnFocus)$('.chd-menu-toggle').focus();
}
$('.chd-menu-toggle').addEventListener('click',()=>{
  const open=!host.classList.contains('is-open');host.classList.toggle('is-open',open);
  $('.chd-menu-toggle').setAttribute('aria-expanded',String(open));
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&host.classList.contains('is-open'))closeMenu(true);});
document.addEventListener('pointerdown',event=>{if(!host.contains(event.target))closeMenu();});
navigation.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href]');if(!anchor)return;
  const url=new URL(anchor.href,location.href);
  if(['collegehockeydata.com','www.collegehockeydata.com'].includes(url.hostname))anchor.href=url.pathname+url.search+url.hash;
},true);
matchMedia('(min-width: 901px)').addEventListener('change',event=>{if(event.matches)closeMenu();});

// Existing application state remains the owner of each analytical view.
// Notify the shared shell when those applications update their URLs.
for(const method of ['replaceState','pushState']) {
  const original=history[method].bind(history);
  history[method]=function(...args){const result=original(...args);queueMicrotask(update);return result;};
}
window.addEventListener('popstate',update);
window.addEventListener('hashchange',update);
document.addEventListener('change',event=>{if(event.target.matches('select'))queueMicrotask(update);});

// Keep the legacy hooks in the document: apps still own these menu elements.
// Their chrome is replaced by the shared shell, without changing chart code.
document.querySelectorAll('body > header:not(#chd-shell),body > .site-nav,body > .review').forEach(element=>element.classList.add('chd-legacy-chrome'));
document.querySelectorAll('body > footer:not(.chd-footer)').forEach(element=>element.classList.add('chd-legacy-chrome'));

// Move live coverage labels, rather than hiding their useful data with a hero.
const liveLabels=document.querySelector('[data-chd-live-labels]');
if(liveLabels) {
  const labels=['hero-season','hero-status','hero-coverage','headline-season','headline-count'];
  if(context.view?.id==='graphics')labels.push('snapshot');
  for(const id of labels) {
    const element=document.getElementById(id);if(element)liveLabels.append(element);
  }
}
update();

if(document.getElementById('chd-explore')) {
  const root=document.getElementById('chd-explore');
  function renderExplore() {
    root.replaceChildren();
    GROUPS.forEach((group,index)=>{
      const views=VIEWS.filter(view=>view.group===group.id&&view.paths[context.competition]);
      if(!views.length)return;
      const section=document.createElement('section');section.className='chd-study-group';section.id=group.id;
      const heading=document.createElement('div');heading.className='chd-group-heading';
      heading.append(text('span',String(index+1).padStart(2,'0'),'chd-number'),text('h2',group.title),text('p',group.description));
      const grid=document.createElement('div');grid.className='chd-study-grid';
      views.forEach(view=>{
        const card=link('',viewHref(view.id,context,capabilities),'chd-study-card');
        card.append(text('span',view.research?'Research':view.source||'Interactive study','chd-card-label'),text('h3',view.title),text('p',view.summary),text('span','Explore →','chd-card-action'));
        grid.append(card);
      });
      section.append(heading,grid);root.append(section);
    });
    const count=VIEWS.filter(view=>view.paths[context.competition]).length;
    document.querySelector('[data-chd-study-count]').textContent=`${count} studies · ${context.competition==='women'?"women's hockey":"men's hockey"}`;
  }
  renderExplore();
  document.addEventListener('chd:context',renderExplore);
}
