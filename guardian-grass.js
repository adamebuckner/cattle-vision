(function(){
const DOG='Livestock Guardian Dog',HORSE='Horse';
function addOption(sel,val){if(!sel||[...sel.options].some(o=>o.value===val))return;const o=document.createElement('option');o.value=val;o.textContent=val;sel.appendChild(o)}
function setupAnimalOptions(){['aSex','rSex'].forEach(id=>{addOption($(id),DOG);addOption($(id),HORSE)});document.querySelectorAll('select.bulk-sex').forEach(sel=>{addOption(sel,DOG);addOption(sel,HORSE)})}
function isDog(a){return a&&a.sex===DOG}
function isHorse(a){return a&&a.sex===HORSE}
function isCattle(a){return a&&!isDog(a)&&!isHorse(a)}
function currentPastureStart(a,pasture){const hist=Array.isArray(a.locationHistory)?a.locationHistory:[];for(let i=hist.length-1;i>=0;i--){const h=hist[i];if(String(h.to||'').toLowerCase()===String(pasture||'').toLowerCase()&&h.date){const d=new Date(h.date);if(!Number.isNaN(d.getTime()))return d}}return null}
function daysSince(d){if(!d||Number.isNaN(d.getTime()))return null;const now=new Date();return Math.max(0,Math.floor((now-d)/86400000))}
function grazingText(animals,pasture){const vals=animals.filter(isCattle).map(a=>daysSince(currentPastureStart(a,pasture))).filter(v=>v!==null);if(!vals.length)return '';const min=Math.min(...vals),max=Math.max(...vals);return min===max?`${min} day${min===1?'':'s'} on grass`:`${min}–${max} days on grass`}
function decoratePastures(){document.querySelectorAll('.pasture-card').forEach(card=>{const name=card.querySelector('.pasture-card-head strong')?.textContent?.trim();if(!name)return;const animals=cattle.filter(a=>String(a.location||'').toLowerCase()===name.toLowerCase());const dogs=animals.filter(isDog).length,horses=animals.filter(isHorse).length,cows=animals.filter(isCattle).length;const count=card.querySelector('.pasture-card-head span');const parts=[`${cows} cattle`];if(dogs)parts.push(`${dogs} guardian dog${dogs===1?'':'s'}`);if(horses)parts.push(`${horses} horse${horses===1?'':'s'}`);const countText=parts.join(' • ');if(count&&count.textContent!==countText)count.textContent=countText;let info=card.querySelector('.grass-days');if(!info){info=document.createElement('div');info.className='grass-days muted';info.style.marginTop='6px';card.querySelector('.pasture-card-head>div')?.appendChild(info)}const gt=grazingText(animals,name),txt=gt?`Pasture time: ${gt}`:'';if(info&&info.textContent!==txt)info.textContent=txt})}
window.cvDecoratePastures=decoratePastures;
function openGuardianDog(){openAdd();setupAnimalOptions();$('aSex').value=DOG;$('addTitle').textContent='Add Livestock Guardian Dog'}
window.openGuardianDog=openGuardianDog;
const origCloseAdd=window.closeAdd;if(typeof origCloseAdd==='function')window.closeAdd=function(){const out=origCloseAdd.apply(this,arguments);if($('addTitle'))$('addTitle').textContent='Add Animal';return out};
const origRender=window.render;if(typeof origRender==='function')window.render=async function(){const out=await origRender.apply(this,arguments);setupAnimalOptions();return out};
const origPastureRender=window.renderPastureManager;if(typeof origPastureRender==='function')window.renderPastureManager=function(){const out=origPastureRender.apply(this,arguments);decoratePastures();return out};
const origBulkRender=window.renderBulkSorter;if(typeof origBulkRender==='function')window.renderBulkSorter=function(){const out=origBulkRender.apply(this,arguments);setupAnimalOptions();return out};
setupAnimalOptions();if(typeof window.render==='function')window.render();
})();