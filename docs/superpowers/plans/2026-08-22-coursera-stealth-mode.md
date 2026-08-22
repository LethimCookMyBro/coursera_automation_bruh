# Coursera Stealth & Human Simulation Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a modular Max Stealth & Human Behavior Simulation engine to prevent LMS anti-bot detection.

**Architecture:** Create a dedicated `stealth.js` module that encapsulates human reading time models, Gaussian jitter delays, and smooth interaction handlers, integrated into `content.js`, `popup.js`, and `popup.html`.

**Tech Stack:** Chrome Extension Manifest V3, Pure ES6 JavaScript, HTML5/CSS3.

---

### Task 1: Create `stealth.js` Human Simulation Engine
**Files:**
- Create: `coursera-extension/stealth.js`
- Test: `tests/test_stealth.js`

- [ ] **Step 1: Write `tests/test_stealth.js` unit test**
- [ ] **Step 2: Implement `stealth.js` with Gaussian jitter, human reading delay, and dwell times**
- [ ] **Step 3: Run unit tests and verify calculation accuracy**

---

### Task 2: Integrate Stealth Engine into `content.js` and `manifest.json`
**Files:**
- Modify: `coursera-extension/manifest.json`
- Modify: `coursera-extension/content.js`

- [ ] **Step 1: Register `stealth.js` in `manifest.json` content_scripts**
- [ ] **Step 2: Update `bypassCurrentModule()` to use staggered human delays**
- [ ] **Step 3: Update `solveCurrentQuiz()` to simulate smooth scrolling, hover dwell, and realistic question reading times**

---

### Task 3: Update UI Controls in `popup.html`, `popup.css`, and `popup.js`
**Files:**
- Modify: `coursera-extension/popup.html`
- Modify: `coursera-extension/popup.js`

- [ ] **Step 1: Add Stealth Mode & Realistic Grade toggles in `popup.html`**
- [ ] **Step 2: Bind storage handlers in `popup.js`**
- [ ] **Step 3: Verify all JS files pass syntax validation and test suite**
