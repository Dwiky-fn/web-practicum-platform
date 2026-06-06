function passwordChangedNotificationTemplate({ appName, changedAt }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Password Akun Berhasil Diganti - ${appName}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .email-wrapper { padding: 16px 0 !important; }
      .email-card { max-width: 480px !important; }
      .email-header { border-radius: 10px 10px 0 0 !important; padding: 20px !important; }
      .app-badge { font-size: 12px !important; letter-spacing: 0.06em !important; padding: 7px 14px !important; }
      .email-body { padding: 24px 20px 20px !important; }
      .icon-wrap { padding-bottom: 14px !important; }
      .icon-circle { width: 52px !important; height: 52px !important; line-height: 52px !important; font-size: 26px !important; }
      .title { font-size: 18px !important; margin-bottom: 5px !important; }
      .subtitle { font-size: 13px !important; margin-bottom: 20px !important; }
      .detail-cell { padding: 16px !important; }
      .detail-label { font-size: 10px !important; margin-bottom: 12px !important; }
      .time-label { font-size: 11px !important; }
      .time-value { font-size: 11px !important; }
      .info-copy { font-size: 13px !important; }
      .muted-copy { font-size: 12px !important; }
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
                <div class="icon-circle" style="display:inline-block;width:60px;height:60px;background-color:#F0FDF4;border-radius:50%;border:2px solid #86EFAC;text-align:center;line-height:60px;font-size:30px;color:#16A34A;">
                  &#10003;
                </div>
              </td></tr>
            </table>

            <p class="title" style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1E293B;text-align:center;line-height:1.3;">
              Password Akun Berhasil Diganti
            </p>
            <p class="subtitle" style="margin:0 0 28px;font-size:14px;color:#64748B;text-align:center;line-height:1.6;">
              Password untuk akun Anda di
              <span style="color:#1D4ED8;font-weight:600;">${appName}</span>
              telah berhasil diperbarui.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
              style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:24px;">
              <tr><td class="detail-cell" style="padding:20px 24px;">
                <p class="detail-label" style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;">
                  Detail Perubahan
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="time-label" style="font-size:12px;color:#94A3B8;">&#128336; Waktu perubahan:</td>
                    <td class="time-value" style="text-align:right;font-size:12px;color:#64748B;font-weight:600;">${changedAt}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p class="info-copy" style="margin:0 0 10px;font-size:14px;color:#1E293B;line-height:1.7;">
              Mulai sekarang, gunakan password baru Anda untuk masuk ke akun.
            </p>
            <p class="muted-copy" style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
              Demi keamanan, jangan bagikan password Anda kepada siapa pun.
            </p>
          </td>
        </tr>

        <tr>
          <td class="warning-cell" style="background-color:#FFF7ED;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;padding:16px 40px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="border-left:4px solid #F97316;padding:12px 16px;background-color:#ffffff;">
                  <p class="warning-title" style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E;">
                    &#9888;&#65039; <span class="desktop-warning-text">Bukan Anda yang Mengubah Password Ini?</span><span class="mobile-warning-text" style="display:none;">Bukan Anda?</span>
                  </p>
                  <p class="warning-copy desktop-warning-text" style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                    Jika Anda tidak merasa melakukan perubahan password, segera hubungi
                    <strong>administrator</strong> atau <strong>dosen penanggung jawab</strong>
                    untuk mengamankan akun Anda sesegera mungkin.
                  </p>
                  <p class="warning-copy mobile-warning-text" style="display:none;margin:0;font-size:12px;color:#92400E;line-height:1.6;">
                    Segera hubungi administrator atau dosen penanggung jawab
                    untuk mengamankan akun Anda.
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

module.exports = { passwordChangedNotificationTemplate };
