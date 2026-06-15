const Joi = require('joi');

const LoginPayloadSchema = Joi.object({
  identifier: Joi.string().trim().allow('', null),
  email: Joi.string().trim().allow('', null),
  nim: Joi.string().trim().allow('', null),
  password: Joi.string().required(),
}).or('identifier', 'email', 'nim');

const GoogleLoginPayloadSchema = Joi.object({
  credential: Joi.string().required(),
});

const PasswordResetRequestPayloadSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const VerifyPasswordResetOtpPayloadSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string().trim().required(),
});

function validatePasswordConfirmation(value, helpers) {
  const newPassword = value.newPassword || value.new_password;
  const confirmPassword = value.confirmPassword || value.confirm_password;

  if (newPassword !== confirmPassword) {
    return helpers.message('Konfirmasi password tidak sama dengan password baru');
  }

  return value;
}

const ResetForgottenPasswordPayloadSchema = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8),
  new_password: Joi.string().min(8),
  confirmPassword: Joi.string(),
  confirm_password: Joi.string(),
})
  .or('newPassword', 'new_password')
  .or('confirmPassword', 'confirm_password')
  .custom(validatePasswordConfirmation);

const PersonalDataSchema = Joi.object({
  no_telepon: Joi.string().allow('', null),
  tempat_lahir: Joi.string().allow('', null),
  tanggal_lahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null),
  kota: Joi.string().allow('', null),
});

const UpdateUserPayloadSchema = Joi.object({
  isActive: Joi.boolean(),
  is_active: Joi.boolean(),
  avatarUrl: Joi.string().uri().allow('', null),
  avatar_url: Joi.string().uri().allow('', null),
  personalData: PersonalDataSchema,
  personal_data: PersonalDataSchema,
}).min(1);

const VerifyCurrentPasswordPayloadSchema = Joi.object({
  currentPassword: Joi.string().required(),
  current_password: Joi.string(),
}).or('currentPassword', 'current_password');

const UpdateEmailRequestPayloadSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  currentPassword: Joi.string().required(),
  current_password: Joi.string(),
}).or('currentPassword', 'current_password');

const VerifyEmailOtpPayloadSchema = Joi.object({
  otp: Joi.string().trim().required(),
});

const UpdatePasswordPayloadSchema = Joi.object({
  currentPassword: Joi.string(),
  current_password: Joi.string(),
  newPassword: Joi.string().min(8),
  new_password: Joi.string().min(8),
  confirmPassword: Joi.string(),
  confirm_password: Joi.string(),
})
  .or('currentPassword', 'current_password')
  .or('newPassword', 'new_password')
  .or('confirmPassword', 'confirm_password')
  .custom(validatePasswordConfirmation);

const UploadAvatarPayloadSchema = Joi.object({
  image: Joi.string()
    .pattern(/^data:image\/(jpeg|jpg|png|webp);base64,/i)
    .required()
    .messages({
      'string.pattern.base': 'Format gambar tidak didukung',
    }),
});

module.exports = {
  GoogleLoginPayloadSchema,
  LoginPayloadSchema,
  PasswordResetRequestPayloadSchema,
  ResetForgottenPasswordPayloadSchema,
  UpdateEmailRequestPayloadSchema,
  UpdatePasswordPayloadSchema,
  UpdateUserPayloadSchema,
  UploadAvatarPayloadSchema,
  VerifyCurrentPasswordPayloadSchema,
  VerifyEmailOtpPayloadSchema,
  VerifyPasswordResetOtpPayloadSchema,
};
