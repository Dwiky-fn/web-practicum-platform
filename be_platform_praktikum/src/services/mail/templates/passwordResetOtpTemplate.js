function passwordResetOtpTemplate({ otp, appName, expiresIn }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Kode OTP Reset Password - ${appName}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-wrapper { padding: 16px 0 !important; }
      .email-card { max-width: 480px !important; }
      .email-header { border-radius: 10px 10px 0 0 !important; padding: 20px !important; }
      .app-badge { font-size: 12px !important; letter-spacing: 0.06em !important; padding: 7px 14px !important; }
      .email-body { padding: 24px 20px 20px !important; }
      .icon-wrap { padding-bottom: 14px !important; }
      .icon-circle { width: 48px !important; height: 48px !important; line-height: 48px !important; font-size: 22px !important; }
      .title { font-size: 18px !important; margin-bottom: 5px !important; }
      .subtitle { font-size: 13px !important; margin-bottom: 20px !important; }
      .otp-box { padding: 20px 12px !important; }
      .otp-label { font-size: 10px !important; margin-bottom: 12px !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.25em !important; margin-bottom: 14px !important; }
      .otp-expiry { padding: 5px 14px !important; font-size: 12px !important; }
      .desktop-expiry-text { display: none !important; }
      .mobile-expiry-text { display: inline !important; }
      .instruction { margin-top: 20px !important; font-size: 13px !important; }
      .security-note { font-size: 12px !important; }
      .warning-cell { padding: 12px 20px !important; }
      .warning-title { font-size: 12px !important; }
      .warning-copy { font-size: 12px !important; }
      .desktop-warning-text { display: none !important; }
      .mobile-warning-text { display: block !important; }
      .footer { border-radius: 0 0 10px 10px !important; padding: 16px 20px !important; }
      .footer-title { font-size: 12px !important; }
      .footer-copy { font-size: 11px !important; }
      .desktop-footer-text { display: none !important; }
      .mobile-footer-text { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-wrapper" style="background-color:#F1F5F9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card" style="max-width:600px;width:100%;">
        <tr>
          <td class="email-header" style="background-color:#1D4ED8;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
            <div class="app-badge" style="display:inline-block;background-color:rgba(255,255,255,0.15);color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.08em;padding:8px 20px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);">
              ${appName}
            </div>
          </td>
        </tr>

        <tr>
          <td class="email-body" style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr><td class="icon-wrap" style="text-align:center;padding-bottom:20px;">
                <div class="icon-circle" style="display:inline-block;width:56px;height:56px;background-color:#EFF6FF;border-radius:50%;border:2px solid #BFDBFE;text-align:center;line-height:56px;font-size:26px;">
                  &#128274;
                </div>
              </td></tr>
            </table>

            <p class="title" style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1E293B;text-align:center;line-height:1.3;">
              Verifikasi Reset Password
            </p>
            <p class="subtitle" style="margin:0 0 28px;font-size:14px;color:#64748B;text-align:center;line-height:1.6;">
              Gunakan kode berikut untuk memverifikasi permintaan reset password akun Anda di
              <span style="color:#1D4ED8;font-weight:600;">${appName}</span>.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="otp-box" style="background-color:#EFF6FF;border:1.5px solid #1D4ED8;border-radius:10px;padding:28px 20px;text-align:center;">
                  <p class="otp-label" style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1D4ED8;">
                    Kode OTP Anda
                  </p>
                  <p class="otp-code" style="margin:0 0 16px;font-size:44px;font-weight:800;letter-spacing:0.3em;color:#1E3A8A;font-family:'Courier New','Lucida Console',monospace;line-height:1;">
                    ${otp}
                  </p>
                  <p class="otp-expiry" style="margin:0;display:inline-block;background-color:#DBEAFE;border-radius:20px;padding:6px 18px;font-size:13px;color:#1E3A8A;">
                    &#128336;
                    <span class="desktop-expiry-text">Berlaku selama <strong>${expiresIn}</strong> sejak email ini dikirim</span>
                    <span class="mobile-expiry-text" style="display:none;">Berlaku <strong>${expiresIn}</strong></span>
                  </p>
                </td>
              </tr>
            </table>

            <p class="instruction" style="margin:28px 0 0;font-size:14px;color:#1E293B;line-height:1.7;">
              Masukkan kode tersebut pada halaman reset password yang terbuka di browser Anda.
              Jangan tutup tab atau halaman sebelum proses selesai.
            </p>
            <p class="security-note" style="margin:10px 0 0;font-size:13px;color:#64748B;line-height:1.6;">
              Demi keamanan, <strong>jangan bagikan kode ini</strong> kepada siapa pun,
              termasuk pihak yang mengaku sebagai tim dukungan ${appName}.
            </p>
          </td>
        </tr>

        <tr>
          <td class="warning-cell" style="background-color:#FFF7ED;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;padding:16px 40px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="border-left:4px solid #F97316;padding:12px 16px;background-color:#ffffff;">
                  <p class="warning-title" style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E;">
                    &#9888;&#65039; <span class="desktop-warning-text">Bukan Anda yang Meminta Reset Password?</span><span class="mobile-warning-text" style="display:none;">Bukan Anda?</span>
                  </p>
                  <p class="warning-copy desktop-warning-text" style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                    Jika Anda tidak pernah meminta reset password,
                    <strong>abaikan email ini</strong> dan segera hubungi administrator
                    atau dosen penanggung jawab untuk mengamankan akun Anda.
                  </p>
                  <p class="warning-copy mobile-warning-text" style="display:none;margin:0;font-size:12px;color:#92400E;line-height:1.6;">
                    Abaikan email ini dan segera hubungi administrator
                    atau dosen penanggung jawab untuk mengamankan akun Anda.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="footer" style="background-color:#1E3A8A;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p class="footer-title" style="margin:0 0 4px;font-size:13px;font-weight:600;color:#BFDBFE;">${appName}</p>
            <p class="footer-copy desktop-footer-text" style="margin:0;font-size:12px;color:#93C5FD;line-height:1.5;">
              Email ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.
            </p>
            <p class="footer-copy mobile-footer-text" style="display:none;margin:0;font-size:11px;color:#93C5FD;line-height:1.5;">
              Email dikirim otomatis. Jangan dibalas.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { passwordResetOtpTemplate };
