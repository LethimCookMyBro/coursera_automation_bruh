// Popup Script for Coursera Auto-Cert Pro

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const pageTitle = document.getElementById('pageTitle');
  const pageDesc = document.getElementById('pageDesc');
  const courseraStatusText = document.getElementById('courseraStatusText');
  const actionStatusMsg = document.getElementById('actionStatusMsg');
  const currentSpeedDisplay = document.getElementById('currentSpeedDisplay');

  const btnBypassModule = document.getElementById('btnBypassModule');
  const btnSolveQuiz = document.getElementById('btnSolveQuiz');
  const btnCopyShareableLink = document.getElementById('btnCopyShareableLink');
  const speedButtons = document.querySelectorAll('.btn-speed');

  // Settings Elements
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnToggleApiKey = document.getElementById('btnToggleApiKey');
  const btnTestApi = document.getElementById('btnTestApi');
  const apiTestResult = document.getElementById('apiTestResult');
  const modelSelect = document.getElementById('modelSelect');
  const toggleStealthMode = document.getElementById('toggleStealthMode');
  const toggleRealisticGrades = document.getElementById('toggleRealisticGrades');
  const toggleAutoSubmit = document.getElementById('toggleAutoSubmit');
  const toggleFloatingWidget = document.getElementById('toggleFloatingWidget');
  const btnSaveSettings = document.getElementById('btnSaveSettings');

  let currentSettings = {
    geminiApiKey: '',
    geminiModel: 'gemini-flash-latest',
    autoSpeed: 2,
    autoSubmit: false,
    floatingWidgetEnabled: true,
    stealthMode: true,
    realisticGrades: false
  };

  // 1. Tab Switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // 2. Load Stored Settings
  await new Promise(resolve => {
    chrome.storage.local.get(['geminiApiKey', 'geminiModel', 'autoSpeed', 'autoSubmit', 'floatingWidgetEnabled', 'stealthMode', 'realisticGrades'], (res) => {
      if (res.geminiApiKey) {
        currentSettings.geminiApiKey = res.geminiApiKey;
        apiKeyInput.value = res.geminiApiKey;
      }
      if (res.geminiModel) {
        currentSettings.geminiModel = res.geminiModel;
        modelSelect.value = res.geminiModel;
      }
      if (res.autoSpeed !== undefined) {
        currentSettings.autoSpeed = res.autoSpeed;
        currentSpeedDisplay.innerText = `${res.autoSpeed}x`;
        updateActiveSpeedButton(res.autoSpeed);
      }
      if (res.autoSubmit !== undefined) {
        currentSettings.autoSubmit = res.autoSubmit;
        toggleAutoSubmit.checked = res.autoSubmit;
      }
      if (res.floatingWidgetEnabled !== undefined) {
        currentSettings.floatingWidgetEnabled = res.floatingWidgetEnabled;
        toggleFloatingWidget.checked = res.floatingWidgetEnabled;
      }
      if (res.stealthMode !== undefined && toggleStealthMode) {
        currentSettings.stealthMode = res.stealthMode;
        toggleStealthMode.checked = res.stealthMode;
      }
      if (res.realisticGrades !== undefined && toggleRealisticGrades) {
        currentSettings.realisticGrades = res.realisticGrades;
        toggleRealisticGrades.checked = res.realisticGrades;
      }
      resolve();
    });
  });

  // Toggle API Key visibility
  btnToggleApiKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      btnToggleApiKey.innerText = '🔒';
    } else {
      apiKeyInput.type = 'password';
      btnToggleApiKey.innerText = '👁️';
    }
  });

  // Save Settings
  btnSaveSettings.addEventListener('click', () => {
    const updated = {
      geminiApiKey: apiKeyInput.value.trim(),
      geminiModel: modelSelect.value,
      autoSubmit: toggleAutoSubmit.checked,
      floatingWidgetEnabled: toggleFloatingWidget.checked,
      stealthMode: toggleStealthMode ? toggleStealthMode.checked : true,
      realisticGrades: toggleRealisticGrades ? toggleRealisticGrades.checked : false
    };

    chrome.storage.local.set(updated, () => {
      showActionStatus('✅ บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
      // Notify active tab
      sendMessageToActiveTab({ action: 'SETTINGS_UPDATED' });
    });
  });

  // Test Gemini API Key
  btnTestApi.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      apiTestResult.innerHTML = '<span style="color: #f87171;">กรุณาใส่ API Key ก่อนทดสอบ</span>';
      return;
    }

    btnTestApi.disabled = true;
    apiTestResult.innerHTML = '<span style="color: #94a3b8;">กำลังทดสอบการเชื่อมต่อกับ Google Gemini...</span>';

    try {
      const solver = new GeminiQuizSolver(key, modelSelect.value);
      await solver.testConnection();
      apiTestResult.innerHTML = '<span style="color: #34d399;">✅ เชื่อมต่อ Gemini API สำเร็จ! พร้อมใช้งาน</span>';
    } catch (err) {
      apiTestResult.innerHTML = `<span style="color: #f87171;">❌ ล้มเหลว: ${err.message}</span>`;
    } finally {
      btnTestApi.disabled = false;
    }
  });

  // 3. Inspect Active Tab Status
  async function checkTabStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('coursera.org')) {
      pageTitle.innerText = 'ไม่ได้อยู่ในหน้า Coursera';
      pageDesc.innerText = 'กรุณาเปิดหน้าเว็บ Coursera เพื่อใช้งาน';
      courseraStatusText.innerText = 'ออฟไลน์';
      document.querySelector('.status-badge').style.background = 'rgba(239, 68, 68, 0.15)';
      document.querySelector('.status-dot').style.background = '#ef4444';
      return;
    }

    pageTitle.innerText = tab.title ? tab.title.split('|')[0].trim() : 'Coursera Course';
    pageDesc.innerText = tab.url.includes('/learn/') ? 'ตรวจพบคอร์สเรียน พร้อมสำหรับการทำงาน' : 'เปิดหน้าหลักสูตรหรือแบบฝึกหัด';

    // Get live status from content script
    sendMessageToActiveTab({ action: 'GET_STATUS' }, (res) => {
      if (res && res.isQuizPage) {
        pageDesc.innerText = '📝 ตรวจพบหน้าข้อสอบ (Quiz/Exam)';
      }
    });
  }

  checkTabStatus();

  // 4. Action Handlers
  const btnAutoPilotModule = document.getElementById('btnAutoPilotModule');
  if (btnAutoPilotModule) {
    btnAutoPilotModule.addEventListener('click', async () => {
      btnAutoPilotModule.disabled = true;
      showActionStatus('🚀 กำลังเริ่ม Auto-Pilot จบทั้ง Module...', 'info');

      sendMessageToActiveTab({ action: 'START_AUTOPILOT' }, (res) => {
        btnAutoPilotModule.disabled = false;
        if (res && res.success) {
          showActionStatus(`✅ Auto-Pilot กำลังทำงาน...`, 'success');
        } else {
          showActionStatus(res?.error || 'เกิดข้อผิดพลาดในการเริ่ม Auto-Pilot', 'error');
        }
      });
    });
  }

  btnBypassModule.addEventListener('click', async () => {
    btnBypassModule.disabled = true;
    showActionStatus('🚀 กำลังส่งคำสั่งข้ามบทเรียนทั้งหมด...', 'info');

    sendMessageToActiveTab({ action: 'BYPASS_MODULE' }, (res) => {
      btnBypassModule.disabled = false;
      if (res && res.success) {
        showActionStatus(`✅ ข้ามเรียบร้อย ${res.count} รายการ!`, 'success');
      } else {
        showActionStatus(res?.error || 'เกิดข้อผิดพลาด หรือไม่พบบทเรียนในหน้านี้', 'error');
      }
    });
  });

  // 5. Pending Items Inspector & Targeted Solve Handlers
  const btnScanPending = document.getElementById('btnScanPending');
  const pendingCountBadge = document.getElementById('pendingCountBadge');
  const pendingListContainer = document.getElementById('pendingListContainer');
  const pendingItemsScrollbox = document.getElementById('pendingItemsScrollbox');
  const selectAllPending = document.getElementById('selectAllPending');
  const selectedCountDisplay = document.getElementById('selectedCountDisplay');
  const targetedBtnCount = document.getElementById('targetedBtnCount');
  const btnTargetedSolve = document.getElementById('btnTargetedSolve');

  let currentPendingList = [];

  function updateSelectedPendingCounts() {
    const checkboxes = pendingItemsScrollbox.querySelectorAll('.pending-item-checkbox');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const count = checked.length;
    
    if (selectedCountDisplay) selectedCountDisplay.innerText = `${count}/${checkboxes.length}`;
    if (targetedBtnCount) targetedBtnCount.innerText = `${count}`;
    if (selectAllPending) selectAllPending.checked = count === checkboxes.length && count > 0;
    if (btnTargetedSolve) btnTargetedSolve.disabled = count === 0;
  }

  if (btnScanPending) {
    btnScanPending.addEventListener('click', () => {
      btnScanPending.disabled = true;
      pendingCountBadge.innerText = 'Scanning...';
      showActionStatus('🔍 กำลังสแกนหารายการที่ยังไม่เสร็จใน Module...', 'info');

      sendMessageToActiveTab({ action: 'SCAN_PENDING_ITEMS' }, (res) => {
        btnScanPending.disabled = false;
        if (res && res.success && res.items) {
          currentPendingList = res.items;
          pendingCountBadge.innerText = `เหลือ ${res.items.length} รายการ`;
          
          if (res.items.length === 0) {
            pendingListContainer.style.display = 'block';
            pendingItemsScrollbox.innerHTML = '<div style="font-size: 11px; color: #34d399; text-align: center; padding: 10px;">🎉 ยอดเยี่ยม! เรียนและสอบผ่านครบทุกรายการแล้ว</div>';
            if (btnTargetedSolve) btnTargetedSolve.style.display = 'none';
            showActionStatus('🎉 ไม่พบรายการที่ค้าง ทำครบหมดแล้ว!', 'success');
            return;
          }

          if (btnTargetedSolve) btnTargetedSolve.style.display = 'flex';
          pendingListContainer.style.display = 'block';
          pendingItemsScrollbox.innerHTML = '';

          res.items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'pending-item-row';
            row.innerHTML = `
              <label class="pending-checkbox-label">
                <input type="checkbox" class="pending-item-checkbox" data-url="${item.url}" checked>
                <span class="pending-type-tag type-${(item.type || 'quiz').toLowerCase()}">[${item.type}]</span>
                <span class="pending-item-title" title="${item.title}">${item.title}</span>
              </label>
            `;
            pendingItemsScrollbox.appendChild(row);
          });

          // Attach checkbox change listeners
          pendingItemsScrollbox.querySelectorAll('.pending-item-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedPendingCounts);
          });

          updateSelectedPendingCounts();
          showActionStatus(`🔍 ตรวจพบ ${res.items.length} รายการที่ต้องทำ`, 'success');
        } else {
          pendingCountBadge.innerText = 'Error';
          showActionStatus(res?.error || 'ไม่สามารถสแกนรายการได้ กรุณาเปิดหน้า Course Module', 'error');
        }
      });
    });
  }

  if (selectAllPending) {
    selectAllPending.addEventListener('change', () => {
      const isChecked = selectAllPending.checked;
      pendingItemsScrollbox.querySelectorAll('.pending-item-checkbox').forEach(cb => {
        cb.checked = isChecked;
      });
      updateSelectedPendingCounts();
    });
  }

  if (btnTargetedSolve) {
    btnTargetedSolve.addEventListener('click', () => {
      const checkboxes = pendingItemsScrollbox.querySelectorAll('.pending-item-checkbox:checked');
      const selectedUrls = Array.from(checkboxes).map(cb => cb.getAttribute('data-url')).filter(Boolean);

      if (selectedUrls.length === 0) {
        showActionStatus('⚠️ กรุณาเลือกอย่างน้อย 1 รายการเพื่อดำเนินการ', 'error');
        return;
      }

      btnTargetedSolve.disabled = true;
      showActionStatus(`🎯 เริ่ม Auto-Pilot เฉพาะ ${selectedUrls.length} รายการที่เลือก...`, 'info');

      sendMessageToActiveTab({ action: 'START_TARGETED_AUTOPILOT', urls: selectedUrls }, (res) => {
        btnTargetedSolve.disabled = false;
        if (res && res.success) {
          showActionStatus(`🚀 กำลังนำทางไปทำ ${selectedUrls.length} รายการที่เลือก...`, 'success');
        } else {
          showActionStatus(res?.error || 'เกิดข้อผิดพลาดในการเริ่ม Targeted Auto-Pilot', 'error');
        }
      });
    });
  }

  btnSolveQuiz.addEventListener('click', async () => {
    if (!apiKeyInput.value.trim()) {
      showActionStatus('⚠️ กรุณาตั้งค่า Gemini API Key ในแท็บ "ตั้งค่า" ก่อน', 'error');
      tabs[1].click();
      return;
    }

    btnSolveQuiz.disabled = true;
    showActionStatus('🤖 กำลังเริ่มวิเคราะห์โจทย์ข้อสอบด้วย AI...', 'info');

    sendMessageToActiveTab({ action: 'SOLVE_QUIZ' }, (res) => {
      btnSolveQuiz.disabled = false;
      if (res && res.success) {
        showActionStatus(`🎉 ทำข้อสอบเสร็จเรียบร้อย ${res.count} ข้อ!`, 'success');
      } else {
        showActionStatus(res?.error || 'ไม่พบข้อสอบในหน้านี้', 'error');
      }
    });
  });

  // Speed Control
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.getAttribute('data-speed'));
      updateActiveSpeedButton(speed);
      currentSpeedDisplay.innerText = `${speed}x`;
      chrome.storage.local.set({ autoSpeed: speed });
      sendMessageToActiveTab({ action: 'SET_SPEED', speed: speed });
    });
  });

  function updateActiveSpeedButton(speed) {
    speedButtons.forEach(b => {
      if (parseFloat(b.getAttribute('data-speed')) === speed) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  // Copy Shareable Peer Link
  btnCopyShareableLink.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      // If on assignment page, format shareable link
      let shareUrl = tab.url;
      if (shareUrl.includes('/submit')) {
        shareUrl = shareUrl.replace('/submit', '/give-feedback');
      }
      navigator.clipboard.writeText(shareUrl);
      showActionStatus('🔗 คัดลอกลิงก์การบ้านลง Clipboard แล้ว!', 'success');
    }
  });

  // Helper to send message to active tab
  function sendMessageToActiveTab(msg, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, msg, (res) => {
          if (chrome.runtime.lastError) {
            // Content script might not be injected yet
            if (callback) callback({ success: false, error: 'กรุณารีเฟรชหน้า Coursera ก่อนใช้งาน' });
          } else if (callback) {
            callback(res);
          }
        });
      }
    });
  }

  function showActionStatus(msg, type) {
    actionStatusMsg.className = `status-msg ${type}`;
    actionStatusMsg.innerText = msg;
    actionStatusMsg.style.display = 'block';
  }
});
