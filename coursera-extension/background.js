// Background Service Worker for Coursera Auto-Cert Pro

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Auto-Cert Pro] Extension Installed');

  // Set default settings if not exists
  chrome.storage.local.get(['geminiModel', 'autoSpeed', 'autoSubmit', 'floatingWidgetEnabled'], (res) => {
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
});

// Handle messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});
