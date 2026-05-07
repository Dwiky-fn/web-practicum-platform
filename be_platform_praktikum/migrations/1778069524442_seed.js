const toJsonb = (obj) => JSON.stringify(obj).replace(/'/g, "''");

exports.up = async (pgm) => {
  // ============================================================
  // USERS
  // Password semua: "password123" (bcrypt hash)
  // ============================================================
  pgm.sql(`
    INSERT INTO users (id, fullname, email, password, role, is_active, created_at)
    VALUES
      (
        'admin-1',
        'Administrator',
        'admin@polnep.ac.id',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'ADMIN',
        true,
        CURRENT_TIMESTAMP
      ),
      (
        'dosen-1',
        'Budi Santoso',
        'budi.santoso@polnep.ac.id',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'DOSEN',
        true,
        CURRENT_TIMESTAMP
      ),
      (
        'mhs-1',
        'Andi Pratama',
        'andi.pratama@mahasiswa.polnep.ac.id',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'MAHASISWA',
        true,
        CURRENT_TIMESTAMP
      );
  `);

  // ============================================================
  // PROFILES
  // ============================================================
  pgm.sql(`
    INSERT INTO student_profiles (user_id, nim, program_studi, jurusan, angkatan, semester, status)
    VALUES (
      'mhs-1',
      '3201911001',
      'Teknik Informatika',
      'Teknologi Informasi',
      2021,
      6,
      'Aktif'
    );

    INSERT INTO lecturer_profiles (user_id, nip, program_studi, jurusan, status)
    VALUES (
      'dosen-1',
      '198501012010011001',
      'Teknik Informatika',
      'Teknologi Informasi',
      'Aktif'
    );
  `);

  // ============================================================
  // CURRICULUM
  // ============================================================
  pgm.sql(`
    INSERT INTO curriculum (id, name, is_active, created_at)
    VALUES ('kur-1', 'Kurikulum 2021', true, CURRENT_TIMESTAMP);
  `);

  // course sudah di-seed di 04_create_courses.js (mk-3)

  // ============================================================
  // ACADEMIC PERIOD
  // ============================================================
  pgm.sql(`
    INSERT INTO academic_periods (id, year, semester_type, is_active)
    VALUES ('ap-1', '2025/2026', 'GENAP', true);
  `);

  // ============================================================
  // CLASS
  // ============================================================
  pgm.sql(`
    INSERT INTO classes (id, course_id, name, lecturer_id, academic_period_id, status)
    VALUES ('kelas-a', 'mk-3', 'Kelas A', 'dosen-1', 'ap-1', 'AKTIF');
  `);

  // ============================================================
  // CLASS STUDENT
  // ============================================================
  pgm.sql(`
    INSERT INTO class_students (id, class_id, student_id, created_at, status)
    VALUES ('cs-1', 'kelas-a', 'mhs-1', CURRENT_TIMESTAMP, 'AKTIF');
  `);

  // ============================================================
  // JOBSHEET
  // Konten gabungan: summary lama + theory (tipe-data, identifier,
  // variabel, konstanta) + task — semua dalam 1 kolom content JSONB
  // ============================================================
  pgm.sql(`
    INSERT INTO jobsheets (id, course_id, title, description, goal, content, status)
    VALUES (
      'job-1',
      'mk-3',
      'Jobsheet 2: Tipe Data, Variabel, dan Konstanta',
      'Mahasiswa mempelajari tipe data, identifier, variabel, dan konstanta dalam Java.',
      'Mahasiswa mampu menggunakan variabel, konstanta, dan berbagai jenis tipe data dalam program Java untuk menyelesaikan contoh kasus.',
      '${toJsonb({
        summary: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Jobsheet ini membahas konsep dasar pemrograman Java yang meliputi tipe data, identifier, variabel, dan konstanta, serta penerapannya dalam berbagai percobaan praktikum.',
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: "Java memiliki dua jenis tipe data, yaitu tipe data primitif dan tipe data referensi. Tipe data primitif terdiri dari delapan jenis yang mencakup bilangan bulat (byte, short, int, long), bilangan pecahan (float, double), karakter (char), dan logika (boolean). Masing-masing tipe memiliki ukuran memori dan rentang nilai tertentu. Dalam penggunaan literal, tipe long harus diakhiri dengan karakter 'L', sedangkan float harus diakhiri dengan karakter 'F'.",
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Tipe data referensi digunakan untuk merepresentasikan objek, seperti String, Integer, class, array, dan interface.',
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Variabel merupakan wadah untuk menyimpan nilai yang dapat berubah, sedangkan konstanta menggunakan kata kunci final dan nilainya tidak dapat diubah setelah dideklarasikan.',
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Melalui delapan percobaan dan satu latihan, mahasiswa diharapkan mampu:',
                },
              ],
            },
            {
              type: 'orderedList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Menggunakan berbagai tipe data sesuai kebutuhan',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Memahami batasan nilai dan error kompilasi',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Membedakan variabel dan konstanta',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Mengimplementasikan tipe data referensi dan objek sederhana',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        theory: [
          {
            id: 'tipe-data',
            title: 'Tipe Data',
            order: 1,
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Java mengenal 2 (dua) jenis tipe data yaitu ',
                    },
                    {
                      type: 'text',
                      text: 'Primitif',
                      marks: [{ type: 'bold' }],
                    },
                    { type: 'text', text: ' dan ' },
                    {
                      type: 'text',
                      text: 'Referensi',
                      marks: [{ type: 'bold' }],
                    },
                    { type: 'text', text: '.' },
                  ],
                },
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Tipe Data Primitif' }],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Tipe data Primitif adalah tipe data dasar yang dikenal oleh Java, yang terdiri dari 8 tipe data, yaitu:',
                    },
                  ],
                },
                {
                  type: 'orderedList',
                  attrs: { start: 1 },
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Bilangan Bulat',
                              marks: [{ type: 'bold' }],
                            },
                          ],
                        },
                        {
                          type: 'table',
                          content: [
                            {
                              type: 'tableRow',
                              content: [
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Tipe Data' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Ukuran' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Range' },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'tableRow',
                              content: [
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [{ type: 'text', text: 'byte' }],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: '8-bit' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: '-2' },
                                        {
                                          type: 'text',
                                          text: '7',
                                          marks: [{ type: 'superscript' }],
                                        },
                                        { type: 'text', text: ' s.d. 2' },
                                        {
                                          type: 'text',
                                          text: '7',
                                          marks: [{ type: 'superscript' }],
                                        },
                                        { type: 'text', text: ' - 1' },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: "Nilai untuk tipe data long wajib ditambahkan dengan karakter 'L' atau 'l' di bagian akhir nilainya.",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Bilangan Pecahan',
                              marks: [{ type: 'bold' }],
                            },
                          ],
                        },
                        {
                          type: 'table',
                          content: [
                            {
                              type: 'tableRow',
                              content: [
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Tipe Data' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Ukuran' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableHeader',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'Range' },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'tableRow',
                              content: [
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: 'float' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        { type: 'text', text: '32-bit' },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  type: 'tableCell',
                                  content: [
                                    {
                                      type: 'paragraph',
                                      content: [
                                        {
                                          type: 'text',
                                          text: '±3.40282347E+38 (6-7 significant digits)',
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Karakter',
                              marks: [{ type: 'bold' }],
                            },
                          ],
                        },
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Tipe data char memiliki ukuran 16-bit (0 s.d. 65536 unsigned).',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Logika',
                              marks: [{ type: 'bold' }],
                            },
                          ],
                        },
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Java hanya mengenal 2 (dua) nilai literal untuk tipe data boolean, yaitu true dan false.',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Tipe Data Referensi' }],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Tipe data Referensi adalah tipe data yang digunakan untuk memegang referensi dari suatu objek.',
                    },
                  ],
                },
              ],
            },
          },
          {
            id: 'identifier',
            title: 'Identifier',
            order: 2,
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Identifier adalah nama yang ditentukan oleh seorang programmer untuk memberikan nama terhadap class, interface, variabel, konstanta, dan method.',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Adapun aturan dalam penamaan identifier adalah sebagai berikut:',
                    },
                  ],
                },
                {
                  type: 'orderedList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Tidak boleh menggunakan keywords atau karakter spasi.',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: 'Tidak ada batasan panjang karakter identifier.',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: "Identifier harus diawali dengan huruf, '_' atau '$', dan tidak boleh menggunakan operator seperti +, -, *, /.",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Contoh identifier yang benar: ',
                      marks: [{ type: 'bold' }],
                    },
                    {
                      type: 'text',
                      text: 'tempNilai, $nilai, nilai41, _temp, nilai_akhir. ',
                      marks: [{ type: 'code' }],
                    },
                    {
                      type: 'text',
                      text: 'Contoh yang salah: ',
                      marks: [{ type: 'bold' }],
                    },
                    {
                      type: 'text',
                      text: '2an, temp-nilai, +hari, siang/malam.',
                      marks: [{ type: 'code' }],
                    },
                  ],
                },
              ],
            },
          },
          {
            id: 'variabel',
            title: 'Variabel',
            order: 3,
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Variabel adalah wadah yang digunakan untuk menampung nilai sesuai dengan tipe data yang dideklarasikan untuk variabel tersebut dan nilainya dapat berubah-ubah.',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Sintaks untuk mendeklarasikan variabel adalah sebagai berikut:',
                    },
                  ],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: '[access_modifier] tipe_data nama_variable;',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'atau' }],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: '[access_modifier] static tipe_data nama_variable;',
                    },
                  ],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: 'int nilai;\nint harga;\nchar karakter;\nString nama;',
                    },
                  ],
                },
              ],
            },
          },
          {
            id: 'konstanta',
            title: 'Konstanta',
            order: 4,
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Konstanta adalah wadah yang digunakan untuk menampung nilai sesuai dengan tipe data yang dideklarasikan untuk konstanta tersebut dan nilainya tetap (tidak dapat berubah).',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Sintaks untuk mendeklarasikan konstanta adalah sebagai berikut:',
                    },
                  ],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: '[access_modifier] final tipe_data NAMA_KONSTANTA = nilai_literal;',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'atau' }],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: '[access_modifier] final static tipe_data NAMA_KONSTANTA = nilai_literal;',
                    },
                  ],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'java' },
                  content: [
                    {
                      type: 'text',
                      text: 'final int NILAI = 200;\nfinal int HARGA = 200;\nfinal char KARAKTER = \'a\';\nfinal String NAMA = "Andi";',
                    },
                  ],
                },
              ],
            },
          },
        ],
        task: {
          experimentIds: ['percobaan-2'],
          exerciseIds: ['latihan-1'],
          instructionContent: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Buat laporan praktikum untuk Percobaan 2 dan Latihan sesuai format yang telah ditentukan.',
                  },
                ],
              },
            ],
          },
          additionalNoteContent: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Gunakan bahasa sendiri dan sertakan analisis hasil percobaan.',
                  },
                ],
              },
            ],
          },
          requireSelfDeclaration: true,
          conclusionConfig: {
            enabled: true,
            required: true,
            minWord: 10,
          },
        },
      })}'::jsonb,
      'PUBLISHED'
    );
  `);

  // ============================================================
  // JOBSHEET CLASS
  // ============================================================
  pgm.sql(`
    INSERT INTO jobsheet_classes (
      id, jobsheet_id, class_id, is_active, deadline,
      title, description, goal, content, status
    )
    SELECT
      'jc-1',
      'job-1',
      'kelas-a',
      true,
      '2026-06-23 23:59:59',
      title, description, goal, content,
      'PUBLISHED'
    FROM jobsheets WHERE id = 'job-1';
  `);

  // ============================================================
  // EXPERIMENTS (global)
  // ============================================================
  pgm.sql(`
    INSERT INTO experiments (id, jobsheet_id, title, instruction_content, template_code)
    VALUES
    (
      'percobaan-1',
      'job-1',
      'Percobaan 1: Tipe Data Bilangan Bulat',
      '${toJsonb({
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Buatlah program berikut ini dan amatilah outputnya!',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel ',
                      },
                      {
                        type: 'text',
                        text: 'nilaiA',
                        marks: [{ type: 'code' }],
                      },
                      { type: 'text', text: ' menjadi ' },
                      { type: 'text', text: '-129', marks: [{ type: 'code' }] },
                      { type: 'text', text: ' atau ' },
                      { type: 'text', text: '128', marks: [{ type: 'code' }] },
                      {
                        type: 'text',
                        text: '. Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel ',
                      },
                      {
                        type: 'text',
                        text: 'hargaB',
                        marks: [{ type: 'code' }],
                      },
                      { type: 'text', text: ' menjadi ' },
                      {
                        type: 'text',
                        text: '3000000000',
                        marks: [{ type: 'code' }],
                      },
                      {
                        type: 'text',
                        text: '. Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })}'::jsonb,
      $$package tipedata;
public class BilanganBulat {
    public static void main(String args[]) {

        // deklarasi variabel/state/atribut
        byte nilaiA;
        short nilaiB;
        int hargaA;
        long hargaB;

        // inisialisasi variabel/state/atribut
        nilaiA = 97;
        nilaiB = 30000;
        hargaA = 2000000000;
        hargaB = 3000000000L;

        // menampilkan nilai dari variabel ke layar output
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
      '${toJsonb({
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Buatlah program berikut ini dan amatilah output-nya!',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel ',
                      },
                      { type: 'text', text: 'ips', marks: [{ type: 'code' }] },
                      { type: 'text', text: ' menjadi ' },
                      { type: 'text', text: '3.5', marks: [{ type: 'code' }] },
                      {
                        type: 'text',
                        text: '. Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })}'::jsonb,
      $$package tipedata;

public class BilanganPecahan {
    public static void main(String args[]) {

        // deklarasi variabel
        float ips;
        double ipk;

        // inisialisasi variabel
        ips = 3.5f;
        ipk = 3.8;

        // menampilkan nilai variabel ke layar output
        System.out.println(ips);
        System.out.println(ipk);
    }
}$$
    );
  `);

  // ============================================================
  // EXERCISES (global)
  // ============================================================
  pgm.sql(`
    INSERT INTO exercises (id, jobsheet_id, title, instruction_content, template_code)
    VALUES (
      'latihan-1',
      'job-1',
      'Latihan - Biodata Mahasiswa',
      '${toJsonb({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Latihan' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Buatlah program untuk menampilkan data mahasiswa ke layar output (console).',
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Nama class: BiodataMahasiswa' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Terdapat konstanta berupa nama, NIM, dan prodi.',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Terdapat variabel berupa semester, kelas, umur, dan ipk.',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Nilai disesuaikan dengan data masing-masing.',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Tampilkan seluruh data ke layar console.',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })}'::jsonb,
      ''
    );
  `);

  // ============================================================
  // CLASS EXPERIMENTS (copy dari global ke kelas-a)
  // ============================================================
  pgm.sql(`
    INSERT INTO class_experiments (id, jobsheet_class_id, experiment_id, title, instruction_content, template_code)
    SELECT
      'ce-' || id,
      'jc-1',
      id,
      title,
      instruction_content,
      template_code
    FROM experiments WHERE jobsheet_id = 'job-1';
  `);

  // ============================================================
  // CLASS EXERCISES (copy dari global ke kelas-a)
  // ============================================================
  pgm.sql(`
    INSERT INTO class_exercises (id, jobsheet_class_id, exercise_id, title, instruction_content, template_code)
    SELECT
      'cex-' || id,
      'jc-1',
      id,
      title,
      instruction_content,
      template_code
    FROM exercises WHERE jobsheet_id = 'job-1';
  `);

  // ============================================================
  // STUDENT PROGRESS
  // ============================================================
  pgm.sql(`
    INSERT INTO student_progress (
      id, student_id, jobsheet_id, class_id,
      status, progress, last_page, last_activity, completed_theory_pages
    ) VALUES (
      'sp-1',
      'mhs-1',
      'job-1',
      'kelas-a',
      'BELUM',
      0,
      NULL,
      CURRENT_TIMESTAMP,
      '[]'::jsonb
    );
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM student_progress WHERE id = 'sp-1';
    DELETE FROM class_exercises WHERE jobsheet_class_id = 'jc-1';
    DELETE FROM class_experiments WHERE jobsheet_class_id = 'jc-1';
    DELETE FROM exercises WHERE jobsheet_id = 'job-1';
    DELETE FROM experiments WHERE jobsheet_id = 'job-1';
    DELETE FROM jobsheet_classes WHERE id = 'jc-1';
    DELETE FROM jobsheets WHERE id = 'job-1';
    DELETE FROM class_students WHERE id = 'cs-1';
    DELETE FROM classes WHERE id = 'kelas-a';
    DELETE FROM academic_periods WHERE id = 'ap-1';
    DELETE FROM curriculum WHERE id = 'kur-1';
    DELETE FROM lecturer_profiles WHERE user_id = 'dosen-1';
    DELETE FROM student_profiles WHERE user_id = 'mhs-1';
    DELETE FROM users WHERE id IN ('admin-1', 'dosen-1', 'mhs-1');
  `);
};
