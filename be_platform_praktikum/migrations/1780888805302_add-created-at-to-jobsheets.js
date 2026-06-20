exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('jobsheets', {
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addColumn('jobsheet_classes', {
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('jobsheet_classes', 'created_at');
  pgm.dropColumn('jobsheets', 'created_at');
};
