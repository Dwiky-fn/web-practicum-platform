exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('kurikulum_prodi_angkatan', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    study_program_id: { type: 'VARCHAR(20)', notNull: true, references: 'study_programs(id)', onDelete: 'RESTRICT' },
    angkatan: { type: 'INT', notNull: true },
    id_kurikulum: { type: 'VARCHAR(20)', notNull: true, references: 'kurikulum(id)', onDelete: 'RESTRICT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.addConstraint('kurikulum_prodi_angkatan', 'unique_kurikulum_prodi_angkatan', 'UNIQUE(study_program_id, angkatan)');
  pgm.createIndex('kurikulum_prodi_angkatan', ['id_kurikulum'], { ifNotExists: true });
  pgm.createIndex('kurikulum_prodi_angkatan', ['study_program_id', 'angkatan'], { ifNotExists: true });

  pgm.createTable('kurikulum_prodi_angkatan_conflicts', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    study_program_id: { type: 'VARCHAR(20)', references: 'study_programs(id)', onDelete: 'SET NULL' },
    angkatan: { type: 'INT' },
    conflict_reason: { type: 'TEXT', notNull: true },
    conflicting_kurikulum_ids: { type: 'TEXT', notNull: true },
    student_count: { type: 'INT', notNull: true, default: 0 },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.createIndex('kurikulum_prodi_angkatan_conflicts', ['study_program_id', 'angkatan'], { ifNotExists: true });

  pgm.addColumns('kelas_semester', {
    study_program_id: { type: 'VARCHAR(20)', references: 'study_programs(id)', onDelete: 'RESTRICT' },
  }, { ifNotExists: true });
  pgm.dropConstraint('kelas_semester', 'unique_kelas_semester_combination', { ifExists: true });
  pgm.addConstraint(
    'kelas_semester',
    'unique_kelas_semester_program_combination',
    'UNIQUE(id_tahun_semester, id_semester, id_kelas, study_program_id)',
  );
  pgm.createIndex('kelas_semester', ['study_program_id'], { ifNotExists: true });

  pgm.createTable('kelas_semester_study_program_conflicts', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_kelas_semester: { type: 'VARCHAR(20)', references: 'kelas_semester(id)', onDelete: 'CASCADE' },
    conflict_reason: { type: 'TEXT', notNull: true },
    conflicting_study_program_ids: { type: 'TEXT', notNull: true },
    student_count: { type: 'INT', notNull: true, default: 0 },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.createIndex('kelas_semester_study_program_conflicts', ['id_kelas_semester'], { ifNotExists: true });

  pgm.addColumns('semester_promotion_logs', {
    eligible_students_count: { type: 'INT', notNull: true, default: 0 },
    promoted_students_count: { type: 'INT', notNull: true, default: 0 },
    excluded_students_count: { type: 'INT', notNull: true, default: 0 },
    auto_created_classes_count: { type: 'INT', notNull: true, default: 0 },
    finalized_by: { type: 'VARCHAR(20)', references: 'users(id)', onDelete: 'SET NULL' },
  }, { ifNotExists: true });
  pgm.createIndex('semester_promotion_logs', ['finalized_by'], { ifNotExists: true });

  pgm.sql(`
    INSERT INTO kurikulum_prodi_angkatan (id, study_program_id, angkatan, id_kurikulum)
    SELECT
      'kpa_' || SUBSTRING(MD5(study_program_id || '_' || angkatan || '_' || MIN(id_kurikulum)), 1, 16) AS id,
      study_program_id,
      angkatan,
      MIN(id_kurikulum) AS id_kurikulum
    FROM student_profiles
    WHERE study_program_id IS NOT NULL
      AND angkatan IS NOT NULL
      AND id_kurikulum IS NOT NULL
    GROUP BY study_program_id, angkatan
    HAVING COUNT(DISTINCT id_kurikulum) = 1
    ON CONFLICT (study_program_id, angkatan) DO NOTHING
  `);

  pgm.sql(`
    INSERT INTO kurikulum_prodi_angkatan_conflicts (
      id, study_program_id, angkatan, conflict_reason, conflicting_kurikulum_ids, student_count
    )
    SELECT
      'kpac_' || SUBSTRING(MD5(study_program_id || '_' || angkatan || '_' || STRING_AGG(DISTINCT id_kurikulum, ',' ORDER BY id_kurikulum)), 1, 15) AS id,
      study_program_id,
      angkatan,
      'Data lama pada Program Studi dan Angkatan ini memiliki lebih dari satu kurikulum mahasiswa.' AS conflict_reason,
      STRING_AGG(DISTINCT id_kurikulum, ',' ORDER BY id_kurikulum) AS conflicting_kurikulum_ids,
      COUNT(*)::int AS student_count
    FROM student_profiles
    WHERE study_program_id IS NOT NULL
      AND angkatan IS NOT NULL
      AND id_kurikulum IS NOT NULL
    GROUP BY study_program_id, angkatan
    HAVING COUNT(DISTINCT id_kurikulum) > 1
    ON CONFLICT (id) DO NOTHING
  `);

  pgm.sql(`
    UPDATE kelas_semester ks
    SET study_program_id = grouped.study_program_id
    FROM (
      SELECT
        km.id_kelas_semester,
        MIN(sp.study_program_id) AS study_program_id
      FROM kelas_mhs km
      JOIN student_profiles sp ON sp.user_id = km.id_mahasiswa
      WHERE km.id_kelas_semester IS NOT NULL
        AND sp.study_program_id IS NOT NULL
      GROUP BY km.id_kelas_semester
      HAVING COUNT(DISTINCT sp.study_program_id) = 1
    ) grouped
    WHERE ks.id = grouped.id_kelas_semester
      AND ks.study_program_id IS NULL
  `);

  pgm.sql(`
    INSERT INTO kelas_semester_study_program_conflicts (
      id, id_kelas_semester, conflict_reason, conflicting_study_program_ids, student_count
    )
    SELECT
      'kssc_' || SUBSTRING(MD5(km.id_kelas_semester || '_' || STRING_AGG(DISTINCT sp.study_program_id, ',' ORDER BY sp.study_program_id)), 1, 15) AS id,
      km.id_kelas_semester,
      'Kelas semester lama memiliki mahasiswa dari lebih dari satu Program Studi.' AS conflict_reason,
      STRING_AGG(DISTINCT sp.study_program_id, ',' ORDER BY sp.study_program_id) AS conflicting_study_program_ids,
      COUNT(*)::int AS student_count
    FROM kelas_mhs km
    JOIN student_profiles sp ON sp.user_id = km.id_mahasiswa
    WHERE km.id_kelas_semester IS NOT NULL
      AND sp.study_program_id IS NOT NULL
    GROUP BY km.id_kelas_semester
    HAVING COUNT(DISTINCT sp.study_program_id) > 1
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('semester_promotion_logs', ['finalized_by'], { ifExists: true });
  pgm.dropColumns('semester_promotion_logs', [
    'eligible_students_count',
    'promoted_students_count',
    'excluded_students_count',
    'auto_created_classes_count',
    'finalized_by',
  ], { ifExists: true });
  pgm.dropTable('kelas_semester_study_program_conflicts', { ifExists: true, cascade: true });
  pgm.dropConstraint('kelas_semester', 'unique_kelas_semester_program_combination', { ifExists: true });
  pgm.addConstraint('kelas_semester', 'unique_kelas_semester_combination', 'UNIQUE(id_tahun_semester, id_semester, id_kelas)');
  pgm.dropIndex('kelas_semester', ['study_program_id'], { ifExists: true });
  pgm.dropColumns('kelas_semester', ['study_program_id'], { ifExists: true });
  pgm.dropTable('kurikulum_prodi_angkatan_conflicts', { ifExists: true, cascade: true });
  pgm.dropTable('kurikulum_prodi_angkatan', { ifExists: true, cascade: true });
};
