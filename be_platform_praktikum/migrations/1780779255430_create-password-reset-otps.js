exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('password_reset_otps', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    user_id: {
      type: 'varchar(255)',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    otp_hash: {
      type: 'text',
      notNull: true,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    attempts: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('password_reset_otps', 'user_id', {
    name: 'idx_password_reset_otps_user_id',
  });

  pgm.createIndex('password_reset_otps', 'expires_at', {
    name: 'idx_password_reset_otps_expires_at',
  });

  pgm.createIndex('password_reset_otps', ['user_id', 'created_at'], {
    name: 'idx_password_reset_otps_user_created_at',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('password_reset_otps', ['user_id', 'created_at'], {
    name: 'idx_password_reset_otps_user_created_at',
    ifExists: true,
  });

  pgm.dropIndex('password_reset_otps', 'expires_at', {
    name: 'idx_password_reset_otps_expires_at',
    ifExists: true,
  });

  pgm.dropIndex('password_reset_otps', 'user_id', {
    name: 'idx_password_reset_otps_user_id',
    ifExists: true,
  });

  pgm.dropTable('password_reset_otps', {
    ifExists: true,
  });
};
