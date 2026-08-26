require('dotenv').config();

async function testRawMindRouter() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  console.log('=== TEST RAW FETCH TO MINDROUTER ===');
  console.log('Base URL:', baseURL);
  console.log('API Key:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'MISSING');

  // Test 1: GET /models with standard fetch
  console.log('\n--- TEST 1: GET /models (standard node fetch) ---');
  try {
    const res1 = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Status:', res1.status, res1.statusText);
    console.log('Server Header:', res1.headers.get('server'));
    console.log('Content-Type:', res1.headers.get('content-type'));
    const text1 = await res1.text();
    console.log('Body:', text1.slice(0, 500));
  } catch (err) {
    console.log('Error Test 1:', err.message);
  }

  // Test 2: GET /models with Browser User-Agent
  console.log('\n--- TEST 2: GET /models (with Browser User-Agent) ---');
  try {
    const res2 = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
    });
    console.log('Status:', res2.status, res2.statusText);
    console.log('Server Header:', res2.headers.get('server'));
    console.log('Content-Type:', res2.headers.get('content-type'));
    const text2 = await res2.text();
    console.log('Body:', text2.slice(0, 500));
  } catch (err) {
    console.log('Error Test 2:', err.message);
  }

  // Test 3: POST /chat/completions with Browser User-Agent & Bearer
  console.log('\n--- TEST 3: POST /chat/completions (with Browser User-Agent & Bearer) ---');
  try {
    const res3 = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      }),
    });
    console.log('Status:', res3.status, res3.statusText);
    console.log('Server Header:', res3.headers.get('server'));
    console.log('Content-Type:', res3.headers.get('content-type'));
    const text3 = await res3.text();
    console.log('Body:', text3.slice(0, 500));
  } catch (err) {
    console.log('Error Test 3:', err.message);
  }

  // Test 4: POST /chat/completions with x-api-key header
  console.log('\n--- TEST 4: POST /chat/completions (with x-api-key header) ---');
  try {
    const res4 = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      }),
    });
    console.log('Status:', res4.status, res4.statusText);
    const text4 = await res4.text();
    console.log('Body:', text4.slice(0, 500));
  } catch (err) {
    console.log('Error Test 4:', err.message);
  }
}

testRawMindRouter();
