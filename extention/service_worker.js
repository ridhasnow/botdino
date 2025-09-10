// خلفية الإضافة: يدير tabCapture + offscreen + رسائل
let state = { capturing:false, stream:null, offscreen:false, roi:null, timer:null };

chrome.runtime.onMessage.addListener((msg, sender, respond)=>{
  (async ()=>{
    if (msg.op === 'start') {
      const conf = await chrome.storage.local.get(['server','session','mode','interval']);
      if (!conf.server || !conf.session) { console.warn('server/session missing'); return; }
      if (conf.mode === 'dom') {
        await chrome.scripting.executeScript({ target:{tabId: msg.tabId}, files:['content_dom.js'] });
        chrome.tabs.sendMessage(msg.tabId, {op:'dom-start', conf});
      } else {
        // OCR: إن لم تُحدد ROI، اطلب تحديدها
        if (!state.roi) {
          await chrome.scripting.executeScript({ target:{tabId: msg.tabId}, files:['select_roi.js'] });
          return;
        }
        await ensureOffscreen();
        await startTabCapture(msg.tabId, conf);
      }
    } else if (msg.op === 'roi') {
      const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
      if (tabs[0]) await chrome.scripting.executeScript({ target:{tabId: tabs[0].id}, files:['select_roi.js'] });
    } else if (msg.op === 'ready') {
      chrome.storage.local.set({ ready:true, readyTs: Date.now() });
    } else if (msg.kind === 'roi-selected') {
      state.roi = msg.roi; // {x,y,w,h, devicePixelRatio}
      chrome.storage.local.set({ roi: state.roi });
    } else if (msg.kind === 'ocr-result') {
      // استقبل نتائج OCR من offscreen وادفعها للسيرفر
      const { server, session } = await chrome.storage.local.get(['server','session']);
      const payload = { sessionId: session, ts: msg.ts, value: msg.value, roundId: msg.roundId, source:'ocr' };
      try { await fetch(`${server}/api/ingest`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); } catch {}
    } else if (msg.kind === 'dom-result') {
      const { server, session } = await chrome.storage.local.get(['server','session']);
      const payload = { sessionId: session, ts: msg.ts, value: msg.value, roundId: msg.roundId, source:'dom' };
      try { await fetch(`${server}/api/ingest`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); } catch {}
    }
  })();
  respond && respond();
  return true;
});

async function startTabCapture(tabId, conf) {
  if (state.capturing) return;
  state.stream = await chrome.tabCapture.capture({ audio:false, video:true, videoConstraints:{ mandatory:{ maxWidth:1920, maxHeight:1080, maxFrameRate:15 } } });
  state.capturing = true;
  // أرسل streamId إلى offscreen عبر message channel
  chrome.runtime.sendMessage({ kind:'start-offscreen', roi: state.roi, interval: conf.interval || 1000 });
}

async function ensureOffscreen() {
  if (state.offscreen) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS','DISPLAY_MEDIA'],
    justification: 'Run Tesseract OCR on tab capture frames and crop ROI'
  });
  state.offscreen = true;
}
// … (تكملة الملف السابق)
let frameTimer = null;
async function tickCapture(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format:'png' });
    await chrome.runtime.sendMessage({ kind:'frame-dataUrl', dataUrl });
  } catch (e) {}
}
async function startTabCapture(tabId, conf) {
  if (state.capturing) return;
  await ensureOffscreen();
  state.capturing = true;
  frameTimer && clearInterval(frameTimer);
  frameTimer = setInterval(()=>tickCapture(tabId), conf.interval || 1000);
}
