exports.up = (pgm) => {
  pgm.addColumn('task_submissions', {
    ai_evaluation_status: {
      type: 'VARCHAR(30)',
      notNull: true,
      default: 'none',
    },
    ai_evaluation_error: {
      type: 'TEXT',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('task_submissions', 'ai_evaluation_error');
  pgm.dropColumn('task_submissions', 'ai_evaluation_status');
};
