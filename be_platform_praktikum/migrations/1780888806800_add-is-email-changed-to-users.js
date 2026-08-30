exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    is_email_changed: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'is_email_changed');
};
