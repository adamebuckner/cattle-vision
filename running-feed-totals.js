(function(){
if(window.__cvRunningFeedTotalsInstalled)return;
window.__cvRunningFeedTotalsInstalled=true;
const ANIMAL_KEY='cv2-animal-cost-events';
const PASTURE_KEY='cv2-pasture-cost-events';
const FEED_RE=/feed|hay|grain|corn|mineral|supplement|stuffer/i;
const money=v=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v)||0);
const readArray=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const year=()=>new Date().getFullYear();
const inYear=(x,y=year())=>String(x?.date||x?.eventDate||'').slice(0,4)===String(y);
const isFeed=x=>FEED_RE.test(`${x?.category||''} ${x?.item||''} ${x?.description||''}`);
const animalEvents=()=>readArray(ANIMAL_KEY);
const pastureEvents=()=>readArray(PASTURE_KEY);
function animalFeedYtd(animalId,y=year()){
  return animalEvents().filter(x=>String(x.animalId)===String(animalId)&&inYear(x,y)&&isFeed(x)).reduce((s,x)=>s+(Number(x.amount)||0),0);
}
function pastureFeedRows(name,y=year()){
  const n=String(name||'').trim().toLowerCase();
  return pastureEvents().filter(x=>String(x.pastureName||'').trim().toLowerCase()===n&&inYear(x,y)&&isFeed(x));
}
function pastureStats(name,y=year()){
  const rows=pastureFeedRows(name,y),total=rows.reduce((s,x)=>s+(Number(x.totalCost)||0),0);
  const sourceIds=new Set(rows.map(x=>String(x.id||'')).filter(Boolean));
  const allocations=animalEvents().filter(x=>sourceIds.has(String(x.sourceId||''))&&inYear(x,y)&&isFeed(x));
  const animals=new Set(allocations.map(x=>String(x.animalId||'')).filter(Boolean));
  const allocated=allocations.reduce((s,x)=>s+(Number(x.amount)||0),0);
  return{total,animalCount:animals.size,average:animals.size?allocated/animals.size:0};
}
function idFromCard(el){
  const raw=el?.getAttribute('onclick')||'';
  const m=raw.match(/openRecord\(['\"]([^'\"]+)['\"]\)/);
  return m?m[1]:'';
}
function ensureStyle(){
  if(document.getElementById('cvRunningFeedStyle'))return;
  const s=document.createElement('style');s.id='cvRunningFeedStyle';
  s.textContent='.cv-feed-ytd-chip{font-weight:850}.cv-feed-ytd-line{margin-top:5px;font-size:12px;font-weight:800}.cv-ytd-feed-banner{margin:10px 0;padding:11px 12px;border:1px solid rgba(23,102,49,.22);border-radius:11px;background:rgba(238,243,233,.72);font-size:13px}.cv-ytd-feed-banner b{font-size:15px}.cv-dashboard-feed{margin-top:3px;font-size:11px;font-weight:800}.cv-ytd-feed-card{order:-1}';
  document.head.appendChild(s);
}
function decorateHerd(){
  const y=year();
  document.querySelectorAll('.animal').forEach(card=>{
    const aid=idFromCard(card);if(!aid)return;
    const total=animalFeedYtd(aid,y),chips=card.querySelector('.chips');if(!chips)return;
    let chip=chips.querySelector('.cv-feed-ytd-chip');
    if(total<=0){chip?.remove();return}
    if(!chip){chip=document.createElement('span');chip.className='chip cv-feed-ytd-chip';chips.appendChild(chip)}
    chip.textContent=`${y} Feed ${money(total)}`;
  });
}
function decorateAnimalRecord(){
  const host=document.getElementById('econAnimalRecordBox');if(!host)return;
  let aid='';try{if(typeof currentId!=='undefined')aid=String(currentId||'')}catch{}
  if(!aid)return;
  const grid=host.querySelector('.econ-mini-grid');if(!grid)return;
  const total=animalFeedYtd(aid),y=year();
  let box=grid.querySelector('.cv-ytd-feed-mini');
  if(!box){box=document.createElement('div');box.className='econ-mini cv-ytd-feed-mini';grid.insertBefore(box,grid.firstChild)}
  box.innerHTML=`<span>${y} Feed YTD</span><b>${money(total)}</b>`;
}
function decorateDashboard(){
  const y=year();
  document.querySelectorAll('.econ-animal-row').forEach(row=>{
    const aid=idFromCard(row);if(!aid)return;
    const total=animalFeedYtd(aid,y),left=row.firstElementChild;if(!left)return;
    let line=left.querySelector('.cv-dashboard-feed');
    if(!line){line=document.createElement('div');line.className='cv-dashboard-feed';left.appendChild(line)}
    line.textContent=`${y} feed YTD: ${money(total)}`;
  });
}
function decoratePastureCards(){
  const y=year();
  document.querySelectorAll('.pasture-card').forEach(card=>{
    const name=card.querySelector('.pasture-card-head strong')?.textContent?.trim();if(!name)return;
    const stats=pastureStats(name,y),head=card.querySelector('.pasture-card-head>div');if(!head)return;
    let line=head.querySelector('.cv-feed-ytd-line');
    if(!line){line=document.createElement('div');line.className='cv-feed-ytd-line';head.appendChild(line)}
    line.innerHTML=`<b>${y} feed YTD: ${money(stats.total)}</b>${stats.animalCount?` • ${money(stats.average)} avg / animal fed`:''}`;
  });
}
function currentPastureName(){
  const title=document.getElementById('pcTitle')?.textContent||'';
  return title.replace(/\s+[—-]\s+Costs.*$/,'').trim();
}
function decoratePastureModal(){
  const host=document.getElementById('pcSummary');if(!host)return;
  const name=currentPastureName();if(!name)return;
  const stats=pastureStats(name),y=year();
  let banner=document.getElementById('cvPastureYtdFeedBanner');
  if(!banner){banner=document.createElement('div');banner.id='cvPastureYtdFeedBanner';banner.className='cv-ytd-feed-banner';host.insertAdjacentElement('beforebegin',banner)}
  banner.innerHTML=`<b>${y} running feed total: ${money(stats.total)}</b>${stats.animalCount?`<br>${stats.animalCount} animal${stats.animalCount===1?'':'s'} received feed • ${money(stats.average)} average per animal`:''}<br><span class="muted">Each feeding stays in the history below; this number keeps adding through the year.</span>`;
}
function decorateLedger(){
  const host=document.getElementById('pcLedgerSummary');if(!host)return;
  const y=year(),rows=pastureEvents().filter(x=>inYear(x,y)&&isFeed(x)),total=rows.reduce((s,x)=>s+(Number(x.totalCost)||0),0);
  let card=document.getElementById('cvFeedYtdLedgerCard');
  if(!card){card=document.createElement('div');card.id='cvFeedYtdLedgerCard';card.className='pc-summary-card cv-ytd-feed-card';host.insertBefore(card,host.firstChild)}
  card.innerHTML=`<span>${y} Feed Running Total</span><b>${money(total)}</b><small>${rows.length} feeding entr${rows.length===1?'y':'ies'} counted</small>`;
  document.querySelectorAll('.pc-pasture-row').forEach(row=>{
    const name=row.querySelector('b')?.textContent?.trim(),span=row.querySelector('span');if(!name||!span)return;
    const stats=pastureStats(name,y);
    let ytd=row.querySelector('.cv-feed-ytd-line');
    if(!ytd){ytd=document.createElement('div');ytd.className='cv-feed-ytd-line';span.insertAdjacentElement('afterend',ytd)}
    ytd.textContent=`${y} feed YTD: ${money(stats.total)}${stats.animalCount?` • ${money(stats.average)} avg / animal fed`:''}`;
  });
}
function decorateAll(){ensureStyle();decorateHerd();decorateAnimalRecord();decorateDashboard();decoratePastureCards();decoratePastureModal();decorateLedger()}
function wrap(name,after){
  const fn=window[name];if(typeof fn!=='function'||fn.__cvFeedYtd)return;
  const wrapped=async function(){const out=await fn.apply(this,arguments);try{after()}catch(e){console.warn('Feed YTD display refresh failed',e)}return out};
  Object.assign(wrapped,fn);wrapped.__cvFeedYtd=true;window[name]=wrapped;
}
wrap('render',()=>setTimeout(decorateHerd,0));
wrap('openRecord',()=>setTimeout(decorateAnimalRecord,0));
wrap('openRanchEconomics',()=>setTimeout(decorateDashboard,0));
wrap('openPastures',()=>setTimeout(decoratePastureCards,0));
wrap('openPastureCosts',()=>setTimeout(()=>{decoratePastureModal();decoratePastureCards()},0));
wrap('openPastureCostLedger',()=>setTimeout(decorateLedger,0));
const oldRefresh=window.cvRefreshPastureCosts;if(typeof oldRefresh==='function'&&!oldRefresh.__cvFeedYtd){const refresh=function(){const out=oldRefresh.apply(this,arguments);setTimeout(()=>{decoratePastureCards();decoratePastureModal();decorateLedger()},0);return out};refresh.__cvFeedYtd=true;window.cvRefreshPastureCosts=refresh}
['cv-finance-restored','cv-pasture-cost-restored','cv-finance-changed','cv-pasture-cost-changed'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(decorateAll,0)));
setTimeout(decorateAll,0);
})();
