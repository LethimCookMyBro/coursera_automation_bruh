// Injected script - Runs in MAIN execution context of Coursera page
(function () {
  console.log('[Auto-Cert Pro] Page Bridge Injected');

  function getUserId() {
    try {
      if (window.App?.context?.dispatcher?.stores?.ApplicationStore?.userData?.id) {
        return window.App.context.dispatcher.stores.ApplicationStore.userData.id;
      }
    } catch (e) {}

    try {
      if (window.__INITIAL_DATA__?.user?.id) {
        return window.__INITIAL_DATA__.user.id;
      }
    } catch (e) {}

    try {
      const match = document.cookie.match(/__204u=([^;]+)/);
      if (match) return match[1];
    } catch (e) {}

    return null;
  }

  function getCourseData() {
    let slug = '';
    let courseId = '';

    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'learn' && parts[1]) {
      slug = parts[1];
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

    return { slug, courseId, userId: getUserId() };
  }

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

  // Initial broadcast when ready
  setTimeout(() => {
    const info = getCourseData();
    window.postMessage({
      source: 'AUTOCERT_PAGE',
      type: 'USER_INFO_RESPONSE',
      data: info
    }, '*');
  }, 1000);
})();
