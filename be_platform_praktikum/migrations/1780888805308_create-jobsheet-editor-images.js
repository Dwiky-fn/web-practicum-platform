exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('jobsheet_editor_images', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: '"jobsheets"',
      onDelete: 'CASCADE',
    },
    uploaded_by: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    public_id: {
      type: 'TEXT',
      notNull: true,
    },
    url: {
      type: 'TEXT',
      notNull: true,
    },
    mime_type: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    file_size: {
      type: 'INTEGER',
      notNull: true,
    },
    width: {
      type: 'INTEGER',
      notNull: true,
    },
    height: {
      type: 'INTEGER',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    deleted_at: {
      type: 'TIMESTAMP',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('jobsheet_editor_images');
};
