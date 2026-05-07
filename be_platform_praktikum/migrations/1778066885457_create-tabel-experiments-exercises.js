exports.shorthands = undefined;

exports.up = (pgm) => {
  // EXPERIMENTS
  pgm.createTable('experiments', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
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

  pgm.createIndex('experiments', ['jobsheet_id']);

  // EXERCISES
  pgm.createTable('exercises', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
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

  pgm.createIndex('exercises', ['jobsheet_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('exercises', { cascade: true });
  pgm.dropTable('experiments', { cascade: true });
};
