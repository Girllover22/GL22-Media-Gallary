const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={files:[],view:'home',featured:null,settings:{},current:null,activePreview:null};
const videoExt=new Set(['.mp4','.mkv','.avi','.mov','.wmv','.m4v','.webm','.flv','.ts','.mts','.m2ts','.mpg','.mpeg','.vob','.ogv','.3gp','.asf','.rm','.rmvb','.divx']);
function bytes(n){if(!Number.isFinite(n))return'';const u=['B','KB','MB','GB','TB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return `${n.toFixed(i?1:0)} ${u[i]}`}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function parseSize(x){const m=x.match(/^([<>]=?|=)?([\d.]+)(b|kb|mb|gb|tb)?$/i);if(!m)return null;const mul={b:1,kb:1024,mb:1024**2,gb:1024**3,tb:1024**4}[(m[3]||'b').toLowerCase()];return{op:m[1]||'=',value:+m[2]*mul}}
function queryFiles(files,text){const tokens=text.match(/(?:[^\s"]+:"[^"]*"|"[^"]*"|[^\s]+)/g)||[];return files.filter(f=>tokens.every(raw=>{const t=raw.replace(/^"|"$/g,'');const i=t.indexOf(':');if(i<0)return `${f.name} ${f.folder} ${f.extension}`.toLowerCase().includes(t.toLowerCase());const key=t.slice(0,i).toLowerCase(),val=t.slice(i+1).replace(/^"|"$/g,'');if(key==='type')return f.type===val.replace(/s$/,'');if(key==='ext')return val.split(',').map(x=>'.'+x.replace(/^\./,'').toLowerCase()).includes(f.extension);if(key==='path'||key==='folder')return f.folder.toLowerCase().includes(val.toLowerCase());if(key==='name')return f.name.toLowerCase().includes(val.toLowerCase());if(key==='exact')return f.name.toLowerCase()===val.toLowerCase();if(key==='size'){const q=parseSize(val);if(!q)return true;return q.op==='>'?f.size>q.value:q.op==='<'?f.size<q.value:q.op==='>='?f.size>=q.value:q.op==='<='?f.size<=q.value:f.size===q.value}if(key==='date'){const days=val==='today'?1:val==='yesterday'?2:/^\d+d$/.test(val)?+val.slice(0,-1):0;return days?f.modified>=Date.now()-days*86400000:true}return true}))}
function sorted(files){const v=$('#sort').value;return [...files].sort((a,b)=>v==='oldest'?a.modified-b.modified:v==='az'?a.name.localeCompare(b.name):v==='za'?b.name.localeCompare(a.name):v==='largest'?b.size-a.size:v==='smallest'?a.size-b.size:b.modified-a.modified)}
function visibleFiles(){let f=state.files;if(state.view==='videos')f=f.filter(x=>x.type==='video');if(state.view==='pictures')f=f.filter(x=>x.type==='picture');if(state.view==='recent')f=f.filter(x=>x.added>Date.now()-30*86400000);return sorted(queryFiles(f,$('#search').value.trim()))}
function card(f){const visual=f.type==='picture'?`<img class="thumb" loading="lazy" decoding="async" src="${f.url}">`:`<video class="thumb" preload="none" muted playsinline data-src="${f.url}"></video>`;return `<article class="card" tabindex="0" data-focus-zone="media" data-focusable="true" data-path="${encodeURIComponent(f.path)}">${visual}<div class="card-body"><div class="card-title">${esc(f.name.replace(/\.[^.]+$/,''))}</div><div class="card-meta">${f.type.toUpperCase()} • ${esc(f.extension.slice(1).toUpperCase())} • ${bytes(f.size)}</div></div></article>`}
function row(title,files){if(!files.length)return'';return `<section class="media-section"><div class="section-head"><h3>${title}</h3><span>${files.length.toLocaleString()} items</span></div><div class="row" data-controller-row="true">${files.slice(0,80).map(card).join('')}</div></section>`}
function setHero(f){state.featured=f;const v=$('#hero-video');v.pause();v.removeAttribute('src');v.load();if(!f){$('#hero-title').textContent='Your media. Beautifully organised.';$('#hero-meta').textContent='Add a folder or scan every drive to begin.';$('#hero-play').disabled=true;$('#hero-info').disabled=true;return}$('#hero-title').textContent=f.name.replace(/\.[^.]+$/,'');$('#hero-meta').textContent=`${f.type==='video'?'Video':'Picture'} • ${f.extension.slice(1).toUpperCase()} • ${bytes(f.size)} • Stored locally`;$('#hero-play').disabled=false;$('#hero-info').disabled=false;if(f.type==='video'&&state.settings.autoplayMuted!==false){v.src=f.url;v.muted=true;v.play().catch(()=>{})}else if(f.type==='picture'){v.poster=f.url}}
function render(){const f=visibleFiles();$('#library-count').textContent=`${f.length.toLocaleString()} shown • ${state.files.length.toLocaleString()} indexed`;$('#page-title').textContent=state.view==='home'?'Your Cinema':state.view==='videos'?'All Videos':state.view==='pictures'?'All Pictures':state.view==='recent'?'Recently Added':'Collections';setHero(f[0]||state.files[0]);let html='';if(state.view==='home'&&!$('#search').value){html+=row('Recently Added',sorted(state.files).slice(0,60));html+=row('All Videos',sorted(state.files.filter(x=>x.type==='video')));html+=row('All Pictures',sorted(state.files.filter(x=>x.type==='picture')))}else if(state.view==='collections'){html='<div class="empty-state"><h2>Collections</h2><p>The custom collection builder is the next major system.</p></div>'}else html+=row(state.view==='videos'?'All Videos':state.view==='pictures'?'All Pictures':state.view==='recent'?'Recently Added':'Search Results',f);if(!html)html='<div class="empty-state"><h2>No media found</h2><p>Try another search or scan a drive.</p></div>';$('#results').innerHTML=html;bindCards();ccAssignZones();ccAssignZones();if(controller.connected)setControllerFocus(focusables()[0])}
function stopCardPreview(){const v=state.activePreview;if(!v)return;try{v.pause();v.removeAttribute('src');v.load()}catch{}state.activePreview=null}
function bindCards(){ccAssignZones();
  $$('.row').forEach(row=>{
    row.addEventListener('wheel',e=>{
      if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){
        e.preventDefault();
        row.scrollBy({left:e.deltaY*1.15,behavior:'smooth'});
      }
    },{passive:false});
  });
  $$('.card').forEach(el=>{const f=state.files.find(x=>x.path===decodeURIComponent(el.dataset.path));el.onclick=()=>openMedia(f);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMedia(f)}};el.onmouseenter=()=>{const v=el.querySelector('video');if(v){stopCardPreview();state.activePreview=v;v.src=v.dataset.src;v.muted=true;v.currentTime=4;v.play().catch(()=>{})}};el.onmouseleave=()=>{const v=el.querySelector('video');if(v===state.activePreview)stopCardPreview()};el.oncontextmenu=e=>{e.preventDefault();showDetails(f)}})}
function openMedia(f){if(!f)return;document.querySelectorAll('.controller-focus').forEach(x=>x.classList.remove('controller-focus'));state.current=f;$('#hero-video').pause();$('#player-title').textContent=f.name;$('#player-overlay').classList.remove('hidden');const p=$('#main-player'),img=$('#main-image');if(f.type==='video'){img.classList.add('hidden');p.classList.remove('hidden');p.src=f.url;p.muted=false;p.play().catch(()=>{})}else{p.pause();p.removeAttribute('src');p.load();p.classList.add('hidden');img.classList.remove('hidden');img.src=f.url}}
function closeMedia(){const p=$('#main-player');p.pause();p.removeAttribute('src');p.load();$('#player-overlay').classList.add('hidden');if(controller.connected)setControllerFocus(document.querySelector('.card')||$('#hero-play'));if(state.featured?.type==='video'&&state.settings.autoplayMuted!==false){const v=$('#hero-video');v.src=state.featured.url;v.muted=true;v.play().catch(()=>{})}}
function showDetails(f){state.current=f;$('#details').classList.remove('hidden');$('#details-title').textContent=f.name.replace(/\.[^.]+$/,'');$('#details-meta').textContent=`${f.type} • ${f.extension.slice(1).toUpperCase()} • ${bytes(f.size)} • ${new Date(f.modified).toLocaleString()}`;$('#details-path').textContent=f.path;$('#details-visual').innerHTML=f.type==='picture'?`<img src="${f.url}">`:`<video muted autoplay loop src="${f.url}"></video>`}
function scanUi(d){$('#scan-panel').classList.remove('hidden');$('#stat-folders').textContent=(d.folders||0).toLocaleString();$('#stat-found').textContent=(d.found||0).toLocaleString();$('#stat-videos').textContent=(d.videos||0).toLocaleString();$('#stat-pictures').textContent=(d.pictures||0).toLocaleString();$('#stat-speed').textContent=`${Math.round((d.checked||0)/Math.max(1,(d.elapsed||1)/1000)).toLocaleString()}/s`;$('#stat-time').textContent=`${Math.round((d.elapsed||0)/1000)}s`;$('#scan-current').textContent=d.current||''}
async function startScan(all){$('#scan-panel').classList.remove('hidden');$('#scan-phase').textContent=all?'Scanning every mounted drive':'Scanning selected folders';const r=all?await window.cinemaAPI.scanAllDrives():await window.cinemaAPI.scanFolders();if(!r?.started){$('#scan-phase').textContent=r?.reason==='already-running'?'A scan is already running':'Could not start scan'}}
async function openSettings(){state.settings=await window.cinemaAPI.getSettings();$('#autoplay-setting').checked=state.settings.autoplayMuted!==false;$('#skip-system-setting').checked=state.settings.skipSystemFolders!==false;$('#keep-index-setting').checked=state.settings.keepLightweightIndex!==false;$('#folder-list').innerHTML=(state.settings.libraryFolders||[]).map(x=>`<div>${esc(x)}</div>`).join('')||'<div>No folders added</div>';$('#settings').classList.remove('hidden')}
$$('.nav[data-view]').forEach(b=>b.onclick=()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.view=b.dataset.view;render()});$('#search').oninput=render;$('#sort').onchange=render;$$('.chips button').forEach(b=>b.onclick=()=>{const q=b.dataset.query;if(q==='')$('#search').value='';else $('#search').value=($('#search').value+' '+q).trim()+' ';render();$('#search').focus()});$('#scan-folders').onclick=()=>startScan(false);$('#scan-drives').onclick=()=>startScan(true);$('#cancel-scan').onclick=()=>window.cinemaAPI.cancelScan();$('#hero-play').onclick=()=>openMedia(state.featured);$('#hero-info').onclick=()=>showDetails(state.featured);$('#player-close').onclick=closeMedia;$('#show-folder').onclick=()=>state.current&&window.cinemaAPI.showInFolder(state.current.path);$('#details-close').onclick=()=>$('#details').classList.add('hidden');$('#details-open').onclick=()=>{$('#details').classList.add('hidden');openMedia(state.current)};$('#settings-btn').onclick=openSettings;$('#settings-close').onclick=()=>$('#settings').classList.add('hidden');$('#add-folder').onclick=async()=>{await window.cinemaAPI.selectFolder();openSettings()};$('#save-settings').onclick=async()=>{state.settings=await window.cinemaAPI.getSettings();state.settings.autoplayMuted=$('#autoplay-setting').checked;state.settings.skipSystemFolders=$('#skip-system-setting').checked;state.settings.keepLightweightIndex=$('#keep-index-setting').checked;await window.cinemaAPI.saveSettings(state.settings);$('#settings').classList.add('hidden');render()};window.cinemaAPI.onScanProgress(scanUi);window.cinemaAPI.onScanComplete(async r=>{state.files=await window.cinemaAPI.getLibrary();$('#scan-phase').textContent=r.cancelled?'Scan cancelled':'Scan complete';scanUi(r.stats||{});render();setTimeout(()=>$('#scan-panel').classList.add('hidden'),2500)});window.cinemaAPI.onScanError(e=>{$('#scan-phase').textContent='Scan stopped safely';$('#scan-current').textContent=e.message||'Unknown scanning error'});



const cinemaController = {
  index: null,
  connected: false,
  focused: null,
  lastButtons: [],
  repeatAt: 0,
  initialRepeatDelay: 330,
  repeatDelay: 125,
  deadzone: 0.52,
  heldDirection: null
};

function ccVisible(el) {
  if (!el || el.disabled || el.classList.contains('hidden')) return false;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
}

function ccScope() {
  if (!$('#player-overlay').classList.contains('hidden')) return $('#player-overlay');
  if (!$('#details').classList.contains('hidden')) return $('#details');
  if (!$('#settings').classList.contains('hidden')) return $('#settings');
  return document;
}

function ccElements() {
  return [...ccScope().querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),.card')]
    .filter(ccVisible);
}

function ccAssignZones() {
  document.querySelectorAll('.sidebar .nav').forEach((el,i)=>{
    el.dataset.focusZone='sidebar'; el.dataset.focusIndex=String(i); el.tabIndex=0;
  });
  document.querySelectorAll('.topbar button,.topbar input,.topbar select').forEach((el,i)=>{
    el.dataset.focusZone='topbar'; el.dataset.focusIndex=String(i); el.tabIndex=0;
  });
  document.querySelectorAll('.chips button').forEach((el,i)=>{
    el.dataset.focusZone='chips'; el.dataset.focusIndex=String(i); el.tabIndex=0;
  });
  ['#hero-play','#hero-info'].forEach((selector,i)=>{
    const el=$(selector); if(el){el.dataset.focusZone='hero';el.dataset.focusIndex=String(i);el.tabIndex=0}
  });
  document.querySelectorAll('.row').forEach((row,rowIndex)=>{
    row.dataset.controllerRow='true';
    row.querySelectorAll('.card').forEach((card,colIndex)=>{
      card.dataset.focusZone='media';
      card.dataset.rowIndex=String(rowIndex);
      card.dataset.colIndex=String(colIndex);
      card.tabIndex=0;
    });
  });
  document.querySelectorAll('#player-overlay button,#player-overlay input').forEach((el,i)=>{
    el.dataset.focusZone='player';el.dataset.focusIndex=String(i);el.tabIndex=0;
  });
}

function ccToast(text) {
  const toast=$('#controller-toast'); if(!toast)return;
  toast.textContent=text; toast.classList.add('show');
  clearTimeout(ccToast.timer);
  ccToast.timer=setTimeout(()=>toast.classList.remove('show'),2100);
}

function ccFocus(el) {
  if(!ccVisible(el))return;
  document.querySelectorAll('.controller-focus').forEach(x=>x.classList.remove('controller-focus'));
  cinemaController.focused=el;
  el.classList.add('controller-focus');
  try{el.focus({preventScroll:true})}catch{}
  el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  const row=el.closest('.row');
  if(row){
    const left=el.offsetLeft-(row.clientWidth-el.clientWidth)/2;
    row.scrollTo({left:Math.max(0,left),behavior:'smooth'});
  }
}

function ccZone(zone) {
  return ccElements().filter(el=>el.dataset.focusZone===zone);
}

function ccFocusZone(zone,index=0) {
  const list=ccZone(zone); if(!list.length)return false;
  ccFocus(list[Math.max(0,Math.min(index,list.length-1))]); return true;
}

function ccMediaCard(rowIndex,colIndex) {
  const rows=[...document.querySelectorAll('.row[data-controller-row="true"]')];
  if(!rows.length)return null;
  const row=rows[Math.max(0,Math.min(rowIndex,rows.length-1))];
  const cards=[...row.querySelectorAll('.card')].filter(ccVisible);
  if(!cards.length)return null;
  return cards[Math.max(0,Math.min(colIndex,cards.length-1))];
}

function ccMoveSidebar(dir) {
  const list=ccZone('sidebar');
  const current=Math.max(0,list.indexOf(cinemaController.focused));
  if(dir==='up')ccFocus(list[Math.max(0,current-1)]);
  else if(dir==='down')ccFocus(list[Math.min(list.length-1,current+1)]);
  else if(dir==='right')ccFocusZone('hero',0)||ccFocusZone('topbar',0)||ccFocus(ccMediaCard(0,0));
}

function ccMoveLinear(zone,dir,leftZone,downZone,upZone) {
  const list=ccZone(zone);
  const current=Math.max(0,list.indexOf(cinemaController.focused));
  if(dir==='left'){
    if(current>0)ccFocus(list[current-1]); else if(leftZone)ccFocusZone(leftZone,0);
  } else if(dir==='right'){
    if(current<list.length-1)ccFocus(list[current+1]);
  } else if(dir==='down'){
    if(downZone==='media')ccFocus(ccMediaCard(0,current)||ccMediaCard(0,0));
    else if(downZone)ccFocusZone(downZone,current);
  } else if(dir==='up'&&upZone)ccFocusZone(upZone,current);
}

function ccMoveMedia(dir) {
  const el=cinemaController.focused;
  let row=Number(el?.dataset.rowIndex||0);
  let col=Number(el?.dataset.colIndex||0);
  if(dir==='left'){
    if(col===0){ccFocusZone('sidebar',0);return}
    col--;
  } else if(dir==='right')col++;
  else if(dir==='up'){
    if(row===0){ccFocusZone('hero',Math.min(col,1))||ccFocusZone('chips',0);return}
    row--;
  } else if(dir==='down')row++;
  const target=ccMediaCard(row,col);
  if(target)ccFocus(target);
}

function ccMove(dir) {
  ccAssignZones();
  if(!cinemaController.focused||!ccVisible(cinemaController.focused)){
    ccFocus($('.nav.active')||$('.nav')||$('#hero-play')||ccMediaCard(0,0)||ccElements()[0]);
    return;
  }
  const zone=cinemaController.focused.dataset.focusZone||
    (cinemaController.focused.classList.contains('card')?'media':'');
  if(zone==='sidebar')return ccMoveSidebar(dir);
  if(zone==='topbar')return ccMoveLinear('topbar',dir,'sidebar','chips',null);
  if(zone==='chips')return ccMoveLinear('chips',dir,'sidebar','hero','topbar');
  if(zone==='hero')return ccMoveLinear('hero',dir,'sidebar','media','chips');
  if(zone==='media')return ccMoveMedia(dir);
  if(zone==='player')return ccMoveLinear('player',dir,null,null,null);
  const list=ccElements(),i=Math.max(0,list.indexOf(cinemaController.focused));
  ccFocus(list[Math.max(0,Math.min(list.length-1,i+(dir==='left'||dir==='up'?-1:1)))]);
}

function ccActivate() {
  const el=cinemaController.focused;
  if(!el){ccMove('right');return}
  if(el.tagName==='INPUT'){el.focus();return}
  el.click();
}

function ccBack() {
  if(!$('#player-overlay').classList.contains('hidden')){
    closeMedia(); setTimeout(()=>ccFocus(document.querySelector('.card')||$('#hero-play')),80); return;
  }
  if(!$('#details').classList.contains('hidden')){
    $('#details').classList.add('hidden');setTimeout(()=>ccFocus(document.querySelector('.card')||$('#hero-play')),80);return;
  }
  if(!$('#settings').classList.contains('hidden')){
    $('#settings').classList.add('hidden');setTimeout(()=>ccFocus($('.nav.active')||$('.nav')),80);return;
  }
  ccFocusZone('sidebar',0);
}

function ccInfo() {
  const el=cinemaController.focused;
  if(!el?.classList.contains('card'))return;
  const f=state.files.find(x=>x.path===decodeURIComponent(el.dataset.path||''));
  if(f)showDetails(f);
}

function ccPlayerAction(button) {
  if($('#player-overlay').classList.contains('hidden'))return false;
  const player=$('#full-player'); if(!player)return false;
  if(button===0){player.paused?player.play().catch(()=>{}):player.pause();return true}
  if(button===4){player.currentTime=Math.max(0,player.currentTime-10);return true}
  if(button===5){player.currentTime=Math.min(player.duration||Infinity,player.currentTime+10);return true}
  return false;
}

function ccDirection(gp,now) {
  const x=gp.axes[0]||0,y=gp.axes[1]||0;
  let dir=null;
  if(gp.buttons[12]?.pressed||y<-cinemaController.deadzone)dir='up';
  else if(gp.buttons[13]?.pressed||y>cinemaController.deadzone)dir='down';
  else if(gp.buttons[14]?.pressed||x<-cinemaController.deadzone)dir='left';
  else if(gp.buttons[15]?.pressed||x>cinemaController.deadzone)dir='right';
  if(!dir){cinemaController.heldDirection=null;cinemaController.repeatAt=0;return null}
  if(dir!==cinemaController.heldDirection){
    cinemaController.heldDirection=dir;
    cinemaController.repeatAt=now+cinemaController.initialRepeatDelay;
    return dir;
  }
  if(now>=cinemaController.repeatAt){
    cinemaController.repeatAt=now+cinemaController.repeatDelay;
    return dir;
  }
  return null;
}

function ccEdge(gp,i){return !!gp.buttons[i]?.pressed&&!cinemaController.lastButtons[i]}

window.addEventListener('gamepadconnected',e=>{
  cinemaController.index=e.gamepad.index;cinemaController.connected=true;
  cinemaController.lastButtons=e.gamepad.buttons.map(b=>b.pressed);
  ccAssignZones();ccToast('Controller connected — full navigation enabled');
  setTimeout(()=>ccFocus($('.nav.active')||$('.nav')),120);
});
window.addEventListener('gamepaddisconnected',e=>{
  if(cinemaController.index===e.gamepad.index){
    cinemaController.index=null;cinemaController.connected=false;
    cinemaController.focused?.classList.remove('controller-focus');
    cinemaController.focused=null;ccToast('Controller disconnected');
  }
});

function pollCinemaController(now=performance.now()) {
  const pads=navigator.getGamepads?[...navigator.getGamepads()]:[];
  const gp=cinemaController.index!==null?pads[cinemaController.index]:pads.find(Boolean);
  if(gp){
    if(cinemaController.index===null)cinemaController.index=gp.index;
    const dir=ccDirection(gp,now);if(dir)ccMove(dir);
    if(ccEdge(gp,0)){if(!ccPlayerAction(0))ccActivate()}
    if(ccEdge(gp,1))ccBack();
    if(ccEdge(gp,2))ccInfo();
    if(ccEdge(gp,3)){const s=$('#search');if(s){ccFocus(s);s.focus()}}
    if(ccEdge(gp,4)){if(!ccPlayerAction(4))$('#content-scroll')?.scrollBy({top:-innerHeight*.75,behavior:'smooth'})}
    if(ccEdge(gp,5)){if(!ccPlayerAction(5))$('#content-scroll')?.scrollBy({top:innerHeight*.75,behavior:'smooth'})}
    if(ccEdge(gp,9)){openSettings();setTimeout(()=>ccFocus($('#settings button')||ccElements()[0]),100)}
    cinemaController.lastButtons=gp.buttons.map(b=>b.pressed);
  }
  requestAnimationFrame(pollCinemaController);
}
document.addEventListener('DOMContentLoaded',()=>{ccAssignZones();setTimeout(ccAssignZones,350)});
requestAnimationFrame(pollCinemaController);


window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#player-overlay').classList.contains('hidden'))closeMedia();else{$$('.modal').forEach(x=>x.classList.add('hidden'))}}if(e.key==='F11'){e.preventDefault();window.cinemaAPI.toggleFullscreen()}});
(async()=>{state.settings=await window.cinemaAPI.getSettings();state.files=await window.cinemaAPI.getLibrary();render()})();
