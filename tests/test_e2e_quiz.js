// Comprehensive End-to-End Simulation Test
global.window = {};
require('../coursera-extension/gemini.js');

const { getApiKey } = require('./load_env.js');
const GeminiQuizSolver = window.GeminiQuizSolver;
const testApiKey = getApiKey();

async function runE2ESimulation() {
  console.log("==================================================");
  console.log("🧪 STARTING E2E QUIZ SOLVER & GEMINI API SUITE");
  console.log("==================================================");

  const solver = new GeminiQuizSolver(testApiKey, 'gemini-flash-latest');

  // Test Case 1: Complex Multiple Choice Python / Data Science
  const quiz1 = {
    prompt: `Consider the following Python snippet:
\`\`\`python
import numpy as np
a = np.array([1, 2, 3])
b = a.copy()
b[0] = 99
\`\`\`
Which of the following statements is TRUE regarding \`a\` and \`b\`?`,
    options: [
      "a[0] will also change to 99 because b is a shallow view of a",
      "a[0] remains 1 because b is an independent deep copy of a",
      "Python will raise a ValueError when modifying b",
      "b is a tuple and cannot be mutated"
    ],
    type: "single",
    expectedIndex: 1
  };

  // Test Case 2: Machine Learning Multi-Select (Checkboxes)
  const quiz2 = {
    prompt: `Which of the following techniques can help mitigate overfitting in a deep neural network? (Select all that apply)`,
    options: [
      "Applying L1/L2 Weight Regularization",
      "Adding Dropout layers during training",
      "Using Early Stopping on validation loss",
      "Increasing the model parameters without additional training data"
    ],
    type: "multiple",
    expectedIndices: [0, 1, 2]
  };

  // Test Case 3: Math / Algorithm True or False
  const quiz3 = {
    prompt: `True or False: The time complexity of searching an element in a balanced Binary Search Tree (BST) with N nodes is O(log N) in the worst case.`,
    options: [
      "True",
      "False"
    ],
    type: "single",
    expectedIndex: 0
  };

  const testCases = [quiz1, quiz2, quiz3];

  let passed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n▶ [Test ${i + 1}] Testing "${tc.prompt.substring(0, 50)}..."`);
    try {
      const res = await solver.solveQuestion(tc.prompt, tc.options, tc.type, "Computer Science");
      console.log(`  Model Used: ${res.modelUsed}`);
      console.log(`  Selected Indices: ${JSON.stringify(res.selected_indices)}`);
      console.log(`  Confidence: ${(res.confidence * 100).toFixed(0)}%`);
      console.log(`  Explanation: ${res.explanation}`);

      if (tc.type === 'single') {
        if (res.selected_indices[0] === tc.expectedIndex) {
          console.log(`  ✅ [PASS] Expected index ${tc.expectedIndex}, got ${res.selected_indices[0]}`);
          passed++;
        } else {
          console.error(`  ❌ [FAIL] Expected index ${tc.expectedIndex}, got ${res.selected_indices[0]}`);
        }
      } else {
        const matches = tc.expectedIndices.every(idx => res.selected_indices.includes(idx)) &&
                        res.selected_indices.length === tc.expectedIndices.length;
        if (matches) {
          console.log(`  ✅ [PASS] Expected indices ${JSON.stringify(tc.expectedIndices)}, got ${JSON.stringify(res.selected_indices)}`);
          passed++;
        } else {
          console.error(`  ❌ [FAIL] Expected ${JSON.stringify(tc.expectedIndices)}, got ${JSON.stringify(res.selected_indices)}`);
        }
      }
    } catch (e) {
      console.error(`  ❌ [ERROR] ${e.message}`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🏆 TEST RESULTS: ${passed}/${testCases.length} Passed (${Math.round(passed / testCases.length * 100)}%)`);
  console.log(`==================================================`);
}

runE2ESimulation();
