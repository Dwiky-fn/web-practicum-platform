require('dotenv').config();
const OpenAI = require('openai');

async function testJsonMode() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  console.log('=== TEST MINDROUTER SDK WITH JSON MODE & USER-AGENT OVERRIDE ===');

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'Kembalikan JSON valid saja.' },
        { role: 'user', content: 'Berikan JSON {"status": "ok", "message": "MindRouter Luna is active"}' }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    console.log('STATUS: SUCCESS 200 OK!');
    console.log('CONTENT:', response.choices[0]?.message?.content);
  } catch (err) {
    console.log('STATUS: FAILED!', err.status, err.message);
  }
}

testJsonMode();
