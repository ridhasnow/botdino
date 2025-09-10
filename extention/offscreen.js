// يستقبل "start-offscreen" ويبدأ أخذ لقطات من tabCapture stream عبر getDisplayMedia-like pipeline
let worker = null;
let roi = null, interval = 1000;
let video, canvas, ctx;

chrome.runtime.onMessage.addListener(async (msg)=>{
  if (msg.kind === 'start-offscreen') {
    roi = msg.roi; interval = msg.interval || 1000;
    if (!video) {
      video = document.createElement('video'); video.muted = true; video.autoplay = true; video.playsInline = true;
      const stream = await navigator.mediaDevices.getUserMedia ? null : null; // placeholder
      // في MV3 لا يمكن الوصول مباشرة لـtabCapture من offscreen؛ سنستخدم chrome.tabCapture.getCapturedTabs؟ غير متاح.
      // حل عملي: نستخدم chrome.tabCapture في service_worker ونرسل frames كـ ImageBitmap؟
      // لتبسيط: سنستخدم captureVisibleTab بدلاً منه كل interval عبر service_worker لاحقًا (ملاحظة في README).
    }
  }
});

// ملاحظة مهمة: بسبب قيود MV3، طريقة عملية وأسهل هي أن يقوم service_worker بطلب chrome.tabs.captureVisibleTab كل interval
// ثم يرسل dataUrl هنا للـOCR. أدناه تنفيذ لهذا المسار:

chrome.runtime.onMessage.addListener(async (msg)=>{
  if (msg.kind === 'frame-dataUrl') {
    const img = await createImageBitmap(await (await fetch(msg.dataUrl)).blob());
    const [sx,sy,sw,sh] = [roi.x*roi.dpr, roi.y*roi.dpr, roi.w*roi.dpr, roi.h*roi.dpr];
    canvas = canvas || new OffscreenCanvas(sw, sh); ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,sw,sh); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await canvas.convertToBlob({ type:'image/png' });
    const { data: { text } } = await Tesseract.recognize(await blob.arrayBuffer(), 'eng', { tessedit_char_whitelist: '0123456789.xX' });
    const m = text && text.match(/(\d{1,4}(?:\.\d{1,2})?)\s*[xX]/);
    if (m) {
      const value = parseFloat(m[1]);
      if (Number.isFinite(value)) chrome.runtime.sendMessage({ kind:'ocr-result', ts: Date.now(), value, roundId: null });
    }
  }
});
