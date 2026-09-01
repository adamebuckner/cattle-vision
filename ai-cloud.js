(function(){
if(window.__cvAiCloudInstalled)return;window.__cvAiCloudInstalled=true;
const URL='https://rtyiqggxruwejqqyqtmv.supabase.co';
const KEY='sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk';
const FARM_KEY='cv2-cloud-farm-id';
let client=null,timer=null,wrappedSync=null,wrappedPull=null;
function herd(){return (typeof cattle!=='undefined'&&Array.isArray(cattle))?cattle:[]}
async function ready(){if(!client&&window.supabase?.createClient)client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});if(!client)return false;const {data}=await client.auth.getSession();return !!data.session?.user}
async function pushFlags(){if(!(await ready()))return;const farmId=localStorage.getItem(FARM_KEY);if(!farmId)return;const flags=herd().map(a=>({legacy_id:String(a.id),double_tagged:a.doubleTagged===true}));if(!flags.length)return;const {error}=await client.rpc('set_double_tag_flags',{p_farm_id:farmId,p_flags:flags});if(error)console.warn('AI double-tag cloud sync will retry later',error)}
async function pullFlags(){if(!(await ready()))return;const farmId=localStorage.getItem(FARM_KEY);if(!farmId)return;const {data,error}=await client.from('animals').select('legacy_id,double_tagged').eq('farm_id',farmId).range(0,9999);if(error){console.warn('AI lineage markers could not be restored yet',error);return}const map=new Map((data||[]).map(x=>[String(x.legacy_id),x.double_tagged===true]));let changed=false;for(const a of herd()){const v=map.get(String(a.id));if(typeof v==='boolean'&&a.doubleTagged!==v){a.doubleTagged=v;changed=true}}if(changed){try{localStorage.setItem('cv2-cattle',JSON.stringify(herd()));if(typeof render==='function')render()}catch(e){console.warn('AI lineage marker restore could not be saved locally',e)}}}
function schedulePush(delay=5200){clearTimeout(timer);timer=setTimeout(pushFlags,delay)}
window.addEventListener('cv-ai-changed',()=>schedulePush());
function installWrappers(){
  const s=window.cloudSyncNow;if(typeof s==='function'&&s!==wrappedSync&&!s.__cvAiCloud){const w=async function(){const out=await s.apply(this,arguments);try{await pushFlags()}catch{}return out};w.__cvAiCloud=true;wrappedSync=w;window.cloudSyncNow=w}
  const p=window.cloudPullNow;if(typeof p==='function'&&p!==wrappedPull&&!p.__cvAiCloud){const w=async function(){const out=await p.apply(this,arguments);try{await pullFlags()}catch{}return out};w.__cvAiCloud=true;wrappedPull=w;window.cloudPullNow=w}
}
function start(){if(!window.supabase?.createClient)return setTimeout(start,300);ready().then(ok=>{if(ok)setTimeout(pullFlags,1800)});installWrappers();setInterval(installWrappers,900)}
start();
})();