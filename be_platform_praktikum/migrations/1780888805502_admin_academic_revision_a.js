exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_active_kurikulum');

  pgm.addColumns('student_profiles', {
    is_transfer_student: { type: 'BOOLEAN', notNull: true, default: false },
    transfer_origin_semester: { type: 'INT' },
    transfer_reason: { type: 'TEXT' },
  });

  pgm.createTable('student_class_history', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    id_mahasiswa: { type: 'VARCHAR(20)', notNull: true, references: 'users(id)', onDelete: 'RESTRICT' },
    from_kelas_mhs_id: { type: 'VARCHAR(20)', references: 'kelas_mhs(id)', onDelete: 'SET NULL' },
    to_kelas_mhs_id: { type: 'VARCHAR(20)', references: 'kelas_mhs(id)', onDelete: 'SET NULL' },
    from_tahun_semester_id: { type: 'VARCHAR(20)', references: 'tahun_semester(id)', onDelete: 'SET NULL' },
    to_tahun_semester_id: { type: 'VARCHAR(20)', references: 'tahun_semester(id)', onDelete: 'SET NULL' },
    from_semester: { type: 'INT' },
    to_semester: { type: 'INT' },
    from_kelas_id: { type: 'VARCHAR(20)', references: 'kelas(id)', onDelete: 'SET NULL' },
    to_kelas_id: { type: 'VARCHAR(20)', references: 'kelas(id)', onDelete: 'SET NULL' },
    action: { type: 'VARCHAR(30)', notNull: true },
    note: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('student_class_history', 'student_class_history_action_check', "CHECK (action IN ('promote', 'retain', 'transfer_exception'))");
  pgm.createIndex('student_class_history', ['id_mahasiswa']);
  pgm.createIndex('student_class_history', ['to_tahun_semester_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('student_class_history', { ifExists: true, cascade: true });
  pgm.dropColumns('student_profiles', ['is_transfer_student', 'transfer_origin_semester', 'transfer_reason'], { ifExists: true });
};
