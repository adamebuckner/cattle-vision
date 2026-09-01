(function(){
function addMobileButton(){if(document.getElementById('cloudMobileBtn'))return;const b=document.createElement('button');b.id='cloudMobileBtn';b.type='button';b.textContent='☁ Cloud';b.onclick=()=>window.openCloud&&window.openCloud();b.style.cssText='position:fixed;right:12px;top:74px;z-index:1200;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.92);color:#17452b;border-radius:999px;padding:8px 12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.14)';document.body.appendChild(b);}
function installSafariStorageFix(){
  if(window.__cvSafariStorageFixInstalled)return;
  window.__cvSafariStorageFixInstalled=true;
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const body=init&&init.body;
      if(url.includes('/storage/v1/object/')&&body instanceof Blob&&(body.type||'').toLowerCase().startsWith('video/')){
        const bytes=new Uint8Array(await body.arrayBuffer());
        init=Object.assign({},init,{body:bytes});
      }
    }catch(e){console.error('Cattle Vision video upload compatibility fix failed',e)}
    return originalFetch(input,init);
  };
}
function loadSecurity(){if(document.getElementById('cvAccountSecurityScript'))return;const a=document.createElement('script');a.id='cvAccountSecurityScript';a.src='account-security.js?v=1';document.body.appendChild(a)}
function loadAutoHook(){if(document.getElementById('cvCloudAutoHook'))return;const h=document.createElement('script');h.id='cvCloudAutoHook';h.src='cloud-auto-hook.js?v=1';document.body.appendChild(h)}
function loadCloud(){installSafariStorageFix();const s=document.createElement('script');s.src='cloud-sync.js?v=8';s.onload=()=>{setTimeout(addMobileButton,50);loadSecurity();loadAutoHook()};document.body.appendChild(s)}
if(window.supabase?.createClient)return loadCloud();const lib=document.createElement('script');lib.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';lib.onload=loadCloud;lib.onerror=()=>console.error('Cattle Vision cloud library failed to load');document.body.appendChild(lib);
})();