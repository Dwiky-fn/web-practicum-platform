exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('student_progress', 'last_page', {
    type: 'TEXT',
  });
};

exports.down = (pgm) => {
  pgm.alterColumn('student_progress', 'last_page', {
    type: 'VARCHAR(21)',
  });
};
