const pool = require('../postgres');
const { randomUUID } = require('crypto');

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

class AiEvaluationQueue {
  constructor() {
    this._queue = [];
    this._processing = false;
  }

  async addJob(submissionId) {
    try {
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
    const submissionRes = await pool.query(
      `SELECT ts.*, j.title as jobsheet_title, j.description as jobsheet_description, j.content as jobsheet_content, j.programming_language
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
    const experimentsRes = await pool.query(
      `SELECT id, title, instruction_content, template_code, rubric
       FROM experiments
       WHERE jobsheet_id = $1
       ORDER BY id ASC`,
      [sub.jobsheet_id]
    );

    const experiments = experimentsRes.rows;
    const aiServiceUrl = (process.env.AI_EVALUATOR_SERVICE_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const aiServiceKey = process.env.AI_SERVICE_API_KEY || '';

    const experimentResults = [];
    let overallSuccess = true;
    let anySuccess = false;

    // Evaluasi setiap experiment secara berurutan
    for (const exp of experiments) {
      try {
        const expReport = report.experiments?.[exp.id] || {};
        const step = expReport.steps?.[0] || { files: {}, output: '', analysis: { type: 'doc', content: [] } };

        // Construct source files
        const files = Object.entries(step.files || {}).map(([filename, content]) => ({
          id: filename,
          path: filename,
          language: sub.programming_language || 'java',
          content: content
        }));

        // Jika tidak ada file code sama sekali, skip evaluasi AI untuk experiment ini atau kirim file kosong
        if (files.length === 0) {
          files.push({
            id: 'Main.java',
            path: 'Main.java',
            language: sub.programming_language || 'java',
            content: exp.template_code || ''
          });
        }

        const payload = {
          scope: 'experiment',
          submissionId: submissionId,
          jobsheet: {
            id: sub.jobsheet_id,
            title: sub.jobsheet_title,
            description: sub.jobsheet_description || ''
          },
          experiment: {
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
            studentConclusion: ''
          },
          rubric: {
            criteria: [
              {
                id: 'correctness',
                name: 'Kebenaran Program & Analisis',
                description: 'Kesesuaian program dengan instruksi, kebenaran output, serta analisis mahasiswa.',
                maxScore: Number(exp.rubric) || 100
              }
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

        console.log(`[AI Queue] Mengirim evaluasi scope experiment untuk ${exp.id}`);
        
        const response = await fetch(`${aiServiceUrl}/api/evaluations`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`AI Evaluator Service HTTP ${response.status}: ${text}`);
        }

        const responseData = await response.json();
        if (responseData.status !== 'success' || !responseData.data) {
          throw new Error(`AI Evaluator Service mengembalikan status ${responseData.status}`);
        }

        const expResult = responseData.data;

        // Map ke format experimentResults jobsheet payload
        experimentResults.push({
          experimentId: exp.id,
          title: exp.title,
          summary: expResult.experimentFeedback?.summary || '',
          strengths: expResult.experimentFeedback?.strengths || [],
          issues: expResult.experimentFeedback?.issues || [],
          suggestions: expResult.experimentFeedback?.suggestions || [],
          rubricScores: expResult.rubricScores || [],
          codeFeedbacks: expResult.codeFeedbacks || [] // simpan code feedback untuk comments nanti
        });

        anySuccess = true;
      } catch (err) {
        console.error(`[AI Queue] Gagal mengevaluasi experiment ${exp.id}:`, err);
        overallSuccess = false;
        // Tetap lanjut ke experiment berikutnya jika ada
      }
    }

    if (!anySuccess) {
      throw new Error('Semua evaluasi percobaan gagal dilakukan.');
    }

    // Evaluasi scope jobsheet setelah percobaan selesai
    let jobsheetResult = null;
    try {
      const payload = {
        scope: 'jobsheet',
        submissionId: submissionId,
        jobsheet: {
          id: sub.jobsheet_id,
          title: sub.jobsheet_title,
          description: sub.jobsheet_description || '',
          objectives: []
        },
        experimentResults: experimentResults.map((res) => ({
          experimentId: res.experimentId,
          title: res.title,
          summary: res.summary,
          strengths: res.strengths,
          issues: res.issues,
          suggestions: res.suggestions,
          rubricScores: res.rubricScores
        })),
        studentConclusion: extractTextFromTiptap(report.conclusion),
        rubric: {
          criteria: experiments.map((exp) => ({
            id: `correctness_${exp.id}`,
            name: exp.title,
            maxScore: Number(exp.rubric) || 100
          }))
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

      console.log(`[AI Queue] Mengirim evaluasi scope jobsheet`);
      const response = await fetch(`${aiServiceUrl}/api/evaluations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`AI Evaluator Service HTTP ${response.status} (Jobsheet): ${text}`);
      }

      const responseData = await response.json();
      if (responseData.status !== 'success' || !responseData.data) {
        throw new Error(`AI Evaluator Service mengembalikan status ${responseData.status} (Jobsheet)`);
      }

      jobsheetResult = responseData.data;
    } catch (err) {
      console.error('[AI Queue] Gagal mengevaluasi scope jobsheet:', err);
      overallSuccess = false;
    }

