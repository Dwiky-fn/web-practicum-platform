exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('jobsheet_classes', {
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
    class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'classes(id)',
      onDelete: 'CASCADE',
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },
    deadline: {
      type: 'TIMESTAMP',
    },
    // Konten di-copy dari jobsheet induk saat di-assign ke kelas.
    // Dosen bisa edit kolom di bawah ini tanpa ganggu jobsheet global.
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
    'jobsheet_classes',
    'unique_jobsheet_class',
    'UNIQUE(jobsheet_id, class_id)',
  );

  pgm.addConstraint(
    'jobsheet_classes',
    'jobsheet_classes_status_check',
    "CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'))",
  );

  pgm.createIndex('jobsheet_classes', ['jobsheet_id']);
  pgm.createIndex('jobsheet_classes', ['class_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('jobsheet_classes', { cascade: true });
};
