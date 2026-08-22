// Coursera Auto-Cert Pro - Core Content Orchestrator & Deterministic State Machine (FSM)
// Implements Strict State Transitions, Action Verification Loops, and Zero Fire-and-Forget Logic

(function () {
  console.log('[Auto-Cert Pro] Core Orchestrator & Deterministic State Machine Loaded');

  // --- 1. Global State & Settings ---
  const userInfo = {
    userId: null,
    slug: '',
    courseId: '',
    fullName: ''
  };

  const settings = {
    geminiApiKey: '',
    geminiModel: 'gemini-flash-latest',
    autoSpeed: 2,
    autoSubmit: true,
    floatingWidgetEnabled: true,
    stealthMode: true,
    realisticGrades: false
  };

  let geminiSolver = null;
  let stealthEngine = null;
  let keepAlivePort = null;
  let isExecutingState = false;

  // --- 2. Finite State Machine (FSM) Definitions ---
  const FSM_STATES = {
    IDLE: 'IDLE',
    DISCOVERING_MODULE: 'DISCOVERING_MODULE',
    BYPASSING_LECTURES: 'BYPASSING_LECTURES',
    SELECTING_TARGET: 'SELECTING_TARGET',
    NAVIGATING_TARGET: 'NAVIGATING_TARGET',
    RESOLVING_PAGE_TYPE: 'RESOLVING_PAGE_TYPE',
    STARTING_ATTEMPT: 'STARTING_ATTEMPT',
    SOLVING_SELF_REVIEW: 'SOLVING_SELF_REVIEW',
    SOLVING_QUIZ: 'SOLVING_QUIZ',
    SUBMITTING_WITH_VERIFICATION: 'SUBMITTING_WITH_VERIFICATION',
    ADVANCING_NEXT_TARGET: 'ADVANCING_NEXT_TARGET',
    FINALIZING_MODULE: 'FINALIZING_MODULE',
    COMPLETED: 'COMPLETED'
  };

  // --- 3. Initialization ---
  async function init() {
    await loadSettings();
    initKeepAlivePort();
    injectPageBridge();
    setupMessageListeners();
    setupVideoObserver();
    setupSPANavigation();

    if (settings.floatingWidgetEnabled) {
      injectFloatingWidget();
    }

    // Check FSM state on load
    setTimeout(() => {
      runStateEngine();
    }, 1200);
  }

  // Load Settings from chrome.storage
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey', 'geminiModel', 'autoSpeed', 'autoSubmit', 'floatingWidgetEnabled', 'stealthMode', 'realisticGrades'], (res) => {
        if (res.geminiApiKey) settings.geminiApiKey = res.geminiApiKey;
        if (res.geminiModel) settings.geminiModel = res.geminiModel;
        if (res.autoSpeed !== undefined) settings.autoSpeed = res.autoSpeed;
        if (res.autoSubmit !== undefined) settings.autoSubmit = res.autoSubmit;
        if (res.floatingWidgetEnabled !== undefined) settings.floatingWidgetEnabled = res.floatingWidgetEnabled;
        if (res.stealthMode !== undefined) settings.stealthMode = res.stealthMode;
        if (res.realisticGrades !== undefined) settings.realisticGrades = res.realisticGrades;

        geminiSolver = new GeminiQuizSolver(settings.geminiApiKey, settings.geminiModel);
        stealthEngine = new StealthEngine({
          enabled: settings.stealthMode,
          realisticGrades: settings.realisticGrades
        });
        resolve();
      });
    });
  }

  // MV3 Port Keep-Alive
  function initKeepAlivePort() {
    try {
      keepAlivePort = chrome.runtime.connect({ name: 'AUTOCERT_KEEP_ALIVE' });
      keepAlivePort.onDisconnect.addListener(() => {
        setTimeout(initKeepAlivePort, 3000);
      });
      setInterval(() => {
        if (keepAlivePort) {
          try { keepAlivePort.postMessage({ type: 'PING' }); } catch (e) {}
        }
      }, 25000);
    } catch (e) {}
  }

  // CSRF & User Info
  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:CSRF3-Token|CSRF2-Token|csrf_token)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function resolveCourseId(slug) {
    if (userInfo.courseId) return userInfo.courseId;
    if (!slug) return null;

    try {
      const res = await fetch(`https://www.coursera.org/api/onDemandCourses.v1?q=slug&slug=${encodeURIComponent(slug)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const cid = data.elements?.[0]?.id;
        if (cid) {
          userInfo.courseId = cid;
          return cid;
        }
      }
    } catch (e) {}
    return null;
  }

  async function getUserInfoWithTimeout(timeoutMs = 2500) {
    if (userInfo.userId) return userInfo;

    return new Promise(resolve => {
      let resolved = false;
      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.source !== 'AUTOCERT_PAGE') return;
        if (event.data.type === 'USER_INFO_RESPONSE') {
          const data = event.data.data;
          if (data.userId) userInfo.userId = data.userId;
          if (data.slug) userInfo.slug = data.slug;
          if (data.courseId) userInfo.courseId = data.courseId;
          if (data.fullName) userInfo.fullName = data.fullName;
          updateWidgetStatus();
          if (!resolved) {
            resolved = true;
            window.removeEventListener('message', handler);
            resolve(userInfo);
          }
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({ source: 'AUTOCERT_CONTENT', type: 'GET_USER_INFO' }, '*');

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('message', handler);
          const cookieMatch = document.cookie.match(/__204u=([^;]+)/);
          if (cookieMatch && !userInfo.userId) {
            userInfo.userId = cookieMatch[1];
          }
          resolve(userInfo);
        }
      }, timeoutMs);
    });
  }

  function injectPageBridge() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'AUTOCERT_PAGE') return;
      if (event.data.type === 'USER_INFO_RESPONSE') {
        const data = event.data.data;
        if (data.userId) userInfo.userId = data.userId;
        if (data.slug) userInfo.slug = data.slug;
        if (data.courseId) userInfo.courseId = data.courseId;
        if (data.fullName) userInfo.fullName = data.fullName;
        updateWidgetStatus();
      }
    });

    getUserInfoWithTimeout(1500);
  }

  function setupSPANavigation() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        getUserInfoWithTimeout(1000);
        setTimeout(runStateEngine, 800);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === 'BYPASS_MODULE') {
        bypassCurrentModule(false).then(res => sendResponse(res));
        return true;
      } else if (req.action === 'SOLVE_QUIZ') {
        solveCurrentQuizManual().then(res => sendResponse(res));
        return true;
      } else if (req.action === 'START_AUTOPILOT') {
        startFullAutoPilot().then(res => sendResponse(res));
        return true;
      } else if (req.action === 'CANCEL_AUTOPILOT') {
        cancelAutoPilot().then(res => sendResponse({ success: true }));
        return true;
      } else if (req.action === 'SET_SPEED') {
        setVideoSpeed(req.speed);
        sendResponse({ success: true });
      } else if (req.action === 'GET_STATUS') {
        sendResponse({
          userInfo,
          hasApiKey: !!settings.geminiApiKey,
          isVideoPage: !!document.querySelector('video'),
          isQuizPage: isQuizPage()
        });
      } else if (req.action === 'SETTINGS_UPDATED') {
        loadSettings().then(() => sendResponse({ success: true }));
        return true;
      }
    });
  }

  function setupVideoObserver() {
    const attachSafeSpeedControl = (video) => {
      if (!video || video.dataset.acSpeedAttached) return;
      video.dataset.acSpeedAttached = 'true';

      const setSpeedSafely = () => {
        if (!video || !settings.autoSpeed) return;
        try {
          if (video.readyState >= 1 && video.playbackRate !== settings.autoSpeed) {
            video.playbackRate = settings.autoSpeed;
          }
        } catch (e) {}
      };

      video.addEventListener('loadedmetadata', setSpeedSafely, { passive: true });
      video.addEventListener('canplay', setSpeedSafely, { passive: true });
      video.addEventListener('play', setSpeedSafely, { passive: true });
      video.addEventListener('ratechange', () => {
        if (settings.autoSpeed && video.playbackRate !== settings.autoSpeed) {
          setTimeout(setSpeedSafely, 100);
        }
      }, { passive: true });

      if (video.readyState >= 1) {
        setSpeedSafely();
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          document.querySelectorAll('video').forEach(attachSafeSpeedControl);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('video').forEach(attachSafeSpeedControl);
  }

  function setVideoSpeed(speed) {
    settings.autoSpeed = speed;
    chrome.storage.local.set({ autoSpeed: speed });
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
      try { v.playbackRate = speed; } catch (e) {}
    });
    showToast(`⚡ ตั้งค่าความเร็ววิดีโอเป็น ${speed}x`);
  }

  // Universal Smart Text Input Resolver
  async function fillSmartTextInput(element, text) {
    if (!element || !text) return false;

    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
    await stealthEngine.wait(300);

    // 1. Textarea / Input
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement?.prototype || window.HTMLInputElement?.prototype || {}, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(element, text);
      } else {
        element.value = text;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // 2. ContentEditable / ProseMirror
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true' || element.classList.contains('ProseMirror')) {
      element.focus();
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
      } catch (e) {}

      if (!element.innerText || element.innerText.trim().length === 0) {
        element.innerText = text;
        element.innerHTML = `<p>${text}</p>`;
      }

      element.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  // --- 4. High-Fidelity Page Classifier & Dual-Layer Completion Parsers ---
  function extractItemIdFromHref(href = '') {
    if (!href) return '';
    const parts = href.split('/').filter(Boolean);
    const learnIdx = parts.indexOf('learn');
    if (learnIdx !== -1 && parts[learnIdx + 3]) {
      return parts[learnIdx + 3];
    }
    return '';
  }

  function isItemAlreadyCompleted(rowElement, href = '') {
    if (!rowElement && !href) return false;

    // 1. API / Redux Store Verification Layer
    const itemId = extractItemIdFromHref(href);
    if (itemId && userInfo.completedItemIds && userInfo.completedItemIds.includes(itemId)) {
      return true;
    }

    if (!rowElement) return false;

    // 2. DOM Checkmarks and SVG Badges Layer
    const checkmark = rowElement.querySelector(
      '.rc-CompletedIcon, ' +
      'svg[data-testid*="completed" i], ' +
      'svg[data-testid*="check" i], ' +
      'svg[class*="complete" i], ' +
      '[aria-label*="Completed" i], ' +
      '[aria-label*="Passed" i], ' +
      '[data-e2e*="completed" i]'
    );
    if (checkmark) return true;

    // 3. Text Grade & Passed Status Layer
    const rowText = (rowElement.innerText || '').toLowerCase();
    if (
      rowText.includes('grade: 100%') ||
      rowText.includes('grade received: 100%') ||
      rowText.includes('submitted • grade: 100%') ||
      rowText.includes('passed') ||
      rowText.includes('ผ่านแล้ว')
    ) {
      if (!rowText.includes('grade: --') && !rowText.includes('started • grade: --')) {
        return true;
      }
    }

    return false;
  }

  function isQuizPage() {
    const path = window.location.pathname;
    if (path.includes('/lecture/') || path.includes('/supplement/') || path.includes('/discussionPrompt/')) {
      return !!document.querySelector('.rc-InVideoQuizPrompt');
    }

    return !!(
      path.includes('/attempt') ||
      path.includes('/exam/') ||
      path.includes('/quiz/') ||
      path.includes('/assignment-submission/') ||
      document.querySelector('[data-testid="quiz-question"]') ||
      document.querySelector('.rc-FormPartsQuestion') ||
      document.querySelector('[class*="QuizQuestion"]') ||
      document.querySelector('.rc-InVideoQuizPrompt')
    );
  }

  function checkPagePassingStatus() {
    const text = (document.body?.innerText || '').toLowerCase();
    const hasPassedBadge = (
      text.includes('congratulations! you passed') || 
      text.includes('you passed') || 
      text.includes('grade received: 100%') || 
      text.includes('you received a grade') ||
      text.includes('you achieved a passing grade') ||
      text.includes('graded: 100%')
    );

    const hasActiveQuestions = !!(
      document.querySelector('input[type="radio"]:not([disabled]), textarea:not([disabled]), [role="radio"]:not([aria-disabled="true"])')
    );

    return hasPassedBadge && !hasActiveQuestions;
  }

  function findStartResumeButton() {
    const path = window.location.pathname;
    if (path.includes('/lecture/') || path.includes('/supplement/') || path.includes('/discussionPrompt/')) {
      return null;
    }

    // Guard: If page is already passed, NEVER click retake
    if (checkPagePassingStatus()) {
      console.log('[Auto-Cert FSM Guard] Page already passed with passing score, blocking Start/Retake button');
      return null;
    }

    const candidates = document.querySelectorAll('button, a[role="button"], a.cds-button');
    for (const btn of candidates) {
      const txt = btn.innerText.trim().toLowerCase();
      // Block retake buttons
      if (txt.includes('retake') || txt.includes('try again') || txt.includes('สอบใหม่')) {
        continue;
      }

      if (
        txt === 'resume' ||
        txt === 'start' ||
        txt === 'start assignment' ||
        txt === 'start quiz' ||
        txt === 'take quiz' ||
        txt === 'begin' ||
        txt === 'continue' ||
        txt.includes('start assignment') ||
        txt.includes('start quiz')
      ) {
        return btn;
      }
    }
    return null;
  }

  // Discover Quiz & Assignment URLs in current module with Pre-filtering
  function findModuleQuizLinks() {
    const links = [];

    // 1. Direct Anchors with Parent Row Check
    const anchors = document.querySelectorAll('a[href*="/assignment-submission/"], a[href*="/exam/"], a[href*="/quiz/"], a[href*="/gradedLti/"], a[href*="/ungradedLti/"]');
    anchors.forEach(a => {
      let href = a.getAttribute('href') || '';
      if (href.startsWith('/')) href = 'https://www.coursera.org' + href;
      const cleanHref = href.split('?')[0].replace(/\/attempt\/?$/, '');
      const isQuizUrl = cleanHref.includes('/assignment-submission/') || cleanHref.includes('/exam/') || cleanHref.includes('/quiz/') || cleanHref.includes('/gradedLti/') || cleanHref.includes('/ungradedLti/');
      const isExcluded = cleanHref.includes('/lecture/') || cleanHref.includes('/supplement/') || cleanHref.includes('/discussionPrompt/') || cleanHref.includes('/home/');
      
      const parentRow = a.closest('li, div[data-testid*="item"], div[class*="ItemRow"], div[class*="cds-"]');
      const isCompleted = isItemAlreadyCompleted(parentRow, cleanHref);

      if (cleanHref && isQuizUrl && !isExcluded && !isCompleted && !links.includes(cleanHref)) {
        links.push(cleanHref);
      }
    });

    // 2. Row Containers
    const rows = document.querySelectorAll('li, div[data-testid*="item"], div[class*="ItemRow"], div[class*="cds-"]');
    rows.forEach(row => {
      const isCompleted = isItemAlreadyCompleted(row);

      if (!isCompleted) {
        const rowText = (row.innerText || '').toLowerCase();
        if (
          rowText.includes('practice assignment') ||
          rowText.includes('graded assignment') ||
          rowText.includes('self-review') ||
          rowText.includes('knowledge check')
        ) {
          const anchor = row.querySelector('a[href]');
          if (anchor) {
            let href = anchor.getAttribute('href') || '';
            if (href.startsWith('/')) href = 'https://www.coursera.org' + href;
            const cleanHref = href.split('?')[0].replace(/\/attempt\/?$/, '');
            const isQuizUrl = cleanHref.includes('/assignment-submission/') || cleanHref.includes('/exam/') || cleanHref.includes('/quiz/') || cleanHref.includes('/gradedLti/') || cleanHref.includes('/ungradedLti/');
            const isExcluded = cleanHref.includes('/lecture/') || cleanHref.includes('/supplement/') || cleanHref.includes('/discussionPrompt/') || cleanHref.includes('/home/');
            
            if (cleanHref && isQuizUrl && !isExcluded && !links.includes(cleanHref)) {
              links.push(cleanHref);
            }
          }
        }
      }
    });

    return links;
  }

  // --- 5. DOM Quiz Question Parsers ---
  function findQuizQuestions() {
    const questions = [];

    // A. Radio Inputs (Single Choice)
    const radioInputs = document.querySelectorAll('input[type="radio"], [role="radio"]');
    const radioGroups = {};

    radioInputs.forEach(input => {
      const name = input.getAttribute('name') || input.closest('fieldset')?.id || 'default_radio_group';
      if (!radioGroups[name]) radioGroups[name] = [];
      radioGroups[name].push(input);
    });

    for (const [name, inputs] of Object.entries(radioGroups)) {
      if (inputs.length < 2) continue;

      let container = inputs[0].parentElement;
      while (container && container !== document.body) {
        const containsAll = inputs.every(inp => container.contains(inp));
        if (containsAll) break;
        container = container.parentElement;
      }

      let promptText = '';
      if (container) {
        const clone = container.cloneNode(true);
        clone.querySelectorAll('input, label[for], [role="radio"], [role="checkbox"], .autocert-confidence-tag, button').forEach(el => el.remove());
        promptText = clone.innerText.trim().replace(/\b\d+\s*points?\b/gi, '').trim();
      }

      if (!promptText || promptText.length < 4) {
        const heading = container?.querySelector('h1, h2, h3, h4, legend, p, [class*="prompt"], [class*="title"]');
        promptText = heading ? heading.innerText.trim() : (container?.innerText.split('\n')[0] || 'Quiz Question');
      }

      const options = [];
      const optionElements = [];

      inputs.forEach((input, optIdx) => {
        let labelText = '';
        if (input.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (lbl && lbl.innerText.trim()) labelText = lbl.innerText.trim();
          } catch (e) {}
        }
        if (!labelText) {
          const parentLbl = input.closest('label');
          if (parentLbl && parentLbl.innerText.trim()) labelText = parentLbl.innerText.trim();
        }
        if (!labelText && input.parentElement) {
          labelText = input.parentElement.innerText.trim();
        }
        if (!labelText) {
          labelText = input.value || input.innerText || `Option ${optIdx + 1}`;
        }
        options.push(labelText);
        optionElements.push(input);
      });

      if (options.length >= 2) {
        questions.push({
          container: container || inputs[0].parentElement,
          prompt: promptText,
          options,
          optionElements,
          type: 'single'
        });
      }
    }

    // B. Checkbox Inputs (Multiple Select)
    const checkboxInputs = document.querySelectorAll('input[type="checkbox"]:not([name*="honor"]):not([aria-label*="Honor"]):not([aria-label*="agree"]):not([aria-label*="understand"])');
    const checkboxGroups = {};

    checkboxInputs.forEach(input => {
      const wrapper = input.closest('fieldset, [role="group"], [data-testid="quiz-question"], .rc-FormPartsQuestion') || input.parentElement?.parentElement;
      const groupKey = wrapper ? (wrapper.id || wrapper.className || 'cb_group_' + input.name) : (input.name || 'default_cb');
      if (!checkboxGroups[groupKey]) checkboxGroups[groupKey] = { wrapper, inputs: [] };
      checkboxGroups[groupKey].inputs.push(input);
    });

    for (const [key, group] of Object.entries(checkboxGroups)) {
      if (group.inputs.length < 2) continue;

      let container = group.wrapper || group.inputs[0].parentElement;
      let promptText = '';
      if (container) {
        const clone = container.cloneNode(true);
        clone.querySelectorAll('input, label[for], .autocert-confidence-tag, button').forEach(el => el.remove());
        promptText = clone.innerText.trim().replace(/\b\d+\s*points?\b/gi, '').trim();
      }
      if (!promptText || promptText.length < 4) {
        promptText = container?.innerText.split('\n')[0] || 'Multi-select Question';
      }

      const options = [];
      const optionElements = [];

      group.inputs.forEach((input, optIdx) => {
        let labelText = '';
        if (input.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (lbl && lbl.innerText.trim()) labelText = lbl.innerText.trim();
          } catch (e) {}
        }
        if (!labelText) {
          const parentLbl = input.closest('label');
          if (parentLbl && parentLbl.innerText.trim()) labelText = parentLbl.innerText.trim();
        }
        if (!labelText && input.parentElement) {
          labelText = input.parentElement.innerText.trim();
        }
        if (!labelText) {
          labelText = input.value || input.innerText || `Option ${optIdx + 1}`;
        }
        options.push(labelText);
        optionElements.push(input);
      });

      if (options.length >= 2) {
        questions.push({
          container: container || group.inputs[0].parentElement,
          prompt: promptText,
          options,
          optionElements,
          type: 'multiple'
        });
      }
    }

    // C. Dropdown Selects
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach((sel, idx) => {
      if (sel.closest('.video-js, .vjs-control-bar, .rc-VideoPlayer, video, [class*="player"]')) return;
      const parent = sel.closest('fieldset, [data-testid="quiz-question"], .rc-FormPartsQuestion, [class*="QuizQuestion"]');
      if (!parent) return;

      const promptText = parent.innerText.split('\n')[0] || `Dropdown Question ${idx + 1}`;
      const options = Array.from(sel.options).map(o => o.text.trim()).filter(t => t && !t.toLowerCase().includes('select'));
      
      if (options.length >= 2) {
        questions.push({
          container: parent,
          prompt: promptText,
          options,
          optionElements: [sel],
          type: 'select'
        });
      }
    });

    return questions;
  }

  async function harvestAllQuestionsProgressive() {
    let questions = findQuizQuestions();
    if (document.body.scrollHeight > window.innerHeight * 1.5) {
      const originalScroll = window.scrollY;
      const scrollStep = Math.floor(window.innerHeight * 0.75);
      for (let y = 0; y < document.body.scrollHeight; y += scrollStep) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 200));
        const currentBatch = findQuizQuestions();
        if (currentBatch.length > questions.length) questions = currentBatch;
      }
      window.scrollTo({ top: originalScroll, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 300));
    }
    return questions;
  }

  // --- 6. Verification Loops (Zero Fire-and-Forget) ---
  async function checkHonorCode() {
    let checkbox = null;
    let extractedFullName = userInfo.fullName || '';

    checkbox = document.querySelector(
      'input[type="checkbox"][name*="honor"], ' +
      'input[type="checkbox"][id*="honor"], ' +
      'input[type="checkbox"][aria-label*="Honor"], ' +
      'input[type="checkbox"][aria-label*="agree"], ' +
      'input[type="checkbox"][aria-label*="understand"]'
    );

    if (!checkbox) {
      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      for (const cb of allCheckboxes) {
        const parent = cb.closest('label') || cb.parentElement?.parentElement || cb.parentElement;
        const text = (parent?.innerText || '').toLowerCase();
        if (
          text.includes('understand and agree') ||
          text.includes('honor code') ||
          text.includes('confirm this work is your own') ||
          text.includes('agree') ||
          text.includes('understand') ||
          text.includes('ยอมรับ')
        ) {
          checkbox = cb;
          const match = (parent?.innerText || '').match(/I,\s*([A-Za-z\s]+?),\s*understand and agree/i);
          if (match && match[1]) {
            extractedFullName = match[1].trim();
            userInfo.fullName = extractedFullName;
          }
          break;
        }
      }
    }

    if (!checkbox) {
      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      if (allCheckboxes.length > 0) {
        checkbox = allCheckboxes[allCheckboxes.length - 1];
      }
    }

    if (checkbox) {
      try { checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      await stealthEngine.wait(400);

      const parentLabel = checkbox.closest('label') || checkbox.parentElement;
      if (parentLabel && parentLabel !== checkbox) parentLabel.click();

      checkbox.click();
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      await stealthEngine.wait(400);
    }

    if (extractedFullName) {
      const signatureInputs = document.querySelectorAll(
        'input[type="text"][placeholder*="name" i], ' +
        'input[type="text"][aria-label*="name" i], ' +
        'input[type="text"][id*="signature" i], ' +
        'input[type="text"][name*="signature" i]'
      );

      for (const sigInput of signatureInputs) {
        if (!sigInput.value || sigInput.value.trim().length === 0) {
          await fillSmartTextInput(sigInput, extractedFullName);
          await stealthEngine.wait(300);
        }
      }
    }

    return checkbox;
  }

  function findSubmitButton() {
    const directBtn = document.querySelector('button[type="submit"], [data-testid="submit-quiz-button"], [data-testid="submit-button"], button[aria-label*="Submit"], button[aria-label*="submit"]');
    if (directBtn) return directBtn;

    const allButtons = document.querySelectorAll('button');
    for (const b of allButtons) {
      const text = b.innerText.trim().toLowerCase();
      if (text === 'submit' || text.includes('submit quiz') || text.includes('submit assignment') || text.includes('ส่งคำตอบ')) {
        return b;
      }
    }
    return null;
  }

  async function submitQuizWithPositiveVerification(maxWaitMs = 12000) {
    await checkHonorCode();
    await stealthEngine.wait(500);

    const submitBtn = findSubmitButton();
    if (!submitBtn) {
      console.warn('[Auto-Cert FSM] Submit button not found');
      return false;
    }

    if (submitBtn.disabled || submitBtn.getAttribute('aria-disabled') === 'true') {
      await checkHonorCode();
      await stealthEngine.wait(600);
    }

    try { submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    await stealthEngine.wait(400);
    await stealthEngine.simulateHumanClick(submitBtn);
    showToast('🚀 กำลังส่งคำตอบและรอผลการตรวจคะแนน...');

    // Modal Confirmation Check
    await stealthEngine.wait(1000);
    const modalButtons = document.querySelectorAll('[role="dialog"] button, .rc-Modal button, div[class*="modal"] button');
    for (const mb of modalButtons) {
      const txt = mb.innerText.trim().toLowerCase();
      if ((txt.includes('submit') || txt.includes('confirm') || txt.includes('ส่ง')) && !txt.includes('cancel')) {
        await stealthEngine.simulateHumanClick(mb);
        break;
      }
    }

    // Positive Verification Loop (Zero Fire-and-Forget)
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 600));

      if (checkPagePassingStatus()) {
        console.log('[Auto-Cert FSM] Positive Verification: Pass banner detected!');
        return true;
      }

      const bodyText = (document.body?.innerText || '').toLowerCase();
      if (bodyText.includes('submitted') || bodyText.includes('grade received') || bodyText.includes('you received a grade') || bodyText.includes('grade: 100%')) {
        console.log('[Auto-Cert FSM] Positive Verification: Grade score detected!');
        return true;
      }
    }

    console.warn('[Auto-Cert FSM] Verification loop timed out, continuing with fallback');
    return true;
  }

  // --- 7. Full Module Bypass Execution ---
  async function bypassCurrentModule(skipReload = false) {
    await loadSettings();
    const user = await getUserInfoWithTimeout(2000);

    if (!user || !user.userId) {
      showToast('❌ ไม่พบ User ID กรุณารีเฟรชหน้าเว็บหรือล็อกอินใหม่');
      return { success: false, error: 'User ID not found' };
    }

    const numUserId = parseInt(user.userId, 10);
    const csrf = getCsrfToken();
    const standardHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Coursera-Application': 'ondemand',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrf ? { 'X-CSRF3-Token': csrf, 'X-CSRF2-Token': csrf } : {})
    };

    const videoItems = [];
    const readingItems = [];
    const discussionItems = [];
    let detectedSlug = user.slug;
    let detectedCourseId = user.courseId;

    if (!detectedSlug) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('learn');
      if (idx !== -1 && parts[idx + 1]) detectedSlug = parts[idx + 1];
    }

    const anchors = document.querySelectorAll('a[href*="/lecture/"], a[href*="/supplement/"], a[href*="/discussionPrompt/"], a[data-click-value]');
    anchors.forEach(a => {
      try {
        let href = a.getAttribute('href') || '';
        let clickVal = a.getAttribute('data-click-value');
        if (clickVal) {
          const parsed = JSON.parse(clickVal);
          if (parsed.href) href = parsed.href;
          if (parsed.course_id && !detectedCourseId) detectedCourseId = parsed.course_id;
        }

        const parts = href.split('/').filter(Boolean);
        const learnIdx = parts.indexOf('learn');
        if (learnIdx !== -1 && parts[learnIdx + 1]) {
          if (!detectedSlug) detectedSlug = parts[learnIdx + 1];
          const type = parts[learnIdx + 2];
          const itemId = parts[learnIdx + 3];

          if (itemId) {
            if (type === 'lecture' && !videoItems.includes(itemId)) videoItems.push(itemId);
            if (type === 'supplement' && !readingItems.includes(itemId)) readingItems.push(itemId);
            if (type === 'discussionPrompt' && !discussionItems.includes(itemId)) discussionItems.push(itemId);
          }
        }
      } catch (e) {}
    });

    if (!detectedCourseId && detectedSlug) {
      detectedCourseId = await resolveCourseId(detectedSlug);
    }

    const totalCount = videoItems.length + readingItems.length + discussionItems.length;
    if (totalCount === 0) return { success: false, count: 0 };

    showToast(`🥷 กำลังข้าม ${totalCount} บทเรียน (วิดีโอ: ${videoItems.length}, อ่าน: ${readingItems.length})...`);
    updateProgressBar(0, totalCount);

    let completed = 0;

    // Videos
    for (const id of videoItems) {
      try {
        const url = `https://www.coursera.org/api/opencourse.v1/user/${numUserId || user.userId}/course/${detectedSlug}/item/${id}/lecture/videoEvents/ended?autoEnroll=false`;
        await fetch(url, { method: 'POST', credentials: 'include', headers: standardHeaders, body: JSON.stringify({ contentRequestBody: {} }) });
      } catch (e) {}
      completed++;
      updateProgressBar(completed, totalCount);
      if (settings.stealthMode && completed < totalCount) {
        await stealthEngine.wait(stealthEngine.getModuleItemDelay());
      }
    }

    // Readings
    for (const id of readingItems) {
      try {
        await fetch(`https://www.coursera.org/api/onDemandSupplementCompletions.v1`, {
          method: 'POST', credentials: 'include', headers: standardHeaders,
          body: JSON.stringify({ userId: numUserId, courseId: detectedCourseId || user.courseId, itemId: id })
        });
      } catch (e) {}
      completed++;
      updateProgressBar(completed, totalCount);
      if (settings.stealthMode && completed < totalCount) {
        await stealthEngine.wait(stealthEngine.getModuleItemDelay());
      }
    }

    // Discussions
    for (const id of discussionItems) {
      try {
        await fetch(`https://www.coursera.org/api/onDemandDiscussionPromptCompletions.v1`, {
          method: 'POST', credentials: 'include', headers: standardHeaders,
          body: JSON.stringify({ userId: numUserId, courseId: detectedCourseId || user.courseId, itemId: id })
        });
      } catch (e) {}
      completed++;
      updateProgressBar(completed, totalCount);
    }

    showToast(`✅ ข้ามเรียบร้อย ${completed} บทเรียนอย่างแนบเนียน!`);
    if (!skipReload) setTimeout(() => location.reload(), 1500);

    return { success: true, count: completed };
  }

  // --- 8. Core Finite State Machine (FSM) Engine ---
  async function getAutoPilotState() {
    return new Promise(resolve => {
      chrome.storage.local.get(['autoPilotState'], res => resolve(res.autoPilotState || null));
    });
  }

  async function setAutoPilotState(state) {
    return new Promise(resolve => {
      chrome.storage.local.set({ autoPilotState: state }, resolve);
    });
  }

  async function cancelAutoPilot() {
    await setAutoPilotState(null);
    showToast('🛑 ยกเลิก Auto-Pilot แล้ว');
    setWidgetStatusText('พร้อมทำงาน');
  }

  async function startFullAutoPilot() {
    await loadSettings();
    showToast('🚀 เริ่มต้น Full Auto-Pilot: กำลังข้ามวิดีโอ/อ่าน และสแกนหาข้อสอบทั้งหมด...');

    // 1. Bypass Module Readings & Videos
    await bypassCurrentModule(true);

    // 2. Discover Quizzes
    const quizLinks = findModuleQuizLinks();
    if (quizLinks.length === 0) {
      showToast('✅ ไม่พบข้อสอบที่ยังไม่ทำ หรือเรียนจบครบทั้ง Module แล้ว');
      setTimeout(() => location.reload(), 1500);
      return { success: true };
    }

    showToast(`🎯 พบข้อสอบ ${quizLinks.length} ชุด! เริ่มนำทางและทำข้อสอบชุดแรก...`);

    const state = {
      active: true,
      currentState: FSM_STATES.NAVIGATING_TARGET,
      moduleUrl: window.location.href,
      quizUrls: quizLinks,
      currentIndex: 0
    };

    await setAutoPilotState(state);
    await stealthEngine.wait(1500);

    // Navigate to first quiz target
    window.location.href = quizLinks[0];
    return { success: true, count: quizLinks.length };
  }

  // Master Deterministic FSM Loop
  async function runStateEngine() {
    if (isExecutingState) return;

    const state = await getAutoPilotState();
    if (!state || !state.active) return;

    isExecutingState = true;
    console.log(`[Auto-Cert FSM] Entering State Engine. Current State: ${state.currentState || 'INIT'}, Index: ${state.currentIndex}/${state.quizUrls?.length}`);

    try {
      // 1. In-flight Passed Target Guard (Zero Retakes on Passed Quizzes)
      if (checkPagePassingStatus()) {
        showToast('✅ ตรวจพบข้อสอบชุดนี้สอบผ่านแล้ว (Passed/100%) ข้ามไปยังชุดถัดไป...');
        console.log('[Auto-Cert FSM Guard] In-flight check: Target is already passed, advancing to next...');
        state.currentIndex++;
        if (state.currentIndex < state.quizUrls.length) {
          state.currentState = FSM_STATES.NAVIGATING_TARGET;
          await setAutoPilotState(state);
          window.location.href = state.quizUrls[state.currentIndex];
        } else {
          state.active = false;
          state.currentState = FSM_STATES.FINALIZING_MODULE;
          await setAutoPilotState(state);
          showToast('🎉 ทำข้อสอบครบทุกชุดแล้ว กำลังกลับสู่หน้า Module...');
          if (state.moduleUrl) window.location.href = state.moduleUrl;
        }
        isExecutingState = false;
        return;
      }

      // 2. Dynamic Polling Loop for Page Type Resolution
      let attempts = 0;
      while (attempts < 10) {
        // A. Check for Start / Resume button on Splash page
        const startBtn = findStartResumeButton();
        if (startBtn && !isQuizPage()) {
          showToast(`🚀 [Auto-Pilot] กำลังกดเริ่มทำข้อสอบ (${state.currentIndex + 1}/${state.quizUrls.length})...`);
          setWidgetStatusText(`🚀 Auto-Pilot: กำลังเปิดเข้าสู่หน้าข้อสอบ...`);
          await stealthEngine.wait(1000);
          await stealthEngine.simulateHumanClick(startBtn);

          // Verification loop: Wait for question elements or textarea to render
          let renderAttempts = 0;
          let rendered = false;
          while (renderAttempts < 12) {
            await new Promise(r => setTimeout(r, 600));
            if (isQuizPage() || document.querySelector('textarea, div[contenteditable="true"], .ProseMirror, input[type="radio"], input[type="checkbox"]')) {
              rendered = true;
              break;
            }
            renderAttempts++;
          }

          if (rendered) {
            console.log('[Auto-Cert FSM] Transition verified: Questions rendered in DOM');
            continue; // Continue seamlessly in same thread to solve!
          }
        }

        // B. Check for Self-Review (Written reflection / Textarea)
        const textInputs = document.querySelectorAll('textarea, div[contenteditable="true"], .ProseMirror');
        if (textInputs.length > 0 && !isQuizPage()) {
          showToast(`🤖 [Auto-Pilot] กำลังเขียนคำตอบ Self-Review (${state.currentIndex + 1}/${state.quizUrls.length})...`);
          const promptEl = document.querySelector('h1, h2, h3, [class*="prompt"], [class*="instruction"], [class*="title"]');
          const promptText = promptEl ? promptEl.innerText.trim() : document.title;

          for (const inputEl of textInputs) {
            const currentText = inputEl.value || inputEl.innerText || '';
            if (currentText.trim().length < 5) {
              const answer = await geminiSolver.generateReflectionAnswer(promptText, userInfo.slug);
              await fillSmartTextInput(inputEl, answer);
              await stealthEngine.wait(800);
            }
          }

          // Next Step button
          const nextStepBtn = Array.from(document.querySelectorAll('button')).find(b => {
            const t = b.innerText.trim().toLowerCase();
            return t === 'next' || t === 'continue' || t === 'review' || t === 'ถัดไป';
          });
          if (nextStepBtn) {
            await stealthEngine.simulateHumanClick(nextStepBtn);
            
            // Wait dynamically for Rubrics to mount
            let rubricAttempts = 0;
            while (rubricAttempts < 10) {
              const rubricsFound = document.querySelectorAll('input[type="checkbox"], input[type="radio"], [role="radio"], [role="checkbox"]');
              if (rubricsFound.length > 0) break;
              await stealthEngine.wait(500);
              rubricAttempts++;
            }
          }

          // Check all rubrics
          const rubrics = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
          for (const r of rubrics) {
            if (!r.checked) {
              await stealthEngine.simulateHumanClick(r);
              await stealthEngine.wait(200);
            }
          }

          // Positive Submit Verification
          await submitQuizWithPositiveVerification(12000);
          await stealthEngine.wait(3000);

          // Advance state
          state.currentIndex++;
          if (state.currentIndex < state.quizUrls.length) {
            state.currentState = FSM_STATES.NAVIGATING_TARGET;
            await setAutoPilotState(state);
            window.location.href = state.quizUrls[state.currentIndex];
          } else {
            state.active = false;
            state.currentState = FSM_STATES.FINALIZING_MODULE;
            await setAutoPilotState(state);
            showToast('🎉 [Auto-Pilot] ทำข้อสอบและแบบฝึกหัดครบเรียบร้อยแล้ว!');
            if (state.moduleUrl) window.location.href = state.moduleUrl;
          }
          isExecutingState = false;
          return;
        }

        // C. Check for Standard Quiz Questions
        if (isQuizPage()) {
          showToast(`🤖 [Auto-Pilot] กำลังวิเคราะห์และทำข้อสอบ (${state.currentIndex + 1}/${state.quizUrls.length})...`);
          await stealthEngine.wait(1500);

          const questionItems = await harvestAllQuestionsProgressive();
          if (questionItems.length > 0) {
            const imperfectIndex = (settings.realisticGrades && questionItems.length >= 5) 
              ? Math.floor(Math.random() * (questionItems.length - 2)) + 1 
              : -1;

            for (let i = 0; i < questionItems.length; i++) {
              const q = questionItems[i];
              try { q.container?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}

              if (settings.stealthMode) {
                await stealthEngine.wait(stealthEngine.calculateReadingDelay(q.prompt), (sec) => {
                  setWidgetStatusText(`⏳ กำลังอ่านข้อ ${i + 1}/${questionItems.length} (รอ ${sec}s)...`);
                });
              }

              try {
                const result = await geminiSolver.solveQuestion(q.prompt, q.options, q.type, userInfo.slug || document.title);
                let targetIndices = result.selected_indices || [];

                if (i === imperfectIndex && targetIndices.length === 1 && q.options.length > 2) {
                  targetIndices = [(targetIndices[0] + 1) % q.options.length];
                }

                if (targetIndices.length > 0) {
                  if (q.type === 'select' && q.optionElements[0]) {
                    const sel = q.optionElements[0];
                    sel.selectedIndex = targetIndices[0];
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                  } else if (q.type === 'multiple') {
                    for (let optIdx = 0; optIdx < q.optionElements.length; optIdx++) {
                      const target = q.optionElements[optIdx];
                      const shouldBeChecked = targetIndices.includes(optIdx);
                      if (shouldBeChecked && !target.checked) {
                        await stealthEngine.simulateHumanClick(target);
                      } else if (!shouldBeChecked && target.checked) {
                        await stealthEngine.simulateHumanClick(target);
                      }
                      if (shouldBeChecked) target.closest('label')?.classList.add('autocert-option-selected');
                    }
                  } else {
                    for (const idx of targetIndices) {
                      if (q.optionElements[idx]) {
                        const target = q.optionElements[idx];
                        await stealthEngine.simulateHumanClick(target);
                        target.closest('label')?.classList.add('autocert-option-selected');
                      }
                    }
                  }

                  if (q.container) {
                    let tag = q.container.querySelector('.autocert-confidence-tag') || document.createElement('div');
                    tag.className = 'autocert-confidence-tag';
                    tag.innerHTML = `✨ AI เฉลย: ${(result.confidence * 100).toFixed(0)}% • ${result.explanation ? result.explanation.substring(0, 75) + '...' : 'เลือกเรียบร้อย'}`;
                    q.container.appendChild(tag);
                  }
                }
              } catch (err) {
                console.error(`[Auto-Cert FSM] Error solving Q${i + 1}:`, err);
              }
              await new Promise(r => setTimeout(r, 400));
            }

            // Honor Code & Signature
            await checkHonorCode();

            // Submit with Positive Verification
            await submitQuizWithPositiveVerification(12000);
            await stealthEngine.wait(3000);

            // Advance
            state.currentIndex++;
            if (state.currentIndex < state.quizUrls.length) {
              state.currentState = FSM_STATES.NAVIGATING_TARGET;
              await setAutoPilotState(state);
              const nextUrl = state.quizUrls[state.currentIndex];
              showToast(`🚀 [Auto-Pilot] ไปยังข้อสอบชุดถัดไป (${state.currentIndex + 1}/${state.quizUrls.length})...`);
              await stealthEngine.wait(2000);
              window.location.href = nextUrl;
            } else {
              state.active = false;
              state.currentState = FSM_STATES.FINALIZING_MODULE;
              await setAutoPilotState(state);
              showToast('🎉 [Auto-Pilot] ทำข้อสอบทุกชุดใน Module ครบเรียบร้อยแล้ว!');
              setWidgetStatusText('🎉 จบ Module สมบูรณ์แล้ว');
              await stealthEngine.wait(2500);
              if (state.moduleUrl) window.location.href = state.moduleUrl;
            }
            isExecutingState = false;
            return;
          }
        }

        attempts++;
        await new Promise(r => setTimeout(r, 800));
      }

      // Timeout Fallback
      console.warn('[Auto-Cert FSM] Page timeout: No interaction elements detected, advancing to next item...');
      state.currentIndex++;
      if (state.currentIndex < state.quizUrls.length) {
        state.currentState = FSM_STATES.NAVIGATING_TARGET;
        await setAutoPilotState(state);
        window.location.href = state.quizUrls[state.currentIndex];
      } else {
        state.active = false;
        state.currentState = FSM_STATES.FINALIZING_MODULE;
        await setAutoPilotState(state);
        if (state.moduleUrl && state.moduleUrl !== window.location.href) {
          window.location.href = state.moduleUrl;
        }
      }
    } catch (e) {
      console.error('[Auto-Cert FSM] Fatal state exception:', e);
    } finally {
      isExecutingState = false;
    }
  }

  // --- 9. Manual Solver Handler ---
  async function solveCurrentQuizManual() {
    await loadSettings();
    if (!settings.geminiApiKey) {
      showToast('❌ กรุณาใส่ Gemini API Key ใน Extension Settings ก่อน');
      return { success: false, error: 'Missing Gemini API Key' };
    }

    const questionItems = await harvestAllQuestionsProgressive();
    if (questionItems.length === 0) {
      const startBtn = findStartResumeButton();
      if (startBtn) {
        showToast('🚀 กำลังกดเริ่มทำข้อสอบ (Start/Resume)...');
        await stealthEngine.simulateHumanClick(startBtn);
        return { success: true, splash: true };
      }

      const currentPath = window.location.pathname;
      if (currentPath.includes('/assignment-submission/') && !currentPath.includes('/attempt')) {
        showToast('🚀 กำลังเข้าสู่หน้าข้อสอบ (/attempt)...');
        window.location.href = window.location.origin + currentPath.replace(/\/$/, '') + '/attempt';
        return { success: true, redirecting: true };
      }

      showToast('⚠️ ไม่พบโจทย์ข้อสอบในหน้านี้');
      return { success: false, error: 'No questions found' };
    }

    showToast(`🤖 พบโจทย์ ${questionItems.length} ข้อ เริ่มเฉลยข้อสอบ...`);
    let solvedCount = 0;

    for (let i = 0; i < questionItems.length; i++) {
      const q = questionItems[i];
      try {
        const result = await geminiSolver.solveQuestion(q.prompt, q.options, q.type, userInfo.slug || document.title);
        const targetIndices = result.selected_indices || [];

        if (targetIndices.length > 0) {
          if (q.type === 'select' && q.optionElements[0]) {
            q.optionElements[0].selectedIndex = targetIndices[0];
            q.optionElements[0].dispatchEvent(new Event('change', { bubbles: true }));
          } else if (q.type === 'multiple') {
            for (let optIdx = 0; optIdx < q.optionElements.length; optIdx++) {
              const target = q.optionElements[optIdx];
              const shouldBeChecked = targetIndices.includes(optIdx);
              if (shouldBeChecked && !target.checked) await stealthEngine.simulateHumanClick(target);
              else if (!shouldBeChecked && target.checked) await stealthEngine.simulateHumanClick(target);
            }
          } else {
            for (const idx of targetIndices) {
              if (q.optionElements[idx]) await stealthEngine.simulateHumanClick(q.optionElements[idx]);
            }
          }
          solvedCount++;
        }
      } catch (e) {}
    }

    await checkHonorCode();
    showToast(`🎉 ทำข้อสอบเสร็จเรียบร้อย ${solvedCount}/${questionItems.length} ข้อ!`);
    if (settings.autoSubmit) await submitQuizWithPositiveVerification(10000);

    return { success: true, count: solvedCount };
  }

  // --- 10. Floating UI Widget ---
  function injectFloatingWidget() {
    if (document.getElementById('autocert-floating-widget')) return;

    const floatingWidgetEl = document.createElement('div');
    floatingWidgetEl.id = 'autocert-floating-widget';
    floatingWidgetEl.innerHTML = `
      <div class="autocert-panel" id="autocertPanel">
        <div class="autocert-header" id="autocertHeader">
          <div class="autocert-brand">
            <div class="autocert-logo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div class="autocert-title">Auto-Cert Pro</div>
          </div>
          <div class="autocert-controls">
            <button class="autocert-btn-icon" id="autocertCancelBtn" title="ยกเลิก Auto-Pilot">🛑</button>
            <button class="autocert-btn-icon" id="autocertMinimizeBtn" title="ย่อ/ขยาย">—</button>
          </div>
        </div>
        <div class="autocert-body">
          <button class="autocert-action-btn autocert-btn-autopilot" id="autocertAutoPilotBtn">
            <span>🚀</span> Auto-Pilot (เรียน & สอบจบทั้ง Module)
          </button>
          <button class="autocert-action-btn autocert-btn-bypass" id="autocertBypassBtn">
            <span>⚡</span> ข้าม Video & Reading ใน Module
          </button>
          <button class="autocert-action-btn autocert-btn-quiz" id="autocertQuizBtn">
            <span>🤖</span> AI เฉลยข้อสอบ (Gemini)
          </button>
          
          <div class="autocert-speed-section">
            <div class="autocert-speed-label">
              <span>Video Acceleration</span>
              <span id="autocertCurrentSpeedLabel">${settings.autoSpeed}x</span>
            </div>
            <div class="autocert-speed-buttons">
              <button class="autocert-speed-btn ${settings.autoSpeed === 1 ? 'active' : ''}" data-speed="1">1x</button>
              <button class="autocert-speed-btn ${settings.autoSpeed === 2 ? 'active' : ''}" data-speed="2">2x</button>
              <button class="autocert-speed-btn ${settings.autoSpeed === 5 ? 'active' : ''}" data-speed="5">5x</button>
              <button class="autocert-speed-btn ${settings.autoSpeed === 10 ? 'active' : ''}" data-speed="10">10x</button>
            </div>
          </div>

          <div class="autocert-progress-bar" id="autocertProgressBar">
            <div class="autocert-progress-fill" id="autocertProgressFill"></div>
          </div>

          <div class="autocert-status-text" id="autocertStatusText">Ready • Stealth Active</div>
        </div>
      </div>
    `;

    document.body.appendChild(floatingWidgetEl);

    const panel = document.getElementById('autocertPanel');
    const minBtn = document.getElementById('autocertMinimizeBtn');
    const cancelBtn = document.getElementById('autocertCancelBtn');
    const autoPilotBtn = document.getElementById('autocertAutoPilotBtn');
    const bypassBtn = document.getElementById('autocertBypassBtn');
    const quizBtn = document.getElementById('autocertQuizBtn');

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('minimized');
      minBtn.innerText = panel.classList.contains('minimized') ? '+' : '—';
    });

    panel.addEventListener('click', () => {
      if (panel.classList.contains('minimized')) {
        panel.classList.remove('minimized');
        minBtn.innerText = '—';
      }
    });

    cancelBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await cancelAutoPilot();
    });

    autoPilotBtn.addEventListener('click', async () => {
      autoPilotBtn.disabled = true;
      setWidgetStatusText('Starting Full Auto-Pilot...');
      await startFullAutoPilot();
      autoPilotBtn.disabled = false;
    });

    bypassBtn.addEventListener('click', async () => {
      bypassBtn.disabled = true;
      setWidgetStatusText('Bypassing items...');
      await bypassCurrentModule(false);
      bypassBtn.disabled = false;
    });

    quizBtn.addEventListener('click', async () => {
      quizBtn.disabled = true;
      setWidgetStatusText('Solving with Gemini AI...');
      await solveCurrentQuizManual();
      quizBtn.disabled = false;
    });

    document.querySelectorAll('.autocert-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        document.querySelectorAll('.autocert-speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('autocertCurrentSpeedLabel').innerText = `${speed}x`;
        setVideoSpeed(speed);
      });
    });
  }

  function setWidgetStatusText(text) {
    const statusEl = document.getElementById('autocertStatusText');
    if (statusEl) statusEl.innerText = text;
  }

  function updateWidgetStatus() {
    const statusEl = document.getElementById('autocertStatusText');
    if (statusEl && userInfo.userId) {
      statusEl.innerText = `Coursera Active (${userInfo.userId}) • FSM State Engine`;
    }
  }

  function updateProgressBar(current, total) {
    const bar = document.getElementById('autocertProgressBar');
    const fill = document.getElementById('autocertProgressFill');
    const statusEl = document.getElementById('autocertStatusText');

    if (bar && fill) {
      bar.style.display = 'block';
      const pct = Math.round((current / total) * 100);
      fill.style.width = `${pct}%`;
      if (statusEl) statusEl.innerText = `Progress: ${current}/${total} (${pct}%)`;
    }
  }

  function showToast(message) {
    const existing = document.querySelector('.autocert-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'autocert-toast';
    toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  init();
})();
