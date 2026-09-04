(function(){
if(window.__cvPastureCloudRefreshInstalled)return;window.__cvPastureCloudRefreshInstalled=true;
const URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
const KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
const FARM_KEY='cv2-cloud-farm-id';
let client=null,refreshing=false,lastRefresh=0,wrapped=false;
function localRows(){try{const x=JSON.parse(localStorage.getItem('cv2-pastures')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function saveRows(rows){localStorage.setItem('cv2-pastures',JSON.stringify(rows));try{if(typeof pastures!=='undefined')pastures=rows}catch{}}
function clientReady(){if(!window.supabase?.createClient)return null;if(!client)client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});return client}
async function refreshCloudPastures(force=false){
  if(refreshing)return false;
  if(!force&&Date.now()-lastRefresh<5000)return false;
  const c=clientReady(),farmId=localStorage.getItem(FARM_KEY);if(!c||!farmId||!navigator.onLine)return false;
  refreshing=true;
  try{
    const {data:s}=await c.auth.getSession();if(!s?.session)return false;
    const {data,error}=await c.from('pastures').select('id,name').eq('farm_id',farmId).order('name');if(error)throw error;
    const rows=localRows(),names=new Set(rows.map(p=>String(p.name||'').trim().toLowerCase()).filter(Boolean));let changed=false;
    for(const p of data||[]){const name=String(p.name||'').trim();if(!name||names.has(name.toLowerCase()))continue;rows.push({id:String(p.id||Date.now()+Math.random()),name,cloudId:p.id||''});names.add(name.toLowerCase());changed=true}
    if(changed){saveRows(rows);if(typeof renderPastureOptions==='function')renderPastureOptions();if(document.getElementById('pastureModal')&&!document.getElementById('pastureModal').classList.contains('hidden')&&typeof renderPastureManager==='function')renderPastureManager(false)}
    lastRefresh=Date.now();return changed;
  }catch(e){console.warn('Cloud pasture refresh will retry later',e);return false}finally{refreshing=false}
}
window.cvRefreshCloudPastures=refreshCloudPastures;
function wrapOpen(){if(wrapped||typeof window.openPastures!=='function')return false;const original=window.openPastures;window.openPastures=function(){const out=original.apply(this,arguments);setTimeout(()=>refreshCloudPastures(true),80);return out};wrapped=true;return true}
if(window.__cvCloudManualMode)wrapOpen();else{
  let tries=0;const t=setInterval(()=>{tries++;wrapOpen();if(window.supabase?.createClient&&localStorage.getItem(FARM_KEY))refreshCloudPastures(false);if((wrapped&&tries>20)||tries>80)clearInterval(t)},500);
  setTimeout(()=>{wrapOpen();refreshCloudPastures(false)},1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>refreshCloudPastures(false),400)});
  window.addEventListener('online',()=>setTimeout(()=>refreshCloudPastures(true),500));
}
})();
