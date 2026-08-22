// Test harness for Gemini API Client
global.window = {};
require('../coursera-extension/gemini.js');

const { getApiKey } = require('./load_env.js');
const GeminiQuizSolver = window.GeminiQuizSolver;

const testApiKey = getApiKey();

async function runTests() {
  console.log("=== Testing GeminiQuizSolver with Updated Models ===");
  
  const models = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  
  for (const model of models) {
    console.log(`\n--- Testing model: ${model} ---`);
    const solver = new GeminiQuizSolver(testApiKey, model);
    try {
      const res = await solver.testConnection();
      console.log(`[PASS] Test Connection: "${res}"`);
    } catch (e) {
      console.error(`[FAIL] Test Connection:`, e.message);
      continue;
    }

    try {
      console.log(`Testing solveQuestion on single-choice quiz...`);
      const qPrompt = "What is the primary function of a Convolutional Neural Network (CNN)?";
      const options = [
        "Processing tabular database records",
        "Extracting spatial visual features from image and grid data",
        "Managing audio sample rates in hardware",
        "Sorting alphabetical strings"
      ];
      const answer = await solver.solveQuestion(qPrompt, options, 'single', 'Deep Learning Basics');
      console.log(`[PASS] Solve Question Result:`, JSON.stringify(answer, null, 2));
    } catch (e) {
      console.error(`[FAIL] Solve Question:`, e.message);
    }

    try {
      console.log(`Testing solveQuestion on multiple-choice quiz (checkbox)...`);
      const qPrompt = "Which of the following are supervised learning algorithms? (Select all that apply)";
      const options = [
        "Linear Regression",
        "K-Means Clustering",
        "Random Forest",
        "PCA (Principal Component Analysis)"
      ];
      const answer = await solver.solveQuestion(qPrompt, options, 'multiple', 'Machine Learning');
      console.log(`[PASS] Multiple Choice Result:`, JSON.stringify(answer, null, 2));
    } catch (e) {
      console.error(`[FAIL] Multiple Choice:`, e.message);
    }
  }
}

runTests();
