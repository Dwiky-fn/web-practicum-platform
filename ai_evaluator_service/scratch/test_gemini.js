require('dotenv').config();
const { generateJsonText, geminiService, checkProviderHealth } = require('../src/services/aiProvider');
const { evaluateExperiment, requestValidModelResult } = require('../src/services/evaluation/orchestrator');

async function runTests() {
  console.log('==================== MEMULAI VERIFIKASI INTEGRASI GEMINI API ====================');

  // Test 1: API Connection & Health Check
  console.log('\n--- Test 1: API Connection & Health Check ---');
  const health = await checkProviderHealth();
  console.log('Health check result:', health);
  if (!health.connected) {
    console.error('Test 1 Gagal: Health check tidak terhubung!');
    process.exit(1);
  }
  console.log('Test 1 PASSED: Gemini API Connection OK!');

  // Test 2: JSON Response
  console.log('\n--- Test 2: JSON Response Generation ---');
  try {
    const rawJson = await generateJsonText({
      systemPrompt: 'Kamu adalah asisten JSON. Selalu balas dalam format JSON valid.',
      userPrompt: 'Balas hanya dengan JSON: {"status": "success", "message": "GEMINI TEST BERHASIL"}',
      requestId: 'req-test-2',
    });
    console.log('Raw JSON output:', rawJson);
    const parsed = JSON.parse(rawJson);
    console.log('Parsed JSON object:', parsed);
    if (parsed.status === 'success' || parsed.message?.includes('GEMINI TEST BERHASIL')) {
      console.log('Test 2 PASSED: JSON Response valid & parsed successfully!');
    } else {
      console.log('Test 2 PASSED (parsed valid JSON):', parsed);
    }
  } catch (err) {
    console.error('Test 2 FAILED:', err);
    process.exit(1);
  }

  // Test 3: Evaluasi Satu Experiment
  console.log('\n--- Test 3: Evaluasi Satu Experiment ---');
  try {
    const mockExperimentPayload = {
      requestId: 'req-test-3',
      submissionId: 'sub-test-3',
      scope: 'experiment',
      jobsheet: { id: 'js-1', title: 'Pemrograman Dasar Python' },
      experiment: {
        id: 'exp-1',
        title: 'Percobaan 1: Variable dan Tipe Data',
        instructionContent: 'Buatlah variabel nama dan umur lalu cetak.',
        files: [
          {
            path: 'main.py',
            content: 'nama = "Budi"\numur = 20\nprint(f"Nama: {nama}, Umur: {umur}")\n',
          },
        ],
        execution: {
          status: 'success',
          stdout: 'Nama: Budi, Umur: 20\n',
          stderr: '',
        },
      },
      rubric: {
        criteria: [
          { id: 'crit-1', title: 'Kebenaran Sintaks Kode', maxScore: 50 },
          { id: 'crit-2', title: 'Kesesuaian Output Program', maxScore: 50 },
        ],
      },
    };

    const expResult = await evaluateExperiment(mockExperimentPayload);
    console.log('Test 3 Result Summary:');
    console.log('- Total Score Recommendation:', expResult.totalScoreRecommendation);
    console.log('- Feedback Summary:', expResult.experimentFeedback?.summary);
    console.log('- Code Feedbacks Count:', expResult.codeFeedbacks?.length || 0);
    console.log('Test 3 PASSED: Evaluasi satu experiment berhasil diselesaikan oleh Gemini!');
  } catch (err) {
    console.error('Test 3 FAILED:', err);
    process.exit(1);
  }

  console.log('\n==================== SELURUH TEST VERIFIKASI BERHASIL ====================');
}

runTests();
