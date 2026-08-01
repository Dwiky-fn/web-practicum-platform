const pool = require('../postgres');
const { randomUUID } = require('crypto');
const http = require('http');
const https = require('https');

function parseTemplateFiles(templateCode, defaultFileName) {
  if (!templateCode) {
    return { [defaultFileName]: '' };
  }
  try {
    if (templateCode.trim().startsWith('{')) {
      const parsed = JSON.parse(templateCode);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    // not JSON
  }
  return { [defaultFileName]: templateCode };
}

function parseSubmissionSnapshot(rawReport, submissionId = '') {
  if (!rawReport) {
    return {};
  }

  if (typeof rawReport === 'object') {
    return rawReport;
  }

  if (typeof rawReport !== 'string') {
    return {};
  }

  const trimmed = rawReport.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn(`[AI Queue] [${submissionId}] report_html tidak valid JSON. Evaluasi dilanjutkan dengan snapshot kosong.`);
    return {};
  }
}

function toSourceFiles(filesSnapshot, language) {
  if (!filesSnapshot || typeof filesSnapshot !== 'object') {
    return [];
  }

  return Object.entries(filesSnapshot)
    .filter(([filename]) => filename && typeof filename === 'string')
    .map(([filename, content]) => ({
      id: filename,
      path: filename,
      language,
      content: typeof content === 'string' ? content : String(content || ''),
    }));
}

function toTemplateFiles(templateCode, defaultFileName, language) {
  const templateFiles = parseTemplateFiles(templateCode, defaultFileName);

  return Object.entries(templateFiles)
    .filter(([filename]) => filename && typeof filename === 'string')
    .map(([filename, content]) => ({
      id: filename,
      path: filename,
      language,
      content: typeof content === 'string' ? content : String(content || ''),
    }));
}

function normalizeExecution(snapshot = {}) {
  const execution = snapshot.execution && typeof snapshot.execution === 'object'
    ? snapshot.execution
    : {};

  const allowedStatuses = new Set([
    'success',
    'compiler_error',
    'runtime_error',
    'timeout',
    'failed',
    'not_run',
    'unknown',
    'not_available',
  ]);

  const output = typeof snapshot.output === 'string' ? snapshot.output : '';
  const status = allowedStatuses.has(execution.status)
    ? execution.status
    : (output.trim() ? 'success' : 'not_run');

  return {
    status,
    stdin: typeof execution.stdin === 'string' ? execution.stdin : '',
    stdout: typeof execution.stdout === 'string' ? execution.stdout : output,
    stderr: typeof execution.stderr === 'string' ? execution.stderr : '',
    expectedOutput: typeof execution.expectedOutput === 'string' ? execution.expectedOutput : '',
    exitCode: Number.isInteger(execution.exitCode) ? execution.exitCode : null,
    durationMs: Number.isFinite(execution.durationMs) ? execution.durationMs : null,
    testCases: Array.isArray(execution.testCases) ? execution.testCases : [],
  };
}

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

function extractInstructions(instructionContent) {
  if (!instructionContent) return [];
  if (typeof instructionContent === 'string') {
    return [instructionContent];
  }
  const items = [];
  
  function traverse(node) {
    if (!node) return;
    if (node.type === 'listItem') {
      items.push(extractTextFromTiptap(node).trim());
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
    if (node.content && typeof node.content === 'object') {
      traverse(node.content);
    }
  }
  
  traverse(instructionContent);
  return items;
}

function getAiServiceTimeoutMs() {
  const rawValue = process.env.AI_SERVICE_TIMEOUT_MS;

  if (!rawValue || rawValue === '0') {
    return 0;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const timeoutMs = getAiServiceTimeoutMs();
    console.log(
      timeoutMs > 0
        ? `[AI Queue] AI service timeout aktif: ${timeoutMs}ms`
        : '[AI Queue] AI service timeout dinonaktifkan'
    );

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    if (timeoutMs > 0) {
      options.timeout = timeoutMs;
    }

    const req = client.request(options, (res) => {
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

    if (timeoutMs > 0) {
      req.on('timeout', () => {
        req.destroy(new Error(`AI Evaluator Service request timeout (${timeoutMs}ms exceeded)`));
      });
    }

    req.write(body);
    req.end();
  });
}

function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (error.message && error.message.trim()) {
    return error.message;
  }
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const messages = error.errors.map(e => e.message).filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }
  return String(error);
}

function getMaxRetryAttempts() {
  const value = Number(process.env.AI_EVALUATION_MAX_RETRY || 3);
  return Number.isInteger(value) && value >= 0 ? value : 3;
}

function getRetryDelayMs() {
  const value = Number(process.env.AI_EVALUATION_RETRY_DELAY_MS || 1500);
  return Number.isFinite(value) && value >= 0 ? value : 1500;
}

