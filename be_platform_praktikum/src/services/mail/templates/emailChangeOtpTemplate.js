/**
 * Template HTML Email untuk OTP Perubahan Email
 * Platform Praktikum Pemrograman
 *
 * @param {object} params
 * @param {string} params.otp          - Kode OTP (misal: "482931")
 * @param {string} params.appName      - Nama aplikasi (misal: "Platform Praktikum Pemrograman")
 * @param {string|number} params.expiresIn - Durasi berlaku OTP (misal: "10 menit" atau 10)
 * @param {string} [params.logoUrl]    - URL logo (opsional)
 * @returns {string} String HTML siap kirim via Nodemailer
 */
function emailChangeOtpTemplate({ otp, appName, expiresIn, logoUrl }) {
  const expiresText =
    typeof expiresIn === 'number' ? `${expiresIn} menit` : expiresIn;

  // ── BAGIAN YANG BISA KAMU UBAH ──────────────────────────────────────────
  // Warna utama & turunannya — cukup ganti di sini, berlaku ke seluruh template
  const COLOR_PRIMARY = '#1D4ED8'; // Biru utama (tombol, header, aksen)
  const COLOR_PRIMARY_DARK = '#1E3A8A'; // Biru gelap (footer strip, border OTP)
  const COLOR_PRIMARY_LIGHT = '#EFF6FF'; // Biru sangat muda (background OTP box)
  const COLOR_TEXT = '#1E293B'; // Warna teks utama
  const COLOR_MUTED = '#64748B'; // Warna teks sekunder / caption
  const COLOR_BORDER = '#E2E8F0'; // Warna border halus
  const COLOR_BG = '#F1F5F9'; // Warna background email
  const COLOR_WARNING_BG = '#FFF7ED'; // Background pesan keamanan
  const COLOR_WARNING_BORDER = '#FB923C'; // Border pesan keamanan
  // ────────────────────────────────────────────────────────────────────────

  // Fallback logo: inisial nama app jika logoUrl tidak disediakan
  const logoSection = logoUrl
    ? `<img
        src="${logoUrl}"
        alt="${appName} Logo"
        width="160"
        style="display:block; max-height:52px; width:auto; max-width:160px;"
      />`
    : `<div style="
        display:inline-block;
        background-color:${COLOR_PRIMARY};
        color:#ffffff;
        font-size:14px;
        font-weight:700;
        letter-spacing:0.05em;
        padding:8px 18px;
        border-radius:6px;
        font-family:'Segoe UI', Arial, sans-serif;
      ">${appName}</div>`;

  // Pisah digit OTP agar tampil kotak per karakter
  const otpDigits = String(otp)
    .split('')
    .map(
      (digit) =>
        `<span style="
          display:inline-block;
          width:44px;
          height:56px;
          line-height:56px;
          text-align:center;
          font-size:28px;
          font-weight:800;
          color:${COLOR_PRIMARY_DARK};
          background-color:#ffffff;
          border:2px solid ${COLOR_PRIMARY};
          border-radius:8px;
          margin:0 4px;
          font-family:'Courier New', 'Lucida Console', monospace;
          box-shadow:0 2px 6px rgba(29,78,216,0.10);
        ">${digit}</span>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Kode OTP Perubahan Email – ${appName}</title>
</head>
<body style="
  margin:0;
  padding:0;
  background-color:${COLOR_BG};
  font-family:'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
  -webkit-font-smoothing:antialiased;
">

  <!-- Wrapper utama -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="background-color:${COLOR_BG}; padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card email, lebar maks 600px -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:600px; width:100%;">

          <!-- ── HEADER ───────────────────────────────────────────────── -->
          <tr>
            <td style="
              background-color:${COLOR_PRIMARY};
              border-radius:12px 12px 0 0;
              padding:28px 40px;
              text-align:center;
            ">
              ${logoSection}
            </td>
          </tr>

          <!-- ── BODY CARD ─────────────────────────────────────────────── -->
          <tr>
            <td style="
              background-color:#ffffff;
              padding:40px 40px 32px;
              border-left:1px solid ${COLOR_BORDER};
              border-right:1px solid ${COLOR_BORDER};
            ">

              <!-- Judul -->
              <p style="
                margin:0 0 8px;
                font-size:22px;
                font-weight:700;
                color:${COLOR_TEXT};
                line-height:1.3;
              ">Verifikasi Perubahan Email</p>

              <!-- Subjudul -->
              <p style="
                margin:0 0 28px;
                font-size:14px;
                color:${COLOR_MUTED};
                line-height:1.6;
              ">
                Anda telah mengajukan permintaan untuk mengubah alamat email
                akun Anda di <strong style="color:${COLOR_TEXT};">${appName}</strong>.
                Gunakan kode OTP berikut untuk melanjutkan proses verifikasi.
              </p>

              <!-- ── KOTAK OTP ────────────────────────────────────────── -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="
                    background-color:${COLOR_PRIMARY_LIGHT};
                    border:1.5px solid ${COLOR_PRIMARY};
                    border-radius:10px;
                    padding:28px 20px;
                    text-align:center;
                  ">
                    <p style="
                      margin:0 0 16px;
                      font-size:12px;
                      font-weight:600;
                      letter-spacing:0.12em;
                      text-transform:uppercase;
                      color:${COLOR_PRIMARY};
                    ">Kode OTP Anda</p>

                    <!-- Digit-digit OTP -->
                    <div style="margin:0 0 16px; line-height:1;">
                      ${otpDigits}
                    </div>

                    <!-- Waktu berlaku -->
                    <p style="
                      margin:0;
                      font-size:13px;
                      color:${COLOR_MUTED};
                    ">
                      ⏱ Kode ini berlaku selama
                      <strong style="color:${COLOR_PRIMARY_DARK};">${expiresText}</strong>
                      sejak email ini dikirim.
                    </p>
                  </td>
                </tr>
              </table>
              <!-- ──────────────────────────────────────────────────────── -->

              <!-- Instruksi penggunaan -->
              <p style="
                margin:28px 0 0;
                font-size:14px;
                color:${COLOR_TEXT};
                line-height:1.7;
              ">
                Masukkan kode tersebut pada halaman verifikasi yang terbuka
                di browser Anda. Jangan tutup tab atau halaman tersebut
                sebelum proses selesai.
              </p>

              <!-- Tips keamanan -->
              <p style="
                margin:12px 0 0;
                font-size:13px;
                color:${COLOR_MUTED};
                line-height:1.6;
              ">
                Demi keamanan, <strong>jangan bagikan kode ini</strong>
                kepada siapa pun, termasuk pihak yang mengaku sebagai
                tim dukungan ${appName}.
              </p>

            </td>
          </tr>

          <!-- ── PESAN KEAMANAN ─────────────────────────────────────────── -->
          <tr>
            <td style="
              background-color:${COLOR_WARNING_BG};
              border-left:1px solid ${COLOR_BORDER};
              border-right:1px solid ${COLOR_BORDER};
              padding:20px 40px;
            ">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="
                    border-left:4px solid ${COLOR_WARNING_BORDER};
                    padding:12px 16px;
                    border-radius:0 6px 6px 0;
                  ">
                    <p style="
                      margin:0 0 4px;
                      font-size:13px;
                      font-weight:700;
                      color:#92400E;
                    ">⚠ Bukan Anda yang Meminta Perubahan Ini?</p>
                    <p style="
                      margin:0;
                      font-size:13px;
                      color:#92400E;
                      line-height:1.6;
                    ">
                      Jika Anda tidak pernah mengajukan perubahan email,
                      abaikan email ini dan segera hubungi administrator
                      atau dosen penanggung jawab untuk mengamankan akun Anda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ────────────────────────────────────────────────── -->
          <tr>
            <td style="
              background-color:${COLOR_PRIMARY_DARK};
              border-radius:0 0 12px 12px;
              padding:20px 40px;
              text-align:center;
            ">
              <p style="
                margin:0 0 6px;
                font-size:13px;
                font-weight:600;
                color:#BFDBFE;
              ">${appName}</p>
              <p style="
                margin:0;
                font-size:12px;
                color:#93C5FD;
                line-height:1.5;
              ">
                Email ini dikirim secara otomatis oleh sistem. Mohon tidak
                membalas email ini.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card email -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

module.exports = { emailChangeOtpTemplate };
