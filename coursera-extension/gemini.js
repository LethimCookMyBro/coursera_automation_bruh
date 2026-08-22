// Gemini API Client for Coursera Auto-Cert Pro
// Direct browser fetch to Google AI Studio - 100% Client Side & Private

class GeminiQuizSolver {
  constructor(apiKey, model = 'gemini-flash-latest') {
    this.apiKey = apiKey;
    this.model = model || 'gemini-flash-latest';
    this.fallbackModels = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.7-flash'];
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  setModel(model) {
    this.model = model || 'gemini-flash-latest';
  }

  async testConnection() {
    if (!this.apiKey) {
      throw new Error('API Key is missing');
    }

    const modelsToTry = [this.model, ...this.fallbackModels.filter(m => m !== this.model)];
    let lastError = null;

    for (const mod of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{
            parts: [{ text: 'Answer with "OK" only.' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          this.model = mod; // Switch to the working model
          return `เชื่อมต่อสำเร็จ (ใช้โมเดล: ${mod})`;
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = err.error?.message || `HTTP ${res.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    throw new Error(lastError || 'Failed to connect to Gemini API');
  }

  async solveQuestion(questionPrompt, options, questionType = 'single', courseContext = '', retryCount = 0) {
    if (!this.apiKey) {
      throw new Error('กรุณาระบุ Gemini API Key ในหน้า Settings ก่อนใช้งาน');
    }

    const modelsToTry = [this.model, ...this.fallbackModels.filter(m => m !== this.model)];
    let lastError = null;

    const formattedOptions = options.map((opt, idx) => `[${idx}] ${opt}`).join('\n');
    const isMultiple = questionType === 'multiple';

    const systemInstruction = `You are an expert academic tutor helping solve multiple-choice quiz questions accurately.
Analyze the question and all provided options thoroughly.
Identify the scientifically or conceptually correct option(s).
${isMultiple ? 'This question allows selecting ONE OR MORE options (checkbox).' : 'This question allows selecting EXACTLY ONE correct option (radio).'}

You MUST respond strictly with a valid JSON object matching this schema:
{
  "selected_indices": [0], 
  "confidence": 0.98,
  "explanation": "Brief explanation why this option is correct"
}

Notes:
- "selected_indices" must contain the 0-based integer index/indices of the correct option(s) from the provided options list.
- Return ONLY the JSON object.`;

    const userContent = `Course Context: ${courseContext || 'General Course'}
Question:
${questionPrompt}

Options:
${formattedOptions}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n${userContent}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    };

    // Try primary and fallback models with backoff
    for (const mod of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${this.apiKey}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err.error?.message || `HTTP ${res.status}`;
          
          // If rate limited or high demand (503/429), try next fallback model
          if (res.status === 429 || res.status === 503 || errMsg.includes('demand') || errMsg.includes('quota')) {
            console.warn(`[Auto-Cert] Model ${mod} busy/rate-limited, trying fallback...`);
            await new Promise(r => setTimeout(r, 400));
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) {
          continue;
        }

        // Parse JSON output safely
        let cleanJson = textOutput.trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        } else {
          if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
        }

        const parsed = JSON.parse(cleanJson);
        return {
          selected_indices: Array.isArray(parsed.selected_indices) ? parsed.selected_indices : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          explanation: parsed.explanation || '',
          modelUsed: mod
        };
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }
}

// Export for usage in content & popup
if (typeof window !== 'undefined') {
  window.GeminiQuizSolver = GeminiQuizSolver;
}
