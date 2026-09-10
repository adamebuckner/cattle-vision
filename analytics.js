(function(){
if(window.__cvAnalyticsInstalled)return;window.__cvAnalyticsInstalled=true;
const URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
const KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
const VISITOR_KEY='cv2-anon-visitor-id';
const SESSION_KEY='cv2-analytics-session-id';
const ANIMAL_QUEUE_KEY='cv2-animal-analytics-queue';
let client=null,analyticsAllowed=false,flushingAnimalAdds=false;
const el=id=>document.getElementById(id);
function rid(){return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function visitorId(){let v='';try{v=localStorage.getItem(VISITOR_KEY)||'';if(!v){v=rid();localStorage.setItem(VISITOR_KEY,v)}}catch{v=rid()}return v}
function sessionId(){let v='';try{v=sessionStorage.getItem(SESSION_KEY)||'';if(!v){v=rid();sessionStorage.setItem(SESSION_KEY,v)}}catch{v=rid()}return v}
function safeNum(v){const n=Number(v);return Number.isFinite(n)?n:0}
function safe(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function findFarmSection(title){return [...document.querySelectorAll('.farm-menu-section')].find(s=>s.querySelector('h3')?.textContent.trim()===title)}
function ensureButton(){if(!analyticsAllowed||el('cvAnalyticsMenuBtn'))return;const section=findFarmSection('More');const grid=section?.querySelector('.farm-menu-grid');if(!grid)return;const b=document.createElement('button');b.id='cvAnalyticsMenuBtn';b.type='button';b.className='softbtn';b.textContent='Admin Analytics';b.onclick=()=>{if(typeof window.closeFarmMenu==='function')window.closeFarmMenu();openAnalytics()};grid.appendChild(b)}
function injectModal(){if(el('cvAnalyticsModal'))return;const m=document.createElement('div');m.id='cvAnalyticsModal';m.className='modal hidden';m.innerHTML=`<div class="sheet analytics-sheet"><div class="row"><div><h2>Admin Analytics</h2><div class="muted">App visits, animal use, Cloud sign-ins, and tester feedback.</div></div><button class="softbtn" id="cvAnalyticsClose">Close</button></div><div id="cvAnalyticsBody"><div class="muted" style="padding:18px 0">Loading analytics…</div></div></div>`;document.body.appendChild(m);el('cvAnalyticsClose').onclick=()=>m.classList.add('hidden')}
function card(label,value,sub=''){return `<div class="analytics-card"><span>${label}</span><b>${safeNum(value).toLocaleString()}</b>${sub?`<small>${sub}</small>`:''}</div>`}
function render(data){
  const body=el('cvAnalyticsBody');if(!body)return;
  const recent=data?.most_recent_visit?new Date(data.most_recent_visit).toLocaleString():'No tracked visits yet';
  body.innerHTML=`
    <div class="analytics-group">
      <h3>Animal Use</h3>
      <div class="analytics-grid">
        ${card('Animal records in Cloud',data.cloud_animals_total,'Current unique Cloud records')}
        ${card('Added to Cloud • 24h',data.cloud_animals_added_24h)}
        ${card('Added to Cloud • 7 days',data.cloud_animals_added_7d)}
        ${card('Added to Cloud • 30 days',data.cloud_animals_added_30d)}
      </div>
      <div class="analytics-grid analytics-secondary">
        ${card('App animal adds • 24h',data.tracked_animal_adds_24h)}
        ${card('App animal adds • 7 days',data.tracked_animal_adds_7d)}
        ${card('App animal adds • 30 days',data.tracked_animal_adds_30d)}
      </div>
      <div class="analytics-note">App animal-add tracking counts new local animal records even before Cloud sync. It starts with this release, so older local additions cannot be backfilled. Cloud totals above include the records already stored in Cattle Vision Cloud.</div>
    </div>
    <div class="analytics-group">
      <h3>Cloud Accounts</h3>
      <div class="analytics-grid">
        ${card('Registered users',data.registered_users)}
        ${card('Signed in • 24h',data.signed_in_users_24h)}
        ${card('Signed in • 7 days',data.signed_in_users_7d)}
        ${card('Signed in • 30 days',data.signed_in_users_30d)}
      </div>
      <div class="analytics-note">Login sessions in the last 24 hours: <b>${safeNum(data.login_sessions_24h).toLocaleString()}</b></div>
    </div>
    <div class="analytics-group">
      <h3>Anonymous / Website Use</h3>
      <div class="analytics-grid">
        ${card('Anonymous browsers • 24h',data.anonymous_browsers_24h)}
        ${card('Anonymous browsers • 7 days',data.anonymous_browsers_7d)}
        ${card('Anonymous browsers • 30 days',data.anonymous_browsers_30d)}
        ${card('Unique browsers tracked',data.unique_browsers_lifetime)}
      </div>
      <div class="analytics-grid analytics-secondary">
        ${card('Visit sessions • 24h',data.sessions_24h)}
        ${card('Visit sessions • 7 days',data.sessions_7d)}
        ${card('Visit sessions • 30 days',data.sessions_30d)}
      </div>
      <div class="analytics-note">Most recent tracked visit: <b>${recent}</b></div>
    </div>
    <div class="analytics-group">
      <div class="row"><div><h3>Tester Feedback</h3><div class="muted"><b>${safeNum(data.feedback_new).toLocaleString()}</b> new • ${safeNum(data.feedback_total).toLocaleString()} total</div></div><button class="softbtn" id="cvFeedbackRefresh">Refresh Feedback</button></div>
      <div id="cvFeedbackInbox" class="analytics-feedback-inbox"><div class="muted">Loading feedback…</div></div>
    </div>
    <div class="notice analytics-privacy"><b>Privacy-friendly counting</b><br>Usage analytics store random browser/session IDs and animal-add events without tags, notes, sire/dam information, photos, or health records. Tester feedback stores only what the tester chooses to type or dictate.</div>
    <div class="muted analytics-start">Anonymous visit counting began with Cattle Vision v2.7. Animal-add counting begins with this release.</div>
    <button class="softbtn analytics-refresh" id="cvAnalyticsRefresh">Refresh Analytics</button>`;
  el('cvAnalyticsRefresh').onclick=refreshAnalytics;
  el('cvFeedbackRefresh').onclick=loadFeedback;
}
function feedbackButtons(id,status){
  return ['New','Reviewed','Fixed'].map(x=>`<button type="button" class="softbtn analytics-feedback-status${x===status?' active':''}" onclick="cvSetFeedbackStatus('${safe(id)}','${x}')">${x}</button>`).join('');
}
function renderFeedback(rows){
  const box=el('cvFeedbackInbox');if(!box)return;
  if(!Array.isArray(rows)||!rows.length){box.innerHTML='<div class="analytics-empty">No tester feedback has been submitted yet.</div>';return}
  box.innerHTML=rows.map(r=>{
    const when=r.created_at?new Date(r.created_at).toLocaleString():'';
    const where=r.screen?`<div class="analytics-feedback-meta">Where: ${safe(r.screen)}</div>`:'';
    return `<div class="analytics-feedback-item">
      <div class="row analytics-feedback-head"><div><b>${safe(r.category||'General Feedback')}</b><div class="analytics-feedback-meta">${safe(when)} • ${r.signed_in?'Signed-in tester':'Anonymous tester'}</div></div><span class="analytics-feedback-pill">${safe(r.status||'New')}</span></div>
      ${where}
      <div class="analytics-feedback-message">${safe(r.message||'')}</div>
      <div class="analytics-feedback-actions">${feedbackButtons(r.id,r.status||'New')}</div>
    </div>`;
  }).join('');
}
async function loadFeedback(){
  if(!client||!analyticsAllowed)return;
  const box=el('cvFeedbackInbox');if(box)box.innerHTML='<div class="muted">Refreshing feedback…</div>';
  const {data,error}=await client.rpc('get_app_feedback',{p_limit:100});
  if(error){if(box)box.innerHTML='<div class="analytics-empty">Feedback inbox could not load.</div>';return}
  renderFeedback(data||[]);
}
async function setFeedbackStatus(id,status){
  if(!client||!analyticsAllowed)return;
  const {error}=await client.rpc('set_app_feedback_status',{p_id:id,p_status:status});
  if(error)return alert('Feedback status could not be updated.');
  await refreshAnalytics();
}
window.cvSetFeedbackStatus=setFeedbackStatus;
async function refreshAnalytics(){
  if(!client)return;
  const body=el('cvAnalyticsBody');if(body)body.innerHTML='<div class="muted" style="padding:18px 0">Refreshing analytics…</div>';
  const {data,error}=await client.rpc('get_app_analytics');
  if(error){analyticsAllowed=false;if(body)body.innerHTML='<div class="notice">Admin analytics are only available to the Cattle Vision app administrator.</div>';return}
  analyticsAllowed=true;ensureButton();render(data||{});await loadFeedback();
}
async function openAnalytics(){injectModal();el('cvAnalyticsModal').classList.remove('hidden');await refreshAnalytics()}
window.openAnalytics=openAnalytics;
async function recordVisit(){if(!client)return;try{await client.rpc('record_app_visit',{p_visitor_id:visitorId(),p_session_id:sessionId(),p_path:location.pathname||'/'});}catch(e){console.warn('Visit counter unavailable',e)}}
async function recordLogin(){if(!client)return;try{const {data}=await client.auth.getSession();if(data.session?.user)await client.rpc('record_app_login',{p_session_id:sessionId()})}catch(e){console.warn('Login counter unavailable',e)}}
async function checkAdmin(){if(!client)return;const {data,error}=await client.rpc('get_app_analytics');if(!error){analyticsAllowed=true;ensureButton();if(el('cvAnalyticsModal')&&!el('cvAnalyticsModal').classList.contains('hidden')){render(data||{});loadFeedback()}}}
function readAnimalQueue(){try{const v=JSON.parse(localStorage.getItem(ANIMAL_QUEUE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function writeAnimalQueue(rows){try{localStorage.setItem(ANIMAL_QUEUE_KEY,JSON.stringify(rows.slice(-1000)))}catch{}}
function parseCattle(raw){try{const v=JSON.parse(raw||'[]');return Array.isArray(v)?v:null}catch{return null}}
function queueNewAnimalAdds(beforeRaw,afterRaw){
  const before=parseCattle(beforeRaw),after=parseCattle(afterRaw);if(!before||!after)return;
  const known=new Set(before.map(a=>String(a?.id??'')).filter(Boolean));
  const now=Date.now(),fresh=after.filter(a=>{
    const id=String(a?.id??'');if(!id||known.has(id))return false;
    const t=Date.parse(a?.created||'');return Number.isFinite(t)&&Math.abs(now-t)<=10*60*1000;
  });
  if(!fresh.length)return;
  const q=readAnimalQueue(),have=new Set(q.map(x=>x.key));
  for(const a of fresh){const key=String(a.id);if(!have.has(key)){q.push({key,type:String(a.sex||'Unknown'),source:'local-add'});have.add(key)}}
  writeAnimalQueue(q);flushAnimalAdds();
}
function installAnimalCounter(){
  if(window.__cvAnimalAnalyticsStorageHook)return;window.__cvAnimalAnalyticsStorageHook=true;
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    const watch=this===localStorage&&String(k)==='cv2-cattle';
    let before='';if(watch)try{before=this.getItem(k)||'[]'}catch{}
    const out=original.call(this,k,v);
    if(watch)try{queueNewAnimalAdds(before,String(v??'[]'))}catch(e){console.warn('Animal add counter unavailable',e)}
    return out;
  };
}
async function flushAnimalAdds(){
  if(!client||flushingAnimalAdds||!navigator.onLine)return;
  const q=readAnimalQueue();if(!q.length)return;
  flushingAnimalAdds=true;const left=[];
  for(const item of q){
    try{
      const {error}=await client.rpc('record_app_animal_add',{p_visitor_id:visitorId(),p_session_id:sessionId(),p_animal_key:item.key,p_animal_type:item.type,p_source:item.source});
      if(error)left.push(item);
    }catch{left.push(item)}
  }
  writeAnimalQueue(left);flushingAnimalAdds=false;
}
function start(){
  installAnimalCounter();
  if(!window.supabase?.createClient)return setTimeout(start,250);
  client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  injectModal();recordVisit();recordLogin();checkAdmin();flushAnimalAdds();
  window.addEventListener('online',flushAnimalAdds);
  client.auth.onAuthStateChange((event,session)=>{if(session?.user){recordLogin();setTimeout(checkAdmin,150);flushAnimalAdds()}else{analyticsAllowed=false;el('cvAnalyticsMenuBtn')?.remove()}});
  if(!window.__cvCloudManualMode)setInterval(ensureButton,1000);
}
start();
})();
