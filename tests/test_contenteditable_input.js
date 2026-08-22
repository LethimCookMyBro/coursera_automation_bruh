// Test ContentEditable & Rich Text (ProseMirror / Draft.js) Input Handling
function testContentEditableInput() {
  console.log("=== Testing ContentEditable & Rich Text Editor Input Logic ===");

  // 1. Mock ContentEditable DIV (ProseMirror style)
  const mockContentEditable = {
    tagName: 'DIV',
    isContentEditable: true,
    getAttribute: (attr) => attr === 'contenteditable' ? 'true' : null,
    innerText: '',
    innerHTML: '',
    value: undefined, // ContentEditable has NO value property!
    focus: function() {},
    dispatchEvent: function(event) {
      if (event.type === 'input') {
        this.inputDispatched = true;
      }
    }
  };

  const sampleAnswer = "Understanding system threats is vital for effective organizational cyber defense.";

  // Safe Insertion Algorithm
  function fillSmartTextInput(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
      el.focus();
      // In browser: document.execCommand('insertText', false, text);
      el.innerText = text;
      el.innerHTML = `<p>${text}</p>`;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  const success = fillSmartTextInput(mockContentEditable, sampleAnswer);

  if (!success || mockContentEditable.innerText !== sampleAnswer || !mockContentEditable.inputDispatched) {
    throw new Error("ContentEditable insertion failed!");
  }

  console.log("Mock ContentEditable innerText:", mockContentEditable.innerText);
  console.log("Mock ContentEditable innerHTML:", mockContentEditable.innerHTML);
  console.log("✅ [PASS] ContentEditable rich text inserted with input events!");
}

testContentEditableInput();
