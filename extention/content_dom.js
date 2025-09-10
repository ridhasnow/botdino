// قراءة DOM: نبحث عن نص يحتوي "x" بشكل متكرر ونستخرج آخر قيمة
(function(){
  const rx = /(\d{1,4}(?:\.\d{1,2})?)\s*[xX]/;
  let last = null;
  function scan(){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let best = null, bestLen = 0;
    while (walker.nextNode()) {
      const t = walker.currentNode.nodeValue;
      if (!t) continue;
      const m = t.match(rx);
      if (m && t.length > bestLen) { best = m[1]; bestLen = t.length; }
    }
    if (best && best !== last) {
      last = best;
      const value = parseFloat(best);
      if (Number.isFinite(value)) {
        chrome.runtime.sendMessage({ kind:'dom-result', ts: Date.now(), value, roundId: null });
      }
    }
  }
  const mo = new MutationObserver(()=>scan());
  mo.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  scan();
})();
