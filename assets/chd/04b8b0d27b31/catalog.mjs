// One navigation model for the local site. IDs are analytical destinations,
// not copies of an app for each entry point or competition.
export const MAIN_LINKS = [
  {id:'home',title:'Home',href:'/?screen=home'},
  {id:'teams',title:'Teams',href:'/?screen=team'},
  {id:'compare',title:'Compare',href:'/?screen=matchup'},
  {id:'atlas',title:'Player Atlas',href:'/explorers/player-atlas/'},
  {id:'explore',title:'Explore',href:'/explore/'},
];
export const INFORMATION_LINKS = [
  {title:'About',href:'/about/'},
  {title:'Contact',href:'/contact/'},
  {title:'Support the work',href:'/about/#support-title'},
];

export const GROUPS = [
  {id:'performance', title:'Team performance', description:'Results, scoring, shots, and the flow of a season.'},
  {id:'shooting', title:'Shooting', description:'Where attempts begin, where they finish, and how teams compare.'},
  {id:'conferences', title:'Conference races', description:'Standings progress and head-to-head results.'},
  {id:'rosters', title:'Rosters & origins', description:'Roster construction, recruiting geography, and player pathways.'},
];

export const VIEWS = [
  {id:'performance', group:'performance', title:'Team performance', summary:'Compare scoring, shots, special teams, and season paths.', paths:{men:'/explorers/team-stats/',women:'/women/team-stats/'}, season:'season'},
  {id:'control', group:'performance', title:'Game control', summary:'Time leading, tied, and trailing, with score-state timelines.', paths:{men:'/explorers/game-control/',women:'/women/game-control/'}, season:'season'},
  {id:'shots', group:'shooting', title:'Shot & net maps', summary:'Explore shot origins, net placements, and linked goal scorers.', paths:{men:'/shot-maps/'}, season:'season', source:'Hudl Instat'},
  {id:'areas', group:'shooting', title:'Shot-area balance', summary:'Choose an area on the rink to compare what teams create and allow.', paths:{men:'/explorers/shot-locations/'}, season:'season'},
  {id:'historical-shots', group:'shooting', title:'CHN shot-map archive', summary:'Explore retained CHN shot locations with their original coverage.', paths:{men:'/archive/shot-maps/'}, season:'season', source:'CHN archive'},
  {id:'graphics', group:'shooting', title:'Matchup graphics', summary:'Compose roster and shooting graphics for a matchup.', paths:{men:'/matchup-preview/'}},
  {id:'race', group:'conferences', title:'Conference race', summary:'Follow each team by conference games played. Replay any recorded date.', paths:{men:'/explorers/conference-race/',women:'/women/conference-race/'}, season:'season'},
  {id:'head-to-head', group:'conferences', title:'Conference head-to-head', summary:'Compare conference matchups, results, and scoring margins.', paths:{men:'/explorers/conference-matchups/',women:'/explorers/conference-matchups/'}, season:'season'},
  {id:'atlas', group:'rosters', title:'Player Atlas', summary:'Explore hometowns, recruiting footprints, and geographic production.', paths:{men:'/explorers/player-atlas/',women:'/women/player-atlas/'}, season:'range'},
  {id:'origins', group:'rosters', title:'Roster origins', summary:'Compare the previous leagues represented on each roster.', paths:{men:'/explorers/roster-origins/'}, season:'season'},
  {id:'returning', group:'rosters', title:'Returning production', summary:'Returning, incoming, and departed production on the same scale.', paths:{men:'/explorers/preseason-production/'}, season:'season'},
  {id:'pathways', group:'rosters', title:'Production by prior league', summary:'Same-season production and roster shares by reported prior league.', paths:{men:'/explorers/origin-production/'}, season:'season'},
  {id:'draft', group:'rosters', title:'Draft history', summary:'NHL draft selections on recorded college rosters.', paths:{men:'/explorers/draft-history/'}, season:'season'},
  {id:'experience', group:'rosters', title:'Age & experience', summary:'Roster age, class, and prior college experience.', paths:{men:'/explorers/age-experience/'}, season:'season'},
];

const positiveYear = value => /^\d{4}$/.test(value || '') ? Number(value) : null;
const cleanPath = path => path === '/' ? '/' : path.replace(/index\.html$/, '').replace(/\/$/, '') + '/';