    // Construct data untuk disimpan di submission_reviews
    const comments = [];
    experimentResults.forEach((res) => {
      (res.codeFeedbacks || []).forEach((fb) => {
        comments.push({
          experimentId: res.experimentId,
          step: 1,
          comment: `[${fb.filePath} L${fb.startLine}-${fb.endLine}] [${fb.category}] [Severity: ${fb.severity}] ${fb.message} Saran: ${fb.suggestion}`
        });
      });
    });

    const aiFeedback = {
      scope: 'jobsheet',
      jobsheetFeedback: jobsheetResult ? jobsheetResult.jobsheetFeedback : {
        summary: 'Evaluasi jobsheet parsial selesai.',
        overallUnderstanding: '',
        strengths: [],
        issues: [],
        consistencyEvaluation: '',
        conclusionEvaluation: '',
        experimentsNeedingAttention: [],
        learningSuggestions: []
      },
      experimentResults: experimentResults.map((res) => ({
        experimentId: res.experimentId,
        title: res.title,
        summary: res.summary,
        strengths: res.strengths,
        issues: res.issues,
        suggestions: res.suggestions,
        rubricScores: res.rubricScores
      })),
      comments
    };

    const totalScore = jobsheetResult 
      ? jobsheetResult.totalScoreRecommendation 
      : experimentResults.reduce((acc, curr) => acc + (curr.rubricScores?.[0]?.score || 0), 0);

    // Simpan ke database submission_reviews sebagai draft AI
    // Pertama, periksa apakah sudah ada review untuk submission ini
    const existingReviewRes = await pool.query(
      `SELECT id FROM submission_reviews WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
      [submissionId]
    );

    if (existingReviewRes.rows.length > 0) {
      const reviewId = existingReviewRes.rows[0].id;
      await pool.query(
        `UPDATE submission_reviews
         SET lecturer_id = $2, ai_score = $3, final_score = NULL, ai_feedback = $4, feedback = NULL, decision = 'PENDING'
         WHERE id = $1`,
        [reviewId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
      );
    } else {
      const reviewId = `rev-${randomUUID().slice(0, 12)}`;
      await pool.query(
        `INSERT INTO submission_reviews (id, submission_id, lecturer_id, ai_score, final_score, ai_feedback, feedback, decision)
         VALUES ($1, $2, $3, $4, NULL, $5, NULL, 'PENDING')`,
        [reviewId, submissionId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
      );
    }

    // Set status di DB ke completed / partially_failed
    const finalStatus = overallSuccess ? 'completed' : 'partially_failed';
    await pool.query(
      `UPDATE task_submissions 
       SET ai_evaluation_status = $2 
       WHERE id = $1`,
      [submissionId, finalStatus]
    );

    console.log(`[AI Queue] Evaluasi submission ${submissionId} selesai dengan status: ${finalStatus}`);
  }
}

module.exports = new AiEvaluationQueue();
