exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('classes', {
    programming_language: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'java',
    },
  });

  pgm.addConstraint(
    'classes',
    'classes_programming_language_check',
    "CHECK (programming_language IN ('java', 'python'))",
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('classes', 'classes_programming_language_check');
  pgm.dropColumn('classes', 'programming_language');
};
