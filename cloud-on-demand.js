(function(){
if(window.__cvCloudOnDemandInstalled)return;window.__cvCloudOnDemandInstalled=true;
window.__cvCloudManualMode=true;
const el=id=>document.getElementById(id);
const extensions=[
  ['cvPastureSessionCloud','pasture-session-cloud.js?v=3'],
  ['cvEquineCloud','equine-cloud.js?v=3'],
  ['cvAiCloud','ai-cloud.js?v=3'],
  ['cvGuardianDogCloud','guardian-dog-cloud.js?v=4'],
  ['cvGuardianVetCloud','guardian-vet-cloud.js?v=4'],
  ['cvGuardianLitterVetCloud','guardian-litter-vet-cloud.js?v=3'],
  ['cvGuardianVetCostCloud','guardian-vet-cost-cloud.js?v=2'],
  ['cvMedicationCostCloud','medication-cost-cloud.js?v=2'],
  ['cvRanchEconomicsCloud','ranch-economics-cloud.js?v=2'],
  ['cvPastureCostCloud','pasture-cost-cloud.js?v=2'],
  ['cvMileageCostCloud','mileage-cost-cloud.js?v=2'],
  ['cvPastureCloudRefresh','pasture-cloud-refresh.js?v=2'],
  ['cvAnalytics','analytics.js?v=2']
];
let loading=null,realOpen=null;
function script(id,src){return new Promise((resolve,reject)=>{const old=el(id);if(old){if(old.dataset.loaded==='1'||old.readyState==='complete')return resolve();if(old.dataset.failed==='1')old.remove();else{old.addEventListener('load',()=>resolve(),{once:true});old.addEventListener('error',()=>{old.remove();reject(new Error(`Could not load ${src}`))},{once:true});return}}const s=document.createElement('script');s.id=id;s.src=src;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=()=>{s.dataset.failed='1';s.remove();reject(new Error(`Could not load ${src}`))};document.body.appendChild(s)})}
function button(){let b=el('cloudMobileBtn');if(!b){b=document.createElement('button');b.id='cloudMobileBtn';b.className='cloud-mobile-btn';b.type='button';b.setAttribute('aria-label','Open Cattle Vision Cloud');document.querySelector('.topbar')?.appendChild(b)}b.textContent='☁ Cloud';b.disabled=false;b.onclick=()=>openCloudOnDemand();return b}
function waitForCore(){return new Promise((resolve,reject)=>{if(window.__cvCloudCoreReady&&typeof window.openCloud==='function'&&window.openCloud!==openCloudStub)return resolve();let checks=0;const timer=setInterval(()=>{checks++;if(window.__cvCloudCoreReady&&typeof window.openCloud==='function'&&window.openCloud!==openCloudStub){clearInterval(timer);resolve()}else if(checks>=240){clearInterval(timer);reject(new Error('Cloud took too long to become ready'))}},125)})}
async function runExtraTasks(mode){for(const task of(window.__cvCloudExtraTasks||[])){try{await task[mode]?.()}catch(e){console.warn(`${task.name||'Cloud extension'} ${mode} will retry later`,e)}}}
function installExtraTasks(){
  const sync=window.cloudSyncNow;if(typeof sync==='function'&&!sync.__cvExtraTasks){const wrapped=async function(){const result=await sync.apply(this,arguments);if(result?.ok)await runExtraTasks('push');return result};Object.assign(wrapped,sync);wrapped.__cvExtraTasks=true;window.cloudSyncNow=wrapped}
  const pull=window.cloudPullNow;if(typeof pull==='function'&&!pull.__cvExtraTasks){const wrapped=async function(){const result=await pull.apply(this,arguments);if(result?.ok)await runExtraTasks('pull');return result};Object.assign(wrapped,pull);wrapped.__cvExtraTasks=true;window.cloudPullNow=wrapped}
}
async function loadCloud(){
  if(realOpen)return realOpen;
  const b=button();b.disabled=true;b.textContent='Cloud loading…';
  try{
    await script('cvCloudOnDemandLoader','cloud-loader.js?v=18');
    await waitForCore();const open=window.openCloud;
    for(const[id,src]of extensions)await script(id,src);
    installExtraTasks();realOpen=open;
    window.dispatchEvent(new Event('cv-cloud-ready'));
    b.disabled=false;b.textContent='☁ Cloud';b.onclick=()=>realOpen();
    return realOpen;
  }catch(e){if(!window.__cvCloudCoreReady)el('cvCloudOnDemandLoader')?.remove();throw e}
}
async function openCloudOnDemand(){
  try{if(!loading)loading=loadCloud().catch(e=>{loading=null;throw e});const open=await loading;open()}
  catch(e){console.error(e);const b=button();b.disabled=false;b.textContent='☁ Cloud';alert('Cloud could not open right now. Your records remain saved on this phone. Check the connection and try again.')}
}
function openCloudStub(){return openCloudOnDemand()}
if(typeof window.openCloud==='function')realOpen=window.openCloud;else window.openCloud=openCloudStub;
window.cvLoadCloud=loadCloud;button();
})();
