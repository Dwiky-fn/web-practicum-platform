exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('courses', {
    description: {
      type: 'TEXT',
      notNull: true,
      default: '',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('courses', 'description');
};