function isTransientAiError(error) {
  const message = getErrorMessage(error).toLowerCase();
  if (/http 4\d\d/.test(message) && !/http 408|http 429/.test(message)) return false;
  return message.includes('timeout')
    || message.includes('econnreset')
    || message.includes('econnrefused')
    || message.includes('http 408')
    || message.includes('http 429')
    || /http 5\d\d/.test(message);
}

class AiEvaluationQueue {
  constructor() {
    this._queue = [];
    this._activeSubmissionIds = new Set();
    this._queuedSubmissionIds = new Set();
    this._currentSteps = new Map();
    this._processing = false;
    this._cleanHangingJobs();
  }

  getJobInfo(submissionId) {
    if (this._activeSubmissionIds.has(submissionId)) {
      return {
        status: 'processing',
        position: 0,
        currentStep: this._currentSteps.get(submissionId) || 'Menganalisis pengerjaan...',
      };
    }
    const pos = this._queue.indexOf(submissionId);
    if (pos !== -1) {
      return {
        status: 'queued',
        position: pos + 1,
        currentStep: null,
      };
    }
    return null;
  }

  async _cleanHangingJobs() {
    try {
      console.log('[AI Queue] Membersihkan submission yang menggantung (queued/processing) karena server restart.');
      await pool.query(
        `UPDATE task_submissions 
         SET 
           ai_evaluation_status = 'failed', 
           ai_evaluation_error = 'AI review dihentikan karena server restart' 
         WHERE ai_evaluation_status IN ('queued', 'processing')`
      );
    } catch (err) {
      console.error('[AI Queue] Gagal membersihkan submission yang menggantung:', err);
    }
  }

