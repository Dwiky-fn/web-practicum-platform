exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('jobsheets', {
    editor_mode: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'mini_ide',
    },
  });

  pgm.addConstraint(
    'jobsheets',
    'jobsheets_editor_mode_check',
    "CHECK (editor_mode IN ('mini_ide', 'simple'))",
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('jobsheets', 'jobsheets_editor_mode_check');
  pgm.dropColumn('jobsheets', 'editor_mode');
};
