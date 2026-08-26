require('dotenv').config();
const OpenAI = require('openai');

async function testCompletionNoFormat() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  console.log('--- TEST COMPLETION WITHOUT response_format ---');
  const tStart = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'Kembalikan JSON valid saja.' },
        { role: 'user', content: 'Berikan JSON {"status": "ok", "test": "passed"}' }
      ],
      temperature: 0.1,
    });
    console.log(`Status: 200 OK (${Date.now() - tStart} ms)`);
    console.log('Response content:', res.choices[0]?.message?.content);
  } catch (err) {
    console.log(`FAILED (${Date.now() - tStart} ms):`, err.status, err.message);
  }
}

testCompletionNoFormat();
