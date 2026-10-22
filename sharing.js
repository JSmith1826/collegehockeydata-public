(function(){
  'use strict';
  const page=document.querySelector('#page'),model=window.CHD_SHARE,data=window.TEAM_HUB;
  if(!page||!model||!data)return;
  const current=()=>model.query(location,data);
  const link=()=>new URL(model.address(current(),data),location.origin).href;
  function title(){const p=current(),a=data.teams[p.get('team')]?.name,b=data.teams[p.get('opponent')]?.name;return p.get('screen')==='matchup'?a+' vs '+b+' | College Hockey Data':a+' | College Hockey Data';}
  function manualCopy(url){
    let dialog=document.querySelector('#page-share-dialog');
    if(!dialog){
      dialog=document.createElement('dialog');dialog.id='page-share-dialog';dialog.className='page-share-dialog';dialog.setAttribute('aria-labelledby','page-share-dialog-title');
      dialog.innerHTML='<h2 id="page-share-dialog-title">Copy this page link</h2><p>Select the link below and copy it.</p><label>Page link<input readonly type="url"></label><button type="button">Close</button>';
      document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
    }
    dialog.querySelector('input').value=url;dialog.showModal();dialog.querySelector('input').select();
  }
  function mount(){
    const p=current(),heading=page.querySelector('.sheet-title');
    if(!['team','matchup'].includes(p.get('screen'))||!heading||heading.querySelector('.page-share'))return;
    const controls=document.createElement('div');controls.className='page-share';controls.setAttribute('role','group');controls.setAttribute('aria-label','Share this page');
    controls.innerHTML='<button type="button" data-copy-page>Copy link</button>'+(typeof navigator.share==='function'?'<button type="button" data-share-page>Share…</button>':'')+'<span role="status" aria-live="polite"></span>';
    heading.append(controls);
    const status=controls.querySelector('[role=status]');
    controls.querySelector('[data-copy-page]').onclick=async()=>{
      try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(link());status.textContent='Link copied';}
      catch{status.textContent='Select and copy the link';manualCopy(link());}
    };
    const share=controls.querySelector('[data-share-page]');
    if(share)share.onclick=async()=>{try{await navigator.share({title:title(),url:link()});status.textContent='';}catch(e){if(e.name!=='AbortError')manualCopy(link());}};
  }
  // The root base URL keeps shared-route assets and ordinary links valid.
  // Section anchors remain on the current team or matchup rather than /#….
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]');
    if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const hash=a.getAttribute('href'),target=document.getElementById(hash.slice(1));
    if(!target)return;e.preventDefault();history.replaceState(null,'',location.pathname+location.search+hash);target.scrollIntoView({behavior:'instant'});
  });
  new MutationObserver(mount).observe(page,{childList:true});mount();
})();
