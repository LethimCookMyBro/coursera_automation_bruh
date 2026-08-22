// Test Quiz Parser against the exact questions from user's screenshot
global.window = {};
require('../coursera-extension/gemini.js');

const { getApiKey } = require('./load_env.js');
const GeminiQuizSolver = window.GeminiQuizSolver;
const testApiKey = getApiKey();

async function testScreenshotQuestions() {
  console.log("=== Testing 4 Questions from User's Screenshot ===");
  const solver = new GeminiQuizSolver(testApiKey, 'gemini-flash-latest');

  const questions = [
    {
      num: 1,
      prompt: "In computing, which of the following best describes a device driver?",
      options: [
        "A program that an OS uses to communicate instructions to a device.",
        "A set of rules for interacting with a program.",
        "A hardware component that is required to connect devices to a computer."
      ],
      expectedIndex: 0 // Program OS uses to communicate with device
    },
    {
      num: 2,
      prompt: "What is a firewall?",
      options: [
        "A digital wall that retains items with much traffic that could potentially trend and go viral.",
        "A block or filter that monitors incoming traffic and prevents harmful entities from entering.",
        "A type of software that prevents an organization from accessing its own applications."
      ],
      expectedIndex: 1 // Block or filter that monitors traffic
    },
    {
      num: 3,
      prompt: "Malicious software that is hiding in other software is known as a _____.",
      options: [
        "botnet",
        "ransomware",
        "Trojan"
      ],
      expectedIndex: 2 // Trojan
    },
    {
      num: 4,
      prompt: "True or False: An attacker has discovered the password for Sam's personal email, but it doesn't work for Sam's work email. Sam's work email account is now safe.",
      options: [
        "True",
        "False"
      ],
      expectedIndex: 1 // False (password reuse / credential stuffing / risk)
    }
  ];

  let passed = 0;
  for (const q of questions) {
    console.log(`\n▶ [Question ${q.num}] ${q.prompt}`);
    try {
      const res = await solver.solveQuestion(q.prompt, q.options, 'single', 'Cybersecurity Basics');
      console.log(`  Chosen Option: [${res.selected_indices[0]}] "${q.options[res.selected_indices[0]]}"`);
      console.log(`  Confidence: ${(res.confidence * 100).toFixed(0)}%`);
      console.log(`  Explanation: ${res.explanation}`);

      if (res.selected_indices[0] === q.expectedIndex) {
        console.log(`  ✅ [PASS] Correct answer!`);
        passed++;
      } else {
        console.error(`  ❌ [FAIL] Expected [${q.expectedIndex}], got [${res.selected_indices[0]}]`);
      }
    } catch (e) {
      console.error(`  ❌ [ERROR] ${e.message}`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🏆 Result on User's Screenshot: ${passed}/${questions.length} Passed`);
  console.log(`==================================================`);
}

testScreenshotQuestions();