export function contextFromUrl(input, previous = {}) {
  const url = new URL(input, 'http://localhost');
  const explicit = url.searchParams.get('competition');
  const pathWomen = /^\/(women|womens)(\/|$)/.test(url.pathname);
  const view = VIEWS.find(view => Object.values(view.paths).some(path => cleanPath(path) === cleanPath(url.pathname)));
  const menOnly = view && !view.paths.women;
  const neutral = ['/about/','/contact/','/data-status/','/explore/','/studies.html/'].includes(cleanPath(url.pathname));
  const sharedScreen=/^\/teams\/[^/]+\/$/.test(url.pathname)?'team':/^\/matchup\/[^/]+\/$/.test(url.pathname)?'matchup':null;
  if(sharedScreen)url.searchParams.set('screen',sharedScreen);
  const competition = pathWomen || explicit === 'women' && !menOnly ? 'women' : explicit === 'men' || menOnly || !neutral ? 'men' : previous.competition || 'men';
  const from = positiveYear(url.searchParams.get('from')), to = positiveYear(url.searchParams.get('to'));
  const range = from && to && from !== to;
  const year = positiveYear(url.searchParams.get('year')) || positiveYear(url.searchParams.get('season')) || (!range && (to || from)) || (neutral ? previous.year : null) || null;
  return {competition,year,range,url,view};
}

export function viewHref(id, context = {}, capabilities = {}) {
  const view = VIEWS.find(view => view.id === id);
  if (!view) throw new Error(`Unknown study: ${id}`);
  const competition = context.competition || 'men', path = view.paths[competition];
  if (!path) return null;
  const url = new URL(path, 'http://localhost');
  // App team IDs and metric keys are not interchangeable. Only compatible
  // competition/season context crosses between studies.
  url.searchParams.set('competition', competition);
  const allowed = capabilities[id]?.[competition];
  let year = context.year && (!allowed || allowed.includes(context.year)) ? context.year : null;
  if(id==='historical-shots' && capabilities.shots?.men?.length) {
    const current=Math.max(...capabilities.shots.men);
    if(!year || year>=current)year=allowed?.filter(year=>year<current).at(-1) || null;
  }
  if(context.year && !year && allowed && !allowed.includes(context.year))url.searchParams.set('fromSeason',context.year);
  if (view.season === 'range' && context.range && context.url) {
    for (const key of ['from','to'])url.searchParams.set(key,context.url.searchParams.get(key));
  } else if (year && view.season === 'range') {
    url.searchParams.set('from',year);url.searchParams.set('to',year);
  } else if (year && view.season) url.searchParams.set(view.season,year);
  return url.pathname + url.search;
}

export function mainHref(id, context = {}) {
  const women = context.competition === 'women';
  if (id === 'atlas') return viewHref('atlas',context);
  if (id === 'explore') {
    const params=new URLSearchParams();if(women)params.set('competition','women');if(context.year)params.set('season',context.year);
    return '/explore/' + (params.size?'?'+params:'');
  }
  if (women) {
    if (id === 'home') return '/womens/';
    if (id === 'teams') return '/womens/#program-heading';
    if (id === 'compare') return viewHref('performance', context);
  }
  const url = new URL('/', 'http://localhost');
  url.searchParams.set('screen', {home:'home',teams:'team',compare:'matchup'}[id] || 'home');
  if ([2025,2026].includes(context.year)) url.searchParams.set('year',context.year);
  else if(context.year)url.searchParams.set('fromSeason',context.year);
  // Root team IDs are safe only for transitions within this same application.
  if (context.url && (context.url.pathname==='/' || /^\/(teams|matchup)\/[^/]+\/$/.test(context.url.pathname))) {
    for (const key of ['team','teamName','opponent']) {
      const value=context.url.searchParams.get(key);if(value)url.searchParams.set(key,value);
    }
  }
  return url.pathname + url.search;
}

export function switchHref(context, competition, capabilities = {}) {
  if (context.view) return viewHref(context.view.id,{...context,competition},capabilities) || mainHref('explore',{competition});
  const path=cleanPath(context.url.pathname);
  if (path==='/explore/' || path==='/studies.html/') return mainHref('explore',{competition});
  if (['/about/','/contact/','/data-status/'].includes(path)) return path+'?competition='+competition;
  const screen=context.url.searchParams.get('screen');
  return mainHref(screen==='team'?'teams':screen==='matchup'?'compare':'home',{...context,competition});
}

export function activeSection(context) {
  if(context.view?.id==='atlas')return 'atlas';
  if(context.view || /^\/(explore|studies)/.test(context.url.pathname))return 'explore';
  if(context.url.pathname.startsWith('/explorers/'))return 'explore';
  if(context.url.pathname==='/' || /^\/(teams|matchup)\/[^/]+\/$/.test(context.url.pathname))return {team:'teams',matchup:'compare'}[context.url.searchParams.get('screen')] || 'home';
  return context.url.pathname.startsWith('/womens')?(context.url.hash==='#program-heading'?'teams':'home'):null;
}
