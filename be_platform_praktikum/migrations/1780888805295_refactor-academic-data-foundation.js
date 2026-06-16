exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tahun_semester', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    tahun_semester: { type: 'VARCHAR(50)', notNull: true, unique: true },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'inactive' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('tahun_semester', 'tahun_semester_status_check', "CHECK (status IN ('active', 'inactive', 'archived'))");
  pgm.sql("CREATE UNIQUE INDEX unique_active_tahun_semester ON tahun_semester (status) WHERE status = 'active'");

  pgm.createTable('kurikulum', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    tahun_kurikulum: { type: 'VARCHAR(20)', notNull: true },
    nama_kurikulum: { type: 'VARCHAR(100)', notNull: true },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'inactive' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('kurikulum', 'kurikulum_status_check', "CHECK (status IN ('active', 'inactive', 'archived'))");
  pgm.addConstraint('kurikulum', 'unique_kurikulum_tahun_nama', 'UNIQUE(tahun_kurikulum, nama_kurikulum)');
  pgm.sql("CREATE UNIQUE INDEX unique_active_kurikulum ON kurikulum (status) WHERE status = 'active'");

  pgm.createTable('semester', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    semester: { type: 'INT', notNull: true, unique: true },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createTable('kelas', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    kelas: { type: 'VARCHAR(20)', notNull: true, unique: true },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createTable('mata_kuliah', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    kode_mk: { type: 'VARCHAR(50)', notNull: true },
    nama_mk: { type: 'VARCHAR(255)', notNull: true },
    sks: { type: 'INT', notNull: true },
    tipe: { type: 'VARCHAR(30)', notNull: true, default: 'praktikum' },
    id_kurikulum: { type: 'VARCHAR(20)', notNull: true, references: 'kurikulum(id)', onDelete: 'RESTRICT' },
    id_semester: { type: 'VARCHAR(20)', notNull: true, references: 'semester(id)', onDelete: 'RESTRICT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('mata_kuliah', 'mata_kuliah_tipe_check', "CHECK (tipe IN ('teori', 'praktikum', 'teori_praktikum'))");
  pgm.addConstraint('mata_kuliah', 'unique_mata_kuliah_kurikulum_kode', 'UNIQUE(id_kurikulum, kode_mk)');
  pgm.createIndex('mata_kuliah', ['id_kurikulum']);
  pgm.createIndex('mata_kuliah', ['id_semester']);

  pgm.createTable('kelas_mhs', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_tahun_semester: { type: 'VARCHAR(20)', notNull: true, references: 'tahun_semester(id)', onDelete: 'RESTRICT' },
    id_semester: { type: 'VARCHAR(20)', notNull: true, references: 'semester(id)', onDelete: 'RESTRICT' },
    id_kelas: { type: 'VARCHAR(20)', notNull: true, references: 'kelas(id)', onDelete: 'RESTRICT' },
    id_mahasiswa: { type: 'VARCHAR(20)', notNull: true, references: 'users(id)', onDelete: 'RESTRICT' },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'active' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('kelas_mhs', 'kelas_mhs_status_check', "CHECK (status IN ('active', 'inactive', 'archived', 'cuti'))");
  pgm.addConstraint('kelas_mhs', 'unique_kelas_mhs_tahun_mahasiswa', 'UNIQUE(id_tahun_semester, id_mahasiswa)');
  pgm.createIndex('kelas_mhs', ['id_tahun_semester', 'id_semester', 'id_kelas']);
  pgm.createIndex('kelas_mhs', ['id_mahasiswa']);

  pgm.createTable('kelas_praktikum', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_tahun_semester: { type: 'VARCHAR(20)', notNull: true, references: 'tahun_semester(id)', onDelete: 'RESTRICT' },
    id_mata_kuliah: { type: 'VARCHAR(20)', notNull: true, references: 'mata_kuliah(id)', onDelete: 'RESTRICT' },
    id_semester: { type: 'VARCHAR(20)', notNull: true, references: 'semester(id)', onDelete: 'RESTRICT' },
    id_kelas: { type: 'VARCHAR(20)', notNull: true, references: 'kelas(id)', onDelete: 'RESTRICT' },
    nama_kelas: { type: 'VARCHAR(255)', notNull: true },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'draft' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('kelas_praktikum', 'kelas_praktikum_status_check', "CHECK (status IN ('draft', 'open', 'closed', 'archived'))");
  pgm.addConstraint('kelas_praktikum', 'unique_kelas_praktikum_opening', 'UNIQUE(id_tahun_semester, id_mata_kuliah, id_semester, id_kelas)');
  pgm.createIndex('kelas_praktikum', ['id_tahun_semester']);
  pgm.createIndex('kelas_praktikum', ['id_mata_kuliah']);
  pgm.createIndex('kelas_praktikum', ['id_semester', 'id_kelas']);

  pgm.createTable('pengampu', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_kelas_praktikum: { type: 'VARCHAR(20)', notNull: true, references: 'kelas_praktikum(id)', onDelete: 'RESTRICT' },
    id_dosen: { type: 'VARCHAR(20)', notNull: true, references: 'users(id)', onDelete: 'RESTRICT' },
    peran: { type: 'VARCHAR(20)', notNull: true, default: 'utama' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pengampu', 'pengampu_peran_check', "CHECK (peran IN ('utama', 'asisten', 'pengganti'))");
  pgm.addConstraint('pengampu', 'unique_pengampu_kelas_dosen', 'UNIQUE(id_kelas_praktikum, id_dosen)');
  pgm.createIndex('pengampu', ['id_kelas_praktikum']);
  pgm.createIndex('pengampu', ['id_dosen']);

  pgm.addColumns('jobsheet_classes', {
    id_kelas_praktikum: { type: 'VARCHAR(20)', references: 'kelas_praktikum(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('jobsheet_classes', ['id_kelas_praktikum']);

  pgm.addColumns('student_progress', {
    id_kelas_praktikum: { type: 'VARCHAR(20)', references: 'kelas_praktikum(id)', onDelete: 'SET NULL' },
    id_kelas_mhs: { type: 'VARCHAR(20)', references: 'kelas_mhs(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('student_progress', ['id_kelas_praktikum']);
  pgm.createIndex('student_progress', ['id_kelas_mhs']);

  pgm.addColumns('task_submissions', {
    id_kelas_praktikum: { type: 'VARCHAR(20)', references: 'kelas_praktikum(id)', onDelete: 'SET NULL' },
    id_kelas_mhs: { type: 'VARCHAR(20)', references: 'kelas_mhs(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('task_submissions', ['id_kelas_praktikum']);
  pgm.createIndex('task_submissions', ['id_kelas_mhs']);

  pgm.addColumns('student_jobsheet_progress', {
    id_kelas_praktikum: { type: 'VARCHAR(20)', references: 'kelas_praktikum(id)', onDelete: 'SET NULL' },
    id_kelas_mhs: { type: 'VARCHAR(20)', references: 'kelas_mhs(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('student_jobsheet_progress', ['id_kelas_praktikum']);
  pgm.createIndex('student_jobsheet_progress', ['id_kelas_mhs']);
};

exports.down = (pgm) => {
  pgm.dropColumns('student_jobsheet_progress', ['id_kelas_praktikum', 'id_kelas_mhs'], { ifExists: true });
  pgm.dropColumns('task_submissions', ['id_kelas_praktikum', 'id_kelas_mhs'], { ifExists: true });
  pgm.dropColumns('student_progress', ['id_kelas_praktikum', 'id_kelas_mhs'], { ifExists: true });
  pgm.dropColumns('jobsheet_classes', ['id_kelas_praktikum'], { ifExists: true });
  pgm.dropTable('pengampu', { cascade: true });
  pgm.dropTable('kelas_praktikum', { cascade: true });
  pgm.dropTable('kelas_mhs', { cascade: true });
  pgm.dropTable('mata_kuliah', { cascade: true });
  pgm.dropTable('kelas', { cascade: true });
  pgm.dropTable('semester', { cascade: true });
  pgm.dropTable('kurikulum', { cascade: true });
  pgm.dropTable('tahun_semester', { cascade: true });
};
