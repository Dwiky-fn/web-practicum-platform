exports.shorthands = undefined;

exports.up = (pgm) => {
  // CLASS_EXPERIMENTS
  // Copy dari experiments global saat jobsheet di-assign ke kelas.
  // Dosen bisa edit per kelas tanpa ganggu experiments global.
  pgm.createTable('class_experiments', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    jobsheet_class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheet_classes(id)',
      onDelete: 'CASCADE',
    },
    // Referensi ke experiment global asalnya (untuk tracing/sync)
    experiment_id: {
      type: 'VARCHAR(20)',
      references: 'experiments(id)',
      onDelete: 'SET NULL',
    },
    title: {
      type: 'TEXT',
    },
    instruction_content: {
      type: 'JSONB',
    },
    template_code: {
      type: 'TEXT',
    },
  });

  pgm.createIndex('class_experiments', ['jobsheet_class_id']);
  pgm.createIndex('class_experiments', ['experiment_id']);

  // CLASS_EXERCISES
  // Copy dari exercises global saat jobsheet di-assign ke kelas.
  // Dosen bisa edit per kelas tanpa ganggu exercises global.
  pgm.createTable('class_exercises', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    jobsheet_class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheet_classes(id)',
      onDelete: 'CASCADE',
    },
    // Referensi ke exercise global asalnya (untuk tracing/sync)
    exercise_id: {
      type: 'VARCHAR(20)',
      references: 'exercises(id)',
      onDelete: 'SET NULL',
    },
    title: {
      type: 'TEXT',
    },
    instruction_content: {
      type: 'JSONB',
    },
    template_code: {
      type: 'TEXT',
    },
  });

  pgm.createIndex('class_exercises', ['jobsheet_class_id']);
  pgm.createIndex('class_exercises', ['exercise_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('class_exercises', { cascade: true });
  pgm.dropTable('class_experiments', { cascade: true });
};
