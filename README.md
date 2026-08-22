# ⚡ Coursera Auto-Cert Pro (Stealth Edition)

A high-precision, client-side Chrome / Edge Extension for accelerating course completions, anti-bot stealth pacing, and solving quizzes on Coursera with Google Gemini AI.

---

## 🌟 Key Features

* 🚀 **Full Module Auto-Pilot:** Completes all lectures, reading materials, and automatically navigates and solves all quizzes/assignments within a module in one click.
* 🥷 **Anti-Bot Max Stealth Engine:** Human reading time emulation, Gaussian jitter delays ($3.5\text{s} - 8.5\text{s}$), smooth viewport scrolling, and hover dwell to prevent LMS anomaly detection.
* 🤖 **AI Quiz Solver (Google Gemini):** Direct client-side integration with Gemini Flash and fallback models. Automatically handles Single Choice, Multi-select Checkboxes, and True/False questions.
* ✍️ **Athena Smart Honor Code & Auto-Submit:** Automatically detects and confirms the Coursera Honor Code agreement checkbox across all modern Athena UI layouts.
* 🎬 **Event-Driven Video Acceleration:** High-speed playback multiplier (1x, 2x, 5x, 10x) with media buffer stability protection.
* 🔒 **100% Private & Open Source:** Zero external licensing servers, zero tracking. Your Gemini API key is stored strictly in your local browser storage.

---

## 📦 Installation Guide

1. Clone or download this repository.
2. Open your browser extension manager:
   - **Chrome:** `chrome://extensions`
   - **Edge:** `edge://extensions`
   - **Brave:** `brave://extensions`
3. Toggle **"Developer Mode"** (top-right corner).
4. Click **"Load unpacked"** and select the `coursera-extension/` directory.
5. Get a free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey) and paste it into the Extension Settings tab.

---

## 🛠️ Project Structure

```text
├── coursera-extension/          # Chrome Extension Manifest V3 Source
│   ├── manifest.json            # Extension configuration
│   ├── stealth.js               # Anti-bot pacing & human simulation engine
│   ├── gemini.js                # Direct Gemini API integration with model failover
│   ├── content.js               # DOM parser, auto-pilot dispatcher, quiz solver
│   ├── injected.js              # Main context bridge for user & course IDs
│   ├── background.js            # Service worker
│   ├── popup.html / popup.js    # Minimalist dark dashboard
│   ├── styles.css / popup.css   # Obsidian / Raycast aesthetic CSS
│   └── icons/                   # High-DPI icon assets (16, 32, 48, 128)
├── tests/                       # Node.js automated test suites
│   ├── test_honor_code.js       # Athena Honor Code validation
│   ├── test_stealth.js          # Human delay formula validation
│   ├── test_e2e_quiz.js         # End-to-end question answering suite
│   └── test_screenshot_quiz.js  # Real-world question benchmark
└── .env.example                 # Environment configuration template
```

---

## 🧪 Running Tests

```bash
# Set your API key in .env (or export GEMINI_API_KEY)
cp .env.example .env

# Run all test suites
node tests/test_stealth.js
node tests/test_honor_code.js
node tests/test_e2e_quiz.js
```

---

## ⚖️ License
MIT License. Built for educational and personal productivity purposes.
