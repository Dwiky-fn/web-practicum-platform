exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('jobsheets', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    course_id: {
      type: 'VARCHAR(20)',
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
    // Gabungan konten theory, summary, dan task dalam format TipTap JSON.
    // Strukturnya bebas, di-handle di aplikasi.
    content: {
      type: 'JSONB',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
  });

  pgm.addConstraint(
    'jobsheets',
    'jobsheets_status_check',
    "CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'))",
  );

  pgm.createIndex('jobsheets', ['course_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('jobsheets', { cascade: true });
};
