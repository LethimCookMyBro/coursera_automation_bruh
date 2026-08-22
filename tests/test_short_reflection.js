const { getApiKey } = require('./load_env.js');
global.window = {};
require('../coursera-extension/gemini.js');

const GeminiQuizSolver = window.GeminiQuizSolver;
const testApiKey = getApiKey();

async function testShortReflection() {
  console.log("=== Testing Ultra-Short Reflection Generator ===");
  const solver = new GeminiQuizSolver(testApiKey, 'gemini-flash-latest');
  
  const prompt = "Explain how social engineering attacks impact modern enterprise networks and what key measures mitigate them.";
  const answer = await solver.generateReflectionAnswer(prompt, "Cybersecurity Fundamentals");

  console.log(`\nGenerated Answer:\n"${answer}"\n`);
  const wordCount = answer.trim().split(/\s+/).length;
  console.log(`Word count: ${wordCount} words`);

  if (wordCount > 65) {
    throw new Error(`Answer is too long (${wordCount} words), expected under 65 words!`);
  }

  console.log("✅ [PASS] Generated concise, context-relevant short response!");
}

testShortReflection();
