// Test Dynamic Identity Extraction & Signature Input Population
function testDynamicSignatureExtraction() {
  console.log("=== Testing Dynamic Identity Extraction & Signature Input ===");

  // Mock Coursera Athena DOM with Honor Code checkbox containing user's name
  const mockHonorLabel = "I, Chutiphon Jitrungruangsuk, understand and agree that this work is my own.";
  
  // Name extraction regex
  const nameMatch = mockHonorLabel.match(/I,\s*([A-Za-z\s]+?),\s*understand and agree/i);
  let extractedName = nameMatch ? nameMatch[1].trim() : '';

  console.log("Extracted Name from Honor text:", extractedName);
  if (extractedName !== "Chutiphon Jitrungruangsuk") {
    throw new Error(`Failed to extract user name. Got "${extractedName}"`);
  }

  // Mock signature input field
  const mockSignatureInput = {
    tagName: 'INPUT',
    type: 'text',
    id: 'signature-name-input',
    placeholder: 'Type your full legal name',
    value: '',
    dispatchEvent: function() {}
  };

  mockSignatureInput.value = extractedName;
  console.log("Signature Input Value:", mockSignatureInput.value);

  if (mockSignatureInput.value !== "Chutiphon Jitrungruangsuk") {
    throw new Error("Signature input population failed");
  }

  console.log("✅ [PASS] Successfully extracted full name and populated signature field!");
}

testDynamicSignatureExtraction();
