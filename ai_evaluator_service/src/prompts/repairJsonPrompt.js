function buildRepairJsonPrompt({ invalidOutput, validationErrors, scope }) {
  return `
Perbaiki output JSON berikut agar sesuai dengan format evaluasi scope "${scope}".

Aturan:
1. Jangan mengubah fakta evaluasi tanpa alasan.
2. Jangan menambahkan penjelasan di luar JSON.
3. Perbaiki syntax JSON, tipe data, field wajib, dan nilai yang tidak valid.
4. source harus "ai".
5. status harus "draft".
6. requiresLecturerReview harus true.
7. totalScoreRecommendation harus sama dengan jumlah score.

Kesalahan validasi:
${JSON.stringify(validationErrors, null, 2)}

Output yang perlu diperbaiki:
<BEGIN_INVALID_OUTPUT>
${String(invalidOutput).slice(0, 50000)}
<END_INVALID_OUTPUT>

Kembalikan JSON valid saja tanpa markdown.
`.trim();
}

module.exports = buildRepairJsonPrompt;
