// Test Honor Code & Submit Resolution
function testHonorCodeResolution() {
  console.log("=== Testing Honor Code Detection on Coursera Athena UI ===");

  // Mock Coursera Athena DOM
  const mockAthenaCheckbox = {
    tagName: 'INPUT',
    type: 'checkbox',
    id: 'cds-react-aria-1049',
    name: 'cds-checkbox-1049',
    checked: false,
    parentElement: {
      innerText: 'I, Chutiphon Jitrungruangsuk, understand and agree.\nYou must select the checkbox in order to submit the assignment',
      closest: () => null
    },
    click: function() { this.checked = true; },
    dispatchEvent: () => {}
  };

  const allCheckboxes = [mockAthenaCheckbox];

  // Detection Algorithm
  let detectedCb = null;
  for (const cb of allCheckboxes) {
    const parentText = (cb.parentElement?.innerText || '').toLowerCase();
    if (
      parentText.includes('understand and agree') ||
      parentText.includes('honor code') ||
      parentText.includes('confirm this work is your own') ||
      parentText.includes('agree')
    ) {
      detectedCb = cb;
      break;
    }
  }

  if (!detectedCb) {
    throw new Error("Failed to detect Athena Honor Code checkbox");
  }

  detectedCb.click();
  console.log(`✅ [PASS] Detected Athena Checkbox with ID: ${detectedCb.id}`);
  console.log(`✅ [PASS] Checkbox checked state: ${detectedCb.checked}`);
  console.log("\n🏆 Honor Code Detection Test Passed!");
}

testHonorCodeResolution();
