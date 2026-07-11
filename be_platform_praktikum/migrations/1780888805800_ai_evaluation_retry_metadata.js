exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('task_submissions', {
    ai_evaluation_retry_count: {
      type: 'INTEGER',
      notNull: true,
      default: 0,
    },
    ai_evaluation_last_attempt_at: {
      type: 'TIMESTAMP',
    },
  });

  pgm.addConstraint(
    'task_submissions',
    'task_submissions_ai_retry_count_check',
    'CHECK (ai_evaluation_retry_count >= 0)',
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('task_submissions', 'task_submissions_ai_retry_count_check', { ifExists: true });
  pgm.dropColumns('task_submissions', ['ai_evaluation_retry_count', 'ai_evaluation_last_attempt_at'], { ifExists: true });
};
