require('dotenv').config();
const { evaluateSubmission } = require('../src/services/evaluation/orchestrator');

async function testFullJobsheetEvaluation() {
  console.log('=== TEST JOBSHEET FULL EVALUATION (6 EXPERIMENTS + 1 EXERCISE) ===');

  const payload = {
    scope: 'jobsheet',
    submissionId: 'sub-test-full-jobsheet-123',
    requestId: 'req-full-jobsheet-diag-123',
    jobsheet: {
      id: 'jobsheet-percabangan-1',
      title: 'Jobsheet Percabangan (If-Else)',
      description: 'Latihan dan percobaan mengenai percabangan kondisi dalam pemrograman.',
    },
    experiments: [
      {
        id: 'exp-1',
        step: 1,
        title: 'Percobaan 1 - Langkah 1: Program If Sederhana',
        objective: 'Memahami dasar percabangan if.',
        instruction: 'Buatlah program if sederhana untuk memeriksa apakah angka lebih besar dari 0.',
        language: 'python',
        files: [{ id: 'f1', path: 'main.py', language: 'python', content: 'x = 10\nif x > 0:\n    print("Positif")' }],
        execution: { status: 'success', stdout: 'Positif\n', stderr: '', testCases: [] },
        studentAnalysis: 'Program berhasil mencetak Positif karena x bernilai 10.',
        rubric: { criteria: [{ id: 'c1', name: 'Kebenaran Program', maxScore: 100 }] }
      },
      {
        id: 'exp-1',
        step: 2,
        title: 'Percobaan 1 - Langkah 2: Mengubah Kondisi Menjadi False',
        objective: 'Mengamati output saat kondisi bernilai False.',
        instruction: 'Ubah kondisi menjadi x < 0 dan amati apa yang terjadi.',
        language: 'python',
        files: [{ id: 'f2', path: 'main.py', language: 'python', content: 'x = 10\nif x < 0:\n    print("Positif")' }],
        execution: { status: 'success', stdout: '', stderr: '', testCases: [] },
        studentAnalysis: 'Tidak ada output yang tercetak karena kondisi bernilai False.',
        rubric: { criteria: [{ id: 'c2', name: 'Observasi Perilaku', maxScore: 100 }] }
      },
      {
        id: 'exp-1',
        step: 3,
        title: 'Percobaan 1 - Langkah 3: Menambahkan Indentasi Salah (IndentationError)',
        objective: 'Mengamati IndentationError pada Python.',
        instruction: 'Hapus spasi indentasi di bawah statement if untuk sengaja menghasilkan IndentationError.',
        language: 'python',
        files: [{ id: 'f3', path: 'main.py', language: 'python', content: 'x = 10\nif x > 0:\nprint("Positif")' }],
        execution: { status: 'failed', stdout: '', stderr: 'IndentationError: expected an indented block', testCases: [] },
        studentAnalysis: 'Terjadi IndentationError karena statement di dalam blok if di Python wajib memiliki indentasi.',
        rubric: { criteria: [{ id: 'c3', name: 'Observasi Error', maxScore: 100 }] }
      },
      {
        id: 'exp-2',
        step: 1,
        title: 'Percobaan 2 - Langkah 1: Statement If-Else',
        objective: 'Memahami penggunaan else.',
        instruction: 'Buatlah percabangan if-else untuk membedakan bilangan genap dan ganjil.',
        language: 'python',
        files: [{ id: 'f4', path: 'main.py', language: 'python', content: 'x = 7\nif x % 2 == 0:\n    print("Genap")\nelse:\n    print("Ganjil")' }],
        execution: { status: 'success', stdout: 'Ganjil\n', stderr: '', testCases: [] },
        studentAnalysis: 'Program mencetak Ganjil karena 7 sisa bagi 2 adalah 1.',
        rubric: { criteria: [{ id: 'c4', name: 'Kebenaran If-Else', maxScore: 100 }] }
      },
      {
        id: 'exp-2',
        step: 2,
        title: 'Percobaan 2 - Langkah 2: Menggunakan Variabel Belum Didefinisikan',
        objective: 'Mengamati NameError saat variabel dipanggil tanpa inisialisasi.',
        instruction: 'Gunakan variabel y yang belum didefinisikan pada kondisi if untuk mengamati NameError.',
        language: 'python',
        files: [{ id: 'f5', path: 'main.py', language: 'python', content: 'if y > 0:\n    print("Positif")' }],
        execution: { status: 'failed', stdout: '', stderr: "NameError: name 'y' is not defined", testCases: [] },
        studentAnalysis: 'Terjadi NameError karena variabel y dipanggil sebelum diberi nilai.',
        rubric: { criteria: [{ id: 'c5', name: 'Observasi NameError', maxScore: 100 }] }
      },
      {
        id: 'exp-2',
        step: 3,
        title: 'Percobaan 2 - Langkah 3: Perbaikan Kode',
        objective: 'Memperbaiki NameError dengan mendefinisikan y.',
        instruction: 'Definisikan variabel y = 5 sebelum statement if.',
        language: 'python',
        files: [{ id: 'f6', path: 'main.py', language: 'python', content: 'y = 5\nif y > 0:\n    print("Positif")' }],
        execution: { status: 'success', stdout: 'Positif\n', stderr: '', testCases: [] },
        studentAnalysis: 'Program kembali berjalan normal setelah variabel y didefinisikan terlebih dahulu.',
        rubric: { criteria: [{ id: 'c6', name: 'Perbaikan Kode', maxScore: 100 }] }
      }
    ],
    exercises: [
      {
        id: 'exe-1',
        title: 'Latihan 1: Penentuan Kelulusan Nilai',
        instruction: 'Buatlah program yang menerima nilai mahasiswa dan menampilkan LULUS jika nilai >= 70, selain itu TIDAK LULUS.',
        language: 'python',
        files: [{ id: 'f7', path: 'latihan.py', language: 'python', content: 'nilai = 75\nif nilai >= 70:\n    print("LULUS")\nelse:\n    print("TIDAK LULUS")' }],
        execution: { status: 'success', stdout: 'LULUS\n', stderr: '', testCases: [] },
        studentAnalysis: 'Program berhasil menentukan kelulusan berdasarkan nilai 75.',
        rubric: { criteria: [{ id: 'c7', name: 'Penyelesaian Latihan', maxScore: 100 }] }
      }
    ],
    studentConclusion: 'Praktikum ini memberikan pemahaman mendalam tentang percabangan if-else pada Python serta pentingnya sintaks indentasi dan inisialisasi variabel.',
    rubric: {
      criteria: [
        { id: 'c1', name: 'Kebenaran Program', maxScore: 100 },
        { id: 'c2', name: 'Observasi Perilaku', maxScore: 100 },
        { id: 'c3', name: 'Observasi Error', maxScore: 100 },
        { id: 'c4', name: 'Kebenaran If-Else', maxScore: 100 },
        { id: 'c5', name: 'Observasi NameError', maxScore: 100 },
        { id: 'c6', name: 'Perbaikan Kode', maxScore: 100 },
        { id: 'c7', name: 'Penyelesaian Latihan', maxScore: 100 }
      ]
    }
  };

  const startedAt = Date.now();
  try {
    const result = await evaluateSubmission(payload);
    const durationSec = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log(`\n========================================`);
    console.log(`EVALUASI JOBSHEET BERHASIL DILAKUKAN!`);
    console.log(`Total Durasi: ${durationSec} detik`);
    console.log(`Status Evaluasi: ${result.evaluationStatus}`);
    console.log(`Jumlah Percobaan Dievaluasi: ${result.experimentEvaluations?.length || 0}`);
    console.log(`Jumlah Latihan Dievaluasi: ${result.exerciseEvaluations?.length || 0}`);
    console.log(`Ringkasan Feedback Jobsheet: "${result.jobsheetFeedback?.summary}"`);
    console.log(`Rekomendasi Total Skor: ${result.totalScoreRecommendation} / ${result.totalMaxScore}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error(`\nEVALUASI JOBSHEET GAGAL!`);
    console.error(`Error:`, err.message);
    if (err.details) console.error(`Details:`, JSON.stringify(err.details, null, 2));
  }
}

testFullJobsheetEvaluation();
