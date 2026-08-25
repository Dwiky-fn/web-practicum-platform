exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    is_password_changed: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
  });

  pgm.sql('UPDATE users SET is_password_changed = true');
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'is_password_changed');
};
