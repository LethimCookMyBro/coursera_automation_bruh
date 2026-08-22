// Unit test for Stealth Engine
global.window = {};
require('../coursera-extension/stealth.js');

const StealthEngine = global.window.StealthEngine;

function testStealthEngine() {
  console.log("=== Testing Stealth & Human Simulation Engine ===");

  const stealth = new StealthEngine();

  // Test 1: Random Jitter within range
  for (let i = 0; i < 10; i++) {
    const jitter = stealth.getJitter(1000, 3000);
    if (jitter < 1000 || jitter > 3000) {
      throw new Error(`Jitter ${jitter} out of range [1000, 3000]`);
    }
  }
  console.log("✅ [PASS] Jitter Generator produces valid bounded values");

  // Test 2: Reading Time Calculation
  const shortPrompt = "What is a firewall?"; // 19 chars
  const shortDelay = stealth.calculateReadingDelay(shortPrompt);
  console.log(`  Short Prompt (${shortPrompt.length} chars) -> Delay: ${(shortDelay/1000).toFixed(1)}s`);
  if (shortDelay < 3000) {
    throw new Error(`Short delay ${shortDelay} should be at least 3000ms`);
  }

  const longPrompt = "Consider an enterprise environment where multiple virtual private clouds (VPCs) are peered across regions. When an attacker compromises an endpoint within subnet A, which mechanism best prevents lateral movement to database cluster B located in subnet C?";
  const longDelay = stealth.calculateReadingDelay(longPrompt);
  console.log(`  Long Prompt (${longPrompt.length} chars) -> Delay: ${(longDelay/1000).toFixed(1)}s`);
  if (longDelay <= shortDelay) {
    throw new Error(`Long delay (${longDelay}) should be greater than short delay (${shortDelay})`);
  }
  console.log("✅ [PASS] Reading Delay scales realistically with text length");

  // Test 3: Module Item Delay
  const itemDelay = stealth.getModuleItemDelay();
  console.log(`  Module Item Bypass Delay: ${(itemDelay/1000).toFixed(1)}s`);
  if (itemDelay < 2500 || itemDelay > 8500) {
    throw new Error(`Module item delay ${itemDelay} out of expected human range`);
  }
  console.log("✅ [PASS] Module Item Delay is within human pacing bounds");

  console.log("\n🏆 Stealth Engine Unit Tests Passed (3/3)");
}

testStealthEngine();
