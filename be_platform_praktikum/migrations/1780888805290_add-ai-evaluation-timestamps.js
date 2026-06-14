exports.up = (pgm) => {
  pgm.addColumn('task_submissions', {
    ai_evaluation_started_at: {
      type: 'TIMESTAMP',
    },
    ai_evaluation_finished_at: {
      type: 'TIMESTAMP',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('task_submissions', 'ai_evaluation_finished_at');
  pgm.dropColumn('task_submissions', 'ai_evaluation_started_at');
};
