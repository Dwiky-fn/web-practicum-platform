const dns = require('dns');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
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

function forceIPv4Lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
}

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
    if (process.env.RESEND_API_KEY) {
      this._resend = new Resend(process.env.RESEND_API_KEY);
    }

    const host = process.env.MAIL_HOST || 'smtp.gmail.com';
    const primaryPort = parseInt(process.env.MAIL_PORT || '587', 10);
    const primarySecure = process.env.MAIL_SECURE !== undefined
      ? process.env.MAIL_SECURE === 'true'
      : primaryPort === 465;

    const fallbackPort = parseInt(
      process.env.MAIL_FALLBACK_PORT || (primaryPort === 587 ? '465' : '587'),
      10
    );
    const fallbackSecure = fallbackPort === 465;

    this._primaryTransporter = nodemailer.createTransport({
      host,
      port: primaryPort,
      secure: primarySecure,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      family: 4,
      lookup: forceIPv4Lookup,
    });

    this._fallbackTransporter = nodemailer.createTransport({
      host,
      port: fallbackPort,
      secure: fallbackSecure,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      family: 4,
      lookup: forceIPv4Lookup,
    });
  }

  async _sendMail(mailOptions) {
    if (process.env.RESEND_API_KEY) {
      const resend = this._resend || new Resend(process.env.RESEND_API_KEY);
      const from = mailOptions.from || process.env.MAIL_FROM || 'onboarding@resend.dev';
      const { data, error } = await resend.emails.send({
        from,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
      });

      if (error) {
        throw new Error(`Resend API Error: ${error.message || JSON.stringify(error)}`);
      }
      return data;
    }

    try {
      return await this._primaryTransporter.sendMail(mailOptions);
    } catch (error) {
      console.warn(
        `[MailService] Primary SMTP transport failed (${error.message}). Trying fallback transport...`
      );
      return await this._fallbackTransporter.sendMail(mailOptions);
    }
  }

  async sendEmailChangeOtp(to, otp) {
    await this._sendMail({
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
    await this._sendMail({
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
    await this._sendMail({
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
    await this._sendMail({
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
