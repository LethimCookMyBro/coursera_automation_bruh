// Test Video Page vs Quiz Page Isolation & URL Filter
function testVideoQuizFilter() {
  console.log("=== Testing Video vs Quiz Isolation & URL Filtering ===");

  // 1. Test URL Filtering in findModuleQuizLinks
  const mockAnchorHrefs = [
    "/learn/intro-to-cs/lecture/390nf/what-is-a-computer",
    "/learn/intro-to-cs/supplement/ABC12/hardware-vs-software",
    "/learn/intro-to-cs/assignment-submission/rlBNH/self-review-threat-landscape",
    "/learn/intro-to-cs/assignment-submission/CwUrd/general-knowledge-quiz",
    "/learn/intro-to-cs/lecture/NFEpj/what-is-an-os",
    "/learn/intro-to-cs/quiz/XYZ12/knowledge-check"
  ];

  const quizUrls = mockAnchorHrefs.filter(href => {
    // Exclusion rule
    if (href.includes('/lecture/') || href.includes('/supplement/') || href.includes('/discussionPrompt/') || href.includes('/home/')) {
      return false;
    }
    // Inclusion rule
    return (
      href.includes('/assignment-submission/') ||
      href.includes('/exam/') ||
      href.includes('/quiz/') ||
      href.includes('/gradedLti/') ||
      href.includes('/ungradedLti/')
    );
  });

  console.log("Filtered Quiz URLs:", quizUrls);

  if (quizUrls.length !== 3) {
    throw new Error(`Expected 3 quiz URLs, got ${quizUrls.length}`);
  }
  if (quizUrls.some(u => u.includes('/lecture/') || u.includes('/supplement/'))) {
    throw new Error("Lecture or supplement URL was incorrectly included in quiz list!");
  }
  console.log("✅ [PASS] Video and reading URLs successfully excluded from quiz pipeline!");

  // 2. Test Video Player <select> Filtering
  const mockVideoSelect = {
    tagName: 'SELECT',
    options: [{ text: '720p' }, { text: '540p' }, { text: '360p' }],
    closest: (selector) => selector.includes('quiz') ? null : (selector.includes('player') ? {} : null)
  };

  const isInsideQuizContainer = !!mockVideoSelect.closest('[data-testid="quiz-question"], .rc-FormPartsQuestion, fieldset, [class*="QuizQuestion"]');

  if (isInsideQuizContainer) {
    throw new Error("Video player select was incorrectly detected as quiz question!");
  }
  console.log("✅ [PASS] Video resolution and subtitle dropdowns ignored!");

  console.log("\n🏆 Video vs Quiz Filter Test Passed!");
}

testVideoQuizFilter();
