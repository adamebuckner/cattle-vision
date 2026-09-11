(function(){
const SPECIAL=new Set(['Livestock Guardian Dog','Horse']);
const CLASS_MAP={Cows:'Cow',Cow:'Cow',Calves:'Calf',Calf:'Calf',Heifers:'Heifer',Heifer:'Heifer',Bulls:'Bull',Bull:'Bull',Steers:'Steer',Steer:'Steer'};
let cloudHeadcounts=[];
function key(s){return String(s||'').trim().toLowerCase()}
function herd(){return typeof cattle!=='undefined'&&Array.isArray(cattle)?cattle:[]}
function prepareCards(){
  const stats=document.querySelector('.stats'),young=document.querySelector('[data-herd-view="young"]');if(!stats||!young)return;
  young.querySelector('.ico')&&(young.querySelector('.ico').textContent='CALVES');
  young.querySelector('strong')&&(young.querySelector('strong').textContent='Calves');
  young.querySelector('small')&&(young.querySelector('small').textContent='Current calf count • tap for young stock');
  if(!document.getElementById('heiferN')){
    const h=young.cloneNode(true);h.removeAttribute('data-herd-view');h.setAttribute('aria-pressed','false');h.onclick=()=>window.setHerdView?.('young');
    const ico=h.querySelector('.ico');if(ico)ico.textContent='HEIFERS';const n=h.querySelector('b');if(n){n.id='heiferN';n.textContent='0'}
    const strong=h.querySelector('strong');if(strong)strong.textContent='Heifers';const small=h.querySelector('small');if(small)small.textContent='Current heifer count • tap for young stock';young.after(h);
  }
}
function latestOverrides(){
  const latest=new Map();
  for(const e of cloudHeadcounts){const type=CLASS_MAP[e.animal_class];if(!type||!Number.isFinite(Number(e.animal_count)))continue;const pasture=key(e.pasture_name||e.pasture_id||'unassigned'),k=pasture+'|'+type;if(!latest.has(k))latest.set(k,Number(e.animal_count))}
  return latest;
}
function effectiveByPasture(){
  const by=new Map();
  for(const a of herd().filter(a=>!SPECIAL.has(a.sex))){const type=a.sex||'Cow',pasture=key(a.location||'unassigned'),k=pasture+'|'+type;by.set(k,(by.get(k)||0)+1)}
  for(const [k,n] of latestOverrides())by.set(k,n);
  return by;
}
function effectiveCounts(){
  const out={Cow:0,Bull:0,Calf:0,Heifer:0,Steer:0,total:0};
  for(const [k,n] of effectiveByPasture()){const type=k.slice(k.lastIndexOf('|')+1);out[type]=(out[type]||0)+n;out.total+=n}
  return out;
}
function paint(){prepareCards();const c=effectiveCounts(),set=(id,n)=>{const e=document.getElementById(id);if(e)e.textContent=String(n||0)};set('totalN',c.total);set('calfN',c.Calf);set('heiferN',c.Heifer);set('cowN',c.Cow);set('bullN',c.Bull)}
function pastureClassCounts(){
  const out=new Map(),ensure=p=>{if(!out.has(p))out.set(p,{total:0,cows:0,calves:0,heifers:0,bulls:0,steers:0,dogs:0,horses:0,authoritative:false});return out.get(p)};
  for(const a of herd()){const p=key(a.location);if(!p)continue;const c=ensure(p);if(a.sex==='Livestock Guardian Dog'){c.dogs++;continue}if(a.sex==='Horse'){c.horses++;continue}c.total++;if(a.sex==='Cow')c.cows++;else if(a.sex==='Calf')c.calves++;else if(a.sex==='Heifer')c.heifers++;else if(a.sex==='Bull')c.bulls++;else if(a.sex==='Steer')c.steers++}
  const fields={Cow:'cows',Calf:'calves',Heifer:'heifers',Bull:'bulls',Steer:'steers'};
  for(const e of cloudHeadcounts){const type=CLASS_MAP[e.animal_class],field=fields[type],p=key(e.pasture_name);if(!field||!p)continue;const c=ensure(p),old=c[field]||0,n=Number(e.animal_count)||0;c[field]=n;c.total+=n-old;c.authoritative=true}
  return out;
}
function countText(c){
  const parts=[];if(c.cows)parts.push(`${c.cows} cow${c.cows===1?'':'s'}`);if(c.calves)parts.push(`${c.calves} calf${c.calves===1?'':'ves'}`);if(c.heifers)parts.push(`${c.heifers} heifer${c.heifers===1?'':'s'}`);if(c.bulls)parts.push(`${c.bulls} bull${c.bulls===1?'':'s'}`);if(c.steers)parts.push(`${c.steers} steer${c.steers===1?'':'s'}`);if(!parts.length)parts.push(`${c.total||0} cattle`);if(c.dogs)parts.push(`${c.dogs} guardian dog${c.dogs===1?'':'s'}`);if(c.horses)parts.push(`${c.horses} horse${c.horses===1?'':'s'}`);return parts.join(' • ')
}
function installPastureCounts(){
  window.cvFieldHeadcounts=cloudHeadcounts.slice();
  window.cvEffectivePastureCounts=pastureClassCounts;
  if(typeof window.pastureCounts==='function'&&!window.pastureCounts.__cvFieldAware){const f=function(){return pastureClassCounts()};f.__cvFieldAware=true;window.pastureCounts=f}
  if(typeof window.pastureCountText==='function'&&!window.pastureCountText.__cvFieldAware){const f=function(c){return countText(c||{})};f.__cvFieldAware=true;window.pastureCountText=f}
  try{window.renderPastureCounts?.();const modal=document.getElementById('pastureModal');if(modal&&!modal.classList.contains('hidden'))window.renderPastureManager?.(false)}catch(e){console.warn('Pasture counts did not repaint',e)}
}
async function loadCloud(){
  try{
    if(!window.supabase?.createClient)return paint();const farmId=localStorage.getItem('cv2-cloud-farm-id');if(!farmId)return paint();
    const client=window.supabase.createClient('https://rtyiqggxruwejqqyqtmv.supabase.co','sb_publishable_BxkgX1XJz8o_PsTb_LcVDQ_7DR6oHOk',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data:session}=await client.auth.getSession();if(!session?.session)return paint();
    const {data,error}=await client.rpc('get_field_headcounts',{p_farm_id:farmId});if(error)throw error;
    cloudHeadcounts=Array.isArray(data)?data:[];window.cvFieldHeadcounts=cloudHeadcounts.slice();
    installPastureCounts();window.dispatchEvent(new CustomEvent('cv-field-headcounts',{detail:{rows:cloudHeadcounts.slice()}}));
  }catch(e){console.warn('Dashboard field headcounts could not refresh from cloud.',e)}
  paint();
}
function install(){prepareCards();paint();installPastureCounts();loadCloud();window.addEventListener('cv-local-change',()=>setTimeout(loadCloud,250));window.addEventListener('online',loadCloud);window.cvRefreshFieldHeadcounts=loadCloud;const old=window.render;if(typeof old==='function'&&!old.__cvDashboardCounts){const wrapped=async function(){const r=await old.apply(this,arguments);paint();return r};Object.assign(wrapped,old);wrapped.__cvDashboardCounts=true;window.render=wrapped}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
