exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addConstraint('task_submission', 'task_submission_student_id_fkey', {
    foreignKeys: {
      columns: 'student_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('task_submission', 'task_submission_student_id_fkey');
};
