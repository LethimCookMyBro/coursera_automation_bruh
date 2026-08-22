// Background Service Worker for Coursera Auto-Cert Pro (Manifest V3 Production Grade)
// Features: Port Keep-Alive, Periodic Alarm Wakeup, and Extension Lifecycle Management

// 1. Installation & Defaults
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Auto-Cert Pro] Extension Installed / Updated');

  chrome.storage.local.get(['geminiModel', 'autoSpeed', 'autoSubmit', 'floatingWidgetEnabled', 'stealthMode', 'realisticGrades'], (res) => {
    const defaults = {};
    if (!res.geminiModel) defaults.geminiModel = 'gemini-flash-latest';
    if (res.autoSpeed === undefined) defaults.autoSpeed = 2;
    if (res.autoSubmit === undefined) defaults.autoSubmit = false;
    if (res.floatingWidgetEnabled === undefined) defaults.floatingWidgetEnabled = true;
    if (res.stealthMode === undefined) defaults.stealthMode = true;
    if (res.realisticGrades === undefined) defaults.realisticGrades = false;

    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });

  // Setup periodic heartbeat alarm (every 1 minute) to keep worker healthy
  chrome.alarms.create('AUTOCERT_HEARTBEAT_ALARM', { periodInMinutes: 1 });
});

// 2. Alarm Listener for Heartbeat
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'AUTOCERT_HEARTBEAT_ALARM') {
    // Keep alive tick
    console.debug('[Auto-Cert Pro] Background Heartbeat Active');
  }
});

// 3. Port Keep-Alive Channel (Connects with Content Scripts during long tasks)
const activePorts = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'AUTOCERT_KEEP_ALIVE') {
    activePorts.add(port);
    console.log('[Auto-Cert Pro] Keep-Alive port connected');

    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
      console.log('[Auto-Cert Pro] Keep-Alive port disconnected');
    });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'PING') {
        port.postMessage({ type: 'PONG', timestamp: Date.now() });
      }
    });
  }
});

// 4. Runtime Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG', activePorts: activePorts.size });
  }
  return true;
});
