// Coursera Auto-Cert Pro - Stealth & Human Simulation Engine
// Simulates natural human behavior, reading speeds, mouse dwells, and anti-bot pacing

class StealthEngine {
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.realisticGrades = options.realisticGrades !== undefined ? options.realisticGrades : false;
  }

  // Generate bounded random jitter (Uniform + Box-Muller approximation)
  getJitter(minMs, maxMs) {
    const rand = Math.random();
    return Math.floor(minMs + rand * (maxMs - minMs));
  }

  // Calculate dynamic reading time based on question complexity
  calculateReadingDelay(promptText = '') {
    if (!this.enabled) return 300; // Fast mode if stealth disabled

    const charCount = (promptText || '').trim().length;
    // Human average reading speed: ~200-250 words/min => ~20-25 chars/sec => ~40-50ms per character
    const baseTime = Math.min(Math.max(3000, charCount * 45), 10000);
    const jitter = this.getJitter(800, 2500);

    return Math.floor(baseTime + jitter);
  }

  // Staggered delay between skipping consecutive videos/readings
  getModuleItemDelay() {
    if (!this.enabled) return 50;
    return this.getJitter(3000, 6500);
  }

  // Human dwell time before clicking an option (hover + hesitate)
  getOptionDwellTime() {
    if (!this.enabled) return 50;
    return this.getJitter(400, 900);
  }

  // Pre-submit review delay (mimics reviewing answers before clicking Submit)
  getPreSubmitReviewDelay() {
    if (!this.enabled) return 500;
    return this.getJitter(8000, 15000);
  }

  // Async sleep helper with optional progress callback
  async wait(ms, onTick = null) {
    if (ms <= 0) return;
    
    if (onTick && ms > 1000) {
      const startTime = Date.now();
      while (Date.now() - startTime < ms) {
        const remainingSec = Math.max(0, ((ms - (Date.now() - startTime)) / 1000)).toFixed(1);
        onTick(remainingSec);
        await new Promise(r => setTimeout(r, 200));
      }
    } else {
      await new Promise(r => setTimeout(r, ms));
    }
  }

  // Simulate human-like mouse hover and click events with full pointer sequence
  async simulateHumanClick(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { left: 100, top: 100, width: 20, height: 20 };
    const clientX = Math.floor(rect.left + (rect.width / 2) + (Math.random() * 4 - 2));
    const clientY = Math.floor(rect.top + (rect.height / 2) + (Math.random() * 4 - 2));

    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      screenX: clientX + 50,
      screenY: clientY + 100,
      buttons: 1
    };

    // 1. Dwell / Hover
    if (this.enabled) {
      try {
        if (typeof PointerEvent !== 'undefined') {
          element.dispatchEvent(new PointerEvent('pointerenter', eventInit));
          element.dispatchEvent(new PointerEvent('pointerover', eventInit));
        }
        element.dispatchEvent(new MouseEvent('mouseover', eventInit));
        element.dispatchEvent(new MouseEvent('mouseenter', eventInit));
      } catch (e) {}
      await this.wait(this.getOptionDwellTime());
    }

    // 2. Sequential pointer, focus and click events
    try {
      if (typeof PointerEvent !== 'undefined') {
        element.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      }
      element.dispatchEvent(new MouseEvent('mousedown', eventInit));
      
      if (typeof element.focus === 'function') {
        element.focus();
      }

      if (typeof PointerEvent !== 'undefined') {
        element.dispatchEvent(new PointerEvent('pointerup', eventInit));
      }
      element.dispatchEvent(new MouseEvent('mouseup', eventInit));
      element.click();
      
      if (element.tagName === 'INPUT') {
        // Safe React 18 checked setter
        if (element.type === 'radio' || element.type === 'checkbox') {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement?.prototype || {}, 'checked')?.set;
          if (nativeSetter) {
            nativeSetter.call(element, true);
          } else {
            element.checked = true;
          }
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (e) {
      try { element.click(); } catch (err) {}
    }
  }
}

// Export for Node tests and Browser
if (typeof window !== 'undefined') {
  window.StealthEngine = StealthEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StealthEngine;
}
