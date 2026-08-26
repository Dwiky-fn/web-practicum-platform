require('dotenv').config();

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
];

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing GEMINI_API_KEY presence:', Boolean(apiKey));

  for (const model of modelsToTest) {
    console.log(`\n--- Testing Model: ${model} ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply with JSON: {"status": "ok"}' }],
        }),
      });

      console.log(`Model [${model}] HTTP Status:`, res.status, res.statusText);
      const text = await res.text();
      console.log(`Model [${model}] Response:`, text.slice(0, 300));
    } catch (err) {
      console.error(`Model [${model}] Error:`, err.message);
    }
  }
}

testModels();
