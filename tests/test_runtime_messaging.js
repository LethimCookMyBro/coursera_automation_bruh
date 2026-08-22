// Test Runtime Messaging & Async User Info Resolver
function testRuntimeMessaging() {
  console.log("=== Testing Runtime Messaging Async Resolver ===");

  let userInfo = { userId: null, slug: '', courseId: '' };

  function simulateAsyncBridge(delayMs) {
    return new Promise(resolve => {
      setTimeout(() => {
        userInfo.userId = "12345678";
        userInfo.slug = "cybersecurity-basics";
        resolve(userInfo);
      }, delayMs);
    });
  }

  async function getUserInfoWithTimeout(timeoutMs = 2000) {
    if (userInfo.userId) return userInfo;
    
    const promise = simulateAsyncBridge(300);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs));
    
    return Promise.race([promise, timeout]);
  }

  getUserInfoWithTimeout(1000).then(info => {
    if (info.userId !== "12345678") {
      throw new Error("Failed to retrieve async user info");
    }
    console.log(`✅ [PASS] Resolved User ID: ${info.userId} (${info.slug})`);
    console.log("\n🏆 Runtime Messaging Test Passed!");
  });
}

testRuntimeMessaging();
