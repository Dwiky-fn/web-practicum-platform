exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Ensure master active kurikulum and semesters exist for migration
  pgm.sql(`
    INSERT INTO kurikulum (id, tahun_kurikulum, nama_kurikulum, status)
    VALUES ('kur-1', '2021', 'Kurikulum 2021', 'active')
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO semester (id, semester)
    SELECT 'sem_' || s.sem AS id, s.sem AS semester
    FROM (SELECT DISTINCT semester AS sem FROM courses) s
    ON CONFLICT (semester) DO NOTHING;
  `);

  // 2. Migrate legacy curriculum to native kurikulum
  pgm.sql(`
    INSERT INTO kurikulum (id, tahun_kurikulum, nama_kurikulum, status, created_at, updated_at)
    SELECT
      id,
      COALESCE(substring(name from '\\d{4}'), '2021') AS tahun_kurikulum,
      name AS nama_kurikulum,
      'inactive'::varchar AS status,
      created_at,
      created_at AS updated_at
    FROM curriculum
    ON CONFLICT (tahun_kurikulum, nama_kurikulum) DO NOTHING;
  `);

  // 3. Migrate legacy courses to native mata_kuliah
  pgm.sql(`
    INSERT INTO mata_kuliah (id, kode_mk, nama_mk, sks, tipe, id_kurikulum, id_semester, created_at, updated_at, legacy_course_id)
    SELECT
      'mkb_' || id AS id,
      code AS kode_mk,
      name AS nama_mk,
      sks,
      'praktikum' AS tipe,
      (SELECT id FROM kurikulum WHERE status = 'active' LIMIT 1) AS id_kurikulum,
      (SELECT id FROM semester WHERE semester = c.semester LIMIT 1) AS id_semester,
      created_at,
      created_at AS updated_at,
      id AS legacy_course_id
    FROM courses c
    WHERE NOT EXISTS (
      SELECT 1 FROM mata_kuliah WHERE legacy_course_id = c.id
    );
  `);

  // 4. Map academic periods to tahun_semester
  pgm.sql(`
    INSERT INTO tahun_semester (id, tahun_semester, status)
    SELECT
      ap.id,
      ap.year || '-' || ap.semester_type AS tahun_semester,
      'inactive'::varchar AS status
    FROM academic_periods ap
    ON CONFLICT (tahun_semester) DO NOTHING;
  `);

  // 5. Populate kelas master
  pgm.sql(`
    INSERT INTO kelas (id, kelas)
    SELECT
      'kls_' || SUBSTRING(MD5(COALESCE(NULLIF(TRIM(SUBSTRING(CASE WHEN name LIKE '% - %' THEN split_part(name, ' - ', 2) ELSE name END FROM 1 FOR 20)), ''), SUBSTRING(name FROM 1 FOR 20))), 1, 15) AS id,
      COALESCE(NULLIF(TRIM(SUBSTRING(CASE WHEN name LIKE '% - %' THEN split_part(name, ' - ', 2) ELSE name END FROM 1 FOR 20)), ''), SUBSTRING(name FROM 1 FOR 20)) AS kelas
    FROM classes
    ON CONFLICT (kelas) DO NOTHING;
  `);

  // 6. Migrate legacy classes to native kelas_praktikum
  pgm.sql(`
    INSERT INTO kelas_praktikum (id, id_tahun_semester, id_mata_kuliah, id_semester, id_kelas, nama_kelas, status, created_at, updated_at, legacy_class_id)
    SELECT
      'kpb_' || cl.id AS id,
      cl.academic_period_id AS id_tahun_semester,
      COALESCE(
        (SELECT id FROM mata_kuliah WHERE legacy_course_id = cl.course_id LIMIT 1),
        'mkb_' || cl.course_id
      ) AS id_mata_kuliah,
      COALESCE(
        (SELECT id_semester FROM mata_kuliah WHERE legacy_course_id = cl.course_id LIMIT 1),
        (SELECT id FROM semester LIMIT 1)
      ) AS id_semester,
      (SELECT id FROM kelas WHERE kelas = COALESCE(NULLIF(TRIM(SUBSTRING(CASE WHEN cl.name LIKE '% - %' THEN split_part(cl.name, ' - ', 2) ELSE cl.name END FROM 1 FOR 20)), ''), SUBSTRING(cl.name FROM 1 FOR 20)) LIMIT 1) AS id_kelas,
      cl.name AS nama_kelas,
      CASE WHEN cl.status = 'AKTIF' THEN 'open'::varchar ELSE 'closed'::varchar END AS status,
      CURRENT_TIMESTAMP AS created_at,
      CURRENT_TIMESTAMP AS updated_at,
      cl.id AS legacy_class_id
    FROM classes cl
    WHERE NOT EXISTS (
      SELECT 1 FROM kelas_praktikum WHERE legacy_class_id = cl.id
    );
  `);

  // 7. Migrate class_students to kelas_mhs
  pgm.sql(`
    INSERT INTO kelas_mhs (id, id_tahun_semester, id_semester, id_kelas, id_mahasiswa, status)
    SELECT
      'km_' || cs.id AS id,
      cl.academic_period_id AS id_tahun_semester,
      kp.id_semester AS id_semester,
      kp.id_kelas AS id_kelas,
      cs.student_id AS id_mahasiswa,
      CASE WHEN cs.status = 'AKTIF' THEN 'active'::varchar ELSE 'inactive'::varchar END AS status
    FROM class_students cs
    JOIN classes cl ON cl.id = cs.class_id
    JOIN kelas_praktikum kp ON kp.legacy_class_id = cl.id
    ON CONFLICT (id_tahun_semester, id_mahasiswa) DO NOTHING;
  `);

  // 8. Generate kelas_semester groups
  pgm.sql(`
    INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status)
    SELECT DISTINCT
      'ks_' || SUBSTRING(MD5(id_tahun_semester || '_' || id_semester || '_' || id_kelas), 1, 17) AS id,
      id_tahun_semester,
      id_semester,
      id_kelas,
      'active' AS status
    FROM kelas_mhs
    ON CONFLICT (id_tahun_semester, id_semester, id_kelas) DO NOTHING;
  `);

  pgm.sql(`
    UPDATE kelas_mhs km
    SET id_kelas_semester = 'ks_' || SUBSTRING(MD5(km.id_tahun_semester || '_' || km.id_semester || '_' || km.id_kelas), 1, 17)
    WHERE km.id_kelas_semester IS NULL;
  `);

  // 9. Align jobsheets id_mata_kuliah
  pgm.sql(`
    UPDATE jobsheets j
    SET id_mata_kuliah = mk.id
    FROM mata_kuliah mk
    WHERE mk.legacy_course_id = j.course_id
      AND j.id_mata_kuliah IS NULL;
  `);

  // 10. Align jobsheet_classes id_kelas_praktikum
  pgm.sql(`
    UPDATE jobsheet_classes jc
    SET id_kelas_praktikum = kp.id
    FROM kelas_praktikum kp
    WHERE kp.legacy_class_id = jc.class_id
      AND jc.id_kelas_praktikum IS NULL;
  `);

  // 11. Align student_progress, student_jobsheet_progress, task_submissions
  pgm.sql(`
    UPDATE student_progress sp
    SET id_kelas_praktikum = kp.id
    FROM kelas_praktikum kp
    WHERE kp.legacy_class_id = sp.class_id
      AND sp.id_kelas_praktikum IS NULL;
  `);

  pgm.sql(`
    UPDATE student_jobsheet_progress sjp
    SET id_kelas_praktikum = kp.id
    FROM kelas_praktikum kp
    WHERE kp.legacy_class_id = sjp.class_id
      AND sjp.id_kelas_praktikum IS NULL;
  `);

  pgm.sql(`
    UPDATE task_submissions ts
    SET id_kelas_praktikum = kp.id
    FROM kelas_praktikum kp
    WHERE kp.legacy_class_id = ts.id_kelas_praktikum
      AND ts.id_kelas_praktikum IS NULL;
  `);

  pgm.sql(`
    UPDATE student_progress sp
    SET id_kelas_mhs = km.id
    FROM kelas_praktikum kp
    JOIN kelas_mhs km
      ON km.id_tahun_semester = kp.id_tahun_semester
     AND km.id_semester = kp.id_semester
     AND km.id_kelas = kp.id_kelas
    WHERE sp.id_kelas_praktikum = kp.id
      AND sp.student_id = km.id_mahasiswa
      AND sp.id_kelas_mhs IS NULL;
  `);

  pgm.sql(`
    UPDATE student_jobsheet_progress sjp
    SET id_kelas_mhs = km.id
    FROM kelas_praktikum kp
    JOIN kelas_mhs km
      ON km.id_tahun_semester = kp.id_tahun_semester
     AND km.id_semester = kp.id_semester
     AND km.id_kelas = kp.id_kelas
    WHERE sjp.id_kelas_praktikum = kp.id
      AND sjp.student_id = km.id_mahasiswa
      AND sjp.id_kelas_mhs IS NULL;
  `);

  pgm.sql(`
    UPDATE task_submissions ts
    SET id_kelas_mhs = km.id
    FROM kelas_praktikum kp
    JOIN kelas_mhs km
      ON km.id_tahun_semester = kp.id_tahun_semester
     AND km.id_semester = kp.id_semester
     AND km.id_kelas = kp.id_kelas
    WHERE ts.id_kelas_praktikum = kp.id
      AND ts.student_id = km.id_mahasiswa
      AND ts.id_kelas_mhs IS NULL;
  `);

  // 12. Drop legacy columns and constraints
  pgm.dropColumns('jobsheets', ['course_id'], { ifExists: true });
  pgm.dropColumns('jobsheet_classes', ['class_id'], { ifExists: true });
  pgm.dropColumns('student_progress', ['class_id'], { ifExists: true });
  pgm.dropColumns('student_jobsheet_progress', ['class_id'], { ifExists: true });
  pgm.dropColumns('mata_kuliah', ['legacy_course_id'], { ifExists: true });
  pgm.dropColumns('kelas_praktikum', ['legacy_class_id'], { ifExists: true });

  // 13. Drop legacy tables
  pgm.dropTable('class_students', { cascade: true });
  pgm.dropTable('classes', { cascade: true });
  pgm.dropTable('courses', { cascade: true });
  pgm.dropTable('curriculum', { cascade: true });
};

