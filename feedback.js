(function(){
  function load(src,id){
    if(id&&document.getElementById(id))return;
    const s=document.createElement('script');if(id)s.id=id;s.src=src;s.defer=true;document.body.appendChild(s);
  }
  load('https://raw.githubusercontent.com/adamebuckner/cattle-vision/f6b502a4c732c018e16e0909b43bb14bc2c68b4f/feedback.js','cvFeedbackCore');
  load('dashboard-counts.js?v=2','cvDashboardCounts');
})();
