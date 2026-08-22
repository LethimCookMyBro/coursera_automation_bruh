# Coursera Auto-Cert Pro: Max Stealth & Human Simulation Engine Design

## Overview
This design adds advanced anti-bot evasion and realistic human-behavior simulation to the Coursera Auto-Cert Pro Chrome Extension, ensuring course completion and quiz solving are undetectable by automated anomaly detection algorithms.

## Key Subsystems

### 1. Human-like Pacing & Jitter Generator (`stealth.js`)
- **Reading Time Model**: Dynamically models human reading speed based on question character length:
  `delay = clamp(3500, prompt.length * 45, 12000) + gaussianJitter(1000, 3000)`
- **Module Bypass Pacing**: Instead of synchronous bursts, introduces randomized intervals of 3.5s – 7.5s between video/reading completions.
- **Pre-Submit Review Pause**: Adds a realistic 10s – 18s student review period before submitting final quizzes.

### 2. Human Interaction Simulation (`content.js`)
- **Smooth Viewport Alignment**: Smoothly scrolls each question into the user's viewport before interacting.
- **Hover & Dwell Simulation**: Simulates mouse hover and a 400ms – 800ms dwell before triggering selection.
- **Realistic Event Firing**: Dispatches `pointerdown`, `mousedown`, `click`, `mouseup`, `input`, and `change` events sequentially.

### 3. Realistic Score Targeter (`Human Imperfection Mode`)
- When enabled on quizzes with >= 5 questions, targets a realistic human pass rate (e.g. 90-95%) by intentionally selecting a plausible distractor on exactly 1 question if desired, avoiding 100% burst anomalies.

### 4. UI Controls (`popup.html`, `styles.css`)
- Stealth Mode toggle (Default: ON)
- Human Imperfection Mode toggle (Default: OFF / optional)
- Live countdown & status indicators on Floating Widget: "⏳ กำลังเลียนแบบการอ่านโจทย์ (เหลือ 3.2s)..."
