const nodemailer = require('nodemailer');
const {
  emailChangeOtpTemplate,
} = require('./templates/emailChangeOtpTemplate');
const {
  passwordResetOtpTemplate,
} = require('./templates/passwordResetOtpTemplate');
const {
  emailChangedNotificationTemplate,
} = require('./templates/emailChangedNotificationTemplate');
const {
  passwordChangedNotificationTemplate,
} = require('./templates/passwordChangedNotificationTemplate');

const APP_NAME = 'Platform Praktikum Pemrograman';

function formatChangedAt(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    timeZoneName: 'short',
  }).format(date);
}

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
        appName: APP_NAME,
        expiresIn: '5 menit',
      }),
    });
  }

  async sendPasswordResetOtp(to, otp) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Kode OTP Reset Password',
      html: passwordResetOtpTemplate({
        otp,
        appName: APP_NAME,
        expiresIn: '5 menit',
      }),
    });
  }

  async sendEmailChangedNotification(to, newEmail) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Email Akun Berhasil Diubah',
      html: emailChangedNotificationTemplate({
        appName: APP_NAME,
        oldEmail: to,
        newEmail,
        changedAt: formatChangedAt(),
      }),
    });
  }

  async sendPasswordChangedNotification(to) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'Password Akun Berhasil Diubah',
      html: passwordChangedNotificationTemplate({
        appName: APP_NAME,
        changedAt: formatChangedAt(),
      }),
    });
  }
}

module.exports = MailService;
