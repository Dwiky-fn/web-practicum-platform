exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('student_jobsheet_activity_logs', {
    id_kelas_praktikum: {
      type: 'VARCHAR(20)',
      references: 'kelas_praktikum(id)',
      onDelete: 'CASCADE',
    },
    id_kelas_mhs: {
      type: 'VARCHAR(20)',
      references: 'kelas_mhs(id)',
      onDelete: 'CASCADE',
    },
    attempt_type: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'normal',
    },
    exercise_id: {
      type: 'VARCHAR(50)',
    },
    execution_id: {
      type: 'VARCHAR(80)',
    },
  });

  pgm.createIndex('student_jobsheet_activity_logs', ['student_id', 'jobsheet_id', 'id_kelas_praktikum']);
  pgm.createIndex('student_jobsheet_activity_logs', ['activity_type', 'execution_id']);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_code_run_execution
    ON student_jobsheet_activity_logs (execution_id)
    WHERE execution_id IS NOT NULL AND activity_type = 'CODE_RUN'
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_code_run_execution');
  pgm.dropIndex('student_jobsheet_activity_logs', ['activity_type', 'execution_id'], { ifExists: true });
  pgm.dropIndex('student_jobsheet_activity_logs', ['student_id', 'jobsheet_id', 'id_kelas_praktikum'], { ifExists: true });
  pgm.dropColumns(
    'student_jobsheet_activity_logs',
    ['id_kelas_praktikum', 'id_kelas_mhs', 'attempt_type', 'exercise_id', 'execution_id'],
    { ifExists: true },
  );
};
