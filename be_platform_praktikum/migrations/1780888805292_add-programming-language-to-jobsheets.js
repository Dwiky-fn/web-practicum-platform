exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('jobsheets', {
    programming_language: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'java',
    },
  });

  pgm.addConstraint(
    'jobsheets',
    'jobsheets_programming_language_check',
    "CHECK (programming_language IN ('java', 'python'))",
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('jobsheets', 'jobsheets_programming_language_check');
  pgm.dropColumn('jobsheets', 'programming_language');
};
