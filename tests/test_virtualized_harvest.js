// Test Virtualized DOM Scroll-and-Harvest Logic
function testVirtualizedHarvest() {
  console.log("=== Testing Virtualized Scroll-and-Harvest Logic ===");

  // Mock a virtualized container where only 3 questions are rendered at a time
  let currentScroll = 0;
  const allQuestionsData = [
    { id: 1, prompt: "What is an OS?" },
    { id: 2, prompt: "What is RAM?" },
    { id: 3, prompt: "What is a CPU?" },
    { id: 4, prompt: "What is DNS?" },
    { id: 5, prompt: "What is an IP?" },
    { id: 6, prompt: "What is a Router?" }
  ];

  function getCurrentlyRenderedQuestions(scrollPos) {
    if (scrollPos === 0) return allQuestionsData.slice(0, 3); // top: Q1-3
    return allQuestionsData.slice(3, 6); // scrolled down: Q4-6
  }

  // Progressive Scroll and Harvest Algorithm
  const harvestedQuestions = new Map();

  // Pass 1: Top
  let rendered = getCurrentlyRenderedQuestions(0);
  rendered.forEach(q => harvestedQuestions.set(q.id, q));

  // Pass 2: Scroll Down
  rendered = getCurrentlyRenderedQuestions(1000);
  rendered.forEach(q => harvestedQuestions.set(q.id, q));

  console.log(`Total questions harvested across virtualized views: ${harvestedQuestions.size}`);
  if (harvestedQuestions.size !== 6) {
    throw new Error(`Expected 6 questions, harvested ${harvestedQuestions.size}`);
  }

  console.log("✅ [PASS] Successfully harvested all questions across virtualized scroll views!");
}

testVirtualizedHarvest();
