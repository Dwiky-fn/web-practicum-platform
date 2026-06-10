const pool = require('../postgres');
const { randomUUID } = require('crypto');
const http = require('http');

function extractTextFromTiptap(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromTiptap).join(' ');
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromTiptap).join(' ');
  }
  if (node.content && typeof node.content === 'object') {
    return extractTextFromTiptap(node.content);
  }
  return '';
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 0, // Batalkan pembatasan waktu timeout
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => responseBody,
          json: async () => JSON.parse(responseBody),
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

class AiEvaluationQueue {
  constructor() {
    this._queue = [];
    this._processing = false;
  }

  async addJob(submissionId) {
    try {
      console.log(`[AI Queue] Menambahkan submission ${submissionId} ke antrean.`);
      // Set status di DB menjadi queued
      await pool.query(
        `UPDATE task_submissions 
         SET ai_evaluation_status = 'queued', ai_evaluation_error = NULL 
         WHERE id = $1`,
        [submissionId]
      );

      this._queue.push(submissionId);
      this._processNext();
    } catch (err) {
      console.error('[AI Queue] Gagal menambahkan job ke antrean:', err);
    }
  }

  async _processNext() {
    if (this._processing || this._queue.length === 0) {
      return;
    }

    this._processing = true;
    const submissionId = this._queue.shift();
    console.log(`[AI Queue] Mengambil submission ${submissionId} dari antrean untuk diproses. Sisa antrean: ${this._queue.length}`);

    try {
      await this._evaluateSubmissionJob(submissionId);
    } catch (error) {
      console.error(`[AI Queue] Gagal mengevaluasi submission ${submissionId}:`, error);
      await pool.query(
        `UPDATE task_submissions 
         SET ai_evaluation_status = 'failed', ai_evaluation_error = $2
         WHERE id = $1`,
        [submissionId, error.message || 'Unknown error']
      );
    } finally {
      this._processing = false;
      this._processNext();
    }
  }

