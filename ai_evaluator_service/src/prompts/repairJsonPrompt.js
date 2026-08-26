function buildRepairJsonPrompt({ invalidOutput, validationErrors, scope }) {
  return `
Perbaiki output JSON berikut agar sesuai dengan format dan skema evaluasi scope "${scope}".

ATURAN PERBAIKAN STRIKT:
1. DILARANG MENGUBAH FAKTA EVALUASI, PENILAIAN, SKOR, ATAU ISI FEEDBACK.
2. Tugas utama HANYA memperbaiki sintaks JSON, struktur field wajib, tipe data, dan kesalahan pembentukan JSON.
3. Pertahankan seluruh substansi evaluasi, rekomendasi nilai, dan pesan feedback yang sudah dihasilkan pada evaluasi awal.
4. Jangan menambahkan teks penjelasan atau markdown di luar objek JSON.
5. Memastikan field sistem tetap valid:
   - source HARUS "ai"
   - status HARUS "draft"
   - requiresLecturerReview HARUS true
6. Jika scope memiliki rubricScores dan totalScoreRecommendation, pastikan totalScoreRecommendation sama dengan jumlah total nilai pada rubricScores.

KESALAHAN VALIDASI YANG HARUS DIPERBAIKI:
${JSON.stringify(validationErrors, null, 2)}

OUTPUT JSON YANG PERLU DIPERBAIKI:
<BEGIN_INVALID_OUTPUT>
${String(invalidOutput).slice(0, 50000)}
<END_INVALID_OUTPUT>

Kembalikan JSON valid saja tanpa markdown.
`.trim();
}

module.exports = buildRepairJsonPrompt;
