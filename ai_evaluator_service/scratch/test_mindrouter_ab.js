require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const SYSTEM_PROMPT = require('../src/prompts/systemPrompt');
const buildExperimentPrompt = require('../src/prompts/experimentPrompt');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function logLine(str = '') {
  process.stdout.write(str + '\n');
}

async function runDiagnosticAB() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = (process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1').replace(/\/+$/, '');
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NOT_SET';
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  logLine('===========================================================');
  logLine('DIAGNOSIS A/B MINDROUTER — AI EVALUATOR LOCAL');
  logLine(`Base URL: ${baseURL}`);
  logLine(`Model: ${model}`);
  logLine(`API Key: ${maskedKey}`);
  logLine('===========================================================\n');

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'User-Agent': userAgent,
    },
    timeout: 180000, // 3 menit timeout
  });

  const testResults = [];

  // ========================================================
  // TEST A — Minimal Request
  // ========================================================
  logLine('>>> RUNNING TEST A — Minimal Request...');
  const testA_userContent = 'Reply with exactly: OK';
  const testA_systemChars = 0;
  const testA_userChars = testA_userContent.length;
  const testA_totalChars = testA_systemChars + testA_userChars;
  const testA_tokens = Math.ceil(testA_totalChars / 4);

  const tA_start = Date.now();
  let testA_status = 'ERROR';
  let testA_duration = 0;
  let testA_result = '';

  try {
    const resA = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: testA_userContent }],
    });
    testA_duration = Date.now() - tA_start;
    testA_status = '200 OK';
    testA_result = resA.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST A] Status: ${testA_status} | Durasi: ${(testA_duration / 1000).toFixed(2)}s | Respon: "${testA_result}"`);
  } catch (errA) {
    testA_duration = Date.now() - tA_start;
    testA_status = `${errA.status || errA.statusCode || '500'}`;
    testA_result = errA.message || 'Unknown error';
    logLine(`[TEST A] FAILED | Status: ${testA_status} | Durasi: ${(testA_duration / 1000).toFixed(2)}s | Error: ${testA_result}`);
  }

  testResults.push({
    test: 'A',
    payloadName: 'Minimal Request',
    systemChars: testA_systemChars,
    userChars: testA_userChars,
    totalChars: testA_totalChars,
    estimatedTokens: testA_tokens,
    params: 'Standard (No response_format)',
    status: testA_status,
    durationMs: testA_duration,
    resultSummary: testA_result.slice(0, 80),
  });

  logLine('Menunggu 5 detik sebelum TEST B...\n');
  await sleep(5000);

  // ========================================================
  // TEST B — System + User Prompt
  // ========================================================
  logLine('>>> RUNNING TEST B — System + User Prompt...');
  const testB_systemContent = 'You are an AI evaluator. Return valid JSON only.';
  const testB_userContent = "Evaluate this simple submission.\nStudent wrote print('Hello').\nThe instruction asks the student to print Hello.";
  const testB_systemChars = testB_systemContent.length;
  const testB_userChars = testB_userContent.length;
  const testB_totalChars = testB_systemChars + testB_userChars;
  const testB_tokens = Math.ceil(testB_totalChars / 4);

  const tB_start = Date.now();
  let testB_status = 'ERROR';
  let testB_duration = 0;
  let testB_result = '';

  try {
    const resB = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: testB_systemContent },
        { role: 'user', content: testB_userContent },
      ],
      temperature: 0.1,
    });
    testB_duration = Date.now() - tB_start;
    testB_status = '200 OK';
    testB_result = resB.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST B] Status: ${testB_status} | Durasi: ${(testB_duration / 1000).toFixed(2)}s | Respon: "${testB_result.slice(0, 100)}..."`);
  } catch (errB) {
    testB_duration = Date.now() - tB_start;
    testB_status = `${errB.status || errB.statusCode || '500'}`;
    testB_result = errB.message || 'Unknown error';
    logLine(`[TEST B] FAILED | Status: ${testB_status} | Durasi: ${(testB_duration / 1000).toFixed(2)}s | Error: ${testB_result}`);
  }

  testResults.push({
    test: 'B',
    payloadName: 'Simple Prompt',
    systemChars: testB_systemChars,
    userChars: testB_userChars,
    totalChars: testB_totalChars,
    estimatedTokens: testB_tokens,
    params: 'temperature=0.1 (No response_format)',
    status: testB_status,
    durationMs: testB_duration,
    resultSummary: testB_result.slice(0, 80),
  });

  logLine('Menunggu 5 detik sebelum TEST C...\n');
  await sleep(5000);

  // Prepare exact production payload for Experiment Scope Step 1
  const actualProductionPayload = {
    scope: 'experiment',
    submissionId: 'sub-8833f0b4-814',
    jobsheet: {
      id: 'jobsheet-percabangan-1',
      title: 'Jobsheet Percabangan (If-Else)',
      description: 'Latihan dan percobaan mengenai percabangan kondisi dalam pemrograman.',
    },
    experiment: {
      id: 'exp-86qhic5l',
      experimentId: 'exp-86qhic5l',
      step: 1,
      title: 'Percobaan 1 - Langkah 1: Program If Sederhana',
      objective: 'Memahami dasar percabangan if dalam bahasa Python.',
      instruction: 'Buatlah program if sederhana untuk menguji apakah variabel x lebih besar dari 0.',
      language: 'python',
      files: [
        {
          id: 'file-1',
          path: 'main.py',
          language: 'python',
          content: 'x = 10\nif x > 0:\n    print("Positif")',
          _lineOffset: 0,
        },
      ],
      templateFiles: [
        {
          id: 'tmpl-1',
          path: 'main.py',
          language: 'python',
          content: '# Tulis kode Anda di bawah ini\n',
        },
      ],
      hasStudentCode: true,
      execution: {
        status: 'success',
        stdout: 'Positif\n',
        stderr: '',
        testCases: [],
      },
      studentAnalysis: 'Program berhasil mencetak Positif karena variabel x bernilai 10 yang mana lebih besar dari 0.',
      studentConclusion: '',
      rubric: {
        criteria: [
          { id: 'c1', name: 'Kebenaran Sintaks & Logika', maxScore: 100 },
        ],
      },
    },
    rubric: {
      criteria: [
        { id: 'c1', name: 'Kebenaran Sintaks & Logika', maxScore: 100 },
      ],
    },
    options: {
      language: 'id',
      includeScoreRecommendation: true,
    },
  };

  const actualUserPrompt = buildExperimentPrompt(actualProductionPayload);
  const actualSystemPrompt = SYSTEM_PROMPT;

  const prodSystemChars = actualSystemPrompt.length;
  const prodUserChars = actualUserPrompt.length;
  const prodTotalChars = prodSystemChars + prodUserChars;
  const prodTokens = Math.ceil(prodTotalChars / 4);

  // ========================================================
  // TEST C — Request Evaluator Aktual (Dengan response_format)
  // ========================================================
  logLine('>>> RUNNING TEST C — Request Evaluator Aktual (WITH response_format)...');
  logLine(`[TEST C Info] systemChars: ${prodSystemChars}, userChars: ${prodUserChars}, totalChars: ${prodTotalChars}, estimatedTokens: ${prodTokens}`);

  const tC_start = Date.now();
  let testC_status = 'ERROR';
  let testC_duration = 0;
  let testC_result = '';

  try {
    const resC = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: actualSystemPrompt },
        { role: 'user', content: actualUserPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    testC_duration = Date.now() - tC_start;
    testC_status = '200 OK';
    testC_result = resC.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST C] Status: ${testC_status} | Durasi: ${(testC_duration / 1000).toFixed(2)}s | Respon: "${testC_result.slice(0, 100)}..."`);
  } catch (errC) {
    testC_duration = Date.now() - tC_start;
    testC_status = `${errC.status || errC.statusCode || '500'}`;
    testC_result = errC.message || 'Unknown error';
    logLine(`[TEST C] FAILED | Status: ${testC_status} | Durasi: ${(testC_duration / 1000).toFixed(2)}s | Error: ${testC_result}`);
  }

  testResults.push({
    test: 'C',
    payloadName: 'Production Experiment Step 1',
    systemChars: prodSystemChars,
    userChars: prodUserChars,
    totalChars: prodTotalChars,
    estimatedTokens: prodTokens,
    params: 'temperature=0.1, response_format={type:json_object}',
    status: testC_status,
    durationMs: testC_duration,
    resultSummary: testC_result.slice(0, 80),
  });

  logLine('Menunggu 5 detik sebelum TEST D...\n');
  await sleep(5000);

  // ========================================================
  // TEST D — Request Evaluator Tanpa Structured Output (Tanpa response_format)
  // ========================================================
  logLine('>>> RUNNING TEST D — Request Evaluator (WITHOUT response_format)...');
  logLine(`[TEST D Info] systemChars: ${prodSystemChars}, userChars: ${prodUserChars}, totalChars: ${prodTotalChars}, estimatedTokens: ${prodTokens}`);

  const tD_start = Date.now();
  let testD_status = 'ERROR';
  let testD_duration = 0;
  let testD_result = '';

  try {
    const resD = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: actualSystemPrompt },
        { role: 'user', content: actualUserPrompt },
      ],
      temperature: 0.1,
    });
    testD_duration = Date.now() - tD_start;
    testD_status = '200 OK';
    testD_result = resD.choices[0]?.message?.content?.trim() || 'No content';
    logLine(`[TEST D] Status: ${testD_status} | Durasi: ${(testD_duration / 1000).toFixed(2)}s | Respon: "${testD_result.slice(0, 100)}..."`);
  } catch (errD) {
    testD_duration = Date.now() - tD_start;
    testD_status = `${errD.status || errD.statusCode || '500'}`;
    testD_result = errD.message || 'Unknown error';
    logLine(`[TEST D] FAILED | Status: ${testD_status} | Durasi: ${(testD_duration / 1000).toFixed(2)}s | Error: ${testD_result}`);
  }

  testResults.push({
    test: 'D',
    payloadName: 'Production Experiment Step 1',
    systemChars: prodSystemChars,
    userChars: prodUserChars,
    totalChars: prodTotalChars,
    estimatedTokens: prodTokens,
    params: 'temperature=0.1 (Tanpa response_format)',
    status: testD_status,
    durationMs: testD_duration,
    resultSummary: testD_result.slice(0, 80),
  });

  // ========================================================
  // CETAK TABEL HASIL DIAGNOSIS
  // ========================================================
  logLine('\n===========================================================');
  logLine('TABEL HASIL DIAGNOSIS A/B MINDROUTER');
  logLine('===========================================================');
  logLine('| Test | Payload | Estimated Tokens | Parameter Khusus | Status | Durasi | Hasil |');
  logLine('| ---- | ------: | ---------------: | ---------------- | -----: | -----: | ----- |');
  for (const r of testResults) {
    const durSec = (r.durationMs / 1000).toFixed(2) + 's';
    const cleanSummary = r.resultSummary.replace(/[\r\n]+/g, ' ');
    logLine(`| ${r.test} | ${r.payloadName} | ${r.estimatedTokens} | ${r.params} | ${r.status} | ${durSec} | ${cleanSummary} |`);
  }
  logLine('===========================================================\n');
}

runDiagnosticAB();
