exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('submission_reviews', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    submission_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'task_submission(id)',
      onDelete: 'CASCADE',
    },

    lecturer_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'users(id)', // sesuaikan dengan tabel user kamu
      onDelete: 'CASCADE',
    },

    // AI RESULT
    ai_score: {
      type: 'FLOAT',
    },

    ai_feedback: {
      type: 'JSONB',
    },

    // DOSEN RESULT
    final_score: {
      type: 'FLOAT',
    },

    lecturer_feedback: {
      type: 'TEXT',
    },

    // PLAGIARISM
    plagiarism_score: {
      type: 'FLOAT',
    },

    // DECISION
    decision: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'PENDING',
    },

    reviewed_at: {
      type: 'TIMESTAMP',
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

  // constraint decision enum
  pgm.addConstraint(
    'submission_reviews',
    'submission_reviews_decision_check',
    "CHECK (decision IN ('PENDING', 'ACCEPTED', 'REVISION'))",
  );

  // 🚀 index biar cepat
  pgm.createIndex('submission_reviews', ['submission_id']);
  pgm.createIndex('submission_reviews', ['lecturer_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('submission_reviews');
};
