const pool = require('..');
const { randomUUID } = require('crypto');
const AiEvaluationQueue = require('../../execution/AiEvaluationQueue');

function extractSteps(content) {
  if (!content || !content.content) return [];
  const steps = [];
  content.content.forEach((node) => {
    if (node.type === 'orderedList' && node.content) {
      node.content.forEach((listItem) => {
        const paragraph = listItem.content?.[0];
        if (paragraph?.content) {
          const text = paragraph.content
            .map((child) => child.text ?? '')
            .join('');
          if (text.trim()) {
            steps.push(text.trim());
          }
        }
      });
    }
  });
  return steps;
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

function determineStepStatus(step, defaultTemplateCode) {
  const files = step.files || {};
  const hasCode = Object.entries(files).some(([name, code]) => {
    return code && code.trim() !== '' && code.trim() !== (defaultTemplateCode || '').trim();
  });
  const hasOutput = typeof step.output === 'string' && step.output.trim() !== '';
  const analysisText = extractTextFromTiptap(step.analysis);
  const hasAnalysis = analysisText && analysisText.trim() !== '';

  if (!hasCode && !hasOutput && !hasAnalysis) {
    return 'not_started';
  }
  if (hasCode && !hasOutput && !hasAnalysis) {
    return 'in_progress';
  }
  if (hasOutput && !hasAnalysis) {
    return 'executed';
  }
  if (hasAnalysis) {
    return 'completed';
  }
  return 'in_progress';
}

class SubmissionsService {
  constructor(jobsheetService) {
    this._pool = pool;
    this._jobsheetService = jobsheetService;
  }

  _mapSubmissionRow(row) {
    if (!row) return null;

    return {
      ...row,
      report: row.report || null,
      review: row.review || undefined,
      score: row.score != null ? Number(row.score) : undefined,
    };
  }

  _buildSubmissionSelect() {
    return `
      SELECT
        ts.*,
        NULLIF(ts.report_html, '')::json AS report,
        sr.ai_score AS score,
        CASE
          WHEN sr.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', sr.id,
            'ai_score', sr.ai_score,
            'final_score', sr.final_score,
            'feedback', sr.feedback,
            'decision', sr.decision,
            'ai_feedback', COALESCE(sr.ai_feedback, '{}'::jsonb)
          )
        END AS review
      FROM task_submissions ts
      LEFT JOIN LATERAL (
        SELECT *
        FROM submission_reviews
        WHERE submission_id = ts.id
        ORDER BY id DESC
        LIMIT 1
      ) sr ON true
    `;
  }

  _getDefaultFileName(language) {
    return language === 'python' ? 'main.py' : 'Main.java';
  }

  async _getStudentClassProgrammingLanguage(studentId, courseId) {
    const result = await this._pool.query(
      `
      SELECT cl.programming_language
      FROM class_students cs
      JOIN classes cl ON cl.id = cs.class_id
      WHERE cs.student_id = $1
        AND cl.course_id = $2
        AND cs.status = 'AKTIF'
        AND cl.status = 'AKTIF'
      LIMIT 1
      `,
      [studentId, courseId],
    );

    return result.rows[0]?.programming_language || 'java';
  }

  async _resolveAcademicContext(studentId, jobsheetId, classId = null, kelasPraktikumId = null) {
    if (kelasPraktikumId) {
      const nativeResult = await this._pool.query(
        `SELECT kp.legacy_class_id AS class_id,
          kp.id AS id_kelas_praktikum,
          km.id AS id_kelas_mhs
         FROM kelas_praktikum kp
         JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
          AND km.id_mahasiswa = $1
         WHERE kp.id = $2
           AND jc.jobsheet_id = $3
         LIMIT 1`,
        [studentId, kelasPraktikumId, jobsheetId],
      );

      if (nativeResult.rows.length) return nativeResult.rows[0];
    }

    const params = [studentId, jobsheetId];
    let filter = '';

    if (kelasPraktikumId) {
      params.push(kelasPraktikumId);
      filter = `AND kp.id = $${params.length}`;
    } else if (classId) {
      params.push(classId);
      filter = `AND cl.id = $${params.length}`;
    }

    const result = await this._pool.query(
      `SELECT cl.id AS class_id,
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM class_students cs
       JOIN classes cl ON cl.id = cs.class_id
       JOIN jobsheets j ON j.course_id = cl.course_id
       LEFT JOIN jobsheet_classes jc
         ON jc.jobsheet_id = j.id
        AND jc.class_id = cl.id
       LEFT JOIN kelas_praktikum kp
         ON kp.id = jc.id_kelas_praktikum
         OR kp.legacy_class_id = cl.id
       LEFT JOIN kelas_mhs km
         ON km.id_tahun_semester = kp.id_tahun_semester
        AND km.id_semester = kp.id_semester
        AND km.id_kelas = kp.id_kelas
        AND km.id_mahasiswa = cs.student_id
       WHERE cs.student_id = $1
         AND j.id = $2
         AND cs.status = 'AKTIF'
         AND cl.status = 'AKTIF'
         ${filter}
       ORDER BY jc.id_kelas_praktikum IS NULL ASC, cl.id ASC
       LIMIT 1`,
      params,
    );

    return result.rows[0] || {
      class_id: classId || null,
      id_kelas_praktikum: kelasPraktikumId || null,
      id_kelas_mhs: null,
    };
  }

  _buildSubmissionScopeClause(academicContext, startIndex = 3) {
    if (academicContext?.id_kelas_praktikum) {
      return {
        clause: `AND ts.id_kelas_praktikum = $${startIndex}`,
        values: [academicContext.id_kelas_praktikum],
      };
    }

    return {
      clause: 'AND ts.id_kelas_praktikum IS NULL',
      values: [],
    };
  }

  _buildSubmissionUpdateScopeClause(academicContext, startIndex = 5) {
    if (academicContext?.id_kelas_praktikum) {
      return {
        clause: `AND id_kelas_praktikum = $${startIndex}`,
        values: [academicContext.id_kelas_praktikum],
      };
    }

    return {
      clause: 'AND id_kelas_praktikum IS NULL',
      values: [],
    };
  }

  _parseTemplateFiles(templateCode, defaultFileName) {
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

  _generateInitialReport(jobsheet) {
    const defaultFileName = this._getDefaultFileName(
      jobsheet.programming_language || 'java',
    );

    return {
      experiments: Object.fromEntries(
        (jobsheet.experiments || []).map((exp) => [
          exp.id,
          {
            steps: [
              {
                files: this._parseTemplateFiles(exp.default_template_code, defaultFileName),
                output: '',
                analysis: { type: 'doc', content: [] },
              },
            ],
          },
        ]),
      ),

      exercises: Object.fromEntries(
        (jobsheet.exercises || []).map((exe) => [
          exe.id,
          {
            files: this._parseTemplateFiles(exe.default_template_code, defaultFileName),
            output: '',
            analysis: { type: 'doc', content: [] },
          },
        ]),
      ),

      conclusion: null,
    };
  }

  async createSubmission({
    jobsheetId,
    courseId,
    mataKuliahId = null,
    studentId,
    classId = null,
    kelasPraktikumId = null,
    status = 'DRAFT',
  }) {
    const id = `sub-${randomUUID().slice(0, 12)}`;

    const jobsheet = mataKuliahId
      ? await this._jobsheetService.getJobsheetFullByMataKuliah(
        jobsheetId,
        mataKuliahId,
        kelasPraktikumId,
        { role: 'MAHASISWA', id: studentId },
      )
      : await this._jobsheetService.getJobsheetFullById(
        jobsheetId,
        courseId,
      );
    if (!jobsheet.programming_language) {
      jobsheet.programming_language = await this._getStudentClassProgrammingLanguage(
        studentId,
        courseId,
      );
    }

    const report = this._generateInitialReport(jobsheet);
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      classId,
      kelasPraktikumId,
    );
    const conflictTarget = academicContext.id_kelas_praktikum
      ? '(jobsheet_id, student_id, id_kelas_praktikum) WHERE id_kelas_praktikum IS NOT NULL'
      : '(jobsheet_id, student_id) WHERE id_kelas_praktikum IS NULL';

    const query = {
      text: `
      WITH saved AS (
        INSERT INTO task_submissions
        (id, jobsheet_id, student_id, id_kelas_praktikum, id_kelas_mhs, report_html, status, submitted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
        ON CONFLICT ${conflictTarget}
        DO UPDATE SET
          id_kelas_praktikum = COALESCE(task_submissions.id_kelas_praktikum, EXCLUDED.id_kelas_praktikum),
          id_kelas_mhs = COALESCE(task_submissions.id_kelas_mhs, EXCLUDED.id_kelas_mhs),
          report_html = task_submissions.report_html
        RETURNING id
      )
      ${this._buildSubmissionSelect()}
      WHERE ts.id = (SELECT id FROM saved)
    `,
      values: [
        id,
        jobsheetId,
        studentId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        JSON.stringify(report),
        status,
      ],
    };

    const result = await this._pool.query(query);

    const submission = this._mapSubmissionRow(result.rows[0]);
    return await this._enrichSubmission(submission);
  }

  async getSubmissionByJobsheetId(jobsheetId, studentId, options = {}) {
    const academicContext = options.classId || options.kelasPraktikumId
      ? await this._resolveAcademicContext(
        studentId,
        jobsheetId,
        options.classId,
        options.kelasPraktikumId,
      )
      : null;
    const scope = academicContext
      ? this._buildSubmissionScopeClause(academicContext, 3)
      : { clause: '', values: [] };

    const result = await this._pool.query(
      `
      ${this._buildSubmissionSelect()}
      WHERE ts.jobsheet_id = $1 AND ts.student_id = $2
      ${scope.clause}
      ORDER BY ts.id_kelas_praktikum IS NULL ASC, ts.submitted_at DESC NULLS LAST, ts.id DESC
      LIMIT 1
      `,
      [jobsheetId, studentId, ...scope.values],
    );

    const submission = this._mapSubmissionRow(result.rows[0]) || null;
    return await this._enrichSubmission(submission);
  }

  async getOrCreateSubmission(jobsheetId, courseId, studentId, options = {}) {
    const existing = await this.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
      options,
    );
    if (existing) return existing;

    return await this.createSubmission({
      jobsheetId,
      courseId,
      mataKuliahId: options.mataKuliahId,
      studentId,
      classId: options.classId,
      kelasPraktikumId: options.kelasPraktikumId,
    });
  }

  async updateSubmission({ jobsheetId, studentId, mataKuliahId = null, report, status, classId = null, kelasPraktikumId = null }) {
    // Perform normalization on report before saving
    try {
      const jobsheetQuery = await this._pool.query('SELECT course_id FROM jobsheets WHERE id = $1', [jobsheetId]);
      if (jobsheetQuery.rows.length) {
        const courseId = jobsheetQuery.rows[0].course_id;
        const jobsheet = mataKuliahId
          ? await this._jobsheetService.getJobsheetFullByMataKuliah(
            jobsheetId,
            mataKuliahId,
            kelasPraktikumId,
            { role: 'MAHASISWA', id: studentId },
          )
          : await this._jobsheetService.getJobsheetFullById(jobsheetId, courseId);
        jobsheet.programming_language = await this._getStudentClassProgrammingLanguage(
          studentId,
          courseId,
        );
        
        if (report && report.experiments) {
          for (const exp of (jobsheet.experiments || [])) {
            const experimentId = exp.id;
            const stepsTexts = extractSteps(exp.instruction_content);
            const expReport = report.experiments[experimentId];
            if (expReport && Array.isArray(expReport.steps)) {
              expReport.steps = expReport.steps.map((step, index) => {
                const instructionNumber = step.instructionNumber || (index + 1);
                const instructionId = step.instructionId || `instruksi-${instructionNumber}`;
                return {
                  instructionId,
                  instructionNumber,
                  files: step.files || {},
                  output: step.output || '',
                  analysis: step.analysis || { type: 'doc', content: [] },
                  updatedAt: step.updatedAt || new Date().toISOString(),
                };
              });
              // Sort steps by instructionNumber
              expReport.steps.sort((a, b) => a.instructionNumber - b.instructionNumber);
            }
          }
        }
      }
    } catch (err) {
      console.error('Gagal menormalisasi report lama:', err);
    }

    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      classId,
      kelasPraktikumId,
    );
    const scope = this._buildSubmissionUpdateScopeClause(academicContext, 7);

    const query = {
      text: `
        WITH saved AS (
          UPDATE task_submissions
          SET 
            report_html = $1,
            status = COALESCE($2, status),
            id_kelas_praktikum = COALESCE(id_kelas_praktikum, $5),
            id_kelas_mhs = COALESCE(id_kelas_mhs, $6),
            submitted_at = CASE 
              WHEN $2 = 'SUBMITTED' AND submitted_at IS NULL THEN CURRENT_TIMESTAMP 
              ELSE submitted_at 
            END
          WHERE jobsheet_id = $3 AND student_id = $4
          ${scope.clause}
          RETURNING id
        )
        ${this._buildSubmissionSelect()}
        WHERE ts.id = (SELECT id FROM saved)
      `,
      values: [
        JSON.stringify(report),
        status || null,
        jobsheetId,
        studentId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        ...scope.values,
      ],
    };

    const result = await this._pool.query(query);
    const submission = this._mapSubmissionRow(result.rows[0]);
    return await this._enrichSubmission(submission);
  }

  async resetReviewForSubmission(submissionId, client = this._pool) {
    await client.query(
      `
      UPDATE submission_reviews
      SET
        final_score = NULL,
        feedback = NULL,
        decision = 'PENDING'
      WHERE submission_id = $1
      `,
      [submissionId],
    );
  }

  async submitSubmission(jobsheetId, studentId, options = {}) {
    const existing = await this.getSubmissionByJobsheetId(jobsheetId, studentId, options);
    if (!existing) throw new Error('Submission tidak ditemukan');

    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const academicContext = await this._resolveAcademicContext(
        studentId,
        jobsheetId,
        options.classId,
        options.kelasPraktikumId,
      );
      const scope = this._buildSubmissionUpdateScopeClause(academicContext, 6);

      await client.query(
        `
        UPDATE task_submissions
        SET
          report_html = $1,
          status = 'SUBMITTED',
          id_kelas_praktikum = COALESCE(id_kelas_praktikum, $4),
          id_kelas_mhs = COALESCE(id_kelas_mhs, $5),
          submitted_at = CASE
            WHEN submitted_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE submitted_at
          END
        WHERE jobsheet_id = $2 AND student_id = $3
        ${scope.clause}
        `,
        [
          JSON.stringify(existing.report),
          jobsheetId,
          studentId,
          academicContext.id_kelas_praktikum,
          academicContext.id_kelas_mhs,
          ...scope.values,
        ],
      );

      await this.resetReviewForSubmission(existing.id, client);
      await client.query('COMMIT');
      AiEvaluationQueue.addJob(existing.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.getSubmissionByJobsheetId(jobsheetId, studentId, options);
  }

  async _enrichSubmission(submission) {
    if (!submission || !submission.report) return submission;

    try {
      const jobsheetQuery = await this._pool.query(
        'SELECT course_id FROM jobsheets WHERE id = $1',
        [submission.jobsheet_id]
      );
      if (!jobsheetQuery.rows.length) return submission;
      const courseId = jobsheetQuery.rows[0].course_id;

      const jobsheet = await this._jobsheetService.getJobsheetFullById(
        submission.jobsheet_id,
        courseId
      );
      if (!jobsheet.programming_language) {
        jobsheet.programming_language = await this._getStudentClassProgrammingLanguage(
          submission.student_id,
          courseId,
        );
      }

      const report = submission.report;
      if (!report.experiments) report.experiments = {};

      for (const exp of (jobsheet.experiments || [])) {
        const experimentId = exp.id;
        const stepsTexts = extractSteps(exp.instruction_content);
        
        let currentExp = report.experiments[experimentId];
        if (!currentExp) {
          currentExp = { steps: [] };
          report.experiments[experimentId] = currentExp;
        }
        if (!Array.isArray(currentExp.steps)) {
          currentExp.steps = [];
        }

        const existingSteps = currentExp.steps;
        const enrichedSteps = [];

        for (let i = 0; i < stepsTexts.length; i++) {
          const instructionNumber = i + 1;
          const instructionId = `instruksi-${instructionNumber}`;
          const title = stepsTexts[i];

          let stepData = existingSteps.find(s => s.instructionId === instructionId);
          if (!stepData) {
            stepData = existingSteps.find(s => s.instructionNumber === instructionNumber);
            
            if (!stepData && existingSteps[i] && existingSteps[i].instructionId === undefined && existingSteps[i].instructionNumber === undefined) {
              stepData = existingSteps[i];
            }
          }

          const defaultTemplateCode = exp.default_template_code || '';

          if (stepData) {
            const files = stepData.files || {};
            const output = stepData.output || '';
            const analysis = stepData.analysis || { type: 'doc', content: [] };
            
            const status = determineStepStatus({ files, output, analysis }, defaultTemplateCode);

            enrichedSteps.push({
              instructionId,
              instructionNumber,
              title,
              status,
              files,
              output,
              analysis,
            });
          } else {
            enrichedSteps.push({
              instructionId,
              instructionNumber,
              title,
              status: 'not_started',
              files: {},
              output: '',
              analysis: { type: 'doc', content: [] },
            });
          }
        }

        enrichedSteps.sort((a, b) => a.instructionNumber - b.instructionNumber);
        report.experiments[experimentId].steps = enrichedSteps;
      }
    } catch (err) {
      console.error('Gagal melakukan enrichment pada submission:', err);
    }

    return submission;
  }

  async updateSubmissionStep({ jobsheetId, studentId, courseId, mataKuliahId = null, classId = null, kelasPraktikumId = null, stepPayload }) {
    const enrollmentQuery = mataKuliahId
      ? await this._pool.query(
        `SELECT km.id
         FROM kelas_praktikum kp
         JOIN kelas_mhs km
           ON km.id_tahun_semester = kp.id_tahun_semester
          AND km.id_semester = kp.id_semester
          AND km.id_kelas = kp.id_kelas
         JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
         WHERE km.id_mahasiswa = $1
           AND jc.jobsheet_id = $2
           AND kp.id_mata_kuliah = $3
           AND ($4::varchar IS NULL OR kp.id = $4)
         LIMIT 1`,
        [studentId, jobsheetId, mataKuliahId, kelasPraktikumId || null],
      )
      : await this._pool.query(
      `SELECT cs.id
       FROM class_students cs
       JOIN classes cl ON cs.class_id = cl.id
       JOIN jobsheets j ON j.course_id = cl.course_id
       WHERE cs.student_id = $1
         AND j.id = $2
         AND cs.status = 'AKTIF'
         AND cl.status = 'AKTIF'
       LIMIT 1`,
      [studentId, jobsheetId],
    );

    if (!enrollmentQuery.rows.length) {
      throw new Error('Mahasiswa tidak terdaftar atau tidak memiliki akses ke kelas jobsheet ini');
    }

    const submission = await this.getOrCreateSubmission(jobsheetId, courseId, studentId, {
      mataKuliahId,
      classId,
      kelasPraktikumId,
    });
    if (!submission) {
      throw new Error('Submission tidak dapat ditemukan atau dibuat');
    }

    const jobsheet = mataKuliahId
      ? await this._jobsheetService.getJobsheetFullByMataKuliah(
        jobsheetId,
        mataKuliahId,
        kelasPraktikumId,
        { role: 'MAHASISWA', id: studentId },
      )
      : await this._jobsheetService.getJobsheetFullById(jobsheetId, courseId);
    if (!jobsheet.programming_language) {
      jobsheet.programming_language = await this._getStudentClassProgrammingLanguage(
        studentId,
        courseId,
      );
    }
    if (!jobsheet) {
      throw new Error('Jobsheet tidak ditemukan');
    }

    const targetExp = (jobsheet.experiments || []).find(e => e.id === stepPayload.experimentId);
    if (!targetExp) {
      throw new Error(`Experiment ID "${stepPayload.experimentId}" tidak ditemukan pada jobsheet`);
    }

    const stepsTexts = extractSteps(targetExp.instruction_content);
    const instructionIndex = stepPayload.instructionNumber - 1;
    if (instructionIndex < 0 || instructionIndex >= stepsTexts.length) {
      throw new Error(`Instruction number ${stepPayload.instructionNumber} di luar batas instruksi yang valid`);
    }
    const expectedInstructionId = `instruksi-${stepPayload.instructionNumber}`;
    if (stepPayload.instructionId !== expectedInstructionId) {
      throw new Error(`Instruction ID "${stepPayload.instructionId}" tidak cocok dengan instruction number ${stepPayload.instructionNumber}`);
    }

    const report = submission.report || { experiments: {}, exercises: {}, conclusion: null };
    if (!report.experiments) report.experiments = {};
    if (!report.experiments[stepPayload.experimentId]) {
      report.experiments[stepPayload.experimentId] = { steps: [] };
    }
    const expReport = report.experiments[stepPayload.experimentId];
    if (!Array.isArray(expReport.steps)) {
      expReport.steps = [];
    }

    let stepIndex = expReport.steps.findIndex(s => s.instructionId === stepPayload.instructionId);
    if (stepIndex === -1) {
      stepIndex = expReport.steps.findIndex(s => s.instructionNumber === stepPayload.instructionNumber);
    }

    const updatedStep = {
      instructionId: stepPayload.instructionId,
      instructionNumber: stepPayload.instructionNumber,
      files: stepPayload.files,
      output: stepPayload.output,
      analysis: stepPayload.analysis,
      updatedAt: new Date().toISOString(),
    };

    if (stepIndex !== -1) {
      expReport.steps[stepIndex] = updatedStep;
    } else {
      expReport.steps.push(updatedStep);
    }

    expReport.steps.sort((a, b) => a.instructionNumber - b.instructionNumber);

    const cleanedExperiments = {};
    for (const [expId, expData] of Object.entries(report.experiments)) {
      cleanedExperiments[expId] = {
        steps: (expData.steps || []).map(s => ({
          instructionId: s.instructionId,
          instructionNumber: s.instructionNumber,
          files: s.files,
          output: s.output,
          analysis: s.analysis,
          updatedAt: s.updatedAt,
        }))
      };
    }
    const cleanedReport = {
      ...report,
      experiments: cleanedExperiments,
    };

    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      classId,
      kelasPraktikumId,
    );
    const scope = this._buildSubmissionUpdateScopeClause(academicContext, 6);

    const query = {
      text: `
        WITH saved AS (
          UPDATE task_submissions
          SET 
            report_html = $1,
            id_kelas_praktikum = COALESCE(id_kelas_praktikum, $4),
            id_kelas_mhs = COALESCE(id_kelas_mhs, $5)
          WHERE jobsheet_id = $2 AND student_id = $3
          ${scope.clause}
          RETURNING id
        )
        ${this._buildSubmissionSelect()}
        WHERE ts.id = (SELECT id FROM saved)
      `,
      values: [
        JSON.stringify(cleanedReport),
        jobsheetId,
        studentId,
        academicContext.id_kelas_praktikum,
        academicContext.id_kelas_mhs,
        ...scope.values,
      ],
    };

    const result = await this._pool.query(query);
    const updatedSubmission = this._mapSubmissionRow(result.rows[0]);
    
    return await this._enrichSubmission(updatedSubmission);
  }
}

module.exports = SubmissionsService;
