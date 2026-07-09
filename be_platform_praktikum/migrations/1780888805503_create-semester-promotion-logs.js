exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('semester_promotion_logs', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    source_tahun_semester_id: { type: 'VARCHAR(20)', notNull: true, references: 'tahun_semester(id)', onDelete: 'RESTRICT' },
    target_tahun_semester_id: { type: 'VARCHAR(20)', notNull: true, references: 'tahun_semester(id)', onDelete: 'RESTRICT' },
    processed_students: { type: 'INT', notNull: true, default: 0 },
    created_target_classes: { type: 'INT', notNull: true, default: 0 },
    note: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });

  pgm.createIndex('semester_promotion_logs', ['source_tahun_semester_id'], {
    ifNotExists: true,
  });
  pgm.createIndex('semester_promotion_logs', ['target_tahun_semester_id'], {
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropTable('semester_promotion_logs', { ifExists: true, cascade: true });
};
