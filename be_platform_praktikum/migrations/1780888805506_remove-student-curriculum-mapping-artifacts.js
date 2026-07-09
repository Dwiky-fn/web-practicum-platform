exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropTable('kurikulum_prodi_angkatan_conflicts', { ifExists: true, cascade: true });
  pgm.dropTable('kurikulum_prodi_angkatan', { ifExists: true, cascade: true });
  pgm.dropIndex('student_profiles', ['id_kurikulum'], { ifExists: true });
  pgm.dropColumns('student_profiles', ['id_kurikulum'], { ifExists: true });
};

exports.down = (pgm) => {
  pgm.addColumns('student_profiles', {
    id_kurikulum: {
      type: 'VARCHAR(20)',
      references: 'kurikulum(id)',
      onDelete: 'SET NULL',
    },
  }, { ifNotExists: true });
  pgm.createIndex('student_profiles', ['id_kurikulum'], { ifNotExists: true });

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
};
