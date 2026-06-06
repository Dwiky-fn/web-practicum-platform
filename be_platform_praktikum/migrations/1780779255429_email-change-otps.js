exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('email_change_otps', {
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
    new_email: {
      type: 'varchar(255)',
      notNull: true,
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

  pgm.createIndex('email_change_otps', 'user_id', {
    name: 'idx_email_change_otps_user_id',
  });

  pgm.createIndex('email_change_otps', 'expires_at', {
    name: 'idx_email_change_otps_expires_at',
  });

  pgm.createIndex('email_change_otps', ['user_id', 'created_at'], {
    name: 'idx_email_change_otps_user_created_at',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('email_change_otps', ['user_id', 'created_at'], {
    name: 'idx_email_change_otps_user_created_at',
    ifExists: true,
  });

  pgm.dropIndex('email_change_otps', 'expires_at', {
    name: 'idx_email_change_otps_expires_at',
    ifExists: true,
  });

  pgm.dropIndex('email_change_otps', 'user_id', {
    name: 'idx_email_change_otps_user_id',
    ifExists: true,
  });

  pgm.dropTable('email_change_otps', {
    ifExists: true,
  });
};
