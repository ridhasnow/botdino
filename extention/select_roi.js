// يضع طبقة شفافة لاختيار مستطيل ROI للـOCR
(function(){
  if (document.getElementById('__roi_layer__')) return;
  const dpr = window.devicePixelRatio || 1;
  const layer = document.createElement('div');
  layer.id='__roi_layer__';
  Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:9999999, background:'rgba(0,0,0,0.15)'});
  const box = document.createElement('div');
  Object.assign(box.style,{position:'absolute',border:'2px solid #00e5ff',background:'rgba(0,229,255,.15)'});
  layer.appendChild(box); document.body.appendChild(layer);

  let sx=0, sy=0, dragging=false;
  layer.addEventListener('mousedown',(e)=>{ dragging=true; sx=e.clientX; sy=e.clientY; Object.assign(box.style,{left:sx+'px',top:sy+'px',width:'0',height:'0'}); });
  layer.addEventListener('mousemove',(e)=>{ if(!dragging) return; const x=Math.min(sx,e.clientX), y=Math.min(sy,e.clientY); const w=Math.abs(e.clientX-sx), h=Math.abs(e.clientY-sy); Object.assign(box.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'}); });
  layer.addEventListener('mouseup',(e)=>{ dragging=false; const rect=box.getBoundingClientRect(); layer.remove();
    chrome.runtime.sendMessage({ kind:'roi-selected', roi:{ x: rect.left, y: rect.top, w: rect.width, h: rect.height, dpr } });
  });
})();
