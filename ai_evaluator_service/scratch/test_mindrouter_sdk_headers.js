require('dotenv').config();
const OpenAI = require('openai');

async function testSDKHeaders() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  console.log('=== TEST OPENAI SDK WITH VARIOUS HEADERS ===');

  // Test A: Default OpenAI SDK (no custom headers)
  console.log('\n--- TEST A: OpenAI SDK Default (no custom headers) ---');
  try {
    const clientA = new OpenAI({ apiKey, baseURL });
    const resA = await clientA.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    console.log('Test A RESULT: SUCCESS!', resA.choices[0]?.message?.content);
  } catch (err) {
    console.log('Test A RESULT: FAILED! Status:', err.status, 'Message:', err.message);
  }

  // Test B: OpenAI SDK with defaultHeaders: { 'User-Agent': 'Mozilla/5.0 ...' }
  console.log('\n--- TEST B: OpenAI SDK with User-Agent override ---');
  try {
    const clientB = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const resB = await clientB.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    console.log('Test B RESULT: SUCCESS!', resB.choices[0]?.message?.content);
  } catch (err) {
    console.log('Test B RESULT: FAILED! Status:', err.status, 'Message:', err.message);
  }

  // Test C: Fetch without User-Agent header
  console.log('\n--- TEST C: Fetch with OpenAI/NodeJS User-Agent ---');
  try {
    const resC = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'OpenAI/JS 4.50.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      }),
    });
    console.log('Test C Status:', resC.status, resC.statusText);
    const textC = await resC.text();
    console.log('Test C Body:', textC.slice(0, 200));
  } catch (err) {
    console.log('Test C Error:', err.message);
  }

  // Test D: Fetch with Stainless headers
  console.log('\n--- TEST D: Fetch with Stainless x-stainless-* headers ---');
  try {
    const resD = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'OpenAI/JS 4.50.0',
        'x-stainless-lang': 'js',
        'x-stainless-package-version': '4.50.0',
        'x-stainless-os': 'Windows',
        'x-stainless-arch': 'x64',
        'x-stainless-runtime': 'node',
        'x-stainless-runtime-version': 'v20.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      }),
    });
    console.log('Test D Status:', resD.status, resD.statusText);
    const textD = await resD.text();
    console.log('Test D Body:', textD.slice(0, 200));
  } catch (err) {
    console.log('Test D Error:', err.message);
  }
}

testSDKHeaders();
