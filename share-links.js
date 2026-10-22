(function(root){
  'use strict';
  const defaults={context:'shots',metric:'goals',group:'class',minimum:'1',ice:'heatmap',peers:'all',net:'onnet',years:'5',pace:'pct',basis:'games'};
  const cache=new WeakMap();
  function catalog(data){
    if(cache.has(data))return cache.get(data);
    const ids=new Map(),slugs=new Map();
    for(const id of Object.keys(data.seasons['2026'].teams)){
      const name=data.teams[id].name,slug=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      if(slugs.has(slug))throw new Error('Ambiguous team sharing slug');
      const team={id:String(id),name,slug};ids.set(String(id),team);slugs.set(slug,team);
    }
    const result={ids,slugs};cache.set(data,result);return result;
  }
  function route(pathname,data){
    const {slugs}=catalog(data),team=/^\/teams\/([a-z0-9-]+)\/$/.exec(pathname),match=/^\/matchup\/([a-z0-9-]+)-vs-([a-z0-9-]+)\/$/.exec(pathname);
    if(team&&slugs.has(team[1]))return {screen:'team',team:slugs.get(team[1]).id};
    if(match&&slugs.has(match[1])&&slugs.has(match[2])&&match[1]!==match[2])return {screen:'matchup',team:slugs.get(match[1]).id,opponent:slugs.get(match[2]).id};
    return null;
  }
  function query(location,data){
    const params=new URLSearchParams(location.search),r=route(location.pathname,data);
    if(r)for(const [k,v] of Object.entries(r))params.set(k,v);
    return params;
  }
  function address(params,data,hash=''){
    const {ids}=catalog(data),first=ids.get(params.get('team')),second=ids.get(params.get('opponent')),screen=params.get('screen');
    let path;
    if(screen==='team'&&first)path='/teams/'+first.slug+'/';
    else if(screen==='matchup'&&first&&second&&first.id!==second.id)path='/matchup/'+first.slug+'-vs-'+second.slug+'/';
    else return '/'+(params.size?'?'+params.toString():'')+hash;
    const clean=new URLSearchParams({year:params.get('year')==='2025'?'2025':'2026'});
    for(const [key,value] of Object.entries(defaults))if(params.has(key)&&params.get(key)!==value)clean.set(key,params.get(key));
    return path+'?'+clean+hash;
  }
  const api=Object.freeze({catalog,route,query,address});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CHD_SHARE=api;
})(typeof window==='object'?window:globalThis);
