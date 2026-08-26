require('dotenv').config();

async function testPayloadDiff() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const sendRequest = async (label, payloadObj) => {
    console.log(`\n--- ${label} ---`);
    try {
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadObj),
      });
      console.log('Status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Body:', text.slice(0, 300));
    } catch (err) {
      console.log('Error:', err.message);
    }
  };

  // Case 1: Simple user message
  await sendRequest('Case 1: User message only', {
    model,
    messages: [{ role: 'user', content: 'Hello' }],
  });

  // Case 2: System + User message
  await sendRequest('Case 2: System + User message', {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ],
  });

  // Case 3: System + User + Temperature
  await sendRequest('Case 3: System + User + Temperature 0.1', {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ],
    temperature: 0.1,
  });

  // Case 4: Long system prompt
  await sendRequest('Case 4: Long system prompt', {
    model,
    messages: [
      { role: 'system', content: 'Kamu adalah AI evaluator untuk laporan praktikum pemrograman.'.repeat(10) },
      { role: 'user', content: 'Evaluasi percobaan berikut.' }
    ],
    temperature: 0.1,
  });
}

testPayloadDiff();
