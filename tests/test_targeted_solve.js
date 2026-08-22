// Test Pending Items Inspector & Targeted Solve Engine
function testTargetedSolveEngine() {
  console.log("=== Testing Pending Items Inspector & Targeted Solve Engine ===");

  const mockDomRows = [
    {
      title: 'Linked threats',
      type: 'Video',
      href: '/learn/cybersecurity/lecture/VIDEO1/linked-threats',
      completed: true
    },
    {
      title: 'Threat stats',
      type: 'Reading',
      href: '/learn/cybersecurity/supplement/READING1/threat-stats',
      completed: true
    },
    {
      title: 'Self-review: Explaining the threat landscape',
      type: 'Assignment',
      href: '/learn/cybersecurity/assignment-submission/ASSIGN1/self-review-threat-landscape',
      completed: false
    },
    {
      title: 'Knowledge check: Elements of the threat landscape',
      type: 'Quiz',
      href: '/learn/cybersecurity/quiz/QUIZ1/knowledge-check',
      completed: false
    },
    {
      title: 'Knowledge check: Introduction to computing devices',
      type: 'Quiz',
      href: '/learn/cybersecurity/quiz/QUIZ2/intro-to-computing',
      completed: false
    }
  ];

  // 1. Scan Pending Items
  function scanPendingItems(rows) {
    const pending = [];
    rows.forEach(r => {
      if (!r.completed) {
        pending.push({
          title: r.title,
          url: 'https://www.coursera.org' + r.href,
          type: r.type
        });
      }
    });
    return pending;
  }

  const pendingItems = scanPendingItems(mockDomRows);
  console.log("Scanned Pending Items:", pendingItems.length);

  if (pendingItems.length !== 3) {
    throw new Error(`Expected 3 pending items, found ${pendingItems.length}`);
  }
  console.log("✅ [PASS] Pending Items Inspector discovered exactly 3 incomplete items!");

  // 2. User Selects Only Specific Items (e.g. 2 out of 3)
  const userSelectedUrls = [
    pendingItems[0].url, // Self-review
    pendingItems[1].url  // Knowledge check 1
  ];

  // 3. Targeted Injection into FSM State
  function createTargetedFSMState(selectedUrls, moduleUrl) {
    if (!selectedUrls || selectedUrls.length === 0) {
      throw new Error("No items selected for targeted solve");
    }

    return {
      active: true,
      currentState: 'NAVIGATING_TARGET',
      moduleUrl: moduleUrl,
      quizUrls: selectedUrls,
      currentIndex: 0
    };
  }

  const fsmState = createTargetedFSMState(userSelectedUrls, 'https://www.coursera.org/learn/cybersecurity/home/week/1');

  if (fsmState.quizUrls.length !== 2) {
    throw new Error(`Targeted FSM queue length mismatch: expected 2, got ${fsmState.quizUrls.length}`);
  }
  if (fsmState.quizUrls.includes('https://www.coursera.org/learn/cybersecurity/quiz/QUIZ2/intro-to-computing')) {
    throw new Error("Unselected item QUIZ2 was incorrectly included in targeted queue!");
  }

  console.log("Targeted Queue Initialized:", fsmState.quizUrls);
  console.log("✅ [PASS] Targeted Solve Engine successfully injected selected URLs without discovery regression!");
  console.log("\n🏆 Pending Items Inspector & Targeted Solve Engine Tests Passed!");
}

testTargetedSolveEngine();
