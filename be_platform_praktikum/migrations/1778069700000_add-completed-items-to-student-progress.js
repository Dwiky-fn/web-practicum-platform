exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('student_progress', {
    completed_items: {
      type: 'JSONB',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('student_progress', 'completed_items');
};
