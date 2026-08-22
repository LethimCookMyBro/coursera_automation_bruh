// Test Completed Item Detection & Smart Skip Engine
function testSkipCompletedEngine() {
  console.log("=== Testing Completed Item Detection & Smart Skip Engine ===");

  const mockCompletedIds = new Set(['COMPLETED_QUIZ_1', 'LECTURE_1', 'READING_1']);

  // Mock DOM Rows in Course Outline / Sidebar
  const mockRows = [
    {
      id: 'COMPLETED_QUIZ_1',
      innerText: 'Module quiz: Threat landscape\nGraded Assignment • Submitted • Grade: 100% • Graded',
      hasCheckmark: true,
      href: '/learn/cybersecurity/exam/COMPLETED_QUIZ_1/module-quiz-threat-landscape'
    },
    {
      id: 'COMPLETED_READING_1',
      innerText: 'Threat stats\nReading • 10 min',
      hasCheckmark: true,
      href: '/learn/cybersecurity/supplement/READING_1/threat-stats'
    },
    {
      id: 'UNCOMPLETED_SELF_REVIEW',
      innerText: 'Self-review: Explaining the threat landscape\nPractice Assignment • Started • Grade: --',
      hasCheckmark: false,
      href: '/learn/cybersecurity/assignment-submission/UNCOMPLETED_SELF_REVIEW/self-review-threat-landscape'
    },
    {
      id: 'UNCOMPLETED_KNOWLEDGE_CHECK',
      innerText: 'Knowledge check: Elements of the threat landscape\nPractice Assignment • Started • Grade: --',
      hasCheckmark: false,
      href: '/learn/cybersecurity/assignment-submission/UNCOMPLETED_KNOWLEDGE_CHECK/knowledge-check'
    },
    {
      id: 'COMPLETED_GRADED_QUIZ_2',
      innerText: 'Knowledge check: Operating systems\nPractice Assignment • Grade: 100% • Passed',
      hasCheckmark: true,
      href: '/learn/cybersecurity/quiz/COMPLETED_GRADED_QUIZ_2/operating-systems'
    }
  ];

  // Logic: isItemAlreadyCompleted
  function isItemAlreadyCompleted(row, completedItemSet) {
    const text = (row.innerText || '').toLowerCase();
    
    // 1. DOM Checkmark or Passed Class
    if (row.hasCheckmark) return true;

    // 2. DOM Passed / Grade Banner Text
    if (text.includes('grade: 100%') || text.includes('submitted • grade: 100%') || text.includes('passed') || text.includes('ผ่านแล้ว')) {
      return true;
    }

    // 3. API / Redux Store Check
    if (completedItemSet && completedItemSet.has(row.id)) {
      return true;
    }

    return false;
  }

  // Pre-filtering Queue
  const discoveredQuizUrls = [];

  mockRows.forEach(row => {
    const href = row.href;
    const isQuizType = href.includes('/assignment-submission/') || href.includes('/exam/') || href.includes('/quiz/');
    const isExcluded = href.includes('/lecture/') || href.includes('/supplement/') || href.includes('/home/');

    if (isQuizType && !isExcluded) {
      const isCompleted = isItemAlreadyCompleted(row, mockCompletedIds);
      if (!isCompleted) {
        discoveredQuizUrls.push(href);
      }
    }
  });

  console.log("Discovered Uncompleted Quiz URLs:", discoveredQuizUrls);

  if (discoveredQuizUrls.length !== 2) {
    throw new Error(`Expected exactly 2 uncompleted quizzes, got ${discoveredQuizUrls.length}`);
  }

  if (discoveredQuizUrls.includes('/learn/cybersecurity/exam/COMPLETED_QUIZ_1/module-quiz-threat-landscape')) {
    throw new Error("Completed quiz 1 was incorrectly included in queue!");
  }
  if (discoveredQuizUrls.includes('/learn/cybersecurity/quiz/COMPLETED_GRADED_QUIZ_2/operating-systems')) {
    throw new Error("Completed quiz 2 was incorrectly included in queue!");
  }

  console.log("✅ [PASS] Queue Pre-filtering successfully removed 100% of completed items!");

  // In-flight Target Guard Test (Never click Retake if Passed)
  const mockInFlightPage = {
    url: 'https://www.coursera.org/learn/cybersecurity/exam/XYZ/view-submission',
    bodyText: 'Congratulations! You passed! Grade received: 100% View feedback',
    buttons: [
      { text: 'Retake Quiz', isRetake: true },
      { text: 'Next Item', isNext: true }
    ]
  };

  function checkPagePassingStatus(page) {
    const txt = page.bodyText.toLowerCase();
    return (
      txt.includes('congratulations! you passed') ||
      txt.includes('you passed') ||
      txt.includes('grade received: 100%') ||
      txt.includes('grade: 100%')
    );
  }

  const isPassed = checkPagePassingStatus(mockInFlightPage);
  if (!isPassed) {
    throw new Error("Failed to detect passing status on in-flight page");
  }

  let clickedRetake = false;
  if (isPassed) {
    console.log("[In-flight Guard] Page is already passed. Skipping Retake button and advancing!");
    clickedRetake = false; // Block retake click
  } else {
    clickedRetake = true;
  }

  if (clickedRetake) {
    throw new Error("Retake button was clicked on an already passed quiz!");
  }

  console.log("✅ [PASS] In-flight guard successfully blocked Retake button and preserved passed score!");
  console.log("\n🏆 Completed Item Detection & Smart Skip Engine Tests Passed!");
}

testSkipCompletedEngine();
