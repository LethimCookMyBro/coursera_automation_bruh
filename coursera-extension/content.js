// Coursera Auto-Cert Pro - Content Script
// Full Auto-Pilot & Max Stealth Simulation

(function () {
  console.log('[Auto-Cert Pro] Content script initialized with Auto-Pilot & Max Stealth');

  let userInfo = {
    userId: null,
    slug: '',
    courseId: ''
  };

  let settings = {
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
  let floatingWidgetEl = null;

  // Initialize
  async function init() {
    await loadSettings();
    injectPageBridge();
    setupMessageListeners();
    setupVideoObserver();
    setupSPANavigation();

    if (settings.floatingWidgetEnabled) {
      injectFloatingWidget();
    }

    // Check Auto-Pilot active state on load
    setTimeout(() => {
      checkAndRunAutoPilot();
    }, 1500);
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

  // Extract CSRF Token from cookie
  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:CSRF3-Token|CSRF2-Token|csrf_token)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // Fetch Course ID directly from Coursera API if missing
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
    } catch (e) {
      console.warn('[Auto-Cert] Failed to query courseId by slug:', e);
    }
    return null;
  }

  // Request User Info with Promise and Timeout to prevent race conditions
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
          // Fallback: try reading cookie directly
          const cookieMatch = document.cookie.match(/__204u=([^;]+)/);
          if (cookieMatch && !userInfo.userId) {
            userInfo.userId = cookieMatch[1];
          }
          resolve(userInfo);
        }
      }, timeoutMs);
    });
  }

  // Inject Bridge Script to access page context
  function injectPageBridge() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    // Listen to messages from page bridge
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'AUTOCERT_PAGE') return;
      if (event.data.type === 'USER_INFO_RESPONSE') {
        const data = event.data.data;
        if (data.userId) userInfo.userId = data.userId;
        if (data.slug) userInfo.slug = data.slug;
        if (data.courseId) userInfo.courseId = data.courseId;
        updateWidgetStatus();
      }
    });

    // Request user info
    getUserInfoWithTimeout(1500);
  }

  // SPA Navigation listener (Coursera client-side routing)
  function setupSPANavigation() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        getUserInfoWithTimeout(1000);
        setTimeout(checkAndRunAutoPilot, 1200);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  // Message Listener for Popup and Extension commands
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === 'BYPASS_MODULE') {
        bypassCurrentModule(false).then(res => sendResponse(res));
        return true;
      } else if (req.action === 'SOLVE_QUIZ') {
        solveCurrentQuiz().then(res => sendResponse(res));
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

  // Safe Video Speed Controller & Playback Observer
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
      try {
        v.playbackRate = speed;
      } catch (e) {
        console.warn('[Auto-Cert] Failed to set playbackRate:', e);
      }
    });
    showToast(`⚡ ตั้งค่าความเร็ววิดีโอเป็น ${speed}x`);
  }

  // Check if current page is Quiz / Question Attempt / Self-Review
  function isQuizPage() {
    return !!(
      document.querySelector('input[type="radio"], input[type="checkbox"]') ||
      document.querySelector('textarea, div[contenteditable="true"]') ||
      document.querySelector('select') ||
      document.querySelector('[data-testid="quiz-question"]') ||
      document.querySelector('.rc-FormPartsQuestion') ||
      document.querySelector('[class*="QuizQuestion"]') ||
      document.querySelector('.rc-InVideoQuizPrompt') ||
      window.location.pathname.includes('/attempt') ||
      window.location.pathname.includes('/exam/') ||
      window.location.pathname.includes('/quiz/')
    );
  }

  // Check if current page is an already-passed quiz result page
  function isAlreadyPassedPage() {
    const text = (document.body?.innerText || '').toLowerCase();
    return (
      (text.includes('congratulations! you passed') || text.includes('you passed') || text.includes('grade received: 100%') || text.includes('you received a grade')) &&
      !document.querySelector('input[type="radio"], textarea')
    );
  }

  // Find Start / Resume Assignment Button
  function findStartResumeButton() {
    const candidates = document.querySelectorAll('button, a[role="button"], a.cds-button');
    for (const btn of candidates) {
      const txt = btn.innerText.trim().toLowerCase();
      if (
        txt === 'resume' ||
        txt === 'start' ||
        txt === 'start assignment' ||
        txt === 'start quiz' ||
        txt === 'take quiz' ||
        txt === 'begin' ||
        txt.includes('resume') ||
        txt.includes('start assignment') ||
        txt.includes('start quiz')
      ) {
        return btn;
      }
    }
    return null;
  }

  // Discover Quiz & Assignment URLs in current module
  function findModuleQuizLinks() {
    const links = [];

    // 1. Direct Anchor lookup
    const anchors = document.querySelectorAll('a[href*="/assignment-submission/"], a[href*="/exam/"], a[href*="/quiz/"], a[href*="/gradedLti/"], a[href*="/ungradedLti/"]');
    anchors.forEach(a => {
      let href = a.getAttribute('href') || '';
      if (href.startsWith('/')) href = 'https://www.coursera.org' + href;
      const cleanHref = href.split('?')[0].replace(/\/attempt\/?$/, '');
      if (cleanHref && !links.includes(cleanHref)) {
        links.push(cleanHref);
      }
    });

    // 2. Row Container lookup (For Practice Assignments, Self-reviews, Knowledge checks without direct quiz in URL)
    const rows = document.querySelectorAll('li, div[data-testid*="item"], div[class*="ItemRow"], div[class*="cds-"]');
    rows.forEach(row => {
      const rowText = (row.innerText || '').toLowerCase();
      const isCompleted = !!row.querySelector('.rc-CompletedIcon, svg[data-testid="completed"], svg[data-testid*="completed"], [aria-label*="Completed"], [aria-label*="completed"], [data-e2e*="completed"]') ||
                          rowText.includes('completed') || rowText.includes('ผ่านแล้ว');

      if (!isCompleted) {
        if (
          rowText.includes('practice assignment') ||
          rowText.includes('graded assignment') ||
          rowText.includes('self-review') ||
          rowText.includes('knowledge check') ||
          rowText.includes('resume')
        ) {
          const anchor = row.querySelector('a[href]');
          if (anchor) {
            let href = anchor.getAttribute('href') || '';
            if (href.startsWith('/')) href = 'https://www.coursera.org' + href;
            const cleanHref = href.split('?')[0].replace(/\/attempt\/?$/, '');
            if (cleanHref && !links.includes(cleanHref) && !cleanHref.includes('/home/')) {
              links.push(cleanHref);
            }
          }
        }
      }
    });

    return links;
  }

  // Auto-Pilot State Storage
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

  // Check and run Auto-Pilot actions on page load with smart dynamic retry
  async function checkAndRunAutoPilot() {
    const state = await getAutoPilotState();
    if (!state || !state.active) return;

    console.log('[Auto-Cert Auto-Pilot] Active state:', state);

    // If currently on an already passed result screen, advance immediately
    if (isAlreadyPassedPage()) {
      showToast('✅ ข้อสอบชุดนี้ผ่านแล้ว กำลังไปยังชุดถัดไป...');
      state.currentIndex++;
      if (state.currentIndex < state.quizUrls.length) {
        await setAutoPilotState(state);
        window.location.href = state.quizUrls[state.currentIndex];
      } else {
        state.active = false;
        await setAutoPilotState(state);
        if (state.moduleUrl) window.location.href = state.moduleUrl;
      }
      return;
    }

    // Dynamic polling loop: wait up to 8 seconds for page elements (React SPA rendering)
    let attempts = 0;
    while (attempts < 8) {
      // 1. Check if Start / Resume button is present
      const startBtn = findStartResumeButton();
      if (startBtn && !isQuizPage()) {
        showToast(`🚀 [Auto-Pilot] กำลังกดเริ่มทำข้อสอบ (${state.currentIndex + 1}/${state.quizUrls.length})...`);
        setWidgetStatusText(`🚀 Auto-Pilot: กำลังเปิดเข้าสู่หน้าข้อสอบ...`);
        await stealthEngine.wait(1600);
        await stealthEngine.simulateHumanClick(startBtn);
        return;
      }

      // 2. Check if Self-Review / Textarea is present
      const textareas = document.querySelectorAll('textarea, div[contenteditable="true"]');
      if (textareas.length > 0 && !isQuizPage()) {
        showToast(`🤖 [Auto-Pilot] กำลังเขียนคำตอบ Self-Review ด้วย Gemini...`);
        const promptEl = document.querySelector('h1, h2, h3, [class*="prompt"], [class*="instruction"], [class*="title"]');
        const promptText = promptEl ? promptEl.innerText.trim() : document.title;
        
        for (const ta of textareas) {
          if (!ta.value || ta.value.length < 5) {
            const answer = await geminiSolver.generateReflectionAnswer(promptText, userInfo.slug);
            ta.value = answer;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            await stealthEngine.wait(800);
          }
        }

        // Check if there is a "Next" / "Continue" step button
        const nextStepBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = b.innerText.trim().toLowerCase();
          return t === 'next' || t === 'continue' || t === 'review' || t === 'ถัดไป';
        });
        if (nextStepBtn) {
          await stealthEngine.simulateHumanClick(nextStepBtn);
          await stealthEngine.wait(1500);
        }

        // Check all rubric criteria checkboxes
        const rubrics = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        for (const r of rubrics) {
          if (!r.checked) {
            await stealthEngine.simulateHumanClick(r);
            await stealthEngine.wait(200);
          }
        }

        await submitQuizSafely();
        await stealthEngine.wait(4000);
        
        // Advance to next quiz
        state.currentIndex++;
        if (state.currentIndex < state.quizUrls.length) {
          await setAutoPilotState(state);
          window.location.href = state.quizUrls[state.currentIndex];
        } else {
          state.active = false;
          await setAutoPilotState(state);
          showToast('🎉 [Auto-Pilot] ทำข้อสอบและแบบฝึกหัดครบเรียบร้อยแล้ว!');
          if (state.moduleUrl) window.location.href = state.moduleUrl;
        }
        return;
      }

      // 3. Check if standard quiz questions are present
      if (isQuizPage()) {
        showToast(`🤖 [Auto-Pilot] กำลังวิเคราะห์และทำข้อสอบ (${state.currentIndex + 1}/${state.quizUrls.length})...`);
        await stealthEngine.wait(2000);

        await solveCurrentQuiz();
        await stealthEngine.wait(4000);

        state.currentIndex++;
        if (state.currentIndex < state.quizUrls.length) {
          await setAutoPilotState(state);
          const nextUrl = state.quizUrls[state.currentIndex];
          showToast(`🚀 [Auto-Pilot] ไปยังข้อสอบชุดถัดไป (${state.currentIndex + 1}/${state.quizUrls.length})...`);
          await stealthEngine.wait(2500);
          window.location.href = nextUrl;
        } else {
          // All quizzes completed!
          state.active = false;
          await setAutoPilotState(state);
          showToast('🎉 [Auto-Pilot] ทำข้อสอบทุกชุดใน Module ครบเรียบร้อยแล้ว!');
          setWidgetStatusText('🎉 จบ Module สมบูรณ์แล้ว');
          await stealthEngine.wait(3000);
          if (state.moduleUrl) {
            window.location.href = state.moduleUrl;
          }
        }
        return;
      }

      attempts++;
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Start Full Auto-Pilot from Module Home
  async function startFullAutoPilot() {
    await loadSettings();
    showToast('🚀 เริ่มต้น Full Auto-Pilot: กำลังข้ามวิดีโอ/อ่าน และเตรียมทำข้อสอบทั้งหมด...');

    // Step 1: Complete videos & readings (skipReload: true to preserve execution flow)
    await bypassCurrentModule(true);

    // Step 2: Discover quizzes & assignments in module
    const quizLinks = findModuleQuizLinks();
    if (quizLinks.length === 0) {
      showToast('✅ ไม่พบข้อสอบในหน้านี้ หรือเรียนจบครบแล้ว');
      setTimeout(() => location.reload(), 1500);
      return { success: true };
    }

    showToast(`🎯 พบข้อสอบ ${quizLinks.length} ชุด! เริ่มนำทางและทำข้อสอบชุดแรก...`);

    const state = {
      active: true,
      moduleUrl: window.location.href,
      quizUrls: quizLinks,
      currentIndex: 0
    };

    await setAutoPilotState(state);
    await stealthEngine.wait(2000);

    // Navigate seamlessly to first quiz without reload interruption
    window.location.href = quizLinks[0];
  }

  // --- FEATURE 1: Instant Bypass Module with Stealth Pacing ---
  async function bypassCurrentModule(skipReload = false) {
    await loadSettings();

    // 1. Resolve User ID with asynchronous timeout
    const user = await getUserInfoWithTimeout(2000);

    if (!user || !user.userId) {
      showToast('❌ ไม่พบ User ID กรุณารีเฟรชหน้าเว็บหรือล็อกอินใหม่');
      return { success: false, error: 'User ID not found' };
    }

    const numUserId = parseInt(user.userId, 10);
    const csrf = getCsrfToken();

    // Headers with CSRF & Coursera App tokens
    const standardHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Coursera-Application': 'ondemand',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrf ? { 'X-CSRF3-Token': csrf, 'X-CSRF2-Token': csrf } : {})
    };

    // 2. Discover Items in Module
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

    // Scan links with data-click-value or standard Coursera navigation anchors
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

    // Resolve courseId from Coursera API if missing
    if (!detectedCourseId && detectedSlug) {
      detectedCourseId = await resolveCourseId(detectedSlug);
    }

    const totalCount = videoItems.length + readingItems.length + discussionItems.length;
    if (totalCount === 0) {
      return { success: false, count: 0 };
    }

    showToast(`🥷 กำลังข้าม ${totalCount} บทเรียน (วิดีโอ: ${videoItems.length}, อ่าน: ${readingItems.length})...`);
    updateProgressBar(0, totalCount);

    let completed = 0;

    // A. Complete Videos
    for (const id of videoItems) {
      try {
        const url = `https://www.coursera.org/api/opencourse.v1/user/${numUserId || user.userId}/course/${detectedSlug}/item/${id}/lecture/videoEvents/ended?autoEnroll=false`;
        await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: standardHeaders,
          body: JSON.stringify({ contentRequestBody: {} })
        });
      } catch (e) {
        console.warn(`[Auto-Cert] Video ${id} failed:`, e);
      }
      completed++;
      updateProgressBar(completed, totalCount);

      if (settings.stealthMode && completed < totalCount) {
        const delay = stealthEngine.getModuleItemDelay();
        await stealthEngine.wait(delay, (sec) => {
          setWidgetStatusText(`⏳ พรางตัว: จำลองการดูวิดีโอ (${completed}/${totalCount}) รออีก ${sec}s...`);
        });
      } else {
        await new Promise(r => setTimeout(r, 60));
      }
    }

    // B. Complete Readings (Supplements)
    for (const id of readingItems) {
      try {
        const res1 = await fetch(`https://www.coursera.org/api/onDemandSupplementCompletions.v1`, {
          method: 'POST',
          credentials: 'include',
          headers: standardHeaders,
          body: JSON.stringify({
            userId: numUserId,
            courseId: detectedCourseId || user.courseId,
            itemId: id
          })
        });

        if (!res1.ok) {
          await fetch(`https://www.coursera.org/api/opencourse.v1/user/${numUserId || user.userId}/course/${detectedSlug}/item/${id}/supplement/events/completed?autoEnroll=false`, {
            method: 'POST',
            credentials: 'include',
            headers: standardHeaders,
            body: JSON.stringify({ contentRequestBody: {} })
          }).catch(() => {});
        }
      } catch (e) {
        console.warn(`[Auto-Cert] Reading ${id} failed:`, e);
      }
      completed++;
      updateProgressBar(completed, totalCount);

      if (settings.stealthMode && completed < totalCount) {
        const delay = stealthEngine.getModuleItemDelay();
        await stealthEngine.wait(delay, (sec) => {
          setWidgetStatusText(`⏳ พรางตัว: จำลองการอ่านบทเรียน (${completed}/${totalCount}) รออีก ${sec}s...`);
        });
      } else {
        await new Promise(r => setTimeout(r, 60));
      }
    }

    // C. Complete Discussion Prompts
    for (const id of discussionItems) {
      try {
        await fetch(`https://www.coursera.org/api/onDemandDiscussionPromptCompletions.v1`, {
          method: 'POST',
          credentials: 'include',
          headers: standardHeaders,
          body: JSON.stringify({
            userId: numUserId,
            courseId: detectedCourseId || user.courseId,
            itemId: id
          })
        });
      } catch (e) {
        console.warn(`[Auto-Cert] Discussion ${id} failed:`, e);
      }
      completed++;
      updateProgressBar(completed, totalCount);
      await new Promise(r => setTimeout(r, 60));
    }

    showToast(`✅ ข้ามเรียบร้อย ${completed} บทเรียนอย่างแนบเนียน!`);
    
    // Only reload if NOT running inside Auto-Pilot chain
    if (!skipReload) {
      setTimeout(() => location.reload(), 1500);
    }

    return { success: true, count: completed };
  }

  // --- FEATURE 2: Universal AI Quiz Solver with Gemini & Max Stealth ---
  function findQuizQuestions() {
    const questions = [];

    // 1. Group Radio Inputs by Name (Single Choice)
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const radioGroups = {};

    radioInputs.forEach(input => {
      const name = input.getAttribute('name') || 'default_radio_group';
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

      while (container && container.parentElement && container.parentElement !== document.body) {
        const radiosInParent = container.parentElement.querySelectorAll('input[type="radio"]');
        if (radiosInParent.length === inputs.length) {
          container = container.parentElement;
        } else {
          break;
        }
      }

      let promptText = '';
      if (container) {
        const clone = container.cloneNode(true);
        // Only remove option labels, not question legend/header labels
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
          labelText = input.value || `Option ${optIdx + 1}`;
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

    // 2. Group Checkbox Inputs (Multiple Select)
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
          labelText = input.value || `Option ${optIdx + 1}`;
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

    // 3. Dropdown Selects (Fill in the blank / Matching)
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach((sel, idx) => {
      const parent = sel.closest('fieldset, [data-testid="quiz-question"], .rc-FormPartsQuestion') || sel.parentElement;
      const promptText = parent ? parent.innerText.split('\n')[0] : `Dropdown Question ${idx + 1}`;
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

  async function solveCurrentQuiz() {
    await loadSettings();

    if (!settings.geminiApiKey) {
      showToast('❌ กรุณาใส่ Gemini API Key ใน Extension Settings ก่อน');
      return { success: false, error: 'Missing Gemini API Key' };
    }

    const questionItems = findQuizQuestions();

    if (questionItems.length === 0) {
      // If no questions directly on page, check if we are on a module page that has quiz links!
      const quizLinks = findModuleQuizLinks();
      if (quizLinks.length > 0) {
        showToast(`🚀 ตรวจพบข้อสอบใน Module นี้ ${quizLinks.length} ชุด! เริ่ม Auto-Pilot ทันที...`);
        const state = {
          active: true,
          moduleUrl: window.location.href,
          quizUrls: quizLinks,
          currentIndex: 0
        };
        await setAutoPilotState(state);
        await stealthEngine.wait(1500);
        window.location.href = quizLinks[0];
        return { success: true, count: 0, autoPilot: true };
      }

      showToast('⚠️ ไม่พบโจทย์ข้อสอบในหน้านี้');
      return { success: false, error: 'No questions found' };
    }

    showToast(`🤖 พบโจทย์ ${questionItems.length} ข้อ เริ่มวิเคราะห์และทำข้อสอบโหมดพรางตัว...`);

    // Pick 1 question for intentional imperfection if enabled
    const imperfectIndex = (settings.realisticGrades && questionItems.length >= 5) 
      ? Math.floor(Math.random() * (questionItems.length - 2)) + 1 
      : -1;

    let solvedCount = 0;

    for (let i = 0; i < questionItems.length; i++) {
      const q = questionItems[i];

      // Smooth scroll to question
      try {
        if (q.container) {
          q.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {}

      // Human-like reading delay before answering
      if (settings.stealthMode) {
        const readingDelay = stealthEngine.calculateReadingDelay(q.prompt);
        await stealthEngine.wait(readingDelay, (sec) => {
          setWidgetStatusText(`⏳ กำลังอ่านโจทย์ข้อ ${i + 1}/${questionItems.length} (รอ ${sec}s)...`);
        });
      }

      try {
        // Call Gemini
        const result = await geminiSolver.solveQuestion(
          q.prompt,
          q.options,
          q.type,
          userInfo.slug || document.title
        );

        let targetIndices = result.selected_indices || [];

        // Apply realistic grade imperfection on 1 question if toggled
        if (i === imperfectIndex && targetIndices.length === 1 && q.options.length > 2) {
          const correctIdx = targetIndices[0];
          const distractorIdx = (correctIdx + 1) % q.options.length;
          targetIndices = [distractorIdx];
          console.log(`[Auto-Cert Stealth] Applied realistic score distractor on Q${i+1}`);
        }

        if (targetIndices.length > 0) {
          if (q.type === 'select' && q.optionElements[0]) {
            const sel = q.optionElements[0];
            sel.selectedIndex = targetIndices[0];
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (q.type === 'multiple') {
            // Multi-Select: Synchronize checked states cleanly
            for (let optIdx = 0; optIdx < q.optionElements.length; optIdx++) {
              const target = q.optionElements[optIdx];
              const shouldBeChecked = targetIndices.includes(optIdx);
              if (shouldBeChecked && !target.checked) {
                await stealthEngine.simulateHumanClick(target);
              } else if (!shouldBeChecked && target.checked) {
                await stealthEngine.simulateHumanClick(target);
              }
              const parentBox = target.closest('label') || target.parentElement;
              if (parentBox && shouldBeChecked) {
                parentBox.classList.add('autocert-option-selected');
              }
            }
          } else {
            // Single Choice: Select Answer with simulated human click
            for (const idx of targetIndices) {
              if (q.optionElements[idx]) {
                const target = q.optionElements[idx];
                await stealthEngine.simulateHumanClick(target);

                const parentBox = target.closest('label') || target.parentElement;
                if (parentBox) {
                  parentBox.classList.add('autocert-option-selected');
                }
              }
            }
          }

          // Add confidence tag
          if (q.container) {
            let tag = q.container.querySelector('.autocert-confidence-tag');
            if (!tag) {
              tag = document.createElement('div');
              tag.className = 'autocert-confidence-tag';
              q.container.appendChild(tag);
            }
            const isImperfect = (i === imperfectIndex);
            tag.innerHTML = isImperfect 
              ? `🎯 AI จำลองคำตอบสมจริง (~90% Mode)`
              : `✨ AI เฉลย: ${(result.confidence * 100).toFixed(0)}% • ${result.explanation ? result.explanation.substring(0, 80) + '...' : 'เลือกเรียบร้อย'}`;
          }

          solvedCount++;
        }
      } catch (err) {
        console.error(`[Auto-Cert] Error solving question ${i + 1}:`, err);
      }

      await new Promise(r => setTimeout(r, 400));
    }

    // 1. Check Honor Code checkbox
    await checkHonorCode();

    showToast(`🎉 ทำข้อสอบเสร็จเรียบร้อย ${solvedCount}/${questionItems.length} ข้อ!`);
    setWidgetStatusText(`✅ ทำข้อสอบเสร็จสิ้น ${solvedCount}/${questionItems.length} ข้อ`);

    // 2. Auto submit if enabled or running in Auto-Pilot
    const autoPilotState = await getAutoPilotState();
    const isAutoPilot = autoPilotState && autoPilotState.active;

    if (settings.autoSubmit || isAutoPilot) {
      if (settings.stealthMode) {
        const reviewDelay = stealthEngine.getPreSubmitReviewDelay();
        await stealthEngine.wait(reviewDelay, (sec) => {
          setWidgetStatusText(`⏳ กำลังตรวจทานคำตอบก่อนส่ง (รออีก ${sec}s)...`);
        });
      }
      await submitQuizSafely();
    }

    return { success: true, count: solvedCount };
  }

  // Robust Honor Code Checkbox Handler (Matches Athena UI & standard checkboxes)
  async function checkHonorCode() {
    let checkbox = null;

    // A. Specific search
    checkbox = document.querySelector(
      'input[type="checkbox"][name*="honor"], ' +
      'input[type="checkbox"][id*="honor"], ' +
      'input[type="checkbox"][aria-label*="Honor"], ' +
      'input[type="checkbox"][aria-label*="agree"], ' +
      'input[type="checkbox"][aria-label*="understand"]'
    );

    // B. Search all checkboxes by container text
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
          break;
        }
      }
    }

    // C. Fallback to the last checkbox on the page
    if (!checkbox) {
      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      if (allCheckboxes.length > 0) {
        checkbox = allCheckboxes[allCheckboxes.length - 1];
      }
    }

    if (checkbox) {
      try {
        checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}

      await stealthEngine.wait(500);

      const parentLabel = checkbox.closest('label') || checkbox.parentElement;
      if (parentLabel && parentLabel !== checkbox) {
        parentLabel.click();
      }

      checkbox.click();
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      console.log('[Auto-Cert] Honor code checkbox checked successfully');
      await stealthEngine.wait(400);
    }

    return checkbox;
  }

  // Safe Submit Button Handler with Modal Confirmation
  async function submitQuizSafely() {
    await checkHonorCode();
    await stealthEngine.wait(600);

    const submitBtn = findSubmitButton();
    if (!submitBtn) {
      console.warn('[Auto-Cert] Submit button not found');
      return false;
    }

    // If still disabled, re-trigger honor code click
    if (submitBtn.disabled || submitBtn.getAttribute('aria-disabled') === 'true') {
      console.log('[Auto-Cert] Submit button still disabled, re-checking honor code...');
      await checkHonorCode();
      await stealthEngine.wait(800);
    }

    try {
      submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}

    await stealthEngine.wait(400);
    await stealthEngine.simulateHumanClick(submitBtn);
    showToast('🚀 ส่งคำตอบเรียบร้อยแล้ว');

    // Check for confirmation modal dialog popup
    await stealthEngine.wait(1200);
    const modalButtons = document.querySelectorAll('[role="dialog"] button, .rc-Modal button, div[class*="modal"] button');
    for (const mb of modalButtons) {
      const txt = mb.innerText.trim().toLowerCase();
      if ((txt.includes('submit') || txt.includes('confirm') || txt.includes('ส่ง')) && !txt.includes('cancel')) {
        console.log('[Auto-Cert] Confirmation modal detected, clicking confirm...');
        await stealthEngine.simulateHumanClick(mb);
        break;
      }
    }

    return true;
  }

  // Safe Submit Button Resolver
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

  // --- FEATURE 3: Floating UI Widget with Clean Modern HUD ---
  function injectFloatingWidget() {
    if (document.getElementById('autocert-floating-widget')) return;

    floatingWidgetEl = document.createElement('div');
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

    // Event Bindings for Widget
    const panel = document.getElementById('autocertPanel');
    const minBtn = document.getElementById('autocertMinimizeBtn');
    const cancelBtn = document.getElementById('autocertCancelBtn');
    const autoPilotBtn = document.getElementById('autocertAutoPilotBtn');
    const bypassBtn = document.getElementById('autocertBypassBtn');
    const quizBtn = document.getElementById('autocertQuizBtn');
    const statusText = document.getElementById('autocertStatusText');

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
      statusText.innerText = 'Starting Full Auto-Pilot...';
      await startFullAutoPilot();
      autoPilotBtn.disabled = false;
    });

    bypassBtn.addEventListener('click', async () => {
      bypassBtn.disabled = true;
      statusText.innerText = 'Bypassing items...';
      await bypassCurrentModule(false);
      bypassBtn.disabled = false;
    });

    quizBtn.addEventListener('click', async () => {
      quizBtn.disabled = true;
      statusText.innerText = 'Solving with Gemini AI...';
      await solveCurrentQuiz();
      quizBtn.disabled = false;
    });

    // Speed buttons
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
      statusEl.innerText = `Coursera Active (${userInfo.userId}) • Stealth`;
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

  // Toast Notification System
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

  // Start initialization
  init();
})();
