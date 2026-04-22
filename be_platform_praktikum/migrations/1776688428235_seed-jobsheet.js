exports.shorthands = undefined;

exports.up = async (pgm) => {
  // =========================
  // JOBSHEET
  // =========================
  pgm.sql(`
    INSERT INTO jobsheets (
      id, course_id, title, description, goal,
      summary, deadline, status, task
    ) VALUES (
      'job-1',
      'mk-3',
      'Jobsheet 2: Tipe Data, Variabel, dan Konstanta',
      'Mahasiswa mempelajari tipe data, identifier, variabel, dan konstanta dalam Java.',
      'Mahasiswa mampu menggunakan variabel, konstanta, dan berbagai jenis tipe data dalam program Java untuk menyelesaikan contoh kasus.',
      '${JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Jobsheet ini membahas konsep dasar pemrograman Java...',
              },
            ],
          },
        ],
      })}'::jsonb,
      '2026-06-23',
      'PUBLISHED',
      '${JSON.stringify({
        experimentIds: ['percobaan-2'],
        exerciseIds: ['latihan-1'],
        requireSelfDeclaration: true,
        conclusionConfig: {
          enabled: true,
          required: true,
          minWord: 150,
        },
      })}'::jsonb
    );
  `);

  // =========================
  // THEORY
  // =========================
  pgm.sql(`
    INSERT INTO theory (id, jobsheet_id, title, "order", content)
    VALUES 
    (
      'tipe-data',
      'job-1',
      'Tipe Data',
      1,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb
    ),
    (
      'identifier',
      'job-1',
      'Identifier',
      2,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb
    ),
    (
      'variabel',
      'job-1',
      'Variabel',
      3,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb
    ),
    (
      'konstanta',
      'job-1',
      'Konstanta',
      4,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb
    );
  `);

  // =========================
  // EXPERIMENTS
  // =========================
  pgm.sql(`
    INSERT INTO experiments (
      id, jobsheet_id, title, "order",
      instruction_content, default_template_code
    ) VALUES
    (
      'percobaan-1',
      'job-1',
      'Percobaan 1: Tipe Data Bilangan Bulat',
      1,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb,
      $$package tipedata;
public class BilanganBulat {
  public static void main(String args[]) {
    byte nilaiA;
    short nilaiB;
    int hargaA;
    long hargaB;

    nilaiA = 97;
    nilaiB = 30000;
    hargaA = 2000000000;
    hargaB = 3000000000L;

    System.out.println(nilaiA);
    System.out.println(nilaiB);
    System.out.println(hargaA);
    System.out.println(hargaB);
  }
}$$
    ),
    (
      'percobaan-2',
      'job-1',
      'Percobaan 2: Tipe Data Bilangan Pecahan',
      2,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb,
      $$package tipedata;

public class BilanganPecahan {
  public static void main(String args[]) {
    float ips;
    double ipk;

    ips = 3.5f;
    ipk = 3.8;

    System.out.println(ips);
    System.out.println(ipk);
  }
}$$
    );
  `);

  // =========================
  // EXERCISES
  // =========================
  pgm.sql(`
    INSERT INTO exercises (
      id, jobsheet_id, title, "order",
      instruction_content, default_template_code
    ) VALUES
    (
      'latihan-1',
      'job-1',
      'Latihan - Biodata Mahasiswa',
      1,
      '${JSON.stringify({ type: 'doc', content: [] })}'::jsonb,
      ''
    );
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM exercises WHERE jobsheet_id = 'job-1';
    DELETE FROM experiments WHERE jobsheet_id = 'job-1';
    DELETE FROM theory WHERE jobsheet_id = 'job-1';
    DELETE FROM jobsheets WHERE id = 'job-1';
  `);
};
