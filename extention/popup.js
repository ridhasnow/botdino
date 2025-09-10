const $ = (id)=>document.getElementById(id);
(async function init(){
  const { server, session, mode, interval } = await chrome.storage.local.get(['server','session','mode','interval']);
  if (server) $('server').value = server;
  if (session) $('session').value = session;
  if (mode) $('mode').value = mode;
  if (interval) $('interval').value = String(interval);
})();
async function saveState(){
  await chrome.storage.local.set({
    server: $('server').value.trim(),
    session: $('session').value.trim(),
    mode: $('mode').value,
    interval: parseInt($('interval').value,10)||1000
  });
}
$('btnStart').onclick = async ()=>{
  await saveState();
  const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
  if (!tabs[0]) return;
  await chrome.runtime.sendMessage({ op:'start', tabId: tabs[0].id });
  $('status').textContent = 'Started.';
};
$('btnROI').onclick = async ()=>{
  const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
  if (!tabs[0]) return;
  await chrome.runtime.sendMessage({ op:'roi', tabId: tabs[0].id });
};
$('btnReady').onclick = async ()=>{
  await chrome.runtime.sendMessage({ op:'ready' });
  $('status').textContent = 'Marked Ready. You can stop capture.';
};
