(function(){
  'use strict';
  if(window.__cvCriticalUiInstalled)return;
  window.__cvCriticalUiInstalled=true;

  const byId=id=>document.getElementById(id);

  function closeCriticalFarmTools(){
    byId('criticalFarmDrawerBackdrop')?.classList.add('hidden');
    byId('criticalFarmDrawer')?.classList.add('hidden');
  }

  function ensureCriticalFarmTools(){
    if(byId('criticalFarmDrawer'))return;
    const backdrop=document.createElement('div');
    backdrop.id='criticalFarmDrawerBackdrop';
    backdrop.className='farm-drawer-backdrop hidden';
    backdrop.addEventListener('click',closeCriticalFarmTools);

    const drawer=document.createElement('aside');
    drawer.id='criticalFarmDrawer';
    drawer.className='farm-drawer critical-farm-drawer hidden';
    drawer.setAttribute('role','dialog');
    drawer.setAttribute('aria-modal','true');
    drawer.setAttribute('aria-label','Farm Tools');
    drawer.innerHTML=`<div class="farm-drawer-head"><div><h2>Farm Tools</h2><div class="muted">Essential navigation stays available while the rest of Cattle Vision finishes loading.</div></div><button class="softbtn" type="button" onclick="closeCriticalFarmTools()">Close</button></div><div class="farm-menu-section"><div class="farm-menu-grid"><button class="greenbtn" type="button" onclick="cvOpenPastures()">Herds / Pastures</button><button class="softbtn" type="button" onclick="cvOpenMyHerd()">My Herd</button><button class="softbtn" type="button" onclick="cvOpenSettings()">Settings / Backup</button></div></div>`;
    document.body.append(backdrop,drawer);
  }

  function openCriticalFarmTools(event){
    event?.preventDefault?.();
    closeCriticalFarmTools();
    if(typeof window.openFarmMenu==='function'&&byId('farmDrawer')){
      try{return window.openFarmMenu();}catch(error){console.error('Farm Tools could not open; using essential navigation.',error)}
    }
    ensureCriticalFarmTools();
    byId('criticalFarmDrawerBackdrop').classList.remove('hidden');
    byId('criticalFarmDrawer').classList.remove('hidden');
  }

  function launchPastures(){
    if(typeof window.openPastures!=='function'||!byId('pastureModal'))return false;
    closeCriticalFarmTools();
    if(typeof window.closeFarmMenu==='function'){
      try{window.closeFarmMenu()}catch(error){console.error(error)}
    }
    window.openPastures();
    return true;
  }

  function openPasturesSafely(event){
    event?.preventDefault?.();
    if(launchPastures())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(launchPastures())clearInterval(timer);
      else if(tries>=20){
        clearInterval(timer);
        alert('Herd and pasture tools did not finish loading. Refresh Cattle Vision once, then tap Herds / Pastures again. Your saved records will stay on this device.');
      }
    },150);
  }

  function openMyHerd(){
    closeCriticalFarmTools();
    const herd=byId('herd');
    const panel=herd?.closest('.panel');
    const show=[...document.querySelectorAll('.herd-head button')].find(button=>button.textContent.trim()==='Show Herd');
    if(show)show.click();
    else{
      try{localStorage.setItem('cv2-herd-collapsed','0')}catch(error){console.error(error)}
      if(herd)herd.style.display='';
      if(typeof window.render==='function')window.render();
    }
    (panel||herd)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function openSettingsSafely(){
    closeCriticalFarmTools();
    if(typeof window.openSettings==='function')window.openSettings();
  }

  window.closeCriticalFarmTools=closeCriticalFarmTools;
  window.cvOpenFarmTools=openCriticalFarmTools;
  window.cvOpenPastures=openPasturesSafely;
  window.cvOpenMyHerd=openMyHerd;
  window.cvOpenSettings=openSettingsSafely;

  ensureCriticalFarmTools();
  const menu=document.querySelector('.menu');
  if(menu){
    menu.type='button';
    menu.setAttribute('aria-label','Open farm tools');
    menu.addEventListener('click',openCriticalFarmTools);
  }
})();
