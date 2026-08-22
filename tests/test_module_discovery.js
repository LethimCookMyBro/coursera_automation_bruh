// Test Module Discovery & Self-Review Parsing
function testModuleDiscovery() {
  console.log("=== Testing Module Item Discovery ===");

  // Mock DOM of Coursera Module Outline Page
  const mockItems = [
    {
      title: "Self-review: Explaining the threat landscape",
      subtext: "Practice Assignment • 10 min • Grade: --",
      href: "/learn/intro-to-cybersecurity/supplement/ABC12/self-review-explaining-the-threat-landscape",
      completed: false
    },
    {
      title: "Exemplar: Explaining the threat landscape",
      subtext: "Reading • 10 min",
      href: "/learn/intro-to-cybersecurity/supplement/ABC13/exemplar-explaining-the-threat-landscape",
      completed: false,
      locked: true
    },
    {
      title: "Knowledge check: Elements of the threat landscape",
      subtext: "Practice Assignment • 15 min • Grade: --",
      href: "/learn/intro-to-cybersecurity/assignment-submission/HN7X7/knowledge-check",
      completed: false
    },
    {
      title: "Additional resources",
      subtext: "Reading • 5 min",
      href: "/learn/intro-to-cybersecurity/supplement/ABC14/additional-resources",
      completed: true
    }
  ];

  const pendingQuizzes = [];
  mockItems.forEach(item => {
    if (!item.completed && !item.locked) {
      if (
        item.subtext.includes("Practice Assignment") ||
        item.subtext.includes("Graded Assignment") ||
        item.subtext.includes("Quiz") ||
        item.href.includes("/assignment-submission/") ||
        item.href.includes("/quiz/") ||
        item.href.includes("/exam/") ||
        item.title.includes("Self-review") ||
        item.title.includes("Knowledge check")
      ) {
        pendingQuizzes.push(item.href);
      }
    }
  });

  console.log(`Discovered ${pendingQuizzes.length} pending assignments:`, pendingQuizzes);
  if (pendingQuizzes.length !== 2) {
    throw new Error(`Expected 2 pending assignments, found ${pendingQuizzes.length}`);
  }
  console.log("✅ [PASS] Discovered all uncompleted Practice Assignments and Knowledge Checks!");
}

testModuleDiscovery();
