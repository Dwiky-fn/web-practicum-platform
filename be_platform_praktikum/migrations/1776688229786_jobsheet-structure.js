exports.shorthands = undefined;

exports.up = (pgm) => {
  // JOBSHEETS
  pgm.createTable('jobsheets', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    course_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    title: {
      type: 'TEXT',
      notNull: true,
    },
    description: {
      type: 'TEXT',
    },
    goal: {
      type: 'TEXT',
    },
    summary: {
      type: 'JSONB',
    },
    deadline: {
      type: 'TIMESTAMP',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    task: {
      type: 'JSONB',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // THEORY
  pgm.createTable('theory', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'TEXT',
    },
    order: {
      type: 'INT',
    },
    content: {
      type: 'JSONB',
    },
  });

  // EXPERIMENTS
  pgm.createTable('experiments', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'TEXT',
    },
    order: {
      type: 'INT',
    },
    instruction_content: {
      type: 'JSONB',
    },
    default_template_code: {
      type: 'TEXT',
    },
  });

  // EXERCISES
  pgm.createTable('exercises', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'TEXT',
    },
    order: {
      type: 'INT',
    },
    instruction_content: {
      type: 'JSONB',
      notNull: true,
    },
    default_template_code: {
      type: 'TEXT',
    },
  });

  // INDEXES
  pgm.createIndex('experiments', ['jobsheet_id']);
  pgm.createIndex('exercises', ['jobsheet_id']);
  pgm.createIndex('theory', ['jobsheet_id']);

  // STATUS CONSTRAINT
  pgm.addConstraint(
    'jobsheets',
    'jobsheets_status_check',
    "CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'))",
  );
};

exports.down = (pgm) => {
  pgm.dropTable('exercises');
  pgm.dropTable('experiments');
  pgm.dropTable('theory');
  pgm.dropTable('jobsheets');
};
