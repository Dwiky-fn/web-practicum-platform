require('dotenv').config();
const OpenAI = require('openai');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function logLine(str = '') {
  process.stdout.write(str + '\n');
}

async function runInvestigation() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = (process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1').replace(/\/+$/, '');
  const lunaModel = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NOT_SET';
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  logLine('===========================================================');
  logLine('INVESTIGASI PERBEDAAN CHAT MINDROUTER & API AI EVALUATOR');
  logLine(`Base URL: ${baseURL}`);
  logLine(`Model Luna: ${lunaModel}`);
  logLine(`API Key: ${maskedKey}`);
  logLine('===========================================================\n');

  const clientWithUA = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': userAgent,
    },
    timeout: 180000, // 3 menit timeout
  });

  const clientDefaultSDK = new OpenAI({
    apiKey,
    baseURL,
    timeout: 180000,
  });

  const testResults = [];

  // ----------------------------------------------------
  // TEST 1 — Request API Paling Minimal (gpt-5.6-luna)
  // ----------------------------------------------------
  logLine('>>> TEST 1 — Request API Paling Minimal (openai/gpt-5.6-luna)...');
  const t1Start = Date.now();
  let t1Status = 'ERROR';
  let t1Dur = 0;
  let t1Result = '';

  try {
    const res1 = await clientWithUA.chat.completions.create({
      model: lunaModel,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    t1Dur = Date.now() - t1Start;
    t1Status = '200 OK';
    t1Result = res1.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 1] Status: ${t1Status} | Durasi: ${(t1Dur / 1000).toFixed(2)}s | Respon: "${t1Result}"`);
  } catch (err1) {
    t1Dur = Date.now() - t1Start;
    t1Status = `${err1.status || err1.statusCode || '500'}`;
    t1Result = err1.message || 'Error';
    logLine(`[TEST 1] FAILED | Status: ${t1Status} | Durasi: ${(t1Dur / 1000).toFixed(2)}s | Error: ${t1Result}`);
  }

  testResults.push({
    test: '1',
    model: lunaModel,
    payload: 'Minimal ("Reply with exactly: OK")',
    params: 'Tanpa param tambahan',
    status: t1Status,
    durationSec: (t1Dur / 1000).toFixed(2) + 's',
    result: t1Result.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 2 — Tambahkan Temperature
  // ----------------------------------------------------
  logLine('>>> TEST 2 — Minimal + Temperature 0.1...');
  const t2Start = Date.now();
  let t2Status = 'ERROR';
  let t2Dur = 0;
  let t2Result = '';

  try {
    const res2 = await clientWithUA.chat.completions.create({
      model: lunaModel,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      temperature: 0.1,
    });
    t2Dur = Date.now() - t2Start;
    t2Status = '200 OK';
    t2Result = res2.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 2] Status: ${t2Status} | Durasi: ${(t2Dur / 1000).toFixed(2)}s | Respon: "${t2Result}"`);
  } catch (err2) {
    t2Dur = Date.now() - t2Start;
    t2Status = `${err2.status || err2.statusCode || '500'}`;
    t2Result = err2.message || 'Error';
    logLine(`[TEST 2] FAILED | Status: ${t2Status} | Durasi: ${(t2Dur / 1000).toFixed(2)}s | Error: ${t2Result}`);
  }

  testResults.push({
    test: '2',
    model: lunaModel,
    payload: 'Minimal ("Reply with exactly: OK")',
    params: 'temperature=0.1',
    status: t2Status,
    durationSec: (t2Dur / 1000).toFixed(2) + 's',
    result: t2Result.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 3 — Tambahkan Response Format
  // ----------------------------------------------------
  logLine('>>> TEST 3 — Minimal + temperature + response_format...');
  const t3Start = Date.now();
  let t3Status = 'ERROR';
  let t3Dur = 0;
  let t3Result = '';

  try {
    const res3 = await clientWithUA.chat.completions.create({
      model: lunaModel,
      messages: [
        { role: 'user', content: 'Return JSON {"status": "OK"}' }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    t3Dur = Date.now() - t3Start;
    t3Status = '200 OK';
    t3Result = res3.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 3] Status: ${t3Status} | Durasi: ${(t3Dur / 1000).toFixed(2)}s | Respon: "${t3Result}"`);
  } catch (err3) {
    t3Dur = Date.now() - t3Start;
    t3Status = `${err3.status || err3.statusCode || '500'}`;
    t3Result = err3.message || 'Error';
    logLine(`[TEST 3] FAILED | Status: ${t3Status} | Durasi: ${(t3Dur / 1000).toFixed(2)}s | Error: ${t3Result}`);
  }

  testResults.push({
    test: '3',
    model: lunaModel,
    payload: 'JSON Prompt',
    params: 'temperature=0.1, response_format={type:json_object}',
    status: t3Status,
    durationSec: (t3Dur / 1000).toFixed(2) + 's',
    result: t3Result.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 4 — Parameter Production (dari mindrouterService.js)
  // ----------------------------------------------------
  logLine('>>> TEST 4 — Parameter Production (mindrouterService.js params)...');
  const t4Start = Date.now();
  let t4Status = 'ERROR';
  let t4Dur = 0;
  let t4Result = '';

  try {
    const res4 = await clientWithUA.chat.completions.create(
      {
        model: lunaModel,
        messages: [
          { role: 'system', content: 'Kembalikan JSON valid saja.' },
          { role: 'user', content: 'Reply with exactly: {"status": "OK"}' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        timeout: 300000,
      }
    );
    t4Dur = Date.now() - t4Start;
    t4Status = '200 OK';
    t4Result = res4.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 4] Status: ${t4Status} | Durasi: ${(t4Dur / 1000).toFixed(2)}s | Respon: "${t4Result}"`);
  } catch (err4) {
    t4Dur = Date.now() - t4Start;
    t4Status = `${err4.status || err4.statusCode || '500'}`;
    t4Result = err4.message || 'Error';
    logLine(`[TEST 4] FAILED | Status: ${t4Status} | Durasi: ${(t4Dur / 1000).toFixed(2)}s | Error: ${t4Result}`);
  }

  testResults.push({
    test: '4',
    model: lunaModel,
    payload: 'Production params (Prompt minimal)',
    params: 'Production (system prompt, temperature=0.1, response_format)',
    status: t4Status,
    durationSec: (t4Dur / 1000).toFixed(2) + 's',
    result: t4Result.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 5 — Perbandingan Header (Default SDK Header vs Custom User-Agent Header)
  // ----------------------------------------------------
  logLine('>>> TEST 5 — Header Comparison (Default SDK OpenAI Header vs Custom User-Agent Header)...');
  const t5Start = Date.now();
  let t5Status = 'ERROR';
  let t5Dur = 0;
  let t5Result = '';

  try {
    // Attempting default SDK client without User-Agent override
    const res5 = await clientDefaultSDK.chat.completions.create({
      model: lunaModel,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    t5Dur = Date.now() - t5Start;
    t5Status = '200 OK';
    t5Result = res5.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 5] Status: ${t5Status} | Durasi: ${(t5Dur / 1000).toFixed(2)}s | Respon: "${t5Result}"`);
  } catch (err5) {
    t5Dur = Date.now() - t5Start;
    t5Status = `${err5.status || err5.statusCode || '500'}`;
    t5Result = err5.message || 'Error';
    logLine(`[TEST 5] FAILED | Status: ${t5Status} | Durasi: ${(t5Dur / 1000).toFixed(2)}s | Error: ${t5Result}`);
  }

  testResults.push({
    test: '5',
    model: lunaModel,
    payload: 'Minimal',
    params: 'Header comparison (Default SDK User-Agent vs Custom Browser UA)',
    status: t5Status,
    durationSec: (t5Dur / 1000).toFixed(2) + 's',
    result: t5Result.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 7A — Model Pembanding: openai/gpt-4.1-nano
  // ----------------------------------------------------
  logLine('>>> TEST 7A — Model Pembanding: openai/gpt-4.1-nano...');
  const t7aStart = Date.now();
  let t7aStatus = 'ERROR';
  let t7aDur = 0;
  let t7aResult = '';

  try {
    const res7a = await clientWithUA.chat.completions.create({
      model: 'openai/gpt-4.1-nano',
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    t7aDur = Date.now() - t7aStart;
    t7aStatus = '200 OK';
    t7aResult = res7a.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 7A] Status: ${t7aStatus} | Durasi: ${(t7aDur / 1000).toFixed(2)}s | Respon: "${t7aResult}"`);
  } catch (err7a) {
    t7aDur = Date.now() - t7aStart;
    t7aStatus = `${err7a.status || err7a.statusCode || '500'}`;
    t7aResult = err7a.message || 'Error';
    logLine(`[TEST 7A] FAILED | Status: ${t7aStatus} | Durasi: ${(t7aDur / 1000).toFixed(2)}s | Error: ${t7aResult}`);
  }

  testResults.push({
    test: '7A',
    model: 'openai/gpt-4.1-nano',
    payload: 'Minimal ("Reply with exactly: OK")',
    params: 'Tanpa param tambahan',
    status: t7aStatus,
    durationSec: (t7aDur / 1000).toFixed(2) + 's',
    result: t7aResult.slice(0, 70),
  });

  logLine('Menunggu 5 detik...\n');
  await sleep(5000);

  // ----------------------------------------------------
  // TEST 7B — Model Pembanding: openai/gpt-4.1-mini
  // ----------------------------------------------------
  logLine('>>> TEST 7B — Model Pembanding: openai/gpt-4.1-mini...');
  const t7bStart = Date.now();
  let t7bStatus = 'ERROR';
  let t7bDur = 0;
  let t7bResult = '';

  try {
    const res7b = await clientWithUA.chat.completions.create({
      model: 'openai/gpt-4.1-mini',
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    });
    t7bDur = Date.now() - t7bStart;
    t7bStatus = '200 OK';
    t7bResult = res7b.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST 7B] Status: ${t7bStatus} | Durasi: ${(t7bDur / 1000).toFixed(2)}s | Respon: "${t7bResult}"`);
  } catch (err7b) {
    t7bDur = Date.now() - t7bStart;
    t7bStatus = `${err7b.status || err7b.statusCode || '500'}`;
    t7bResult = err7b.message || 'Error';
    logLine(`[TEST 7B] FAILED | Status: ${t7bStatus} | Durasi: ${(t7bDur / 1000).toFixed(2)}s | Error: ${t7bResult}`);
  }

  testResults.push({
    test: '7B',
    model: 'openai/gpt-4.1-mini',
    payload: 'Minimal ("Reply with exactly: OK")',
    params: 'Tanpa param tambahan',
    status: t7bStatus,
    durationSec: (t7bDur / 1000).toFixed(2) + 's',
    result: t7bResult.slice(0, 70),
  });

  // ========================================================
  // TABEL HASIL DIAGNOSIS
  // ========================================================
  logLine('\n===========================================================');
  logLine('TABEL HASIL DIAGNOSIS DETEKSI PERBEDAAN CHAT VS API');
  logLine('===========================================================');
  logLine('| Test | Model | Payload | Parameter Tambahan | Status | Durasi | Hasil |');
  logLine('| ---- | ----- | ------- | ------------------ | ------ | ------ | ----- |');
  for (const r of testResults) {
    const cleanSummary = r.result.replace(/[\r\n]+/g, ' ');
    logLine(`| ${r.test} | ${r.model} | ${r.payload} | ${r.params} | ${r.status} | ${r.durationSec} | ${cleanSummary} |`);
  }
  logLine('===========================================================\n');
}

runInvestigation();
