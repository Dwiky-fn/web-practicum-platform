exports.up = (pgm) => {
  // Create chat_conversations table
  pgm.createTable('chat_conversations', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    student_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    lecturer_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    kelas_praktikum_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'kelas_praktikum',
      onDelete: 'CASCADE',
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'jobsheets',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    last_message_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Unique constraint to guarantee single conversation per (student, lecturer, class, jobsheet)
  pgm.addConstraint(
    'chat_conversations',
    'unique_chat_conversation_scope',
    'UNIQUE (student_id, lecturer_id, kelas_praktikum_id, jobsheet_id)'
  );

  // Indexes for conversation lookup
  pgm.createIndex('chat_conversations', ['student_id', 'lecturer_id', 'kelas_praktikum_id', 'jobsheet_id']);
  pgm.createIndex('chat_conversations', ['kelas_praktikum_id', 'jobsheet_id']);
  pgm.createIndex('chat_conversations', ['lecturer_id', 'last_message_at DESC']);

  // Create chat_messages table
  pgm.createTable('chat_messages', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    conversation_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'chat_conversations',
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    client_message_id: {
      type: 'VARCHAR(100)',
      notNull: false,
    },
    message: {
      type: 'TEXT',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    read_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: false,
    },
  });

  // Non-empty trimmed string check and max length check
  pgm.addConstraint(
    'chat_messages',
    'check_chat_message_content',
    'CHECK (length(trim(message)) > 0 AND length(message) <= 2000)'
  );

  // Partial unique index for client_message_id deduplication per conversation
  pgm.createIndex('chat_messages', ['conversation_id', 'client_message_id'], {
    name: 'unique_chat_message_client_id',
    unique: true,
    where: 'client_message_id IS NOT NULL',
  });

  // Indexes for fetching message history and unread status
  pgm.createIndex('chat_messages', ['conversation_id', 'created_at DESC']);
  pgm.createIndex('chat_messages', ['conversation_id', 'read_at'], {
    name: 'idx_chat_messages_unread',
    where: 'read_at IS NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('chat_messages');
  pgm.dropTable('chat_conversations');
};
