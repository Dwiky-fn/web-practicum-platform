exports.up = (pgm) => {
  pgm.addColumn('experiments', {
    rubric: {
      type: 'INTEGER',
      default: 0,
      notNull: true,
    },
  });
  pgm.addColumn('exercises', {
    rubric: {
      type: 'INTEGER',
      default: 0,
      notNull: true,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('exercises', 'rubric');
  pgm.dropColumn('experiments', 'rubric');
};
