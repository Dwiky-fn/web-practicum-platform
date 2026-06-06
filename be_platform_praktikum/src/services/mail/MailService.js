const nodemailer = require('nodemailer');
const {
  emailChangeOtpTemplate,
} = require('./templates/emailChangeOtpTemplate');

class MailService {
  constructor() {
    this._transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendEmailChangeOtp(to, otp) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Kode OTP Perubahan Email',
      html: emailChangeOtpTemplate({
        otp,
        appName: 'Platform Praktikum Pemrograman',
        expiresIn: '5 menit',
      }),
    });
  }

  async sendEmailChangedNotification(to, newEmail) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Email Akun Berhasil Diubah',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Email Akun Berhasil Diubah</h2>
          <p>Email akun Anda telah berhasil diubah menjadi:</p>
          <p><strong>${newEmail}</strong></p>
          <p>Jika Anda tidak merasa melakukan perubahan ini, segera hubungi administrator.</p>
        </div>
      `,
    });
  }
}

module.exports = MailService;
