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

  // Simulate human-like mouse hover and click events
  async simulateHumanClick(element) {
    if (!element) return;

    // 1. Dwell / Hover
    if (this.enabled) {
      try {
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      } catch (e) {}
      await this.wait(this.getOptionDwellTime());
    }

    // 2. Sequential pointer and click events
    try {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.click();
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      
      if (element.tagName === 'INPUT') {
        element.checked = true;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (e) {
      element.click();
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
