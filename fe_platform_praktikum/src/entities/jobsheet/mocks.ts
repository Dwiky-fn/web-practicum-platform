import type { Jobsheet } from "../../services/jobsheet/types";

export const jobsheetMocks: Jobsheet[] = [
  {
    id: "job-1",
    courseId: "mk-3",
    title: "Jobsheet 2: Tipe Data, Variabel, dan Konstanta",
    description:
      "Mahasiswa mempelajari tipe data, identifier, variabel, dan konstanta dalam Java.",
    goal:
      "Mahasiswa mampu menggunakan variabel, konstanta, dan berbagai jenis tipe data dalam program Java untuk menyelesaikan contoh kasus.",
    deadline: "2026-06-23",
    status: "PUBLISHED",

    summary: 
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Jobsheet ini membahas konsep dasar pemrograman Java yang meliputi tipe data, identifier, variabel, dan konstanta, serta penerapannya dalam berbagai percobaan praktikum."
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Java memiliki dua jenis tipe data, yaitu tipe data primitif dan tipe data referensi. Tipe data primitif terdiri dari delapan jenis yang mencakup bilangan bulat (byte, short, int, long), bilangan pecahan (float, double), karakter (char), dan logika (boolean). Masing-masing tipe memiliki ukuran memori dan rentang nilai tertentu. Dalam penggunaan literal, tipe long harus diakhiri dengan karakter 'L', sedangkan float harus diakhiri dengan karakter 'F'."
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Tipe data referensi digunakan untuk merepresentasikan objek, seperti String, Integer, class, array, dan interface."
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Materi ini juga membahas aturan penamaan identifier, termasuk ketentuan penggunaan huruf, karakter khusus, serta larangan penggunaan keyword dan operator dalam penamaan variabel atau konstanta."
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Variabel merupakan wadah untuk menyimpan nilai yang dapat berubah, sedangkan konstanta menggunakan kata kunci final dan nilainya tidak dapat diubah setelah dideklarasikan. Praktikum dilakukan untuk memahami perbedaan perilaku tipe data, nilai default, error akibat overflow, kesalahan tipe literal, serta sifat immutable pada konstanta."
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Melalui delapan percobaan dan satu latihan, mahasiswa diharapkan mampu:"
            }
          ]
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Menggunakan berbagai tipe data sesuai kebutuhan"
                    }
                  ]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Memahami batasan nilai dan error kompilasi"
                    }
                  ]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Membedakan variabel dan konstanta"
                    }
                  ]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Mengimplementasikan tipe data referensi dan objek sederhana"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    // Theory
    theory: [
      {
        id: "tipe-data",
        order: 1,
        title: "Tipe Data",
        content: {
          type: "doc",
          content: [

            // Intro
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Java mengenal 2 (dua) jenis tipe data yaitu " },
                { type: "text", text: "Primitif", marks: [{ type: "bold" }] },
                { type: "text", text: " dan " },
                { type: "text", text: "Referensi", marks: [{ type: "bold" }] },
                { type: "text", text: "." }
              ]
            },

            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Tipe Data Primitif" }]
            },

            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Tipe data Primitif adalah tipe data dasar yang dikenal oleh Java, yang terdiri dari 8 tipe data, yaitu:"
                }
              ]
            },

            // Ordered List
            {
              type: "orderedList",
              attrs: { start: 1 },
              content: [

                // 1. Bilangan Bulat
                {
                  type: "listItem",
                  content: [

                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Bilangan Bulat", marks: [{ type: "bold" }] }
                      ]
                    },

                    // Tabel
                    {
                      type: "table",
                      content: [
                        {
                          type: "tableRow",
                          content: [
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Tipe Data" }] }] },
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Ukuran" }] }] },
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Range" }] }] }
                          ]
                        },
                        {
                          type: "tableRow",
                          content: [
                            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "byte" }] }] },
                            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "8-bit" }] }] },
                            {
                              type: "tableCell",
                              content: [{
                                type: "paragraph",
                                content: [
                                  { type: "text", text: "-2" },
                                  { type: "text", text: "7", marks: [{ type: "superscript" }] },
                                  { type: "text", text: " s.d. 2" },
                                  { type: "text", text: "7", marks: [{ type: "superscript" }] },
                                  { type: "text", text: " - 1" }
                                ]
                              }]
                            }
                          ]
                        }
                      ]
                    },

                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Nilai untuk tipe data long wajib ditambahkan dengan karakter 'L' atau 'l' di bagian akhir nilainya."
                        }
                      ]
                    }

                  ]
                },

                // 2. Bilangan Pecahan
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Bilangan Pecahan", marks: [{ type: "bold" }] }
                      ]
                    },
                    {
                      type: "table",
                      content: [
                        {
                          type: "tableRow",
                          content: [
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Tipe Data" }] }] },
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Ukuran" }] }] },
                            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Range" }] }] }
                          ]
                        },
                        {
                          type: "tableRow",
                          content: [
                            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "float" }] }] },
                            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "32-bit" }] }] },
                            {
                              type: "tableCell",
                              content: [{
                                type: "paragraph",
                                content: [
                                  { type: "text", text: "±3.40282347E+38 (6-7 significant digits)" }
                                ]
                              }]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // 3. Karakter
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Karakter", marks: [{ type: "bold" }] }
                      ]
                    },
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Tipe data char memiliki ukuran 16-bit (0 s.d. 65536 unsigned)." }
                      ]
                    }
                  ]
                },

                // 4. Logika
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Logika", marks: [{ type: "bold" }] }
                      ]
                    },
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Java hanya mengenal 2 (dua) nilai literal untuk tipe data boolean, yaitu true dan false." }
                      ]
                    }
                  ]
                }

              ]
            },

            // Referensi
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Tipe Data Referensi" }]
            },

            {
              type: "paragraph",
              content: [
                { type: "text", text: "Tipe data Referensi adalah tipe data yang digunakan untuk memegang referensi dari suatu objek." }
              ]
            }
          ]
        }
      },
      {
        id: "identifier",
        order: 2,
        title: "Identifier",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Identifier adalah nama yang ditentukan oleh seorang programmer untuk memberikan nama terhadap class, interface, variabel, konstanta, dan method."
                }
              ]
            },

            {
              type: "paragraph",
              content: [
                { type: "text", text: "Adapun aturan dalam penamaan identifier adalah sebagai berikut:" }
              ]
            },

            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Tidak boleh menggunakan keywords atau karakter spasi." }]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Tidak ada batasan panjang karakter identifier." }]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Identifier harus diawali dengan huruf, '_' atau '$', dan tidak boleh menggunakan operator seperti +, -, *, /."
                        }
                      ]
                    }
                  ]
                }
              ]
            },

            {
              type: "paragraph",
              content: [
                { type: "text", text: "Contoh identifier yang benar: ", marks: [{ type: "bold" }] },
                { type: "text", text: "tempNilai, $nilai, nilai41, _temp, nilai_akhir. ", marks: [{ type: "code" }] },
                { type: "text", text: "Contoh yang salah: ", marks: [{ type: "bold" }] },
                { type: "text", text: "2an, temp-nilai, +hari, siang/malam.", marks: [{ type: "code" }] }
              ]
            }
          ]
        }
      },
      {
        id: "variabel",
        order: 3,
        title: "Variabel",
        content: {
          type: "doc",
          content: [
            // Penjelasan Detail
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Variabel adalah wadah yang digunakan untuk menampung nilai sesuai dengan tipe data yang dideklarasikan untuk variabel tersebut dan nilainya dapat berubah-ubah."
                }
              ]
            },

            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Sintaks untuk mendeklarasikan variabel adalah sebagai berikut:"
                }
              ]
            },

            // Code Block 1
            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text: "[access_modifier] tipe_data nama_variable;",
                  marks: [{ type: "code" }]
                }
              ]
            },

            {
              type: "paragraph",
              content: [{ type: "text", text: "atau" }]
            },

            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text: "[access_modifier] static tipe_data nama_variable;",
                  marks: [{ type: "code" }]
                }
              ]
            },

            // Penjelasan Detail
            {
              type: "paragraph",
              content: [
                { type: "text", text: "access_modifier", marks: [{ type: "code" }] },
                { type: "text", text: " dapat berupa default (tidak dituliskan secara eksplisit di dalam program), private, protected, public. " },
                { type: "text", text: "static", marks: [{ type: "code" }] },
                { type: "text", text: " menunjukkan bahwa variabel merupakan variabel class. " },
                { type: "text", text: "tipe_data", marks: [{ type: "code" }] },
                { type: "text", text: " adalah semua tipe data yang dikenal oleh Java. " },
                { type: "text", text: "nama_variable", marks: [{ type: "code" }] },
                { type: "text", text: " adalah nama variabel yang sesuai dengan aturan penamaan identifier. Berikut ini beberapa contoh deklarasi variabel:" }
              ]
            },
            // Code Block 2
            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text:
                    "int nilai;\n" +
                    "int harga;\n" +
                    "char karakter;\n" +
                    "String nama;",
                  marks: [{ type: "code" }]
                }
              ]
            },

            {
              type: "paragraph",
              content: [{ type: "text", text: "atau" }]
            },

            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text:
                    "int nilai, harga;\n" +
                    "char karakter;\n" +
                    "String nama;",
                  marks: [{ type: "code" }]
                }
              ]
            }

          ]
        }
      },
      {
        id: "konstanta",
        order: 4,
        title: "Konstanta",
        content: {
          type: "doc",
          content: [  
            // Definisi
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Konstanta adalah wadah yang digunakan untuk menampung nilai sesuai dengan tipe data yang dideklarasikan untuk konstanta tersebut dan nilainya tetap (tidak dapat berubah)."
                }
              ]
            },

            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Sintaks untuk mendeklarasikan konstanta adalah sebagai berikut:"
                }
              ]
            },

            // Sintaks
            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text: "[access_modifier] final tipe_data NAMA_KONSTANTA = nilai_literal;",
                  marks: [{ type: "code" }]
                }
              ]
            },

            {
              type: "paragraph",
              content: [{ type: "text", text: "atau" }]
            },

            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text: "[access_modifier] final static tipe_data NAMA_KONSTANTA = nilai_literal;",
                  marks: [{ type: "code" }]
                }
              ]
            },

            // Penjelasan Detail
            {
              type: "paragraph",
              content: [
                { type: "text", text: "access_modifier", marks: [{ type: "code" }] },
                { type: "text", text: " dapat berupa default (tidak dituliskan), private, protected, public. " },
                { type: "text", text: "static", marks: [{ type: "code" }] },
                { type: "text", text: " menunjukkan bahwa konstanta merupakan konstanta class. " },
                { type: "text", text: "tipe_data", marks: [{ type: "code" }] },
                { type: "text", text: " adalah semua tipe data yang dikenal oleh Java. " },
                { type: "text", text: "NAMA_KONSTANTA", marks: [{ type: "code" }] },
                { type: "text", text: " adalah nama konstanta yang sesuai dengan aturan penamaan identifier. Berikut ini beberapa contoh deklarasi konstanta:" }
              ]
            },
            // Contoh
            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text:
                    "final int NILAI = 200;\n" +
                    "final int HARGA = 200;\n" +
                    "final char KARAKTER = 'a';\n" +
                    "final String NAMA = \"Andi\";",
                  marks: [{ type: "code" }]
                }
              ]
            },

            {
              type: "paragraph",
              content: [{ type: "text", text: "atau" }]
            },

            {
              type: "codeBlock",
              attrs: { language: "java" },
              content: [
                {
                  type: "text",
                  text:
                    "final int NILAI, HARGA = 200;\n" +
                    "final char KARAKTER = 'a';\n" +
                    "final String NAMA = \"Andii\";",
                  marks: [{ type: "code" }]
                }
              ]
            }

          ]
        }
      }
    ],

    // Experiment
    experiments: [
      {
        id: "percobaan-1",
        order: 1,
        title: "Percobaan 1: Tipe Data Bilangan Bulat",
        isReported: true,

        instructionContent: {
          type: "doc",
          content: [
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Buatlah program berikut ini dan amatilah outputnya!"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel " },
                        { type: "text", text: "nilaiA", marks: [{ type: "code" }] },
                        { type: "text", text: " menjadi " },
                        { type: "text", text: "-129", marks: [{ type: "code" }] },
                        { type: "text", text: " atau " },
                        { type: "text", text: "128", marks: [{ type: "code" }] },
                        { type: "text", text: ". Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?" }
                      ]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel " },
                        { type: "text", text: "hargaB", marks: [{ type: "code" }] },
                        { type: "text", text: " menjadi " },
                        { type: "text", text: "3000000000", marks: [{ type: "code" }] },
                        { type: "text", text: ". Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },

        defaultTemplateCode: `package tipedata;
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
}`
      },
      {
        id: "percobaan-2",
        order: 2,
        title: "Percobaan 2: Tipe Data Bilangan Pecahan",
        isReported: true,

        instructionContent: {
          type: "doc",
          content: [
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Buatlah program berikut ini dan amatilah output-nya!"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Lakukan modifikasi program di atas dengan cara mengubah nilai untuk variabel "
                        },
                        {
                          type: "text",
                          text: "ips",
                          marks: [{ type: "code" }]
                        },
                        {
                          type: "text",
                          text: " menjadi "
                        },
                        {
                          type: "text",
                          text: "3.5",
                          marks: [{ type: "code" }]
                        },
                        {
                          type: "text",
                          text: ". Lakukan kompilasi dan running, kemudian apa yang terjadi dan mengapa demikian?"
                        }
                      ]
                    }
                  ]
                }

              ]
            }
          ]
        },

        defaultTemplateCode: `package tipedata;

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
}`
      }
    ],

    // Exercise
    exercises: [
      {
        id: "latihan-1",
        order: 1,
        title: "Latihan - Biodata Mahasiswa",
        isReported: true,

        instructionContent: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Latihan" }]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Buatlah program untuk menampilkan data mahasiswa ke layar output (console)."
                }
              ]
            },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: "Nama class: BiodataMahasiswa" }]
                  }]
                },
                {
                  type: "listItem",
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: "Terdapat konstanta berupa nama, NIM, dan prodi." }]
                  }]
                },
                {
                  type: "listItem",
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: "Terdapat variabel berupa semester, kelas, umur, dan ipk." }]
                  }]
                },
                {
                  type: "listItem",
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: "Nilai disesuaikan dengan data masing-masing." }]
                  }]
                },
                {
                  type: "listItem",
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: "Tampilkan seluruh data ke layar console." }]
                  }]
                }
              ]
            }
          ]
        },

        defaultTemplateCode: ""
      }
    ],

    // Task
    task: {
      experimentIds: ["percobaan-2"],
      exerciseIds: ["latihan-1"],

      instructionContent: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Buat laporan praktikum untuk Percobaan 2 dan Latihan sesuai format yang telah ditentukan."
              }
            ]
          }
        ]
      },

      additionalNoteContent: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Gunakan bahasa sendiri dan sertakan analisis hasil percobaan."
              }
            ]
          }
        ]
      },

      requireSelfDeclaration: true,

      conclusionConfig: {
        enabled: true,
        required: true,
        minWord: 150,
      },
    },
  },
];
