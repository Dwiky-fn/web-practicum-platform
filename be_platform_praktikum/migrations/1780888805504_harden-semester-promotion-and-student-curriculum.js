exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('student_profiles', {
    id_kurikulum: {
      type: 'VARCHAR(20)',
      references: 'kurikulum(id)',
      onDelete: 'SET NULL',
    },
  }, { ifNotExists: true });

  pgm.createIndex('student_profiles', ['id_kurikulum'], { ifNotExists: true });

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_semester_promotion_source_target
    ON semester_promotion_logs (source_tahun_semester_id, target_tahun_semester_id)
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_semester_promotion_source_target');
  pgm.dropIndex('student_profiles', ['id_kurikulum'], { ifExists: true });
  pgm.dropColumns('student_profiles', ['id_kurikulum'], { ifExists: true });
};
