const fs = require('fs');
const path = require('path');

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=(.*)/);
      if (match && match[1]) return match[1].trim();
    }
  } catch (e) {}
  return process.env.GEMINI_API_KEY || '';
}

module.exports = { getApiKey };
