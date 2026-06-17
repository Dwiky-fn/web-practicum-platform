exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop tabel academic_periods yang sudah tidak digunakan.
  // Seluruh data periode akademik kini dikelola melalui tabel tahun_semester.
  // Migrasi sebelumnya (1780888805300) sudah memindahkan semua referensi ke tahun_semester
  // dan men-drop tabel legacy (classes, courses, dll) yang menggunakan foreign key ke tabel ini.
  pgm.dropTable('academic_periods', { cascade: true, ifExists: true });
};

exports.down = (pgm) => {
  // Recreate academic_periods untuk rollback jika dibutuhkan
  pgm.createTable('academic_periods', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    year: { type: 'VARCHAR(20)', notNull: true },
    semester_type: {
      type: 'VARCHAR(10)',
      notNull: true,
      check: "semester_type IN ('GANJIL', 'GENAP')",
    },
    is_active: { type: 'BOOLEAN', notNull: true, default: false },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};
