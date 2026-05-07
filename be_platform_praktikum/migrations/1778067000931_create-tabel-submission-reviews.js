exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('submission_reviews', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    submission_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'task_submissions(id)',
      onDelete: 'CASCADE',
    },
    lecturer_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    ai_score: {
      type: 'FLOAT',
    },
    final_score: {
      type: 'FLOAT',
    },
    ai_feedback: {
      type: 'JSONB',
    },
    feedback: {
      type: 'TEXT',
    },
    decision: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'PENDING',
    },
  });

  pgm.addConstraint(
    'submission_reviews',
    'submission_reviews_decision_check',
    "CHECK (decision IN ('PENDING', 'ACCEPTED', 'REVISION'))",
  );

  pgm.createIndex('submission_reviews', ['submission_id']);
  pgm.createIndex('submission_reviews', ['lecturer_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('submission_reviews', { cascade: true });
};
