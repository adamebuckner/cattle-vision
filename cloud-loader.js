(function(){
function addMobileButton(){
  const existing=document.getElementById('cloudMobileBtn');if(existing){existing.disabled=false;existing.textContent='☁ Cloud';existing.onclick=()=>window.openCloud&&window.openCloud();return}
  const b=document.createElement('button');
  b.id='cloudMobileBtn';
  b.className='cloud-mobile-btn';
  b.type='button';
  b.textContent='☁ Cloud';
  b.setAttribute('aria-label','Open Cattle Vision Cloud');
  b.onclick=()=>window.openCloud&&window.openCloud();
  const bar=document.querySelector('.topbar');
  if(bar)bar.appendChild(b);else document.body.appendChild(b);
}
function installSafariStorageFix(){if(window.__cvSafariStorageFixInstalled)return;window.__cvSafariStorageFixInstalled=true;const originalFetch=window.fetch.bind(window);window.fetch=async function(input,init){try{const url=typeof input==='string'?input:(input&&input.url)||'',body=init&&init.body;if(url.includes('/storage/v1/object/')&&body instanceof Blob&&(body.type||'').toLowerCase().startsWith('video/')){const bytes=new Uint8Array(await body.arrayBuffer());init=Object.assign({},init,{body:bytes})}}catch(e){console.error('Cattle Vision video upload compatibility fix failed',e)}return originalFetch(input,init)}}
function loadScript(id,src){return new Promise(resolve=>{const old=document.getElementById(id);if(old)return resolve(old);const s=document.createElement('script');s.id=id;s.src=src;s.onload=()=>resolve(s);s.onerror=()=>{console.error(`Cattle Vision could not load ${src}`);resolve(s)};document.body.appendChild(s)})}
function loadStyle(id,href){if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;l.onerror=()=>console.error(`Cattle Vision could not load ${href}`);document.head.appendChild(l)}
function loadSecurity(){return loadScript('cvAccountSecurityScript','account-security.js?v=3')}
function loadAutoHook(){return loadScript('cvCloudAutoHook','cloud-auto-hook.js?v=3')}
function loadRecovery(){return loadScript('cvPasswordResetScript','password-reset.js?v=3')}
function loadIntegrity(){return loadScript('cvCloudIntegrityScript','cloud-integrity.js?v=3')}
function loadTombstones(){return loadScript('cvCloudTombstonesScript','cloud-tombstones.js?v=3')}
function loadEquine(){
  loadStyle('cvEquineStyle','equine-records.css?v=1');
  loadScript('cvEquineRecordsScript','equine-records.js?v=1');
  loadScript('cvEquineCloudScript','equine-cloud.js?v=2');
}
function loadCloud(){
  installSafariStorageFix();
  if(document.getElementById('cvCloudSyncScript'))return;
  const s=document.createElement('script');
  s.id='cvCloudSyncScript';
  s.src='cloud-sync.js?v=12';
  s.onload=async()=>{setTimeout(addMobileButton,50);await Promise.all([loadSecurity(),loadAutoHook(),loadRecovery(),loadIntegrity(),loadTombstones()]);window.__cvCloudCoreReady=true;window.dispatchEvent(new Event('cv-cloud-core-ready'))};
  s.onerror=()=>{console.error('Cattle Vision cloud sync code failed to load');s.remove()};
  document.body.appendChild(s)
}
if(window.supabase?.createClient)return loadCloud();
if(document.getElementById('cvSupabaseLibrary'))return;
const lib=document.createElement('script');
lib.id='cvSupabaseLibrary';
lib.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
lib.onload=loadCloud;
lib.onerror=()=>{console.error('Cattle Vision cloud library failed to load');lib.remove()};
document.body.appendChild(lib);
})();
