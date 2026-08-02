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

function validateRecipient(to) {
  if (!to || typeof to !== 'string' || !to.trim()) {
    throw new Error('Penerima email tidak tersedia');
  }
  return to.trim();
}

class MailService {
  constructor() {
    const host = process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.MAIL_PORT || '587', 10);
    const secure = process.env.MAIL_SECURE !== undefined
      ? process.env.MAIL_SECURE === 'true'
      : port === 465;

    const transportOptions = {
      host,
      port,
      secure,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };

    if (process.env.MAIL_SERVICE) {
      transportOptions.service = process.env.MAIL_SERVICE;
    }

    const family = process.env.MAIL_FAMILY ? parseInt(process.env.MAIL_FAMILY, 10) : 4;
    if (family) {
      transportOptions.family = family;
    }

    this._transporter = nodemailer.createTransport(transportOptions);
  }

  async sendEmailChangeOtp(to, otp) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: validateRecipient(to),
      subject: 'Kode OTP Perubahan Email',
      html: emailChangeOtpTemplate({
        otp,
        appName: APP_NAME,
        expiresIn: '5 menit',
      }),
    });
  }

  async sendPasswordResetOtp({ to, otp }) {
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: validateRecipient(to),
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
      to: validateRecipient(to),
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
      to: validateRecipient(to),
      subject: 'Password Akun Berhasil Diubah',
      html: passwordChangedNotificationTemplate({
        appName: APP_NAME,
        changedAt: formatChangedAt(),
      }),
    });
  }
}

module.exports = MailService;
