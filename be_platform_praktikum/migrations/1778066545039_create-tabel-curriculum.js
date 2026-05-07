exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('curriculum', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('curricula', { cascade: true });
};