  async hasExistingAiFeedback(submissionId) {
    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM submission_reviews
      WHERE submission_id = $1
        AND ai_feedback IS NOT NULL
      `,
      [submissionId]
    );

    return Number(result.rows[0]?.count || 0) > 0;
  }

  async canEnqueueAiEvaluation(submissionId, options = {}) {
    const force = options.force === true;

    const result = await pool.query(
      `
      SELECT ai_evaluation_status
      FROM task_submissions
      WHERE id = $1
      `,
      [submissionId]
    );

    const submission = result.rows[0];

    if (!submission) {
      return {
        allowed: false,
        reason: 'submission_not_found',
      };
    }

    if (force) {
      return {
        allowed: true,
        reason: 'forced_retry',
      };
    }

    const blockedStatuses = [
      'queued',
      'processing',
      'completed',
      'partially_failed',
      'failed',
      'skipped',
      'needs_lecturer_review',
    ];

    if (blockedStatuses.includes(submission.ai_evaluation_status)) {
      return {
        allowed: false,
        reason: `ai_evaluation_status_is_${submission.ai_evaluation_status}`,
      };
    }

    const hasFeedback = await this.hasExistingAiFeedback(submissionId);
    if (hasFeedback) {
      return {
        allowed: false,
        reason: 'ai_feedback_already_exists',
      };
    }

    return {
      allowed: true,
      reason: 'allowed',
    };
  }

  async addJob(submissionId, options = {}) {
    if (this._activeSubmissionIds.has(submissionId)) {
      console.log(`[AI Queue] Skip enqueue ${submissionId}: already processing`);
      return {
        enqueued: false,
        reason: 'already_processing',
      };
    }

    if (this._queuedSubmissionIds.has(submissionId)) {
      console.log(`[AI Queue] Skip enqueue ${submissionId}: already queued`);
      return {
        enqueued: false,
        reason: 'already_queued',
      };
    }

    // Tandai submission sebagai queued di memori secara sinkron untuk memblokir race condition
    this._queuedSubmissionIds.add(submissionId);

    try {
      console.log(`[AI Queue] Request enqueue submission ${submissionId}`);
      console.trace('[AI Queue] enqueue caller trace');

      const check = await this.canEnqueueAiEvaluation(submissionId, options);
      if (!check.allowed) {
        console.log(`[AI Queue] Skip enqueue ${submissionId}: ${check.reason}`);
        this._queuedSubmissionIds.delete(submissionId);
        return {
          enqueued: false,
          reason: check.reason,
        };
      }

      if (options.force === true) {
        await this._clearPreviousAiReview(submissionId);
      }

      // Set status di DB menjadi queued
      await pool.query(
        `UPDATE task_submissions 
         SET
           ai_evaluation_status = 'queued',
           ai_evaluation_error = NULL,
           ai_evaluation_started_at = NULL,
           ai_evaluation_finished_at = NULL,
           ai_evaluation_retry_count = CASE WHEN $2 = true THEN 0 ELSE COALESCE(ai_evaluation_retry_count, 0) END,
           ai_evaluation_last_attempt_at = NULL
         WHERE id = $1`,
        [submissionId, options.force === true]
      );

      this._queue.push(submissionId);
      this._processNext();

      return {
        enqueued: true,
        reason: check.reason,
      };
    } catch (err) {
      console.error('[AI Queue] Gagal menambahkan job ke antrean:', err);
      this._queuedSubmissionIds.delete(submissionId);
      return {
        enqueued: false,
        reason: 'error',
      };
    }
  }

  async _processNext() {
    if (this._processing || this._queue.length === 0) {
      return;
    }

    this._processing = true;
    const submissionId = this._queue.shift();
    this._queuedSubmissionIds.delete(submissionId);
    this._activeSubmissionIds.add(submissionId);

    console.log(`[AI Queue] Mengambil submission ${submissionId} dari antrean untuk diproses. Sisa antrean: ${this._queue.length}`);

    try {
      await this._evaluateSubmissionJob(submissionId);
    } catch (error) {
      console.error(`[AI Queue] Gagal mengevaluasi submission ${submissionId}:`, error);
    } finally {
      this._activeSubmissionIds.delete(submissionId);
      this._processing = false;
      this._processNext();
    }
  }

  async _evaluateSubmissionJob(submissionId) {
    try {
      await this._evaluateSubmissionJobInternal(submissionId);
    } catch (error) {
      const retried = await this._retryOrFail(submissionId, error);
      if (!retried) throw error;
    }
  }

  async _retryOrFail(submissionId, error) {
    const errorMessage = getErrorMessage(error);
    const retryState = await pool.query(
      `SELECT COALESCE(ai_evaluation_retry_count, 0)::int AS retry_count
       FROM task_submissions
       WHERE id = $1`,
      [submissionId],
    );
    const retryCount = Number(retryState.rows[0]?.retry_count || 0);
    const shouldRetry = isTransientAiError(error) && retryCount < getMaxRetryAttempts();

    if (shouldRetry) {
      const nextRetryCount = retryCount + 1;
      await pool.query(
        `UPDATE task_submissions
         SET
           ai_evaluation_status = 'queued',
           ai_evaluation_error = $2,
           ai_evaluation_retry_count = $3,
           ai_evaluation_last_attempt_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [submissionId, errorMessage, nextRetryCount]
      );
      setTimeout(() => {
        this._queue.push(submissionId);
        this._processNext();
      }, getRetryDelayMs());
      return true;
    }

    await pool.query(
      `UPDATE task_submissions
       SET
         ai_evaluation_status = 'failed',
         ai_evaluation_error = $2,
         ai_evaluation_last_attempt_at = CURRENT_TIMESTAMP,
         ai_evaluation_finished_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [submissionId, errorMessage]
    );
    return false;
  }

  async _clearPreviousAiReview(submissionId) {
    console.log(`[AI Queue] [${submissionId}] Retry manual: membersihkan field AI lama tanpa mengubah review dosen.`);
    await pool.query(
      `UPDATE submission_reviews
       SET
         ai_score = NULL,
         ai_feedback = NULL
       WHERE submission_id = $1`,
      [submissionId]
    );
  }

  async _evaluateSubmissionJobInternal(submissionId) {
    console.log(`[AI Queue] Memulai evaluasi untuk submission ${submissionId}`);
    this._currentSteps.set(submissionId, 'Memulai analisis pengerjaan...');

    // Update status di DB menjadi processing
    await pool.query(
      `UPDATE task_submissions 
       SET
         ai_evaluation_status = 'processing',
         ai_evaluation_started_at = COALESCE(ai_evaluation_started_at, CURRENT_TIMESTAMP),
         ai_evaluation_last_attempt_at = CURRENT_TIMESTAMP,
         ai_evaluation_finished_at = NULL
       WHERE id = $1`,
      [submissionId]
    );

    // Ambil submission, jobsheet, dan data kelas
    this._currentSteps.set(submissionId, 'Mengambil data pengerjaan & modul dari database...');
    console.log(`[AI Queue] [${submissionId}] Mengambil data submission dan jobsheet dari database...`);
    const submissionRes = await pool.query(
      `SELECT ts.*, j.title as jobsheet_title, j.description as jobsheet_description,
        j.content as jobsheet_content, j.programming_language as jobsheet_language,
        j.id_mata_kuliah,
        mk.nama_mk AS course_name
       FROM task_submissions ts
       JOIN jobsheets j ON j.id = ts.jobsheet_id
       JOIN mata_kuliah mk ON mk.id = j.id_mata_kuliah
       WHERE ts.id = $1 LIMIT 1`,
      [submissionId]
    );

    if (!submissionRes.rows.length) {
      throw new Error(`Submission ${submissionId} tidak ditemukan di database`);
    }

    const sub = submissionRes.rows[0];
    const report = parseSubmissionSnapshot(sub.report_html, submissionId);

    // Dapatkan lecturer_id kelas mahasiswa tersebut
    console.log(`[AI Queue] [${submissionId}] Mengambil lecturer ID kelas mahasiswa...`);
    let classRes = { rows: [] };

    if (sub.id_kelas_praktikum) {
      classRes = await pool.query(
        `SELECT kp.id AS class_id,
          p.id_dosen AS lecturer_id,
          'java'::varchar AS programming_language,
          kp.id AS id_kelas_praktikum
         FROM kelas_praktikum kp
         JOIN jobsheets j
           ON j.id = $2
          AND j.id_mata_kuliah = kp.id_mata_kuliah
         JOIN kelas_semester ks
           ON ks.id_tahun_semester = kp.id_tahun_semester
          AND ks.id_semester = kp.id_semester
          AND ks.id_kelas = kp.id_kelas
         JOIN kelas_mhs km
           ON km.id_kelas_semester = ks.id
          AND km.id_mahasiswa = $1
         LEFT JOIN pengampu p
           ON p.id_kelas_praktikum = kp.id
          AND p.peran = 'utama'
         WHERE kp.id = $3
           AND LOWER(COALESCE(km.status, 'active')) = 'active'
         LIMIT 1`,
        [sub.student_id, sub.jobsheet_id, sub.id_kelas_praktikum],
      );
    }

    if (!classRes.rows.length) {
      throw new Error(`Kelas praktikum tidak ditemukan untuk mahasiswa ${sub.student_id} dan jobsheet ${sub.jobsheet_id}`);
    }
    const lecturerId = classRes.rows[0]?.lecturer_id || 'dosen-1';
    sub.class_id = classRes.rows[0]?.class_id || null;
    sub.programming_language = sub.jobsheet_language || classRes.rows[0]?.programming_language || 'java';
    const defaultFileName = sub.programming_language === 'python' ? 'main.py' : 'Main.java';

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

    this._currentSteps.set(
      submissionId,
      `Menyusun payload evaluasi untuk ${experiments.length} Percobaan & ${exercises.length} Latihan...`
    );
    console.log(`[AI Queue] [${submissionId}] Menyusun payload untuk ${experiments.length} percobaan...`);
    const payloadExperiments = [];
    for (let expIndex = 0; expIndex < experiments.length; expIndex++) {
      const exp = experiments[expIndex];
      const expReport = report.experiments?.[exp.id] || {};
      const steps = expReport.steps || [];
      const instructions = extractInstructions(exp.instruction_content);
      const numSteps = Math.max(1, steps.length, instructions.length);

      for (let i = 0; i < numSteps; i++) {
        this._currentSteps.set(
          submissionId,
          `Menyiapkan review Percobaan ${expIndex + 1}/${experiments.length}: ${exp.title || 'Tanpa Judul'} - Langkah ${i + 1}/${numSteps}`
        );
        const step = steps[i] || { files: {}, output: '', analysis: { type: 'doc', content: [] } };
        const instructionText = instructions[i] || instructions[instructions.length - 1] || 'Lakukan percobaan sesuai modul.';
        const stepNumber = i + 1;

        const language = sub.programming_language || 'java';
        const files = toSourceFiles(step.files, language);
        const templateFiles = toTemplateFiles(exp.template_code, defaultFileName, language);

        const totalRubricScore = Number(exp.rubric) || 100;
        const baseScore = Math.floor(totalRubricScore / numSteps);
        const remainder = totalRubricScore % numSteps;
        const stepMaxScore = baseScore + (i < remainder ? 1 : 0);

        payloadExperiments.push({
          id: `${exp.id}:${stepNumber}`,
          experimentId: exp.id,
          step: stepNumber,
          title: `${exp.title} - Langkah ${stepNumber}`,
          objective: '',
          instruction: instructionText,
          language,
          files,
          templateFiles,
          hasStudentCode: files.length > 0,
          execution: normalizeExecution(step),
          studentAnalysis: extractTextFromTiptap(step.analysis),
          studentConclusion: '',
          rubric: {
            criteria: [
              {
                id: `correctness_${exp.id}_step-${stepNumber}`,
                name: `Kebenaran Langkah ${stepNumber}`,
                description: `Kesesuaian langkah ${stepNumber} dengan instruksi, kebenaran output, serta analisis mahasiswa.`,
                maxScore: stepMaxScore
              }
            ]
          }
        });
      }
    }

    console.log(`[AI Queue] [${submissionId}] Menyusun payload untuk ${exercises.length} latihan...`);
    const payloadExercises = [];
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
      const exe = exercises[exerciseIndex];
      this._currentSteps.set(
        submissionId,
        `Menyiapkan review Latihan ${exerciseIndex + 1}/${exercises.length}: ${exe.title || 'Tanpa Judul'}`
      );
      const exeReport = report.exercises?.[exe.id] || {};
      const language = sub.programming_language || 'java';
      const files = toSourceFiles(exeReport.files, language);
      const templateFiles = toTemplateFiles(exe.template_code, defaultFileName, language);

      payloadExercises.push({
        id: exe.id,
        title: exe.title,
        objective: '',
        instruction: typeof exe.instruction_content === 'string'
          ? exe.instruction_content
          : extractTextFromTiptap(exe.instruction_content),
        language,
        files,
        templateFiles,
        hasStudentCode: files.length > 0,
        execution: normalizeExecution(exeReport),
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

    // Build the main jobsheet rubric criteria by combining step-level rubric criteria for experiments,
    // and exercise-level criteria.
    const mainRubricCriteria = [];
    for (const exp of payloadExperiments) {
      mainRubricCriteria.push({
        id: exp.rubric.criteria[0].id,
        name: exp.title,
        description: exp.rubric.criteria[0].description,
        maxScore: exp.rubric.criteria[0].maxScore
      });
    }
    for (const exe of payloadExercises) {
      mainRubricCriteria.push({
        id: exe.rubric.criteria[0].id,
        name: exe.title,
        description: exe.rubric.criteria[0].description,
        maxScore: exe.rubric.criteria[0].maxScore
      });
    }

    const payload = {
      schemaVersion: '1.0',
      scope: 'jobsheet',
      submission: {
        id: submissionId,
        source: sub.remedial_id ? 'remedial' : (sub.submission_source || 'manual'),
        attemptType: sub.attempt_type || (sub.remedial_id ? 'remedial' : 'normal'),
        attemptNo: Number(sub.attempt_no || 1),
        remedialId: sub.remedial_id || null,
        isAutoSubmitted: Boolean(sub.is_auto_submitted),
      },
      context: {
        kelasPraktikumId: sub.id_kelas_praktikum || classRes.rows[0]?.id_kelas_praktikum || null,
        idKelasMhs: sub.id_kelas_mhs || null,
        studentId: sub.student_id,
        classId: sub.class_id,
        programmingLanguage: sub.programming_language,
        courseName: sub.course_name,
      },
      jobsheet: {
        id: sub.jobsheet_id,
        title: sub.jobsheet_title,
        description: sub.jobsheet_description || ''
      },
      experiments: payloadExperiments,
      exercises: payloadExercises,
      studentConclusion: extractTextFromTiptap(report.conclusion),
      rubric: {
        criteria: mainRubricCriteria
      },
      options: {
        language: 'id-ID',
        includeScoreRecommendation: true
      }
    };

    if (process.env.AI_EVALUATOR_DEBUG_PAYLOAD === 'true') {
      console.log('[AI Queue] Payload summary', {
        submissionId,
        scope: payload.scope,
        schemaVersion: payload.schemaVersion,
        submissionSource: payload.submission?.source,
        attemptType: payload.submission?.attemptType,
        remedialId: payload.submission?.remedialId,
        experimentsCount: payload.experiments?.length,
        exercisesCount: payload.exercises?.length,
        rubricCriteriaCount: payload.rubric?.criteria?.length,
        experimentFileCounts: payload.experiments?.map((item) => ({
          id: item.id,
          files: item.files?.length || 0,
          templateFiles: item.templateFiles?.length || 0,
          executionStatus: item.execution?.status,
        })),
        exerciseFileCounts: payload.exercises?.map((item) => ({
          id: item.id,
          files: item.files?.length || 0,
          templateFiles: item.templateFiles?.length || 0,
          executionStatus: item.execution?.status,
        })),
      });
    }

    const webhookUrl = process.env.LMS_WEBHOOK_URL || 'https://be.dwkyjnrdi.my.id/api/internal/ai-callback';
    payload.options = {
      ...(payload.options || {}),
      webhookUrl,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (aiServiceKey) {
      headers['X-AI-Service-Key'] = aiServiceKey;
    }

    const payloadString = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadString);

    this._currentSteps.set(submissionId, 'Mengirim data pengerjaan ke Evaluator AI Service...');
    console.log(`[AI Service Log] ==================== MEMULAI REQUEST EVALUASI AI ====================`);
    console.log(`[AI Service Log] Submission ID  : ${submissionId}`);
    console.log(`[AI Service Log] Target Endpoint: ${aiServiceUrl}/api/evaluations`);
    console.log(`[AI Service Log] Webhook Target : ${webhookUrl}`);
    console.log(`[AI Service Log] Protocol       : ${aiServiceUrl.startsWith('https') ? 'HTTPS (TLS/SSL Encrypted)' : 'HTTP'}`);
    console.log(`[AI Service Log] Header Auth    : ${aiServiceKey ? 'Terpasang (API Key Hidden)' : 'Tanpa API Key'}`);
    console.log(`[AI Service Log] Ukuran Payload : ${(payloadBytes / 1024).toFixed(2)} KB (${payloadBytes} bytes)`);
    console.log(`[AI Service Log] Detail Content : ${payload.experiments.length} Percobaan (${payloadExperiments.reduce((acc, curr) => acc + curr.files.length, 0)} file kode), ${payload.exercises.length} Latihan (${payloadExercises.reduce((acc, curr) => acc + curr.files.length, 0)} file kode)`);
    console.log(`[AI Service Log] Bahasa Program : ${sub.programming_language}`);
    console.log(`[AI Service Log] Mengirim request ke AI Evaluator Service...`);

    const startTime = Date.now();
    const response = await httpPost(`${aiServiceUrl}/api/evaluations`, headers, payloadString);
    const durationMs = Date.now() - startTime;

    console.log(`[AI Service Log] AI Service merespon dalam ${durationMs}ms dengan status HTTP ${response.status}`);

    if (!response.ok) {
      let text = await response.text();
      console.error(`[AI Service Log] [ERROR] Request ke AI Service Gagal! Status: HTTP ${response.status}`);
      console.error(`[AI Service Log] [ERROR] Durasi Request: ${durationMs}ms`);
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        console.error(`[AI Service Log] [ERROR] Respons dari server berupa HTML page (kemungkinan error web server/Cloudflare/Nginx)`);
        text = `HTTP ${response.status} Error (HTML Response)`;
      } else {
        console.error(`[AI Service Log] [ERROR] Raw Response Body: ${text.slice(0, 500)}`);
      }
      throw new Error(`AI Evaluator Service HTTP ${response.status}: ${text}`);
    }

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      console.error(`[AI Service Log] [ERROR] Gagal parse JSON dari respons AI Service:`, e.message);
      throw new Error('Gagal mengurai respons JSON dari AI Evaluator Service');
    }

    // ── CASE 1: HTTP 202 Accepted (Background Job Async) ──
    if (response.status === 202 || responseData.status === 'accepted') {
      console.log(`[AI Service Log] [ACCEPTED] AI Service telah menerima tugas (HTTP ${response.status}). Evaluasi diproses di background.`);
      console.log(`[AI Service Log] [ACCEPTED] Respons AI Service:`, responseData);
      this._currentSteps.set(submissionId, 'Tugas diterima oleh AI Service. Sedang menganalisis pengerjaan di background...');
      return; // Selesai dari antrean HTTP lokal, DB tetap status 'processing' menunggu Webhook callback!
    }

    // ── CASE 2: HTTP 200 OK langsung (Synchronous Fallback) ──
    if (responseData.status === 'success' && responseData.data) {
      await this.processAndSaveAiResult(submissionId, responseData);
    } else {
      console.error(`[AI Service Log] [ERROR] AI Service mengembalikan status non-success: ${responseData.status}`);
      throw new Error(`AI Evaluator Service mengembalikan status ${responseData.status}`);
    }
  }

  /**
   * Memproses dan menyimpan hasil evaluasi AI (dikirim via Webhook Callback atau Sync) ke PostgreSQL.
   */
  async processAndSaveAiResult(submissionId, payloadData) {
    console.log(`[AI Queue] [${submissionId}] Memproses dan menyimpan hasil evaluasi AI ke database...`);

    // 1. Cek jika evaluasi dilaporkan gagal oleh AI Service
    if (payloadData.status === 'failed' || payloadData.error) {
      const errorMsg = payloadData.error || 'Evaluasi AI gagal di background';
      console.error(`[AI Queue] [${submissionId}] Evaluasi gagal: ${errorMsg}`);
      
      await pool.query(
        `UPDATE task_submissions 
         SET ai_evaluation_status = 'failed', 
             ai_evaluation_error = $2,
             ai_evaluation_finished_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [submissionId, errorMsg]
      );
      this._currentSteps.delete(submissionId);
      return;
    }

    const result = payloadData.data || payloadData;
    if (!result) {
      throw new Error('Payload data evaluasi AI tidak ditemukan');
    }

    // 2. Ambil data submission, lecturer_id, dan jobsheet_id
    const subRes = await pool.query(
      `SELECT
         ts.id,
         ts.jobsheet_id,
         COALESCE(p.id_dosen, fallback_pengampu.id_dosen, 'dosen-1') AS lecturer_id
       FROM task_submissions ts
       JOIN jobsheets j ON j.id = ts.jobsheet_id
       LEFT JOIN pengampu p
         ON p.id_kelas_praktikum = ts.id_kelas_praktikum
        AND p.peran = 'utama'
       LEFT JOIN LATERAL (
         SELECT pengampu.id_dosen
         FROM pengampu
         JOIN kelas_praktikum kp ON kp.id = pengampu.id_kelas_praktikum
         WHERE kp.id_mata_kuliah = j.id_mata_kuliah
           AND pengampu.peran = 'utama'
         ORDER BY pengampu.id ASC
         LIMIT 1
       ) fallback_pengampu ON true
       WHERE ts.id = $1 LIMIT 1`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      throw new Error(`Submission dengan ID ${submissionId} tidak ditemukan`);
    }

    const { jobsheet_id: jobsheetId, lecturer_id: lecturerId } = subRes.rows[0];

    // 3. Ambil daftar percobaan & latihan untuk pemetaan title
    const expRes = await pool.query(
      `SELECT id, title, order_number as order FROM experiments WHERE jobsheet_id = $1`,
      [jobsheetId]
    );
    const experiments = expRes.rows;

    const exeRes = await pool.query(
      `SELECT id, title, order_number as order FROM exercises WHERE jobsheet_id = $1`,
      [jobsheetId]
    );
    const exercises = exeRes.rows;

    // 4. Ekstrak evaluasi percobaan & latihan
    const comments = [];
    const experimentResultsMap = new Map();
    let overallSuccess = true;

    (result.experimentEvaluations || []).forEach((expEval) => {
      const [legacyExpId, legacyStepStr] = String(expEval.experimentId || '').split(':');
      const realExpId = legacyExpId;
      const stepNumber = Number(expEval.step || legacyStepStr || 1);
      const expTitle = experiments.find(e => e.id === realExpId)?.title || 'Percobaan';

      if (!experimentResultsMap.has(realExpId)) {
        experimentResultsMap.set(realExpId, {
          experimentId: realExpId,
          title: expTitle,
          status: 'completed',
          summaries: [],
          strengths: new Set(),
          issues: new Set(),
          suggestions: new Set(),
          rubricScores: []
        });
      }

      const agg = experimentResultsMap.get(realExpId);

      if (expEval.status === 'completed') {
        const feedback = expEval.feedback || {};
        if (feedback.summary) agg.summaries.push(`Langkah ${stepNumber}: ${feedback.summary}`);
        (feedback.strengths || []).forEach(s => agg.strengths.add(s));
        (feedback.issues || []).forEach(i => agg.issues.add(i));
        (feedback.suggestions || []).forEach(s => agg.suggestions.add(s));
        (expEval.rubricScores || []).forEach((score) => {
          agg.rubricScores.push(score);
        });

        (expEval.codeFeedbacks || []).forEach((fb) => {
          comments.push({
            experimentId: realExpId,
            step: stepNumber,
            comment: `[${fb.filePath} L${fb.startLine}-${fb.endLine}] [${fb.category}] [Severity: ${fb.severity}] ${fb.message} Saran: ${fb.suggestion}`
          });
        });
      } else {
        agg.status = 'failed';
        agg.error = expEval.error || `Gagal mengevaluasi Langkah ${stepNumber}`;
        overallSuccess = false;
      }
    });

    const experimentResultsForDb = [];
    experimentResultsMap.forEach((agg, realExpId) => {
      if (agg.status === 'completed') {
        const totalScore = agg.rubricScores.reduce((sum, item) => sum + item.score, 0);
        const totalMaxScore = agg.rubricScores.reduce((sum, item) => sum + item.maxScore, 0);
        const reason = agg.rubricScores.map(item => {
          const stepNum = item.criterionId.split('_step-')[1] || '';
          return `Langkah ${stepNum}: ${item.reason}`;
        }).join(' | ');

        experimentResultsForDb.push({
          experimentId: realExpId,
          title: agg.title,
          summary: agg.summaries.join('\n\n'),
          strengths: Array.from(agg.strengths),
          issues: Array.from(agg.issues),
          suggestions: Array.from(agg.suggestions),
          rubricScores: [
            {
              criterionId: `correctness_${realExpId}`,
              score: totalScore,
              maxScore: totalMaxScore,
              reason: reason
            }
          ]
        });
      } else {
        experimentResultsForDb.push({
          experimentId: realExpId,
          title: agg.title,
          status: 'failed',
          error: agg.error
        });
      }
    });

    (result.exerciseEvaluations || []).forEach((exeEval) => {
      const exeTitle = exercises.find(e => e.id === exeEval.exerciseId)?.title || 'Latihan';
      if (exeEval.status === 'completed') {
        const feedback = exeEval.feedback || {};
        experimentResultsForDb.push({
          experimentId: exeEval.exerciseId,
          title: exeTitle,
          summary: feedback.summary || '',
          strengths: feedback.strengths || [],
          issues: feedback.issues || [],
          suggestions: feedback.suggestions || [],
          rubricScores: exeEval.rubricScores || []
        });

        (exeEval.codeFeedbacks || []).forEach((fb) => {
          comments.push({
            experimentId: exeEval.exerciseId,
            step: 1,
            comment: `[${fb.filePath} L${fb.startLine}-${fb.endLine}] [${fb.category}] [Severity: ${fb.severity}] ${fb.message} Saran: ${fb.suggestion}`
          });
        });
      } else {
        overallSuccess = false;
        experimentResultsForDb.push({
          experimentId: exeEval.exerciseId,
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
        const [legacyExpId, legacyStepStr] = String(e.experimentId || '').split(':');
        const realExpId = legacyExpId;
        const stepNumber = Number(e.step || legacyStepStr || 1);
        (e.codeFeedbacks || []).forEach(fb => {
          mergedCodeFeedbacks.push({
            experimentId: realExpId,
            step: stepNumber,
            ...fb
          });
        });
      });

    (result.exerciseEvaluations || [])
      .filter(e => e.status === 'completed')
      .forEach(e => {
        (e.codeFeedbacks || []).forEach(fb => {
          mergedCodeFeedbacks.push({
            experimentId: e.exerciseId,
            step: 1,
            ...fb
          });
        });
      });

    const experimentsNeedingAttention = [];
    if (result.jobsheetFeedback?.experimentsNeedingAttention) {
      const seen = new Set();
      result.jobsheetFeedback.experimentsNeedingAttention.forEach((item) => {
        const [realExpId, stepStr] = String(item.experimentId || '').split(':');
        const stepLabel = stepStr ? `Langkah ${stepStr}` : '';
        const key = `${realExpId}:${item.reason}`;
        if (!seen.has(key)) {
          seen.add(key);
          experimentsNeedingAttention.push({
            experimentId: realExpId,
            reason: `${stepLabel ? `[${stepLabel}] ` : ''}${item.reason}`
          });
        }
      });
    }
    if (result.jobsheetFeedback?.exercisesNeedingAttention) {
      result.jobsheetFeedback.exercisesNeedingAttention.forEach((item) => {
        experimentsNeedingAttention.push({
          experimentId: item.exerciseId,
          reason: item.reason
        });
      });
    }

    const aiFeedback = {
      scope: 'jobsheet',
      jobsheetFeedback: {
        ...(result.jobsheetFeedback || {
          summary: 'Evaluasi jobsheet selesai.',
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

    aiFeedback.scoreSummary = {
      totalScoreRecommendation: Number(result.totalScoreRecommendation || 0),
      totalMaxScore: Number(result.totalMaxScore || 0),
      finalGradeRecommendation: Number(result.finalGradeRecommendation || 0)
    };

    const totalScore = Math.min(100, Math.max(0, Number(
      result.finalGradeRecommendation
      ?? result.totalScoreRecommendation
      ?? 0
    )));

    console.log(`[AI Queue] [${submissionId}] Nilai akhir rekomendasi AI: ${totalScore}/100. Menyimpan ke submission_reviews...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingReviewRes = await client.query(
        `SELECT id FROM submission_reviews WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
        [submissionId]
      );

      if (existingReviewRes.rows.length > 0) {
        const reviewId = existingReviewRes.rows[0].id;
        console.log(`[AI Queue] [${submissionId}] Ditemukan review lama dengan ID: ${reviewId}, mengupdate review...`);
        await client.query(
          `UPDATE submission_reviews
           SET
             lecturer_id = COALESCE(lecturer_id, $2),
             ai_score = $3,
             ai_feedback = $4
           WHERE id = $1`,
          [reviewId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
        );
      } else {
        const reviewId = `rev-${randomUUID().slice(0, 12)}`;
        console.log(`[AI Queue] [${submissionId}] Membuat review baru dengan ID: ${reviewId}...`);
        await client.query(
          `INSERT INTO submission_reviews (id, submission_id, lecturer_id, ai_score, final_score, ai_feedback, feedback, decision)
           VALUES ($1, $2, $3, $4, NULL, $5, NULL, 'PENDING')`,
          [reviewId, submissionId, lecturerId, totalScore, JSON.stringify(aiFeedback)]
        );
      }

      const finalStatus = result.evaluationStatus || (overallSuccess ? 'completed' : 'partially_failed');
      console.log(`[AI Queue] [${submissionId}] Mengupdate ai_evaluation_status di task_submissions menjadi '${finalStatus}'...`);
      await client.query(
        `UPDATE task_submissions 
         SET
           ai_evaluation_status = $2,
           ai_evaluation_error = NULL,
           ai_evaluation_finished_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [submissionId, finalStatus]
      );

      await client.query('COMMIT');
      this._currentSteps.delete(submissionId);
      console.log(`[AI Queue] [${submissionId}] Feedback AI berhasil disimpan via Webhook / Sync. Status: ${finalStatus}`);
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  }
}

module.exports = new AiEvaluationQueue();