  async _evaluateSubmissionJob(submissionId) {
    console.log(`[AI Queue] Memulai evaluasi untuk submission ${submissionId}`);

    // Update status di DB menjadi processing
    await pool.query(
      `UPDATE task_submissions 
       SET ai_evaluation_status = 'processing' 
       WHERE id = $1`,
      [submissionId]
    );

    // Ambil submission, jobsheet, dan data kelas
    console.log(`[AI Queue] [${submissionId}] Mengambil data submission dan jobsheet dari database...`);
    const submissionRes = await pool.query(
      `SELECT ts.*, j.title as jobsheet_title, j.description as jobsheet_description, j.content as jobsheet_content
       FROM task_submissions ts
       JOIN jobsheets j ON j.id = ts.jobsheet_id
       WHERE ts.id = $1 LIMIT 1`,
      [submissionId]
    );

    if (!submissionRes.rows.length) {
      throw new Error(`Submission ${submissionId} tidak ditemukan di database`);
    }

    const sub = submissionRes.rows[0];
    const report = typeof sub.report_html === 'string' ? JSON.parse(sub.report_html) : (sub.report_html || {});

    // Dapatkan lecturer_id kelas mahasiswa tersebut
    console.log(`[AI Queue] [${submissionId}] Mengambil lecturer ID kelas mahasiswa...`);
    const classRes = await pool.query(
      `SELECT c.lecturer_id 
       FROM classes c
       JOIN class_students cs ON cs.class_id = c.id
       WHERE cs.student_id = $1 AND cs.status = 'AKTIF' AND c.status = 'AKTIF'
       LIMIT 1`,
      [sub.student_id]
    );
    const lecturerId = classRes.rows[0]?.lecturer_id || 'dosen-1';

    // Ambil daftar experiments dari database untuk jobsheet ini
    console.log(`[AI Queue] [${submissionId}] Mengambil daftar percobaan untuk jobsheet ${sub.jobsheet_id}...`);
    const experimentsRes = await pool.query(
      `SELECT id, title, instruction_content, template_code, rubric
       FROM experiments
       WHERE jobsheet_id = $1
       ORDER BY id ASC`,
      [sub.jobsheet_id]
    );
    const experiments = experimentsRes.rows;

    // Ambil daftar exercises dari database untuk jobsheet ini
    console.log(`[AI Queue] [${submissionId}] Mengambil daftar latihan untuk jobsheet ${sub.jobsheet_id}...`);
    const exercisesRes = await pool.query(
      `SELECT id, title, instruction_content, template_code, rubric
       FROM exercises
       WHERE jobsheet_id = $1
       ORDER BY id ASC`,
      [sub.jobsheet_id]
    );
    const exercises = exercisesRes.rows;

    const aiServiceUrl = (process.env.AI_EVALUATOR_SERVICE_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const aiServiceKey = process.env.AI_SERVICE_API_KEY || '';

    console.log(`[AI Queue] [${submissionId}] Menyusun payload untuk ${experiments.length} percobaan...`);
    const payloadExperiments = [];
    for (const exp of experiments) {
      const expReport = report.experiments?.[exp.id] || {};
      const step = expReport.steps?.[0] || { files: {}, output: '', analysis: { type: 'doc', content: [] } };

      const files = Object.entries(step.files || {}).map(([filename, content]) => ({
        id: filename,
        path: filename,
        language: sub.programming_language || 'java',
        content: content
      }));

      if (files.length === 0) {
        files.push({
          id: 'Main.java',
          path: 'Main.java',
          language: sub.programming_language || 'java',
          content: exp.template_code || ''
        });
      }

      payloadExperiments.push({
        id: exp.id,
        title: exp.title,
        objective: '',
        instruction: typeof exp.instruction_content === 'string'
          ? exp.instruction_content
          : extractTextFromTiptap(exp.instruction_content),
        language: sub.programming_language || 'java',
        files,
        execution: {
          status: 'success',
          stdin: '',
          stdout: step.output || '',
          stderr: '',
          expectedOutput: '',
          exitCode: 0,
          durationMs: 0,
          testCases: []
        },
        studentAnalysis: extractTextFromTiptap(step.analysis),
        studentConclusion: '',
        rubric: {
          criteria: [
            {
              id: `correctness_${exp.id}`,
              name: `Kebenaran ${exp.title}`,
              description: 'Kesesuaian program dengan instruksi, kebenaran output, serta analisis mahasiswa.',
              maxScore: Number(exp.rubric) || 100
            }
          ]
        }
      });
    }

    console.log(`[AI Queue] [${submissionId}] Menyusun payload untuk ${exercises.length} latihan...`);
    const payloadExercises = [];
    for (const exe of exercises) {
      const exeReport = report.exercises?.[exe.id] || {};
      const files = Object.entries(exeReport.files || {}).map(([filename, content]) => ({
        id: filename,
        path: filename,
        language: sub.programming_language || 'java',
        content: content
      }));

      if (files.length === 0) {
        files.push({
          id: 'Main.java',
          path: 'Main.java',
          language: sub.programming_language || 'java',
          content: exe.template_code || ''
        });
      }

      payloadExercises.push({
        id: exe.id,
        title: exe.title,
        objective: '',
        instruction: typeof exe.instruction_content === 'string'
          ? exe.instruction_content
          : extractTextFromTiptap(exe.instruction_content),
        language: sub.programming_language || 'java',
        files,
        execution: {
          status: 'success',
          stdin: '',
          stdout: exeReport.output || '',
          stderr: '',
          expectedOutput: '',
          exitCode: 0,
          durationMs: 0,
          testCases: []
        },
        studentAnalysis: extractTextFromTiptap(exeReport.analysis),
        studentConclusion: '',
        rubric: {
          criteria: [
            {
              id: `correctness_${exe.id}`,
              name: `Kebenaran ${exe.title}`,
              description: 'Kesesuaian program dengan instruksi, kebenaran output, serta analisis mahasiswa.',
              maxScore: Number(exe.rubric) || 100
            }
          ]
        }
      });
    }

    const payload = {
      scope: 'jobsheet',
      submissionId: submissionId,
      jobsheet: {
        id: sub.jobsheet_id,
        title: sub.jobsheet_title,
        description: sub.jobsheet_description || ''
      },
      experiments: payloadExperiments,
      exercises: payloadExercises,
      studentConclusion: extractTextFromTiptap(report.conclusion),
      rubric: {
        criteria: [
          ...experiments.map((exp) => ({
            id: `correctness_${exp.id}`,
            name: exp.title,
            description: 'Kesesuaian program dengan instruksi, kebenaran output, serta analisis mahasiswa.',
            maxScore: Number(exp.rubric) || 100
          })),
          ...exercises.map((exe) => ({
            id: `correctness_${exe.id}`,
            name: exe.title,
            description: 'Kesesuaian program dengan instruksi, kebenaran output, serta analisis mahasiswa.',
            maxScore: Number(exe.rubric) || 100
          }))
        ]
      },
      options: {
        language: 'id-ID',
        includeScoreRecommendation: true
      }
    };

    const headers = { 'Content-Type': 'application/json' };
    if (aiServiceKey) {
      headers['X-AI-Service-Key'] = aiServiceKey;
    }

    console.log(`[AI Queue] [${submissionId}] Mengirim POST request ke AI Evaluator Service di: ${aiServiceUrl}/api/evaluations`);

    const response = await httpPost(`${aiServiceUrl}/api/evaluations`, headers, JSON.stringify(payload));

    console.log(`[AI Queue] [${submissionId}] AI Service merespon dengan status HTTP ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI Evaluator Service HTTP ${response.status}: ${text}`);
    }

    const responseData = await response.json();
    if (responseData.status !== 'success' || !responseData.data) {
      throw new Error(`AI Evaluator Service mengembalikan status ${responseData.status}`);
    }

    const result = responseData.data;
    console.log(`[AI Queue] [${submissionId}] Response data AI Service valid. Status evaluasi: ${result.evaluationStatus}`);

    // Extract experiment evaluations from the unified response
    const comments = [];
    const experimentResultsForDb = [];
    let overallSuccess = true;

    (result.experimentEvaluations || []).forEach((expEval) => {
      const expTitle = experiments.find(e => e.id === expEval.experimentId)?.title || 'Percobaan';
      if (expEval.status === 'completed') {
        const feedback = expEval.feedback || {};
        experimentResultsForDb.push({
          experimentId: expEval.experimentId,
          title: expTitle,
          summary: feedback.summary || '',
          strengths: feedback.strengths || [],
          issues: feedback.issues || [],
          suggestions: feedback.suggestions || [],
          rubricScores: expEval.rubricScores || []
        });

        (expEval.codeFeedbacks || []).forEach((fb) => {
          comments.push({
            experimentId: expEval.experimentId,
            step: 1,
            comment: `[${fb.filePath} L${fb.startLine}-${fb.endLine}] [${fb.category}] [Severity: ${fb.severity}] ${fb.message} Saran: ${fb.suggestion}`
          });
        });
      } else {
        overallSuccess = false;
        experimentResultsForDb.push({
          experimentId: expEval.experimentId,
          title: expTitle,
          status: 'failed',
          error: expEval.error || 'Gagal mengevaluasi percobaan'
        });
      }
    });

    (result.exerciseEvaluations || []).forEach((exeEval) => {
      const exeTitle = exercises.find(e => e.id === exeEval.exerciseId)?.title || 'Latihan';
      if (exeEval.status === 'completed') {
        const feedback = exeEval.feedback || {};
        experimentResultsForDb.push({
          experimentId: exeEval.exerciseId, // Alias exerciseId as experimentId
          title: exeTitle,
          summary: feedback.summary || '',
          strengths: feedback.strengths || [],
          issues: feedback.issues || [],
          suggestions: feedback.suggestions || [],
          rubricScores: exeEval.rubricScores || []
        });

        (exeEval.codeFeedbacks || []).forEach((fb) => {
          comments.push({
            experimentId: exeEval.exerciseId, // Alias exerciseId as experimentId
            step: 1,
            comment: `[${fb.filePath} L${fb.startLine}-${fb.endLine}] [${fb.category}] [Severity: ${fb.severity}] ${fb.message} Saran: ${fb.suggestion}`
          });
        });
      } else {
        overallSuccess = false;
        experimentResultsForDb.push({
          experimentId: exeEval.exerciseId, // Alias exerciseId as experimentId
          title: exeTitle,
          status: 'failed',
          error: exeEval.error || 'Gagal mengevaluasi latihan'
        });
      }
    });

    const mergedCodeFeedbacks = [];
    (result.experimentEvaluations || [])
      .filter(e => e.status === 'completed')
      .forEach(e => {
        (e.codeFeedbacks || []).forEach(fb => {
          mergedCodeFeedbacks.push({
            experimentId: e.experimentId,
            ...fb
          });
        });
      });

    (result.exerciseEvaluations || [])
      .filter(e => e.status === 'completed')
      .forEach(e => {
        (e.codeFeedbacks || []).forEach(fb => {
          mergedCodeFeedbacks.push({
            experimentId: e.exerciseId, // Alias exerciseId as experimentId
            ...fb
          });
        });
      });

    const experimentsNeedingAttention = [
      ...(result.jobsheetFeedback.experimentsNeedingAttention || [])
    ];
    if (result.jobsheetFeedback.exercisesNeedingAttention) {
      result.jobsheetFeedback.exercisesNeedingAttention.forEach((item) => {
        experimentsNeedingAttention.push({
          experimentId: item.exerciseId, // Alias exerciseId as experimentId
          reason: item.reason
        });
      });
    }

    const aiFeedback = {
      scope: 'jobsheet',
      jobsheetFeedback: {
        ...(result.jobsheetFeedback || {
          summary: 'Evaluasi jobsheet parsial selesai.',
          overallUnderstanding: '',
          strengths: [],
          issues: [],
          consistencyEvaluation: '',
          conclusionEvaluation: '',
          experimentsNeedingAttention: [],
          exercisesNeedingAttention: [],
          learningSuggestions: []
        }),
        experimentsNeedingAttention
      },
      experimentResults: experimentResultsForDb,
      comments,
      codeFeedbacks: mergedCodeFeedbacks
    };

    const totalScore = Math.min(100, Math.max(0, result.totalScoreRecommendation || 0));
    console.log(`[AI Queue] [${submissionId}] Total score rekomendasi AI (clamped): ${totalScore}. Menyimpan ke submission_reviews...`);

    // Simpan ke database submission_reviews sebagai draft AI
    const existingReviewRes = await pool.query(
      `SELECT id FROM submission_reviews WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
      [submissionId]
    );

    if (existingReviewRes.rows.length > 0) {
      const reviewId = existingReviewRes.rows[0].id;
      console.log(`[AI Queue] [${submissionId}] Ditemukan review lama dengan ID: ${reviewId}, mengupdate review...`);
      await pool.query(
        `UPDATE submission_reviews
         SET lecturer_id = $2, ai_score = $3, final_score = NULL, ai_feedback = $4, feedback = NULL, decision = 'PENDING'
         WHERE id = $1`,
        [reviewId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
      );
    } else {
      const reviewId = `rev-${randomUUID().slice(0, 12)}`;
      console.log(`[AI Queue] [${submissionId}] Membuat review baru dengan ID: ${reviewId}...`);
      await pool.query(
        `INSERT INTO submission_reviews (id, submission_id, lecturer_id, ai_score, final_score, ai_feedback, feedback, decision)
         VALUES ($1, $2, $3, $4, NULL, $5, NULL, 'PENDING')`,
        [reviewId, submissionId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
      );
    }

    // Set status di DB ke completed / partially_failed
    const finalStatus = result.evaluationStatus || (overallSuccess ? 'completed' : 'partially_failed');
    console.log(`[AI Queue] [${submissionId}] Mengupdate ai_evaluation_status di task_submissions menjadi '${finalStatus}'...`);
    await pool.query(
      `UPDATE task_submissions 
       SET ai_evaluation_status = $2 
       WHERE id = $1`,
      [submissionId, finalStatus]
    )
    console.log(`[AI Queue] [${submissionId}] Evaluasi submission selesai dengan status: ${finalStatus}`);
  }
}

module.exports = new AiEvaluationQueue();
