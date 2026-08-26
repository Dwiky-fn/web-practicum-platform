require('dotenv').config();

async function testNoJsonFormat() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  console.log('=== TEST WITHOUT response_format ===');

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Kembalikan JSON valid saja.' },
          { role: 'user', content: 'Berikan JSON {"status": "ok", "message": "MindRouter Luna is active"}' }
        ],
        temperature: 0.1,
      }),
    });

    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Choices:', JSON.stringify(data.choices, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testNoJsonFormat();
