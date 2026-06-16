exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('kelas_semester', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_tahun_semester: { type: 'VARCHAR(20)', notNull: true, references: 'tahun_semester(id)', onDelete: 'RESTRICT' },
    id_semester: { type: 'VARCHAR(20)', notNull: true, references: 'semester(id)', onDelete: 'RESTRICT' },
    id_kelas: { type: 'VARCHAR(20)', notNull: true, references: 'kelas(id)', onDelete: 'RESTRICT' },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'active' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.addConstraint('kelas_semester', 'kelas_semester_status_check', "CHECK (status IN ('active', 'inactive', 'archived'))");
  pgm.addConstraint('kelas_semester', 'unique_kelas_semester_combination', 'UNIQUE(id_tahun_semester, id_semester, id_kelas)');
  pgm.createIndex('kelas_semester', ['id_tahun_semester']);
  pgm.createIndex('kelas_semester', ['id_semester', 'id_kelas']);

  // Add id_kelas_semester column to class student mapping
  pgm.addColumns('kelas_mhs', {
    id_kelas_semester: { type: 'VARCHAR(20)', references: 'kelas_semester(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('kelas_mhs', ['id_kelas_semester']);

  // Migrate existing unique class groups in kelas_mhs to kelas_semester
  pgm.sql(`
    INSERT INTO kelas_semester (id, id_tahun_semester, id_semester, id_kelas, status, created_at, updated_at)
    SELECT DISTINCT 
      'ks_' || SUBSTRING(MD5(id_tahun_semester || '_' || id_semester || '_' || id_kelas), 1, 17) AS id,
      id_tahun_semester,
      id_semester,
      id_kelas,
      'active' AS status,
      MIN(created_at) AS created_at,
      MIN(updated_at) AS updated_at
    FROM kelas_mhs
    GROUP BY id_tahun_semester, id_semester, id_kelas
    ON CONFLICT (id_tahun_semester, id_semester, id_kelas) DO NOTHING
  `);

  // Link existing records in kelas_mhs to the newly created groups
  pgm.sql(`
    UPDATE kelas_mhs km
    SET id_kelas_semester = 'ks_' || SUBSTRING(MD5(km.id_tahun_semester || '_' || km.id_semester || '_' || km.id_kelas), 1, 17)
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns('kelas_mhs', ['id_kelas_semester'], { ifExists: true });
  pgm.dropTable('kelas_semester', { cascade: true });
};
