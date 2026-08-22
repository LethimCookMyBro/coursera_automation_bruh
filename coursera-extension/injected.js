// Injected Script - Runs in MAIN Execution Context of Coursera
// Provides high-fidelity access to React/Redux stores and intercepts API lifecycle events

(function () {
  console.log('[Auto-Cert Pro] High-Fidelity Page Bridge Injected');

  function getUserId() {
    try {
      if (window.App?.context?.dispatcher?.stores?.ApplicationStore?.userData?.id) {
        return String(window.App.context.dispatcher.stores.ApplicationStore.userData.id);
      }
    } catch (e) {}

    try {
      if (window.__INITIAL_DATA__?.user?.id) {
        return String(window.__INITIAL_DATA__.user.id);
      }
    } catch (e) {}

    try {
      const match = document.cookie.match(/__204u=([^;]+)/);
      if (match) return String(match[1]);
    } catch (e) {}

    return null;
  }

  function getUserFullName() {
    try {
      if (window.App?.context?.dispatcher?.stores?.ApplicationStore?.userData?.fullName) {
        return window.App.context.dispatcher.stores.ApplicationStore.userData.fullName;
      }
    } catch (e) {}
    try {
      if (window.__INITIAL_DATA__?.user?.fullName) {
        return window.__INITIAL_DATA__.user.fullName;
      }
    } catch (e) {}
    return '';
  }

  function getItemProgresses() {
    const completedItems = new Set();
    
    // 1. Check ProgressStore
    try {
      const progressStore = window.App?.context?.dispatcher?.stores?.ProgressStore;
      if (progressStore?.itemProgresses) {
        Object.entries(progressStore.itemProgresses).forEach(([id, prog]) => {
          if (prog?.isCompleted || prog?.state === 'COMPLETED' || prog?.state === 'PASSED' || (prog?.grade && prog.grade >= (prog.passingFraction || 0.7))) {
            completedItems.add(id);
          }
        });
      }
    } catch (e) {}

    // 2. Check CourseStore / Materials
    try {
      const courseStore = window.App?.context?.dispatcher?.stores?.CourseStore;
      if (courseStore?.course?.materials?.itemProgresses) {
        Object.entries(courseStore.course.materials.itemProgresses).forEach(([id, prog]) => {
          if (prog?.isCompleted || prog?.state === 'COMPLETED' || prog?.state === 'PASSED') {
            completedItems.add(id);
          }
        });
      }
    } catch (e) {}

    // 3. Check __INITIAL_DATA__
    try {
      if (window.__INITIAL_DATA__?.progress?.itemProgresses) {
        Object.entries(window.__INITIAL_DATA__.progress.itemProgresses).forEach(([id, prog]) => {
          if (prog?.isCompleted || prog?.state === 'COMPLETED') completedItems.add(id);
        });
      }
    } catch (e) {}

    return Array.from(completedItems);
  }

  function getCourseData() {
    let slug = '';
    let courseId = '';

    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const learnIdx = parts.indexOf('learn');
    if (learnIdx !== -1 && parts[learnIdx + 1]) {
      slug = parts[learnIdx + 1];
    }

    try {
      if (window.App?.context?.dispatcher?.stores?.ApplicationStore?.currentCourseId) {
        courseId = window.App.context.dispatcher.stores.ApplicationStore.currentCourseId;
      } else if (window.App?.context?.dispatcher?.stores?.CourseStore?.courseId) {
        courseId = window.App.context.dispatcher.stores.CourseStore.courseId;
      } else if (window.App?.context?.dispatcher?.stores?.CourseStore?.course?.id) {
        courseId = window.App.context.dispatcher.stores.CourseStore.course.id;
      }
    } catch (e) {}

    if (!courseId) {
      try {
        const activeData = document.querySelector('[data-click-value]');
        if (activeData) {
          const val = JSON.parse(activeData.getAttribute('data-click-value'));
          if (val.course_id) courseId = val.course_id;
        }
      } catch (e) {}
    }

    return { 
      slug, 
      courseId, 
      userId: getUserId(),
      fullName: getUserFullName(),
      completedItemIds: getItemProgresses()
    };
  }

  // Hook into window.fetch to capture authoritative submission confirmations from Coursera backend
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    const response = await originalFetch.apply(this, args);

    try {
      if (url.includes('/api/onDemandQuizSubmissions.v1') || 
          url.includes('/api/onDemandSupplementCompletions.v1') || 
          url.includes('/api/opencourse.v1') ||
          url.includes('/api/onDemandPeerReviews.v1')) {
        
        const clone = response.clone();
        clone.json().then(data => {
          window.postMessage({
            source: 'AUTOCERT_PAGE',
            type: 'API_ACTIVITY_EVENT',
            data: {
              url,
              status: response.status,
              body: data,
              completedItemIds: getItemProgresses()
            }
          }, '*');
        }).catch(() => {});
      }
    } catch (e) {}

    return response;
  };

  // Listen to requests from content script
  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.source !== 'AUTOCERT_CONTENT') {
      return;
    }

    if (event.data.type === 'GET_USER_INFO') {
      const info = getCourseData();
      window.postMessage({
        source: 'AUTOCERT_PAGE',
        type: 'USER_INFO_RESPONSE',
        data: info
      }, '*');
    }
  });

  // Initial broadcast
  setTimeout(() => {
    const info = getCourseData();
    window.postMessage({
      source: 'AUTOCERT_PAGE',
      type: 'USER_INFO_RESPONSE',
      data: info
    }, '*');
  }, 300);
})();
