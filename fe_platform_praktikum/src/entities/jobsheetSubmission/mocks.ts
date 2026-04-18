import type { JobsheetSubmission } from "./types";
import type { JSONContent } from "@tiptap/react";

/* ================= HELPER ================= */

function codeBlock(content: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "codeBlock",
        attrs: { language: "java" },
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      },
    ],
  };
}

function paragraph(content: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      },
    ],
  };
}

/* ================= MOCK ================= */

export const jobsheetSubmissionMocks: JobsheetSubmission[] = [
  {
    id: "sub-1",
    jobsheetId: "job-1",
    studentId: '1',
    status: "DRAFT",
    score: 0,

    experiments: [
      {
        experimentId: "percobaan-1",
        steps: [
          // ===== PROGRAM 1 =====
          {
            step: 1,
            code: codeBlock(`package tipedata;
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
}`),

            output: `97
30000
2000000000
3000000000`,

            analysis: paragraph(
              "Program berjalan dengan baik karena semua nilai masih dalam batas tipe data masing-masing."
            ),
          },

          // ===== PROGRAM 2 =====
          {
            step: 2,
            code: codeBlock(`nilaiA = -129; // di luar range byte
nilaiB = 128;`),

            output: "Belum ada output...",

            analysis: paragraph(
              "Nilai -129 menyebabkan error karena melebihi batas tipe byte. Nilai 128 masih valid untuk short."
            ),
          },

          // ===== PROGRAM 3 =====
          {
            step: 3,
            code: codeBlock(`hargaB = 3000000000; // tanpa L`),

            output: `Error`,

            analysis: paragraph(
              "Terjadi error karena literal dianggap sebagai int. Untuk long harus menggunakan suffix L."
            ),
          },
        ],
      },

      // ===== PERC0BAAN 2 (IMPROVISASI) =====
      {
        experimentId: "percobaan-2",
        steps: [
          {
            step: 1,
            code: codeBlock(`float ips = 3.5f;
double ipk = 3.8;

System.out.println(ips);
System.out.println(ipk);`),

            output: `3.5
3.8`,

            analysis: paragraph(
              "Program menampilkan nilai float dan double sesuai tipe datanya."
            ),
          },
        ],
      },
    ],

    // ===== LATIHAN =====
    exercises: [
      {
        exerciseId: "latihan-1",

        code: codeBlock(`public class BiodataMahasiswa {
  public static void main(String[] args) {
    String nama = "Dwiky Juniardi";
    String nim = "3202316001";
    String prodi = "Teknik Informatika";

    System.out.println(nama);
    System.out.println(nim);
    System.out.println(prodi);
  }
}`),

        output: `Dwiky Juniardi
3202316001
Teknik Informatika`,

        analysis: paragraph(
          "Program berhasil menampilkan biodata mahasiswa sesuai dengan nilai variabel yang diberikan."
        ),
      },
    ],

    // ===== KESIMPULAN =====
    conclusion: {
      content: paragraph(
        "Pada praktikum ini saya memahami batasan setiap tipe data dalam Java serta pentingnya menggunakan tipe data yang sesuai agar tidak terjadi error."
      ),
      wordCount: 32,
    },

    review: {
      id: "rev-1",
      submissionId: "sub-1",
      lecturerId: "lec-1",

      aiScore: 80,
      finalScore: 85,
      plagiarismScore: 5,

      aiFeedback: {
        summary: {
          totalPercobaan: 2,
          percobaanValid: 2,
          nilaiAkhir: 80,
        },
        detail: [
          {
            percobaan: "Percobaan 1",
            hasil: {
              kebenaran: 8,
              kualitasKode: 7,
              kualitasAnalisis: 7,
              total: 22,
              feedback:
                "Program sudah benar, namun analisis masih kurang dalam."
            }
          }
        ]
      },

      lecturerFeedback:
        "Secara umum sudah baik, namun perlu memperhatikan batas tipe data dan penjelasan analisis.",

      decision: "REVISION",

      comments: [
        {
          experimentId: "percobaan-1",
          step: 2,
          comment:
            "Nilai -129 tidak valid untuk byte, perhatikan range (-128 sampai 127)."
        },
        {
          experimentId: "percobaan-1",
          step: 3,
          comment:
            "Gunakan suffix L untuk literal long agar tidak terjadi error."
        },
        {
          exerciseId: "latihan-1",
          comment:
            "Output sudah benar, tapi analisis masih bisa diperjelas."
        }
      ]
    },

    createdAt: "2026-03-20",
    updatedAt: "2026-03-20",
  },
];