exports.down = (pgm) => {
  // Recreating legacy tables & columns (dummy for rollback compatibility if needed)
  pgm.createTable('curriculum', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    name: { type: 'VARCHAR(100)', notNull: true },
    is_active: { type: 'BOOLEAN', notNull: true, default: false },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createTable('courses', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    name: { type: 'VARCHAR(255)', notNull: true },
    code: { type: 'VARCHAR(50)', notNull: true },
    semester: { type: 'INT', notNull: true },
    sks: { type: 'INT', notNull: true },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'AKTIF' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createTable('classes', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    course_id: { type: 'VARCHAR(20)', references: 'courses(id)', onDelete: 'CASCADE' },
    name: { type: 'VARCHAR(100)', notNull: true },
    lecturer_id: { type: 'VARCHAR(20)', references: 'users(id)', onDelete: 'SET NULL' },
    academic_period_id: { type: 'VARCHAR(20)', references: 'academic_periods(id)', onDelete: 'RESTRICT' },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'AKTIF' },
  });

  pgm.createTable('class_students', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    class_id: { type: 'VARCHAR(20)', references: 'classes(id)', onDelete: 'CASCADE' },
    student_id: { type: 'VARCHAR(20)', references: 'users(id)', onDelete: 'CASCADE' },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'AKTIF' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
};
