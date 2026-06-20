const pool = require('..');
const { randomUUID } = require('crypto');
const { AuthorizationError, NotFoundError, ClientError } = require('../../../exceptions');

class RemedialsService {
  constructor(jobsheetService) {
    this._pool = pool;
    this._jobsheetService = jobsheetService;
  }

  _getDefaultFileName(language) {
    return language === 'python' ? 'main.py' : 'Main.java';
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

  async _assertLecturerAccess(kelasPraktikumId, lecturerId) {
    const result = await this._pool.query(
      'SELECT 1 FROM pengampu WHERE id_kelas_praktikum = $1 AND id_dosen = $2 LIMIT 1',
      [kelasPraktikumId, lecturerId]
    );
    if (!result.rows.length) {
      throw new AuthorizationError('Anda tidak memiliki akses ke kelas praktikum ini');
    }
  }

  async createRemedial({
    jobsheetId,
    kelasPraktikumId,
    title,
    description,
    startAt,
    endAt,
    studentIds,
  }, lecturerId) {
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      // Get jobsheet data first for potential initial report generation & defaults
      const jobsheetQuery = await client.query(
        'SELECT id_mata_kuliah, title FROM jobsheets WHERE id = $1',
        [jobsheetId]
      );
      if (!jobsheetQuery.rows.length) {
        throw new NotFoundError('Jobsheet tidak ditemukan');
      }
      const { id_mata_kuliah: mataKuliahId, title: jobsheetTitle } = jobsheetQuery.rows[0];

      const finalTitle = title || (jobsheetTitle ? `Remedial ${jobsheetTitle}` : 'Remedial');
      const finalDescription = description || '';

      const remedialId = `rem-${randomUUID().slice(0, 12)}`;

      // Insert remedial session
      await client.query(
        `INSERT INTO jobsheet_remedials 
          (id, jobsheet_id, id_kelas_praktikum, title, description, start_at, end_at, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [remedialId, jobsheetId, kelasPraktikumId, finalTitle, finalDescription, startAt, endAt, lecturerId]
      );

      const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
        jobsheetId,
        mataKuliahId,
        kelasPraktikumId,
        { role: 'DOSEN', id: lecturerId }
      );

      for (const studentId of studentIds) {
        // Resolve student's class membership (kelas_mhs)
        const kmResult = await client.query(
          `SELECT km.id AS id_kelas_mhs
           FROM kelas_mhs km
           JOIN kelas_semester ks ON ks.id = km.id_kelas_semester
           JOIN kelas_praktikum kp 
             ON kp.id_tahun_semester = ks.id_tahun_semester
            AND kp.id_semester = ks.id_semester
            AND kp.id_kelas = ks.id_kelas
           WHERE kp.id = $1 AND km.id_mahasiswa = $2 AND km.status = 'active'
           LIMIT 1`,
          [kelasPraktikumId, studentId]
        );

        if (!kmResult.rows.length) {
          throw new ClientError(`Mahasiswa ${studentId} tidak terdaftar aktif di kelas praktikum ini`);
        }

        const idKelasMhs = kmResult.rows[0].id_kelas_mhs;

        // Find parent submission (normally the attempt with highest attempt_no or where remedial_id IS NULL)
        const parentSubRes = await client.query(
          `SELECT id, report_html FROM task_submissions
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3
           ORDER BY attempt_no DESC LIMIT 1`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const parentSubmissionId = parentSubRes.rows[0]?.id || null;
        
        // Start from empty template for remedial
        const reportHtml = JSON.stringify(this._generateInitialReport(jobsheet));

        // Determine next attempt number
        const maxAttemptRes = await client.query(
          `SELECT COALESCE(MAX(attempt_no), 0) AS max_attempt
           FROM task_submissions
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const attemptNo = maxAttemptRes.rows[0].max_attempt + 1;
        const attemptType = 'remedial';
        const attemptLabel = `Remedial ${attemptNo - 1}`;

        // Create remedial submission record
        const newSubmissionId = `sub-${randomUUID().slice(0, 12)}`;
        await client.query(
          `INSERT INTO task_submissions 
            (id, jobsheet_id, student_id, id_kelas_praktikum, id_kelas_mhs, status, report_html, submitted_at, attempt_no, attempt_type, attempt_label, remedial_id, parent_submission_id, submission_source, is_auto_submitted)
           VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, NULL, $7, $8, $9, $10, $11, 'remedial', false)`,
          [newSubmissionId, jobsheetId, studentId, kelasPraktikumId, idKelasMhs, reportHtml, attemptNo, attemptType, attemptLabel, remedialId, parentSubmissionId]
        );

        // Reset progress context for remedial (start fresh)
        const progress = 0;
        const lastPage = null;
        const completedItems = [];

        const newProgressId = `progress-${randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO student_progress
            (id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs, status, progress, last_page, last_activity, completed_items, attempt_no, attempt_type, remedial_id)
           VALUES ($1, $2, $3, $4, $5, 'SEDANG', $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11)`,
          [newProgressId, studentId, jobsheetId, kelasPraktikumId, idKelasMhs, progress, lastPage, JSON.stringify(completedItems), attemptNo, attemptType, remedialId]
        );

        // Reset student jobsheet progress snapshot for remedial (start fresh)
        const parentJobsheetProgressRes = await client.query(
          `SELECT module_id, total_steps FROM student_jobsheet_progress
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3
           ORDER BY attempt_no DESC LIMIT 1`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const theoryCount = Array.isArray(jobsheet.theory) ? jobsheet.theory.length : 0;
        const expCount = Array.isArray(jobsheet.experiments) ? jobsheet.experiments.length : 0;
        const exeCount = Array.isArray(jobsheet.exercises) ? jobsheet.exercises.length : 0;
        const fallbackTotalSteps = theoryCount + expCount + exeCount + 1;

        const moduleId = (parentJobsheetProgressRes.rows[0]?.module_id || `jobsheet:${jobsheetId}`).slice(0, 20);
        const currentExperimentId = null;
        const currentInstructionId = null;
        const completedSteps = 0;
        const totalSteps = parentJobsheetProgressRes.rows[0]?.total_steps || fallbackTotalSteps;
        const progressPercentage = 0;

        const newJobsheetProgressId = `prog-${randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO student_jobsheet_progress
            (id, student_id, id_kelas_praktikum, id_kelas_mhs, module_id, jobsheet_id, current_experiment_id, current_instruction_id, completed_steps, total_steps, progress_percentage, status, first_opened_at, last_activity_at, completed_at, attempt_no, attempt_type, remedial_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, $12, $13, $14)`,
          [newJobsheetProgressId, studentId, kelasPraktikumId, idKelasMhs, moduleId, jobsheetId, currentExperimentId, currentInstructionId, completedSteps, totalSteps, progressPercentage, attemptNo, attemptType, remedialId]
        );

        // Insert participant
        const studentRemedialId = `rem-std-${randomUUID().slice(0, 12)}`;
        await client.query(
          `INSERT INTO jobsheet_remedial_students 
            (id, remedial_id, student_id, id_kelas_mhs, source_submission_id, status, assigned_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentRemedialId, remedialId, studentId, idKelasMhs, parentSubmissionId]
        );
      }

      await client.query('COMMIT');
      return remedialId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getRemedialsByJobsheet(jobsheetId, lecturerId) {
    const result = await this._pool.query(
      `SELECT jr.*, kp.nama_kelas
       FROM jobsheet_remedials jr
       JOIN kelas_praktikum kp ON kp.id = jr.id_kelas_praktikum
       JOIN pengampu p ON p.id_kelas_praktikum = kp.id AND p.id_dosen = $2
       WHERE jr.jobsheet_id = $1
       ORDER BY jr.created_at DESC`,
      [jobsheetId, lecturerId]
    );

    return result.rows.map((row) => ({
      ...row,
      startAt: row.start_at,
      endAt: row.end_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getRemedialStudents(remedialId, lecturerId) {
    // Assert lecturer can access the class
    const remedialRes = await this._pool.query(
      'SELECT id_kelas_praktikum FROM jobsheet_remedials WHERE id = $1',
      [remedialId]
    );
    if (!remedialRes.rows.length) {
      throw new NotFoundError('Sesi remedial tidak ditemukan');
    }
    const { id_kelas_praktikum: kelasPraktikumId } = remedialRes.rows[0];
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId);

    const query = `
      SELECT 
        jrs.id,
        jrs.remedial_id,
        jrs.student_id,
        u.fullname,
        sp.nim,
        jrs.status,
        jrs.assigned_at,
        ts.attempt_no,
        ts.id AS submission_id,
        rev.final_score
      FROM jobsheet_remedial_students jrs
      JOIN users u ON u.id = jrs.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      JOIN jobsheet_remedials jr ON jr.id = jrs.remedial_id
      LEFT JOIN task_submissions ts 
        ON ts.student_id = jrs.student_id 
       AND ts.jobsheet_id = jr.jobsheet_id 
       AND ts.remedial_id = jr.id
      LEFT JOIN LATERAL (
        SELECT final_score FROM submission_reviews
        WHERE submission_id = ts.id
        ORDER BY id DESC
        LIMIT 1
      ) rev ON true
      WHERE jrs.remedial_id = $1
      ORDER BY u.fullname ASC
    `;

    const result = await this._pool.query(query, [remedialId]);
    return result.rows;
  }

  async addStudentsToRemedial(remedialId, studentIds, lecturerId) {
    const remedialRes = await this._pool.query(
      'SELECT jobsheet_id, id_kelas_praktikum FROM jobsheet_remedials WHERE id = $1',
      [remedialId]
    );
    if (!remedialRes.rows.length) {
      throw new NotFoundError('Sesi remedial tidak ditemukan');
    }
    const { jobsheet_id: jobsheetId, id_kelas_praktikum: kelasPraktikumId } = remedialRes.rows[0];
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const jobsheetQuery = await client.query(
        'SELECT id_mata_kuliah FROM jobsheets WHERE id = $1',
        [jobsheetId]
      );
      const mataKuliahId = jobsheetQuery.rows[0].id_mata_kuliah;
      const jobsheet = await this._jobsheetService.getJobsheetFullByMataKuliah(
        jobsheetId,
        mataKuliahId,
        kelasPraktikumId,
        { role: 'DOSEN', id: lecturerId }
      );

      for (const studentId of studentIds) {
        const existingCheck = await client.query(
          'SELECT 1 FROM jobsheet_remedial_students WHERE remedial_id = $1 AND student_id = $2',
          [remedialId, studentId]
        );
        if (existingCheck.rows.length) {
          continue;
        }

        const kmResult = await client.query(
          `SELECT km.id AS id_kelas_mhs
           FROM kelas_mhs km
           JOIN kelas_semester ks ON ks.id = km.id_kelas_semester
           JOIN kelas_praktikum kp 
             ON kp.id_tahun_semester = ks.id_tahun_semester
            AND kp.id_semester = ks.id_semester
            AND kp.id_kelas = ks.id_kelas
           WHERE kp.id = $1 AND km.id_mahasiswa = $2 AND km.status = 'active'
           LIMIT 1`,
          [kelasPraktikumId, studentId]
        );

        if (!kmResult.rows.length) {
          throw new ClientError(`Mahasiswa ${studentId} tidak terdaftar aktif di kelas praktikum ini`);
        }

        const idKelasMhs = kmResult.rows[0].id_kelas_mhs;

        const parentSubRes = await client.query(
          `SELECT id, report_html FROM task_submissions
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3
           ORDER BY attempt_no DESC LIMIT 1`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const parentSubmissionId = parentSubRes.rows[0]?.id || null;
        
        // Start from empty template for remedial
        const reportHtml = JSON.stringify(this._generateInitialReport(jobsheet));

        const maxAttemptRes = await client.query(
          `SELECT COALESCE(MAX(attempt_no), 0) AS max_attempt
           FROM task_submissions
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const attemptNo = maxAttemptRes.rows[0].max_attempt + 1;
        const attemptType = 'remedial';
        const attemptLabel = `Remedial ${attemptNo - 1}`;

        const newSubmissionId = `sub-${randomUUID().slice(0, 12)}`;
        await client.query(
          `INSERT INTO task_submissions 
            (id, jobsheet_id, student_id, id_kelas_praktikum, id_kelas_mhs, status, report_html, submitted_at, attempt_no, attempt_type, attempt_label, remedial_id, parent_submission_id, submission_source, is_auto_submitted)
           VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, NULL, $7, $8, $9, $10, $11, 'remedial', false)`,
          [newSubmissionId, jobsheetId, studentId, kelasPraktikumId, idKelasMhs, reportHtml, attemptNo, attemptType, attemptLabel, remedialId, parentSubmissionId]
        );

        // Reset progress context for remedial (start fresh)
        const progress = 0;
        const lastPage = null;
        const completedItems = [];

        const newProgressId = `progress-${randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO student_progress
            (id, student_id, jobsheet_id, id_kelas_praktikum, id_kelas_mhs, status, progress, last_page, last_activity, completed_items, attempt_no, attempt_type, remedial_id)
           VALUES ($1, $2, $3, $4, $5, 'SEDANG', $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11)`,
          [newProgressId, studentId, jobsheetId, kelasPraktikumId, idKelasMhs, progress, lastPage, JSON.stringify(completedItems), attemptNo, attemptType, remedialId]
        );

        // Reset student jobsheet progress snapshot for remedial (start fresh)
        const parentJobsheetProgressRes = await client.query(
          `SELECT module_id, total_steps FROM student_jobsheet_progress
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3
           ORDER BY attempt_no DESC LIMIT 1`,
          [studentId, jobsheetId, kelasPraktikumId]
        );

        const theoryCount = Array.isArray(jobsheet.theory) ? jobsheet.theory.length : 0;
        const expCount = Array.isArray(jobsheet.experiments) ? jobsheet.experiments.length : 0;
        const exeCount = Array.isArray(jobsheet.exercises) ? jobsheet.exercises.length : 0;
        const fallbackTotalSteps = theoryCount + expCount + exeCount + 1;

        const moduleId = (parentJobsheetProgressRes.rows[0]?.module_id || `jobsheet:${jobsheetId}`).slice(0, 20);
        const currentExperimentId = null;
        const currentInstructionId = null;
        const completedSteps = 0;
        const totalSteps = parentJobsheetProgressRes.rows[0]?.total_steps || fallbackTotalSteps;
        const progressPercentage = 0;

        const newJobsheetProgressId = `prog-${randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO student_jobsheet_progress
            (id, student_id, id_kelas_praktikum, id_kelas_mhs, module_id, jobsheet_id, current_experiment_id, current_instruction_id, completed_steps, total_steps, progress_percentage, status, first_opened_at, last_activity_at, completed_at, attempt_no, attempt_type, remedial_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, $12, $13, $14)`,
          [newJobsheetProgressId, studentId, kelasPraktikumId, idKelasMhs, moduleId, jobsheetId, currentExperimentId, currentInstructionId, completedSteps, totalSteps, progressPercentage, attemptNo, attemptType, remedialId]
        );

        const studentRemedialId = `rem-std-${randomUUID().slice(0, 12)}`;
        await client.query(
          `INSERT INTO jobsheet_remedial_students 
            (id, remedial_id, student_id, id_kelas_mhs, source_submission_id, status, assigned_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentRemedialId, remedialId, studentId, idKelasMhs, parentSubmissionId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRemedial(remedialId, lecturerId) {
    const remResult = await this._pool.query(
      'SELECT id_kelas_praktikum FROM jobsheet_remedials WHERE id = $1',
      [remedialId]
    );

    if (!remResult.rows.length) {
      throw new NotFoundError('Sesi remedial tidak ditemukan');
    }

    const { id_kelas_praktikum: kelasPraktikumId } = remResult.rows[0];
    await this._assertLecturerAccess(kelasPraktikumId, lecturerId);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete student activity logs for this remedial session
      await client.query(
        'DELETE FROM student_jobsheet_activity_logs WHERE remedial_id = $1',
        [remedialId]
      );

      // 2. Delete student jobsheet progress for this remedial session
      await client.query(
        'DELETE FROM student_jobsheet_progress WHERE remedial_id = $1',
        [remedialId]
      );

      // 3. Delete student progress for this remedial session
      await client.query(
        'DELETE FROM student_progress WHERE remedial_id = $1',
        [remedialId]
      );

      // 4. Delete jobsheet remedial students reference/record
      await client.query(
        'DELETE FROM jobsheet_remedial_students WHERE remedial_id = $1',
        [remedialId]
      );

      // 5. Delete task submissions for this remedial session
      await client.query(
        'DELETE FROM task_submissions WHERE remedial_id = $1',
        [remedialId]
      );

      // 6. Delete remedial session itself
      await client.query(
        'DELETE FROM jobsheet_remedials WHERE id = $1',
        [remedialId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = RemedialsService;
