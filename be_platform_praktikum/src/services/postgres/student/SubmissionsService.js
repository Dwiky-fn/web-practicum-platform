const pool = require('..');
const { randomUUID } = require('crypto');
const AiEvaluationQueue = require('../../execution/AiEvaluationQueue');
const DeadlineAccessService = require('./DeadlineAccessService');
const JobsheetProgressScoringService = require('../../scoring/JobsheetProgressScoringService');
const { AuthorizationError } = require('../../../exceptions');

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

  _resolveKelasPraktikumParam(options = {}) {
    // classId is a compatibility alias for kelasPraktikumId.
    return options.kelasPraktikumId || options.id_kelas_praktikum || options.classId || null;
  }

  async assertWriteAccess(studentId, jobsheetId, kelasPraktikumId) {
    return DeadlineAccessService.assertCanWriteDraft({
      studentId,
      jobsheetId,
      kelasPraktikumId,
    });
  }

  async assertSubmitAccess(studentId, jobsheetId, kelasPraktikumId) {
    return DeadlineAccessService.assertCanSubmit({
      studentId,
      jobsheetId,
      kelasPraktikumId,
    });
  }

  _mapSubmissionRow(row) {
    if (!row) return null;

    return {
      ...row,
      report: row.report || null,
      review: row.review || undefined,
      score: row.score != null ? Number(row.score) : undefined,
      calculated_progress_score: row.calculated_progress_score != null
        ? Number(row.calculated_progress_score)
        : null,
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

  async _resolveAcademicContext(studentId, jobsheetId, kelasPraktikumId = null) {
    if (!kelasPraktikumId) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    const params = [studentId, jobsheetId];
    params.push(kelasPraktikumId);

    const nativeResult = await this._pool.query(
      `SELECT
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs
       FROM jobsheet_classes jc
       JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $1
        AND km.status = 'active'
       WHERE jc.jobsheet_id = $2
         AND jc.is_active = true
         AND kp.id = $3
       ORDER BY kp.id ASC
       LIMIT 1`,
      params,
    );

    if (nativeResult.rows.length) return nativeResult.rows[0];

    const publishedResult = await this._pool.query(
      `SELECT 1
       FROM jobsheet_classes
       WHERE jobsheet_id = $1
         AND id_kelas_praktikum = $2
         AND is_active = true
       LIMIT 1`,
      [jobsheetId, kelasPraktikumId],
    );

    if (!publishedResult.rows.length) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    throw new Error('Mahasiswa belum terdaftar pada kelas semester ini.');
  }

  _buildSubmissionScopeClause(academicContext, startIndex = 3) {
    if (academicContext?.id_kelas_praktikum) {
      return {
        clause: `AND ts.id_kelas_praktikum = $${startIndex}`,
        values: [academicContext.id_kelas_praktikum],
      };
    }

    // Read-only historical fallback. Write paths must resolve a native kelasPraktikumId first.
    return {
      clause: 'AND ts.id_kelas_praktikum IS NULL',
      values: [],
    };
  }

  _buildSubmissionUpdateScopeClause(academicContext, startIndex = 5) {
    if (!academicContext?.id_kelas_praktikum) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    return {
      clause: `AND id_kelas_praktikum = $${startIndex}`,
      values: [academicContext.id_kelas_praktikum],
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
    mataKuliahId,
    courseId,
    studentId,
    classId,
    kelasPraktikumId = null,
    status = 'DRAFT',
  }) {
    const id = `sub-${randomUUID().slice(0, 12)}`;
    const nativeKelasPraktikumId = this._resolveKelasPraktikumParam({ kelasPraktikumId, classId });
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      nativeKelasPraktikumId,
    );
    const writeAccess = await DeadlineAccessService.assertCanWriteDraft({
      studentId,
      jobsheetId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
    });

    const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
      jobsheetId,
      mataKuliahId || courseId,
      academicContext.id_kelas_praktikum,
      { role: 'MAHASISWA', id: studentId },
    );

    const report = this._generateInitialReport(jobsheet);
    const attemptNo = writeAccess.attemptNo || 1;
    const attemptType = writeAccess.attemptType || 'normal';
    const attemptLabel = attemptType === 'remedial' ? writeAccess.attemptLabel : 'Pengerjaan Normal';
    const remedialId = writeAccess.remedialId || null;
    const submissionSource = attemptType === 'remedial' ? 'remedial' : 'manual';
    const conflictTarget = remedialId
      ? '(student_id, jobsheet_id, id_kelas_praktikum, remedial_id) WHERE (remedial_id IS NOT NULL)'
      : '(student_id, jobsheet_id, id_kelas_praktikum) WHERE (remedial_id IS NULL)';

    const query = {
      text: `
      WITH saved AS (
        INSERT INTO task_submissions
        (id, jobsheet_id, student_id, id_kelas_praktikum, id_kelas_mhs, report_html, status, submitted_at, attempt_no, attempt_type, attempt_label, remedial_id, submission_source, is_auto_submitted)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11, $12, false)
        ON CONFLICT ${conflictTarget}
        DO UPDATE SET
          id_kelas_mhs = EXCLUDED.id_kelas_mhs,
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
        attemptNo,
        attemptType,
        attemptLabel,
        remedialId,
        submissionSource,
      ],
    };

    const result = await this._pool.query(query);

    const submission = this._mapSubmissionRow(result.rows[0]);
    return await this._enrichSubmission(submission);
  }

  async getSubmissionByJobsheetId(jobsheetId, studentId, options = {}) {
    const reqUser = options.reqUser;

    if (options.submissionId) {
      const result = await this._pool.query(
        `
        ${this._buildSubmissionSelect()}
        WHERE ts.id = $1
        LIMIT 1
        `,
        [options.submissionId]
      );
      const submission = this._mapSubmissionRow(result.rows[0]) || null;
      if (submission && reqUser) {
        if (studentId && submission.student_id !== studentId) {
          throw new AuthorizationError('Anda tidak memiliki akses ke pengerjaan mahasiswa ini.');
        }
        if (jobsheetId && submission.jobsheet_id !== jobsheetId) {
          throw new AuthorizationError('Anda tidak memiliki akses ke pengerjaan mahasiswa ini.');
        }
        const requestedKelasPraktikumId = this._resolveKelasPraktikumParam(options);
        if (requestedKelasPraktikumId && submission.id_kelas_praktikum !== requestedKelasPraktikumId) {
          throw new AuthorizationError('Anda tidak memiliki akses ke pengerjaan mahasiswa ini.');
        }
        if (options.attemptType === 'normal' && submission.remedial_id) {
          throw new AuthorizationError('Submission tidak sesuai dengan attempt yang dipilih.');
        }
        if (options.attemptType === 'remedial' && options.remedialId && submission.remedial_id !== options.remedialId) {
          throw new AuthorizationError('Submission tidak sesuai dengan remedial yang dipilih.');
        }
        if (reqUser.role === 'DOSEN') {
          if (submission.id_kelas_praktikum !== null) {
            const pengampuRes = await this._pool.query(
              'SELECT 1 FROM pengampu WHERE id_kelas_praktikum = $1 AND id_dosen = $2 LIMIT 1',
              [submission.id_kelas_praktikum, reqUser.id]
            );
            if (!pengampuRes.rows.length) {
              throw new AuthorizationError('Anda tidak memiliki akses ke kelas praktikum submission ini.');
            }
          }
        } else if (reqUser.role === 'MAHASISWA') {
          if (submission.student_id !== reqUser.id) {
            throw new AuthorizationError('Anda tidak memiliki akses ke data submission mahasiswa lain.');
          }
          if (jobsheetId && submission.jobsheet_id !== jobsheetId) {
            throw new AuthorizationError('Anda tidak memiliki akses ke submission ini.');
          }
          if (submission.id_kelas_praktikum !== null) {
            const contextResult = await this._pool.query(
              `SELECT 1
               FROM jobsheet_classes jc
               JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
               JOIN kelas_semester ks ON ks.id_tahun_semester = kp.id_tahun_semester
                 AND ks.id_semester = kp.id_semester
                 AND ks.id_kelas = kp.id_kelas
               JOIN kelas_mhs km ON km.id_kelas_semester = ks.id
                 AND km.id_mahasiswa = $1
                 AND km.status = 'active'
               WHERE jc.jobsheet_id = $2
                 AND jc.is_active = true
                 AND kp.id = $3
                 AND km.id = $4
               LIMIT 1`,
              [reqUser.id, submission.jobsheet_id, submission.id_kelas_praktikum, submission.id_kelas_mhs]
            );
            if (!contextResult.rows.length) {
              throw new AuthorizationError('Akses ditolak: konteks akademik tidak valid.');
            }
          }
        }
      }
      return await this._enrichSubmission(submission);
    }

    if (reqUser && reqUser.role === 'DOSEN') {
      const kpId = this._resolveKelasPraktikumParam(options);
      if (kpId !== null) {
        const pengampuRes = await this._pool.query(
          'SELECT 1 FROM pengampu WHERE id_kelas_praktikum = $1 AND id_dosen = $2 LIMIT 1',
          [kpId, reqUser.id]
        );
        if (!pengampuRes.rows.length) {
          throw new AuthorizationError('Anda tidak memiliki akses ke kelas praktikum ini.');
        }
      }
    } else if (reqUser && reqUser.role === 'MAHASISWA') {
      if (studentId !== reqUser.id) {
        throw new AuthorizationError('Anda tidak memiliki akses ke data submission mahasiswa lain.');
      }
    }

    const requestedKelasPraktikumId = this._resolveKelasPraktikumParam(options);
    const academicContext = requestedKelasPraktikumId
      ? await this._resolveAcademicContext(
        studentId,
        jobsheetId,
        requestedKelasPraktikumId,
      )
      : null;
    const scope = academicContext
      ? this._buildSubmissionScopeClause(academicContext, 3)
      : { clause: '', values: [] };

    if (options.remedialId) {
      const result = await this._pool.query(
        `
        ${this._buildSubmissionSelect()}
        WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.remedial_id = $3
        ${scope.clause}
        LIMIT 1
        `,
        [studentId, jobsheetId, options.remedialId, ...scope.values]
      );
      const submission = this._mapSubmissionRow(result.rows[0]) || null;
      return await this._enrichSubmission(submission);
    }

    if (options.attemptType === 'normal') {
      const result = await this._pool.query(
        `
        ${this._buildSubmissionSelect()}
        WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.remedial_id IS NULL
        ${scope.clause}
        ORDER BY ts.submitted_at DESC NULLS LAST, ts.id DESC
        LIMIT 1
        `,
        [studentId, jobsheetId, ...scope.values]
      );
      const submission = this._mapSubmissionRow(result.rows[0]) || null;
      return await this._enrichSubmission(submission);
    }

    if (options.attemptNo) {
      const result = await this._pool.query(
        `
        ${this._buildSubmissionSelect()}
        WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.attempt_no = $3
        ${scope.clause}
        LIMIT 1
        `,
        [studentId, jobsheetId, options.attemptNo, ...scope.values]
      );
      const submission = this._mapSubmissionRow(result.rows[0]) || null;
      return await this._enrichSubmission(submission);
    }

    let attemptClause = 'AND ts.remedial_id IS NULL';
    let attemptValues = [];
    if (academicContext?.id_kelas_praktikum) {
      const activeQuery = await this._pool.query(
        `SELECT jr.id
         FROM jobsheet_remedials jr
         JOIN jobsheet_remedial_students jrs ON jrs.remedial_id = jr.id
         WHERE jr.jobsheet_id = $1 
           AND jr.id_kelas_praktikum = $2 
           AND jrs.student_id = $3
           AND jr.status = 'open'
           AND (NOW() AT TIME ZONE 'Asia/Jakarta') BETWEEN jr.start_at AND jr.end_at
         LIMIT 1`,
        [jobsheetId, academicContext.id_kelas_praktikum, studentId]
      );
      if (activeQuery.rows.length) {
        attemptClause = `AND ts.remedial_id = $${3 + scope.values.length}`;
        attemptValues = [activeQuery.rows[0].id];
      }
    }

    const result = await this._pool.query(
      `
      ${this._buildSubmissionSelect()}
      WHERE ts.jobsheet_id = $1 AND ts.student_id = $2
      ${scope.clause}
      ${attemptClause}
      ORDER BY ts.id_kelas_praktikum IS NULL ASC, ts.submitted_at DESC NULLS LAST, ts.id DESC
      LIMIT 1
      `,
      [jobsheetId, studentId, ...scope.values, ...attemptValues],
    );

    const submission = this._mapSubmissionRow(result.rows[0]) || null;
    return await this._enrichSubmission(submission);
  }

  async getOrCreateSubmission(jobsheetId, studentId, options = {}) {
    const nativeKelasPraktikumId = this._resolveKelasPraktikumParam(options);
    if (!nativeKelasPraktikumId) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    const existing = await this.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
      { ...options, kelasPraktikumId: nativeKelasPraktikumId },
    );
    if (existing) return existing;

    return await this.createSubmission({
      jobsheetId,
      mataKuliahId: options.mataKuliahId || options.id_mata_kuliah,
      studentId,
      kelasPraktikumId: nativeKelasPraktikumId,
    });
  }

  async updateSubmission({ jobsheetId, studentId, mataKuliahId, courseId, report, status, classId, kelasPraktikumId = null }) {
    const nativeKelasPraktikumId = this._resolveKelasPraktikumParam({ kelasPraktikumId, classId });
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      nativeKelasPraktikumId,
    );
    const writeAccess = await this.assertWriteAccess(studentId, jobsheetId, academicContext.id_kelas_praktikum);

    // Perform normalization on report before saving
    try {
      const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
        jobsheetId,
        mataKuliahId || courseId,
        academicContext.id_kelas_praktikum,
        { role: 'MAHASISWA', id: studentId },
      );
      
      if (report && report.experiments) {
        for (const exp of (jobsheet.experiments || [])) {
          const experimentId = exp.id;
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
    } catch (err) {
      console.error('Gagal menormalisasi report lama:', err);
    }

    const scope = this._buildSubmissionUpdateScopeClause(academicContext, 7);

    let attemptClause = '';
    let attemptValues = [];
    if (writeAccess.remedialId) {
      attemptClause = `AND remedial_id = $${7 + scope.values.length}`;
      attemptValues = [writeAccess.remedialId];
    } else {
      attemptClause = 'AND remedial_id IS NULL';
    }

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
          ${attemptClause}
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
        ...attemptValues,
      ],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new Error('Submission tidak ditemukan');
    }
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
    const nativeKelasPraktikumId = this._resolveKelasPraktikumParam(options);
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      nativeKelasPraktikumId,
    );
    const writeAccess = await this.assertSubmitAccess(studentId, jobsheetId, academicContext.id_kelas_praktikum);

    const existing = await this.getSubmissionByJobsheetId(
      jobsheetId,
      studentId,
      { ...options, kelasPraktikumId: academicContext.id_kelas_praktikum },
    );
    if (!existing) throw new Error('Submission tidak ditemukan');

    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      const scoreSnapshot = await JobsheetProgressScoringService.calculate({
        studentId,
        jobsheetId,
        kelasPraktikumId: academicContext.id_kelas_praktikum,
        idKelasMhs: academicContext.id_kelas_mhs,
        attemptType: writeAccess.attemptType,
        attemptNo: writeAccess.attemptNo || existing.attempt_no || 1,
        remedialId: writeAccess.remedialId || null,
        report: existing.report,
        client,
      });

      const scope = this._buildSubmissionUpdateScopeClause(academicContext, 8);

      let attemptClause = '';
      let attemptValues = [];
      if (writeAccess.remedialId) {
        attemptClause = `AND remedial_id = $${8 + scope.values.length}`;
        attemptValues = [writeAccess.remedialId];
      } else {
        attemptClause = 'AND remedial_id IS NULL';
      }

      await client.query(
        `
        UPDATE task_submissions
        SET
          report_html = $1,
          status = 'SUBMITTED',
          id_kelas_praktikum = COALESCE(id_kelas_praktikum, $4),
          id_kelas_mhs = COALESCE(id_kelas_mhs, $5),
          calculated_progress_score = $6,
          score_breakdown = $7::jsonb,
          submitted_at = CASE
            WHEN submitted_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE submitted_at
          END
        WHERE jobsheet_id = $2 AND student_id = $3
        ${scope.clause}
        ${attemptClause}
        `,
        [
          JSON.stringify(existing.report),
          jobsheetId,
          studentId,
          academicContext.id_kelas_praktikum,
          academicContext.id_kelas_mhs,
          scoreSnapshot.progressScore,
          JSON.stringify(scoreSnapshot),
          ...scope.values,
          ...attemptValues,
        ],
      );

      if (writeAccess.remedialId) {
        await client.query(
          `UPDATE jobsheet_remedial_students
           SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
           WHERE remedial_id = $1 AND student_id = $2`,
          [writeAccess.remedialId, studentId]
        );
      }

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
        'SELECT id_mata_kuliah FROM jobsheets WHERE id = $1',
        [submission.jobsheet_id]
      );
      if (!jobsheetQuery.rows.length) return submission;
      const id_mata_kuliah = jobsheetQuery.rows[0].id_mata_kuliah;

      const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
        submission.jobsheet_id,
        id_mata_kuliah,
        submission.id_kelas_praktikum,
        { role: 'MAHASISWA', id: submission.student_id }
      );

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

        const enrichedSteps = [];

        for (let i = 0; i < stepsTexts.length; i++) {
          const instructionNumber = i + 1;
          const instructionId = `instruksi-${instructionNumber}`;
          const title = stepsTexts[i];

          let stepData = currentExp.steps.find(s => s.instructionId === instructionId);
          if (!stepData) {
            stepData = currentExp.steps.find(s => s.instructionNumber === instructionNumber);
            
            if (!stepData && currentExp.steps[i] && currentExp.steps[i].instructionId === undefined && currentExp.steps[i].instructionNumber === undefined) {
              stepData = currentExp.steps[i];
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

  async updateSubmissionStep({ jobsheetId, studentId, mataKuliahId, courseId, classId, kelasPraktikumId = null, stepPayload }) {
    const nativeKelasPraktikumId = this._resolveKelasPraktikumParam({ kelasPraktikumId, classId });
    const academicContext = await this._resolveAcademicContext(
      studentId,
      jobsheetId,
      nativeKelasPraktikumId,
    );

    const enrollmentQuery = await this._pool.query(
      `SELECT km.id
       FROM kelas_praktikum kp
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
       JOIN jobsheet_classes jc ON jc.id_kelas_praktikum = kp.id
       WHERE km.id_mahasiswa = $1
         AND km.status = 'active'
         AND jc.jobsheet_id = $2
         AND jc.is_active = true
         AND kp.id_mata_kuliah = $3
         AND kp.id = $4
       LIMIT 1`,
      [studentId, jobsheetId, mataKuliahId || courseId, academicContext.id_kelas_praktikum],
    );

    if (!enrollmentQuery.rows.length) {
      throw new Error('Mahasiswa tidak terdaftar atau tidak memiliki akses ke kelas jobsheet ini');
    }

    const writeAccess = await this.assertWriteAccess(studentId, jobsheetId, academicContext.id_kelas_praktikum);

    const submission = await this.getOrCreateSubmission(jobsheetId, studentId, {
      mataKuliahId: mataKuliahId || courseId,
      kelasPraktikumId: academicContext.id_kelas_praktikum,
    });
    if (!submission) {
      throw new Error('Submission tidak dapat ditemukan atau dibuat');
    }

    const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
      jobsheetId,
      mataKuliahId || courseId,
      academicContext.id_kelas_praktikum,
      { role: 'MAHASISWA', id: studentId },
    );
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

    const scope = this._buildSubmissionUpdateScopeClause(academicContext, 6);

    let attemptClause = '';
    let attemptValues = [];
    if (writeAccess.remedialId) {
      attemptClause = `AND remedial_id = $${6 + scope.values.length}`;
      attemptValues = [writeAccess.remedialId];
    } else {
      attemptClause = 'AND remedial_id IS NULL';
    }

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
          ${attemptClause}
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
        ...attemptValues,
      ],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new Error('Submission tidak ditemukan');
    }
    const updatedSubmission = this._mapSubmissionRow(result.rows[0]);
    
    return await this._enrichSubmission(updatedSubmission);
  }

  async getSubmissionHistory(studentId, jobsheetId, kelasPraktikumId) {
    const result = await this._pool.query(
      `SELECT
        ts.id AS "submissionId",
        ts.attempt_no AS "attemptNo",
        ts.attempt_type AS "attemptType",
        COALESCE(ts.attempt_label, CASE WHEN ts.attempt_type = 'remedial' THEN 'Remedial ' || (ts.attempt_no - 1) ELSE 'Pengerjaan Normal' END) AS "attemptLabel",
        ts.status,
        ts.calculated_progress_score AS "calculatedProgressScore",
        ts.score_breakdown AS "scoreBreakdown",
        rev.final_score AS "finalScore",
        to_char(ts.submitted_at, 'YYYY-MM-DD HH24:MI:SS') AS "submittedAt",
        NULL::text AS "reviewedAt"
       FROM task_submissions ts
       LEFT JOIN LATERAL (
         SELECT final_score FROM submission_reviews
         WHERE submission_id = ts.id
         ORDER BY id DESC
         LIMIT 1
       ) rev ON true
       WHERE ts.student_id = $1 
         AND ts.jobsheet_id = $2 
         AND ts.id_kelas_praktikum = $3
       ORDER BY ts.attempt_no ASC`,
      [studentId, jobsheetId, kelasPraktikumId]
    );

    return result.rows;
  }

  async getStudentSubmissionReview(submissionId, studentId) {
    // 1. Fetch submission details
    const subResult = await this._pool.query(
      `SELECT id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs FROM task_submissions WHERE id = $1`,
      [submissionId]
    );
    if (!subResult.rows.length) {
      throw new AuthorizationError('Submission tidak ditemukan');
    }
    const submission = subResult.rows[0];

    // 2. Validate ownership
    if (submission.student_id !== studentId) {
      throw new AuthorizationError('Anda tidak memiliki akses ke submission ini.');
    }

    // 3. Validate academic context if not null-context
    if (submission.id_kelas_praktikum !== null) {
      const contextResult = await this._pool.query(
        `SELECT 1
         FROM jobsheet_classes jc
         JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
         JOIN kelas_semester ks ON ks.id_tahun_semester = kp.id_tahun_semester
           AND ks.id_semester = kp.id_semester
           AND ks.id_kelas = kp.id_kelas
         JOIN kelas_mhs km ON km.id_kelas_semester = ks.id
           AND km.id_mahasiswa = $1
           AND km.status = 'active'
         WHERE jc.jobsheet_id = $2
           AND jc.is_active = true
           AND kp.id = $3
           AND km.id = $4
         LIMIT 1`,
        [studentId, submission.jobsheet_id, submission.id_kelas_praktikum, submission.id_kelas_mhs]
      );
      if (!contextResult.rows.length) {
        throw new AuthorizationError('Akses ditolak: konteks akademik tidak valid.');
      }
    }

    // 4. Fetch the review
    const reviewResult = await this._pool.query(
      `SELECT id, final_score, feedback, decision, feedback_details
       FROM submission_reviews
       WHERE submission_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [submissionId]
    );

    if (!reviewResult.rows.length) {
      return null;
    }

    const review = reviewResult.rows[0];
    if (review.decision === 'PENDING') {
      return null; // Return null if review is not published yet
    }

    return {
      id: review.id,
      final_score: review.final_score,
      feedback: review.feedback,
      decision: review.decision,
      feedback_details: typeof review.feedback_details === 'string' 
        ? JSON.parse(review.feedback_details) 
        : (review.feedback_details || []),
    };
  }
}

module.exports = SubmissionsService;
