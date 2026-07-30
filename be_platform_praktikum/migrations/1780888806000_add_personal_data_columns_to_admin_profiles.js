exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('admin_profiles', {
    program_studi: {
      type: 'VARCHAR(100)',
      default: 'D3 Teknik Informatika',
    },
    jurusan: {
      type: 'VARCHAR(100)',
      default: 'Teknik Elektro',
    },
    tempat_lahir: {
      type: 'VARCHAR(100)',
    },
    tanggal_lahir: {
      type: 'DATE',
    },
    kota: {
      type: 'VARCHAR(100)',
    },
  });

  pgm.sql(`
    UPDATE admin_profiles 
    SET program_studi = 'D3 Teknik Informatika', 
        jurusan = 'Teknik Elektro' 
    WHERE program_studi IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns('admin_profiles', ['program_studi', 'jurusan', 'tempat_lahir', 'tanggal_lahir', 'kota']);
};
