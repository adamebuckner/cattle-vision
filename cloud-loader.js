(function(){
function addMobileButton(){
  if(document.getElementById('cloudMobileBtn'))return;
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
function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.onerror=()=>console.error(`Cattle Vision could not load ${src}`);document.body.appendChild(s)}
function loadStyle(id,href){if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;l.onerror=()=>console.error(`Cattle Vision could not load ${href}`);document.head.appendChild(l)}
function loadSecurity(){loadScript('cvAccountSecurityScript','account-security.js?v=3')}
function loadAutoHook(){loadScript('cvCloudAutoHook','cloud-auto-hook.js?v=3')}
function loadRecovery(){loadScript('cvPasswordResetScript','password-reset.js?v=3')}
function loadIntegrity(){loadScript('cvCloudIntegrityScript','cloud-integrity.js?v=3')}
function loadTombstones(){loadScript('cvCloudTombstonesScript','cloud-tombstones.js?v=3')}
function loadEquine(){
  loadStyle('cvEquineStyle','equine-records.css?v=1');
  loadScript('cvEquineRecordsScript','equine-records.js?v=1');
  loadScript('cvEquineCloudScript','equine-cloud.js?v=2');
}
function loadCloud(){
  installSafariStorageFix();
  loadEquine();
  if(document.getElementById('cvCloudSyncScript'))return;
  const s=document.createElement('script');
  s.id='cvCloudSyncScript';
  s.src='cloud-sync.js?v=12';
  s.onload=()=>{setTimeout(addMobileButton,50);loadSecurity();loadAutoHook();loadRecovery();loadIntegrity();loadTombstones()};
  s.onerror=()=>console.error('Cattle Vision cloud sync code failed to load');
  document.body.appendChild(s)
}
if(window.supabase?.createClient)return loadCloud();
if(document.getElementById('cvSupabaseLibrary'))return;
const lib=document.createElement('script');
lib.id='cvSupabaseLibrary';
lib.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
lib.onload=loadCloud;
lib.onerror=()=>console.error('Cattle Vision cloud library failed to load');
document.body.appendChild(lib);
})();
