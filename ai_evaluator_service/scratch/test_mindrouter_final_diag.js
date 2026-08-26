require('dotenv').config();
const OpenAI = require('openai');

async function runFinalDiagnostic() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = (process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1').replace(/\/+$/, '');
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  console.log('=== INVESTIGASI FINAL MINDROUTER (DIAGNOSTIC TEST) ===');
  console.log(`Base URL: ${baseURL}`);
  console.log(`Model: ${model}`);
  console.log(`API Key: ${apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'MISSING'}\n`);

  // ----------------------------------------------------
  // TEST 1 — GET /v1/models
  // ----------------------------------------------------
  console.log('--- TEST 1 — GET /v1/models ---');
  const t1Start = Date.now();
  try {
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 30000);

    const res1 = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': userAgent,
        'Accept': 'application/json',
      },
      signal: controller1.signal,
    });
    clearTimeout(timeout1);
    const duration1 = Date.now() - t1Start;
    const contentType1 = res1.headers.get('content-type') || '';
    const text1 = await res1.text();

    console.log(`HTTP Status: ${res1.status} ${res1.statusText}`);
    console.log(`Durasi: ${duration1} ms`);
    console.log(`Server Header: ${res1.headers.get('server') || '-'}`);
    console.log(`CF-Ray: ${res1.headers.get('cf-ray') || '-'}`);
    console.log(`Content-Type: ${contentType1}`);
    if (res1.status === 200) {
      try {
        const json1 = JSON.parse(text1);
        const modelList = Array.isArray(json1.data) ? json1.data.map(m => m.id) : [];
        const hasTargetModel = modelList.includes(model);
        console.log(`Hasil: SUCCESS — Total Model: ${modelList.length}, Model '${model}' ${hasTargetModel ? 'TERSEDIA' : 'TIDAK TERSEDIA'}`);
      } catch (e) {
        console.log(`Hasil: SUCCESS 200 tetapi response non-JSON: ${text1.slice(0, 200)}`);
      }
    } else {
      console.log(`Hasil: FAILED ${res1.status} — Body: ${text1.slice(0, 500)}`);
    }
  } catch (err) {
    const duration1 = Date.now() - t1Start;
    console.log(`HTTP Status: ERROR (${err.name})`);
    console.log(`Durasi: ${duration1} ms`);
    console.log(`Hasil: FAILED — Error: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2 — chat.completions via OpenAI SDK
  // ----------------------------------------------------
  console.log('\n--- TEST 2 — chat.completions via OpenAI SDK ---');
  const t2Start = Date.now();
  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        'User-Agent': userAgent,
      },
      timeout: 30000, // 30 detik
    });

    const res2 = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: 'Reply with exactly: OK' }
      ],
    });
    const duration2 = Date.now() - t2Start;

    console.log(`HTTP Status: 200 OK`);
    console.log(`Durasi: ${duration2} ms`);
    console.log(`Model Used: ${res2.model || model}`);
    console.log(`Hasil: SUCCESS — Respon: "${res2.choices[0]?.message?.content}"`);
  } catch (err) {
    const duration2 = Date.now() - t2Start;
    console.log(`HTTP Status: ${err.status || err.statusCode || 'ERROR'}`);
    console.log(`Durasi: ${duration2} ms`);
    console.log(`Error Name: ${err.name || 'Error'}`);
    console.log(`Error Message: ${err.message}`);
    if (err.headers) {
      console.log(`CF-Ray: ${err.headers.get ? err.headers.get('cf-ray') : (err.headers['cf-ray'] || '-')}`);
      console.log(`Server Header: ${err.headers.get ? err.headers.get('server') : (err.headers['server'] || '-')}`);
    }
    console.log(`Hasil: FAILED — Body/Details: ${err.error ? JSON.stringify(err.error) : err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3 — chat.completions via native fetch
  // ----------------------------------------------------
  console.log('\n--- TEST 3 — chat.completions via native fetch ---');
  const t3Start = Date.now();
  try {
    const controller3 = new AbortController();
    const timeout3 = setTimeout(() => controller3.abort(), 30000);

    const res3 = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Reply with exactly: OK' }
        ],
      }),
      signal: controller3.signal,
    });
    clearTimeout(timeout3);
    const duration3 = Date.now() - t3Start;
    const contentType3 = res3.headers.get('content-type') || '';
    const text3 = await res3.text();

    console.log(`HTTP Status: ${res3.status} ${res3.statusText}`);
    console.log(`Durasi: ${duration3} ms`);
    console.log(`Server Header: ${res3.headers.get('server') || '-'}`);
    console.log(`CF-Ray: ${res3.headers.get('cf-ray') || '-'}`);
    console.log(`Date Header: ${res3.headers.get('date') || '-'}`);
    console.log(`Content-Type: ${contentType3}`);

    if (res3.status === 200) {
      try {
        const json3 = JSON.parse(text3);
        console.log(`Hasil: SUCCESS — Respon: "${json3.choices[0]?.message?.content}"`);
      } catch (e) {
        console.log(`Hasil: SUCCESS 200 tetapi response non-JSON: ${text3.slice(0, 200)}`);
      }
    } else {
      console.log(`Hasil: FAILED ${res3.status}`);
      console.log(`Response Body: ${text3}`);
    }
  } catch (err) {
    const duration3 = Date.now() - t3Start;
    console.log(`HTTP Status: ERROR (${err.name})`);
    console.log(`Durasi: ${duration3} ms`);
    console.log(`Hasil: FAILED — Error: ${err.message}`);
  }
}

runFinalDiagnostic();
